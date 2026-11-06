/* ---------- platform: browser (PWA, artifact) or the Android app (Capacitor) ----------
   In the APK the Capacitor runtime injects window.Capacitor with its plugins (Filesystem, Share, App, KeepAwake).
   Every function returns null when it cannot help, and the caller falls back to the browser way. */
/** the folder of a project on this computer (0.9.18): a folder chosen once (File System Access, Chromium on a computer), remembered per project
 *  in IndexedDB; reports and backups are written there and replace the file of the same name. The Android app uses Documents/Ventilation Setup Tool/<project>. */
const Folders = {
  ok() { return typeof window.showDirectoryPicker === 'function' && !(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()); },
  _db: null, names: {},
  db() {
    if (!this._db) this._db = new Promise((res) => { if (!('indexedDB' in window)) return res(null); let r; try { r = indexedDB.open('inregelaar-folders', 1); } catch (e) { return res(null); }
      r.onupgradeneeded = () => r.result.createObjectStore('h'); r.onsuccess = () => res(r.result); r.onerror = () => res(null); r.onblocked = () => res(null); });
    return this._db;
  },
  async get(pid) { const d = await this.db(); if (!d) return null; return new Promise((res) => { try { const q = d.transaction('h').objectStore('h').get(pid); q.onsuccess = () => { const h = q.result || null; Folders.names[pid] = h ? (h.name || '📁') : ''; res(h); }; q.onerror = () => res(null); } catch (e) { res(null); } }); },
  async set(pid, h) { const d = await this.db(); if (!d) return false; return new Promise((res) => { try { const tx = d.transaction('h', 'readwrite'); const st = tx.objectStore('h'); if (h) st.put(h, pid); else st.delete(pid); tx.oncomplete = () => { Folders.names[pid] = h ? (h.name || '📁') : ''; res(true); }; tx.onerror = () => res(false); } catch (e) { res(false); } }); },
  async pick(pid) { const h = await window.showDirectoryPicker({ id: 'vst-project', mode: 'readwrite' }); await this.set(pid, h); return h; },
  /** ask for write access while the tap is fresh (before a report is built): true when the folder can be written */
  async ready(pid) { if (!this.ok()) return false; const h = await this.get(pid); if (!h) return false; try { let s = await h.queryPermission({ mode: 'readwrite' }); if (s !== 'granted') s = await h.requestPermission({ mode: 'readwrite' }); return s === 'granted'; } catch (e) { return false; } },
  async write(pid, filename, blob) {
    const h = await this.get(pid); if (!h) return null; if ((await h.queryPermission({ mode: 'readwrite' })) !== 'granted') return null;
    const fh = await h.getFileHandle(filename, { create: true }); const w = await fh.createWritable(); await w.write(blob); await w.close(); return { where: h.name || '📁' };
  },
};
/** updates of the Android app (0.9.20): the website keeps the newest test APK in app/ with app/latest.json
 *  {version, code, apk, bytes, sha256, notes:{ru,nl,en}}; the app compares code with its own versionCode and offers the download.
 *  Android installs an APK only after the user taps «Update» in its own installer (silent updates are for app stores only). */
