/* ---------- accounts on the server (Supabase, EU): sign-up / sign-in, organisation, invitations ----------
   The app talks to Supabase directly with the user's token (REST): the database policies decide what a user may do.
   The role and plan of the server session drive Access, so the whole app follows them. Projects stay on the device for now. */
const CLOUD = { url: 'https://trhzjawcwxojqewfhaiw.supabase.co', key: 'sb_publishable_UVL5oXOL7yu8s1FKDhMoxg_qcl1DoM_',
  captcha: '' }; // Cloudflare Turnstile site key (public). Empty: no robot check. Set it only together with «CAPTCHA» in Supabase Auth
/** public address of the web app (in invitations: the APK itself runs on https://localhost) */
const APP_URL = 'https://bestof-bv.github.io/inregelaar-ventilatie/';
/** the demo site (0.9.21): after sign-in the full version comes from the server (app-bundle: only with a valid plan) and is kept in the
 *  cache «vst-full»; scripts/boot.js starts it from there (the service worker serves full/<version>/…). Signed out or the plan ended: the demo again */
const FullApp = {
  LS: 'vst.full.v1', WANT: 'vst.want.full', CACHE: 'vst-full',
  running() { return !!window.VST_FULL; },
  want() { try { return localStorage.getItem(this.WANT) === '1'; } catch (e) { return false; } },
  setWant(on) { try { if (on) localStorage.setItem(this.WANT, '1'); else localStorage.removeItem(this.WANT); } catch (e) { } },
  info() { try { return JSON.parse(localStorage.getItem(this.LS) || 'null'); } catch (e) { return null; } },
  /** download the files of the full version into the cache; returns the version */
  async install() {
    if (!('caches' in window) || !navigator.serviceWorker) throw new CloudError('no_cache');
    const j = await Auth.call('/functions/v1/app-bundle', { body: {} });
    if (!j || !j.version || !Array.isArray(j.files) || !j.files.length) throw new CloudError('no_bundle');
    const c = await caches.open(this.CACHE); const base = new URL('full/' + j.version + '/', location.href).href;
    for (const f of j.files) {
      if (!/^[A-Za-z0-9_./-]+$/.test(f.path) || f.path.includes('..')) throw new CloudError('bad_bundle');
      const r = await fetch(f.url, { cache: 'no-store' }); if (!r.ok) throw new CloudError('download');
      const type = /\.css$/.test(f.path) ? 'text/css' : /\.woff$/.test(f.path) ? 'font/woff' : 'text/javascript';
      await c.put(base + f.path, new Response(await r.blob(), { headers: { 'content-type': type + (type.startsWith('text') ? '; charset=utf-8' : '') } }));
    }
    for (const k of await c.keys()) if (!k.url.startsWith(base)) await c.delete(k);
    localStorage.setItem(this.LS, JSON.stringify({ version: j.version, files: j.files.map(f => f.path), at: Date.now() }));
    await Promise.race([navigator.serviceWorker.ready, new Promise(r => setTimeout(r, 5000))]); this.setWant(false);
    return j.version;
  },
  async clear() { try { localStorage.removeItem(this.LS); } catch (e) { } try { await caches.delete(this.CACHE); } catch (e) { } },
  /** demo site, signed in: load the full version and restart into it */
  async go() {
    if (this.busy) return; this.busy = true;
    try { toast(__('Loading the full version…')); await this.install(); location.reload(); }
    catch (e) { this.busy = false; toast(e.code === 'no_plan' || e.status === 403 ? __('This account has no valid plan for the full version') : __('The full version could not be loaded: {e}', { e: e.code || e.message })); }
  },
  /** running the full version: a newer one on the server, or the plan ended → update or back to the demo */
  async check() {
    if (!this.running() || !navigator.onLine || !Auth.user()) return;
    try { const j = await Auth.call('/functions/v1/app-bundle', { body: {} }); const i = this.info(); if (j && i && j.version !== i.version) { await this.install(); toast(__('The full version was updated: it is used at the next start')); } }
    catch (e) { if (e.status === 403) { await this.clear(); location.reload(); } }
  },
};
const cloudUrl = () => String(Settings.v.cloudUrl || CLOUD.url).replace(/\/+$/, '');
/** the preview in the chat may not call other sites: sign-in works in the app (APK) and the PWA */
const cloudOn = () => STANDALONE || !!Settings.v.cloudUrl;
class CloudError extends Error { constructor(code, msg, status) { super(msg || code); this.code = code; this.status = status; } }

