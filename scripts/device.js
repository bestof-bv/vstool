/* ---------- device key (0.11.0): at most 3 working devices per account, each known by its own key pair (like an SSH key) ----------
   The device makes an ECDSA P-256 key pair once and keeps the private key: in the Android app in the Android Keystore (plugin DeviceKey,
   the key cannot leave the chip), in a browser as a non-extractable WebCrypto key in IndexedDB. With a signature over a one-time
   challenge the server («device» function) gives the device a token for 7 days; every request carries it (header x-device-token).
   Over the limit (and once the server checks it) the app opens read-only until another device is disconnected under Account. */
const Device = {
  LS: 'inregelaar.device.v1', s: null, busy: null, limit: null,
  load() { try { this.s = JSON.parse(localStorage.getItem(this.LS) || 'null'); } catch (e) { this.s = null; } return this; },
  save(s) { this.s = s; try { if (s) localStorage.setItem(this.LS, JSON.stringify(s)); else localStorage.removeItem(this.LS); } catch (e) { } },
  mine() { const u = Auth.user(); const s = this.s; return s && u && s.uid === u.id ? s : null; },
  /** the token for the requests of the signed-in user, while it is valid */
  header() { const s = this.mine(); return s && s.token && s.exp * 1000 > Date.now() + 60e3 ? s.token : ''; },
  /** the server checks devices and this device has no place, or was unbound from this account: read-only */
  blocked() { const s = this.mine(); return !!(s && s.enforce && (s.state === 'limit' || s.state === 'unbound')); },
  native() { return Platform.native() && !!Platform.plugin('DeviceKey'); },
  /* -- the key pair -- */
  _db: null,
  db() {
    if (!this._db) this._db = new Promise((res) => { if (!('indexedDB' in window)) return res(null); let r; try { r = indexedDB.open('inregelaar-device', 1); } catch (e) { return res(null); }
      r.onupgradeneeded = () => r.result.createObjectStore('k'); r.onsuccess = () => res(r.result); r.onerror = () => res(null); r.onblocked = () => res(null); });
    return this._db;
  },
  async idb(op, v) {
    const d = await this.db(); if (!d) return null;
    return new Promise((res) => { try { const tx = d.transaction('k', op === 'get' ? 'readonly' : 'readwrite'); const st = tx.objectStore('k');
      const q = op === 'get' ? st.get('p256') : st.put(v, 'p256'); q.onsuccess = () => res(op === 'get' ? q.result || null : true); q.onerror = () => res(null); } catch (e) { res(null); } });
  },
  b64(buf) { let s = ''; const b = new Uint8Array(buf); for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]); return btoa(s); },
  /** {spki, kind, label, platform, sign(text) → base64} */
  async key() {
    if (this.native()) {
      const P = Platform.plugin('DeviceKey'); const k = await P.publicKey();
      return { spki: k.spki, kind: 'keystore', label: k.label || '', platform: k.platform || 'Android', cls: k.cls || this.cls(), hw: k.hw || '', sign: async (t) => (await P.sign({ data: t })).sig };
    }
    if (!(window.crypto && crypto.subtle)) throw new CloudError('device_key');
    let kp = await this.idb('get');
    // 0.12.2: ask the browser to keep this site's storage (Safari on iOS may otherwise clear it, and with it the key)
    try { if (navigator.storage && navigator.storage.persist && !this._persist) { this._persist = true; navigator.storage.persist().catch(() => {}); } } catch (e) { }
    if (!kp || !kp.privateKey || !kp.publicKey) {
      kp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign', 'verify']); // the private key: not extractable
      if (!(await this.idb('put', kp))) throw new CloudError('device_key');
    }
    const spki = this.b64(await crypto.subtle.exportKey('spki', kp.publicKey));
    return { spki, kind: 'webcrypto', label: this.label(), platform: this.platform(), cls: this.cls(), hw: '',
      sign: async (t) => this.b64(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, kp.privateKey, new TextEncoder().encode(t))) };
  },
  CLS: () => ({ computer: __('computer'), tablet: __('tablet'), phone: __('phone') }),
  classMsg(c) {
    const m = this.mine() || {};
    // the same tablet in the app and in the browser are two devices: say which one holds the place
    if (m.other === 'keystore' && !this.native()) return __('Your {kind} is used with the Ventilation Setup Tool app (Android): work in the app on that device, or disconnect it under Account › Devices', { kind: this.CLS()[c] || c || '' });
    if (m.other === 'webcrypto' && this.native()) return __('Your {kind} is used in the browser: work in this app and disconnect the browser under Account › Devices', { kind: this.CLS()[c] || c || '' });
    return __('There is already a {kind} on your account (one computer, one tablet and one phone per account): disconnect it under Account › Devices', { kind: this.CLS()[c] || c || '' });
  },
  /** 0.12.1: the kind of device — one computer / laptop, one tablet and one phone per account */
  cls() {
    const u = navigator.userAgent || ''; const touch = (navigator.maxTouchPoints || 0) > 1;
    if (/iPhone|iPod/.test(u)) return 'phone';
    if (/iPad/.test(u) || (/Macintosh/.test(u) && touch)) return 'tablet';
    if (/Android/.test(u)) return /Mobile/.test(u) ? 'phone' : 'tablet'; // Chrome on Android: «Mobile» only on phones
    if (/Mobi|Windows Phone/.test(u)) return 'phone';
    return 'computer';
  },
  platform() { const u = navigator.userAgent || ''; return /Android/.test(u) ? 'Android' : /iPhone|iPad|iPod/.test(u) ? 'iOS' : /Windows/.test(u) ? 'Windows' : /Mac OS X/.test(u) ? 'macOS' : /Linux/.test(u) ? 'Linux' : ''; },
  label() {
    const u = navigator.userAgent || ''; const b = /Edg\//.test(u) ? 'Edge' : /SamsungBrowser/.test(u) ? 'Samsung Internet' : /Firefox\//.test(u) ? 'Firefox' : /Chrome\//.test(u) ? 'Chrome' : /Safari\//.test(u) ? 'Safari' : __('Browser');
    const m = /Android [\d.]+; ([^;)]+?)(?: Build|\))/.exec(u); const model = m && !/^K$/.test(m[1]) ? m[1].trim() : '';
    return (model ? model + ' · ' : '') + b + (window.matchMedia && matchMedia('(display-mode: standalone)').matches ? ' (app)' : '');
  },
  /* -- the server -- */
  /** a valid token for the signed-in user: check in when there is none (once at a time); throws CloudError('device_limit') */
  async ensure(force) {
    const u = Auth.user(); if (!u || (typeof Demo !== 'undefined' && Demo.on())) return '';
    if (!force && this.header()) return this.header();
    const m = this.mine();
    if (!force && this.failAt && Date.now() - this.failAt < 60e3) return ''; // offline or an older server: not again for a minute
    if (!force && m && (m.state === 'limit' || m.state === 'unbound') && Date.now() - m.at < 5 * 60e3) return ''; // no place / unbound: try again after 5 minutes
    if (!this.busy) this.busy = this.checkin(u).then((t) => { this.failAt = 0; return t; }, (e) => { this.failAt = e.code === 'device_limit' || e.code === 'device_class' || e.code === 'unbound' ? 0 : Date.now(); throw e; }).finally(() => { this.busy = null; });
    return this.busy;
  },
  async checkin(u) {
    const k = await this.key();
    const c = await Auth.call('/functions/v1/device', { body: { action: 'challenge' } });
    const sig = await k.sign(`vst-device:${c.nonce}:${u.id}`);
    let r;
    try { r = await Auth.call('/functions/v1/device', { body: { action: 'checkin', nonce: c.nonce, pubkey: k.spki, sig, kind: k.kind, label: k.label, platform: k.platform, cls: k.cls, hw: k.hw } }); }
    catch (e) {
      if (e.code === 'unbound') { // 0.11.1: unbound from this account less than 60 days ago
        this.save({ uid: u.id, state: 'unbound', until: e.data && e.data.until, enforce: !!(e.data && e.data.enforce), at: Date.now() });
        const er = new CloudError('unbound'); er.data = e.data; throw er;
      }
      if (e.code === 'limit' || e.code === 'class') { // 0.12.1: 'class' — already a device of this kind on the account
        this.save({ uid: u.id, state: 'limit', why: e.code, cls: e.data && e.data.class, other: e.data && e.data.devices && e.data.devices[0] ? e.data.devices[0].kind || '' : '', enforce: !!(e.data && e.data.enforce), at: Date.now() });
        this.limit = e.data || null; const er = new CloudError(e.code === 'class' ? 'device_class' : 'device_limit'); er.data = e.data; throw er;
      }
      throw e;
    }
    if (!r || typeof r.token !== 'string' || !r.token) throw new CloudError('device_server'); // an answer without a token: back off, no loop
    this.limit = null;
    this.save({ uid: u.id, state: 'ok', id: r.id, token: r.token, exp: r.exp, enforce: !!r.enforce, kind: k.kind, cls: k.cls, trialUsed: !!r.trial_used, at: Date.now() });
    if (r.replaced && typeof toast === 'function') toast(__('This device took the place of your previous {kind}', { kind: this.CLS()[k.cls] || '' }));
    if (r.trial_cut && typeof toast === 'function') toast(__('This device was already used for a free trial: a subscription is needed'));
    return r.token;
  },
  /** the devices of the account (or of a member, for an owner / administrator) */
  list(uid) { return Auth.rpc('device_list', uid ? { p_user: uid } : {}); },
  /** disconnect a device; when this device waited for a place it checks in right away */
  async revoke(id) {
    await Auth.rpc('device_revoke', { p_id: id });
    if (this.s && this.s.id === id) this.save(null);
    if (this.mine() && this.mine().state === 'limit') { try { await this.ensure(true); } catch (e) { if (e.code !== 'device_limit' && e.code !== 'device_class' && e.code !== 'unbound') throw e; } }
  },
  /** Business: an owner / administrator lets a member's unbound device come back to that account */
  allow(id) { return Auth.rpc('device_allow', { p_id: id }); },
};