const Updater = {
  info: null, mine: null, at: 0,
  base() { return (typeof APP_URL === 'string' ? APP_URL : 'https://bestof-bv.github.io/inregelaar-ventilatie/') + 'app/'; },
  async installed() {
    if (this.mine) return this.mine; const App = Platform.plugin('App'); let i = null;
    try { i = App && App.getInfo ? await App.getInfo() : null; } catch (e) { }
    this.mine = { version: (i && i.version) || APP_VERSION, code: Number(i && i.build) || 0 }; return this.mine;
  },
  /** null: nothing newer (or not the app / offline); else the newer version. Without force at most every 6 hours */
  async check(force) {
    if (!Platform.native()) return null;
    if (!force && Date.now() - this.at < 6 * 3600e3) return this.info;
    const me = await this.installed(); if (!me.code) return null;
    let j = null;
    // 0.9.21: signed in → the server (app-update: only with a valid plan, link signed for 30 minutes); else the public test address
    if (typeof Auth !== 'undefined' && Auth.user()) { try { j = await Auth.call('/functions/v1/app-update', { body: {} }); } catch (e) { if (e.status === 403) { this.at = Date.now(); this.info = null; return null; } } }
    if (!j) { this.at = Date.now(); this.info = null; return null; } // 0.9.23: updates only for signed-in users (the old public address is closed)
    this.at = Date.now();
    this.info = j && Number(j.code) > me.code && j.apk ? j : null; return this.info;
  },
  /** 0.9.23: the app downloads the APK itself (plugin ApkInstaller: SHA-256 checked) and opens the Android installer — one tap «Install».
   *  Without the plugin (an APK before 0.9.23): the system browser downloads it */
  busy: false,
  async open() {
    if (!this.info || this.busy) return;
    const url = this.info.url || new URL(this.info.apk, this.base()).href, P = Platform.plugin('ApkInstaller');
    if (!P) { const a = document.createElement('a'); a.href = url; a.rel = 'noopener'; document.body.appendChild(a); a.click(); a.remove(); toast(__('Downloading the update — open the file when it is ready')); return; }
    try {
      const c = await P.canInstall();
      if (!c.ok) { toast(__('Allow this app to install updates, then tap «Update» again')); await P.openSettings(); return; }
      await this.check(true); if (!this.info || !this.info.url) { toast(__('The update could not be downloaded: try again')); return; } // a fresh signed link (valid 30 minutes)
      const u = this.info.url;
      this.busy = true; toast(__('Downloading the update…'));
      const h = await P.addListener('progress', (e) => { if (this.busy && e.total > 0) toast(__('Downloading the update… {p} %', { p: Math.round(e.loaded / e.total * 100) })); });
      try { await P.install({ url: u, sha256: this.info.sha256 || '', name: this.info.apk }); }
      finally { this.busy = false; try { h.remove(); } catch (e) { } }
      toast(__('Tap «Install» to finish the update'));
    } catch (e) {
      this.busy = false; this.at = 0;
      toast(String(e && e.message).includes('checksum') ? __('The download was damaged: try again') : __('The update could not be downloaded: try again'));
    }
  },
  notes() { const n = this.info && this.info.notes; if (!n) return ''; return typeof n === 'string' ? n : n[I18N.cur.ui] || n.en || ''; },
};
const Platform = {
  get cap() { return window.Capacitor || null; },
  native() { const c = this.cap; return !!(c && typeof c.isNativePlatform === 'function' && c.isNativePlatform()); },
  /** a native plugin. Since Capacitor 3, Capacitor.Plugins only holds plugins registered with registerPlugin (a bundler does that through the
   *  @capacitor/* imports; this app has no bundler), so register it here — only when the APK has that plugin (PluginHeaders) — 0.9.14 */
  plugin(name) {
    const c = this.cap; if (!c) return null;
    if (c.Plugins && c.Plugins[name]) return c.Plugins[name];
    const known = Array.isArray(c.PluginHeaders) ? c.PluginHeaders.some(h => h && h.name === name) : false;
    if (!known || typeof c.registerPlugin !== 'function') return null;
    try { return c.registerPlugin(name) || null; } catch (e) { console.error(e); return null; }
  },
  blobB64(blob) { return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1] || ''); r.onerror = rej; r.readAsDataURL(blob); }); },
  /** Android app: write to Documents/Ventilation Setup Tool; {where} for the message */
  async saveFile(filename, blob, sub) { // 0.9.18: sub = folder of the project, so a new export replaces the file of the same name
    const FS = this.plugin('Filesystem'); if (!this.native() || !FS) return null;
    const dir = 'Ventilation Setup Tool' + (sub ? '/' + sub : '');
    const r = await FS.writeFile({ path: dir + '/' + filename, data: await this.blobB64(blob), directory: 'DOCUMENTS', recursive: true });
    return { uri: r.uri, where: 'Documents/' + dir };
  },
  /** Android app: system share sheet (mail, WhatsApp, Drive …) */
  async shareFile(filename, blob, title) {
    const Share = this.plugin('Share'), FS = this.plugin('Filesystem'); if (!this.native() || !Share || !FS) return null;
    const r = await FS.writeFile({ path: filename, data: await this.blobB64(blob), directory: 'CACHE' });
    await Share.share({ title: title || filename, files: [r.uri] });
    return true;
  },
  /** Android app: share a text (invitation code) */
  async shareText(text, title) {
    const Share = this.plugin('Share'); if (!this.native() || !Share) return null;
    await Share.share({ title: title || '', text, dialogTitle: title || '' });
    return true;
  },
  /** keep the screen on during measurements */
  async keepAwake(on) {
    const KA = this.plugin('KeepAwake'); if (!this.native() || !KA) return null;
    try { if (on) await KA.keepAwake(); else await KA.allowSleep(); } catch (e) { }
    return true;
  },
  /** files opened with the app (package, result, measuring sheet, backup) and the Android back button */
  init() {
    const App = this.plugin('App'); if (!this.native() || !App || !App.addListener) return;
    App.addListener('backButton', () => {
      if (history.state && history.state.inregelaar) history.back();
      else if (S.view !== 'home') { S.view = 'home'; S.pid = null; render(); }
      else if (App.exitApp) App.exitApp();
    });
    App.addListener('appUrlOpen', async (ev) => { try { await Platform.openUrl(ev && ev.url); } catch (e) { console.error(e); } });
  },
  /** content:// or file:// URL from an «Open with» intent → File → the normal import */
  async openUrl(url) {
    if (!url || /^https?:/i.test(url)) return;
    const FS = this.plugin('Filesystem'); if (!FS) return;
    const r = await FS.readFile({ path: url });
    const bin = Uint8Array.from(atob(r.data), c => c.charCodeAt(0));
    const name = decodeURIComponent(url.split('/').pop() || 'file').replace(/\?.*$/, '');
    const type = /\.json$/i.test(name) ? 'application/json' : /\.xlsx$/i.test(name) ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : '';
    await importFile({ files: [new File([bin], name, { type })], value: '' });
  },
};