const Auth = {
  LS: 'inregelaar.auth.v1', t: null,
  load() { try { this.t = JSON.parse(localStorage.getItem(this.LS) || 'null'); } catch (e) { this.t = null; } return this; },
  save(t) { this.t = t; try { if (t) localStorage.setItem(this.LS, JSON.stringify(t)); else localStorage.removeItem(this.LS); } catch (e) { } if (!t && typeof Access !== 'undefined' && Access.s && Access.s.status === 'cloud') Access.clear(); },
  user() { return (this.t && this.t.user) || null; },
  async call(path, { method = 'POST', body, auth = true, prefer } = {}) {
    const h = { apikey: CLOUD.key, 'Content-Type': 'application/json' };
    if (auth) { const tok = await this.token(); if (tok) h.Authorization = 'Bearer ' + tok; }
    if (prefer) h.Prefer = prefer;
    let r;
    try { r = await fetch(cloudUrl() + path, { method, headers: h, body: body === undefined ? undefined : JSON.stringify(body) }); }
    catch (e) { throw new CloudError('offline'); }
    const txt = await r.text(); let j = null; try { j = txt ? JSON.parse(txt) : null; } catch (e) { }
    if (!r.ok) {
      const code = (j && (j.error_code || (j.code === 'P0001' ? j.message : j.code) || j.error)) || 'http_' + r.status;
      throw new CloudError(String(code), (j && (j.msg || j.message || j.error_description)) || '', r.status);
    }
    return j;
  },
  sessionFrom(j) {
    const u = j.user || {};
    return { access_token: j.access_token, refresh_token: j.refresh_token, expires_at: j.expires_at ? j.expires_at * 1000 : Date.now() + (j.expires_in || 3600) * 1000,
      user: { id: u.id, email: u.email || '', name: (u.user_metadata && u.user_metadata.name) || '' } };
  },
  /** access token, refreshed a minute before it ends; a refused refresh signs out */
  async token() {
    const t = this.t; if (!t) return null;
    if (Date.now() < t.expires_at - 60e3) return t.access_token;
    if (!this._refreshing) this._refreshing = this.refreshNow(t).finally(() => { this._refreshing = null; }); // 0.9.8: parallel calls share one refresh (the refresh token is single-use)
    return this._refreshing;
  },
  async refreshNow(t) {
    try { const j = await this.call('/auth/v1/token?grant_type=refresh_token', { body: { refresh_token: t.refresh_token }, auth: false }); this.save(this.sessionFrom(j)); return this.t.access_token; }
    catch (e) { if (e.code !== 'offline') this.save(null); throw e; }
  },
  /** {session: true} when the server signs in right away, {confirm: true} when the e-mail must be confirmed first (code from the e-mail).
   *  An address that already has an account gets no e-mail (the server does not tell): the code screen says to sign in then */
  async signUp(email, password, name) {
    const j = await this.call('/auth/v1/signup', { body: await Captcha.wrap({ email, password, data: { name } }), auth: false });
    if (j && j.access_token) { this.save(this.sessionFrom(j)); return { session: true }; }
    // an address that already has a confirmed account: the server answers with a user without identities and sends nothing
    if (j && Array.isArray(j.identities) && !j.identities.length) throw new CloudError('user_already_exists');
    return { confirm: true };
  },
  /** code from the e-mail: type 'signup' (confirm the address) or 'recovery' (reset the password) → signed in */
  async verify(email, code, type) {
    const j = await this.call('/auth/v1/verify', { body: { type, email, token: String(code || '').replace(/\s+/g, '') }, auth: false });
    if (!j || !j.access_token) throw new CloudError('otp_expired');
    this.save(this.sessionFrom(j));
  },
  async resend(email) { await this.call('/auth/v1/resend', { body: await Captcha.wrap({ type: 'signup', email }), auth: false }); },
  /** {weak: true} when the password no longer meets the rules of the server (sign-in still works) */
  async signIn(email, password) {
    const j = await this.call('/auth/v1/token?grant_type=password', { body: await Captcha.wrap({ email, password }), auth: false });
    this.save(this.sessionFrom(j)); return { weak: !!(j && j.weak_password) };
  },
  async recover(email) { await this.call('/auth/v1/recover', { body: await Captcha.wrap({ email }), auth: false }); },
  async setPassword(password) { await this.call('/auth/v1/user', { method: 'PUT', body: { password } }); },
  /** all = on every device (every refresh token of the account ends; an open session elsewhere ends within the hour) */
  async signOut(all) {
    if (all) { await this.call('/auth/v1/logout?scope=global', { body: {} }); this.save(null); return; }
    try { if (this.t) await this.call('/auth/v1/logout', { body: {} }); } catch (e) { } this.save(null);
  },
  rpc(fn, args = {}) { return this.call('/rest/v1/rpc/' + fn, { body: args }); },
};

/** a link from a Supabase e-mail (standard templates, before the code templates are active):
 *  …#access_token=…&refresh_token=…&type=signup|recovery → signed in; #error_description=… → message. Returns the type, 'error' or null */
async function authFromLink() {
  const h = new URLSearchParams(String(location.hash || '').replace(/^#/, ''));
  if (!h.get('access_token') && !h.get('error_description')) return null;
  try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { }
  if (h.get('error_description')) { acctState().err = h.get('error_code') === 'otp_expired' ? cloudMsg({ code: 'otp_expired' }) : h.get('error_description'); return 'error'; }
  const at = h.get('access_token'), rt = h.get('refresh_token'); if (!at || !rt) return 'error';
  let u = null;
  try { const r = await fetch(cloudUrl() + '/auth/v1/user', { headers: { apikey: CLOUD.key, Authorization: 'Bearer ' + at } }); if (r.ok) u = await r.json(); } catch (e) { }
  if (!u || !u.id) { acctState().err = cloudMsg({ code: 'otp_expired' }); return 'error'; }
  Auth.save(Auth.sessionFrom({ access_token: at, refresh_token: rt, expires_at: Number(h.get('expires_at')) || 0, expires_in: Number(h.get('expires_in')) || 3600, user: u }));
  return h.get('type') || 'link';
}

/** Cloudflare Turnstile before sign-up, sign-in, reset and «send the code again» — only with a site key (CLOUD.captcha).
 *  Invisible: a puzzle appears (bottom of the screen) only when Cloudflare is not sure. One token per request */
const Captcha = {
  w: null, p: null, done: null, fail: null,
  key() { return String(Settings.v.captchaKey || CLOUD.captcha || ''); },
  load() {
    if (window.turnstile) return Promise.resolve();
    if (!this.p) this.p = new Promise((res, rej) => {
      window.__tsReady = () => res();
      const sc = document.createElement('script'); sc.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=__tsReady'; sc.async = true;
      sc.onerror = () => { this.p = null; rej(new CloudError('captcha_load')); }; document.head.appendChild(sc);
    });
    return this.p;
  },
  async token() {
    const key = this.key(); if (!key) return '';
    await this.load();
    let host = document.getElementById('captcha'); if (!host) { host = document.createElement('div'); host.id = 'captcha'; document.body.appendChild(host); }
    return new Promise((res, rej) => {
      const end = () => { clearTimeout(tm); host.classList.remove('show'); this.done = this.fail = null; };
      const tm = setTimeout(() => { end(); rej(new CloudError('captcha_failed')); }, 120e3);
      this.done = (t) => { end(); res(t); }; this.fail = () => { end(); rej(new CloudError('captcha_failed')); };
      if (this.w === null) this.w = window.turnstile.render(host, { sitekey: key, execution: 'execute', appearance: 'interaction-only', language: (I18N.cur && I18N.cur.ui) || 'auto',
        callback: (t) => this.done && this.done(t), 'error-callback': () => this.fail && this.fail(), 'timeout-callback': () => this.fail && this.fail(),
        'before-interactive-callback': () => host.classList.add('show'), 'after-interactive-callback': () => host.classList.remove('show') });
      else window.turnstile.reset(this.w);
      window.turnstile.execute(this.w);
    });
  },
  async wrap(body) { const t = await this.token(); return t ? Object.assign({}, body, { gotrue_meta_security: { captcha_token: t } }) : body; },
};

const Cloud = {
  orgs: [], invites: [], members: [], sent: [], loaded: false,
  /** after sign-in and at start: organisations, invitations for me, session of the chosen organisation */
  async refresh() {
    if (!Auth.user()) { this.orgs = []; this.invites = []; this.members = []; this.sent = []; Access.clear(); return; }
    const [orgs, inv] = await Promise.all([Auth.rpc('my_orgs'), Auth.rpc('my_invites')]);
    this.orgs = orgs || []; this.invites = inv || []; this.loaded = true;
    const o = this.orgs.find(x => x.id === Settings.v.orgId) || this.orgs[0];
    if (!o) { this.members = []; this.sent = []; Access.clear(); loginFill({ status: 'cloud', user: Auth.user(), org: null }); return; }
    if (Settings.v.orgId !== o.id) { Settings.v.orgId = o.id; Settings.save(); }
    const s = await Auth.rpc('my_session', { o: o.id });
    Access.setSession({ user: Auth.user(), org: s.org, role: s.role, plan: s.plan, seats: s.seats, used: s.used, until: s.until || 0, status: 'cloud' });
    if (DEMO_ED && s.plan !== 'expired') FullApp.go(); // demo site: signed in with a valid plan → the full version (0.9.21)
    { const ch = loginFill(); if (ch.length && typeof toast === 'function') toast(__('Company and technician filled in from the sign-in — change them in the settings if needed')); }
    if (s.role === 'owner' || s.role === 'admin') {
      [this.members, this.sent] = await Promise.all([Auth.rpc('org_members', { o: o.id }),
        Auth.call(`/rest/v1/invites?org_id=eq.${encodeURIComponent(o.id)}&accepted_at=is.null&select=id,email,role,expires_at,code&order=created_at`, { method: 'GET' })]);
    } else { this.members = []; this.sent = []; }
  },
  orgId() { const s = Access.s; return s && s.status === 'cloud' && s.org ? s.org.id : null; },
  async createOrg(name) { const id = await Auth.rpc('create_org', { org_name: name }); Settings.v.orgId = id; Settings.save(); await this.refresh(); },
  async pick(id) { Settings.v.orgId = id; Settings.save(); await this.refresh(); },
  /** the invitation code comes from the administrator (WhatsApp, mail, by hand); a wrong code counts, after 5 the invitation closes */
  async accept(id, code) {
    const r = await Auth.rpc('accept_invite', { i: id, c: code });
    if (!r || r.error || !r.org_id) { const e = new CloudError((r && r.error) || 'invite_invalid'); e.left = r && r.left; if (e.code === 'invite_blocked') await this.refresh(); throw e; }
    Settings.v.orgId = r.org_id; Settings.save(); await this.refresh();
  },
  async invite(email, role) { await Auth.call('/rest/v1/invites', { body: { org_id: this.orgId(), email, role }, prefer: 'return=minimal' }); await this.refresh(); },
  async cancelInvite(id) { await Auth.call('/rest/v1/invites?id=eq.' + encodeURIComponent(id), { method: 'DELETE' }); await this.refresh(); },
  async removeMember(uid) { await Auth.call(`/rest/v1/members?org_id=eq.${encodeURIComponent(this.orgId())}&user_id=eq.${encodeURIComponent(uid)}`, { method: 'DELETE' }); await this.refresh(); },
  async signOut(all) { await Auth.signOut(all); await this.refresh(); if (FullApp.running()) { await FullApp.clear(); location.reload(); } }, // full version of the demo site: back to the demo
};
/** after a sign-in: the company data from the company style (else the name of the organisation), the technician from the account (name, else the e-mail before the @).
 *  A value changed by hand stays as long as the same person signs in on this device; returns the fields that changed */
function loginFill(sess) {
  const s = sess || Access.s; if (!s || s.status !== 'cloud' || !s.user || !s.user.id) return [];
  const v = Settings.v; const a = v.auto || {}; const other = a.uid !== s.user.id;
  const firm = (typeof activeStyle === 'function' && activeStyle() || {}).firm || {};
  const want = { company: String(firm.company || (s.org && s.org.name) || '').trim(), address: String(firm.address || '').trim(), footer: String(firm.footer || '').trim(),
    technician: String(s.user.name || '').trim() || String(s.user.email || '').split('@')[0].trim() };
  const ch = [];
  for (const [k, val] of Object.entries(want)) {
    if (!val) continue; const now = String(v[k] || '').trim();
    const free = !now || now === SETTINGS0[k] || now === String(a[k] || '').trim(); // empty, the example text, or what was filled in last time
    if ((other || free) && now !== val) { v[k] = val; ch.push(k); }
  }
  const auto = Object.assign({}, want, { uid: s.user.id, org: (s.org && s.org.id) || '' });
  if (ch.length || JSON.stringify(auto) !== JSON.stringify(v.auto || null)) { v.auto = auto; Settings.save(); }
  return ch;
}
/** the settings field was filled in from the sign-in (and not changed since) */
const loginFilled = (k) => { const a = Settings.v.auto; return !!(a && a.uid && a[k] && String(Settings.v[k] || '').trim() === a[k]); };
/** message for the user */
function cloudMsg(e) {
  const c = (e && e.code) || '';
  const M = {
    offline: __('No connection with the server — check the internet connection'),
    invalid_credentials: __('E-mail or password is not correct'),
    email_not_confirmed: __('Confirm your e-mail address first: enter the code from the e-mail, or send it again'),
    otp_expired: __('The code is not correct or has expired: check it, or send a new one'),
    otp_disabled: __('Codes are switched off on the server'),
    same_password: __('The new password is the same as the old one'),
    reauthentication_needed: __('For security, sign out and use «Forgot the password?» to set a new password'),
    captcha_failed: __('The robot check did not succeed — try again'),
    captcha_load: __('The robot check could not load — check the internet connection'),
    over_request_rate_limit: __('Too many attempts in a short time — wait a moment and try again'),
    invite_blocked: __('Too many wrong codes: the invitation is closed. Ask the administrator for a new one'),
    invite_code_missing: __('Enter the invitation code you received from the administrator'),
    member_move: __('Not allowed for your role or plan'),
    user_already_exists: __('There is already an account with this e-mail address: sign in'),
    weak_password: __('The password is too weak: at least 10 characters, with letters and digits'),
    validation_failed: __('Check the e-mail address and the password'),
    email_address_invalid: __('The e-mail address is not valid'),
    over_email_send_rate_limit: __('Too many e-mails in a short time — try again later'),
    email_address_not_authorized: __('The server may not send e-mail to this address yet (test setup): switch off «Confirm email» in Supabase or set up your own SMTP'),
    signup_disabled: __('New accounts are switched off on the server'),
    seat_limit: __('No free user place in the plan'),
    last_owner: __('The organisation needs at least one owner'),
    invite_invalid: __('The invitation is not valid any more'),
    invite_other_email: __('This invitation is for another e-mail address'),
    org_name_missing: __('Enter the name of the organisation'),
    not_signed_in: __('Sign in first'),
    PGRST202: __('The server is not set up yet: run the SQL file in Supabase (SQL Editor)'),
    '42P01': __('The server is not set up yet: run the SQL file in Supabase (SQL Editor)'),
    '42501': __('Not allowed for your role or plan'),
  };
  if (c === 'invite_code') return __('The invitation code is not correct ({n} attempts left)', { n: isFinite(e.left) ? e.left : '?' });
  return M[c] || (e && e.message && e.message !== c ? e.message : __('Server error ({c})', { c: c || '?' }));
}
/** invitation code as the administrator passes it on: XXXX-XXXX */
const invCodeFmt = (c) => { const x = String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); return x.length > 4 ? x.slice(0, 4) + '-' + x.slice(4) : x; };
/** the rule of the server for new passwords (Supabase Auth: at least 10 characters, letters and digits) */
const PASS_MIN = 10;
const passOK = (p) => String(p || '').length >= PASS_MIN && /[A-Za-z]/.test(p) && /\d/.test(p);
/** text for WhatsApp / mail: where to go, which address, the code */
function invShareText(x) {
  const org = (Access.s && Access.s.org && Access.s.org.name) || '';
  return [__('Invitation to {org} in Ventilation Setup Tool (role: {role}).', { org, role: (L.role || {})[x.role] || x.role }),
    '1. ' + __('Open {url}', { url: APP_URL }),
    '2. ' + __('Create an account with {email} and confirm it with the code from the e-mail.', { email: x.email }),
    '3. ' + __('Under «Invitations for you» enter the invitation code: {code}', { code: invCodeFmt(x.code) }),
    __('Valid until {date}.', { date: fmtDate(Date.parse(x.expires_at), false) })].join('\n');
}
