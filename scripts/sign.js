/* ---------- signatures of several people (0.14.0) ----------
   p.report.signers: the technician who checks and starts the installation, one or more inspectors, the installer who hands over
   (a representative of the installation firm or its fitters) and the client. Each one signs here on the device, or at a distance:
   the server mails a link, the signer reads the report (the PDF as it was sent), confirms with a code from the e-mail and signs
   (function «sign», migration 0023). The report prints all signatures and a signing protocol (how, when, which document).
   p.report.signature / signName keep mirroring the first technician for older versions of the app (team sync).
   0.15.0 (migration 0026): signing by e-mail only for a project in the cloud of the organisation (shared), within the limits of
   its plan. The report is frozen on the server as a version (p.report.signRound {id, n, hash, at, ck}); every signer of that
   version signs the same file, and after each signature the server adds a signatures page — the link and «Signed report» give
   that signed version. A changed report needs «New version for signing»: the signatures of the old version go to s.prev. */
const SIGN_ROLES = ['tech', 'inspector', 'installer', 'client', 'other'];
const signRoleUI = (r) => ({ tech: __('Technician (check and start-up)'), inspector: __('Inspector'), installer: __('Installer (hand-over)'), client: __('Client'), other: __('Other signer') }[r] || r);
const signRoleR = (r) => ({ tech: _r('Inregeltechnicus (controle en opstart)'), inspector: _r('Controleur'), installer: _r('Installateur (oplevering)'), client: _r('Opdrachtgever / klant'), other: _r('Ondertekenaar') }[r] || r);
const signStmtR = (s) => s === 'kennisname' ? _r('voor kennisname') : _r('voor akkoord');

/** a new signer of this role; the technician is filled from the project */
function signerNew(p, role) {
  const s = { id: uid(), role, name: '', company: '', email: '', phone: '', statement: 'akkoord', method: 'here', sig: '', at: '', dev: '', req: null };
  if (role === 'tech') Object.assign(s, { name: p.info.technician || Settings.v.technician || '', company: p.info.company || Settings.v.company || '' });
  if (role === 'client') s.company = p.info.client || '';
  if (role === 'installer') s.company = p.info.installer || '';
  return s;
}
/** the signers of a project (an older project: its one technician's signature becomes the first signer) */
function signers(p) {
  const r = p.report;
  if (!Array.isArray(r.signers)) {
    const t = signerNew(p, 'tech'); if (r.signName) t.name = r.signName;
    if (r.signature) Object.assign(t, { sig: r.signature, at: r.generatedAt || '' });
    r.signers = [t];
  }
  r.signers = r.signers.filter(s => s && SIGN_ROLES.includes(s.role));
  return r.signers;
}
/** keep the old fields in step with the first technician */
function signSync(p) {
  const t = signers(p).find(s => s.role === 'tech');
  p.report.signName = t ? t.name : ''; p.report.signature = t ? t.sig : '';
}
const signDone = (s) => !!s.sig;
/** 0.14.2: signed at a distance (link + code, checked by the server): locked — not cleared, signed again, edited or removed */
const signLocked = (s) => !!(s.sig && s.req && s.req.status === 'signed');
/** 0.15.0: a light fingerprint of the report content, without the signatures (to see that the report changed after it was frozen) */
function signCk(p) {
  const skip = new Set(['signers', 'signFinal', 'signRound', 'signature', 'signName', 'generatedAt', 'cloud', 'updatedAt', 'pkg', 'rev', 'revAuto']);
  let h = 5381; const js = JSON.stringify(p, (k, v) => skip.has(k) ? undefined : typeof v === 'string' && v.length > 600 ? v.length + ':' + v.slice(0, 40) + v.slice(-40) : v) || '';
  for (let i = 0; i < js.length; i++) h = ((h << 5) + h + js.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36) + js.length.toString(36);
}
const signCkMemo = { at: '', id: '', v: '' };
/** 0.15.4: the next report version: 3 → 4, A → B, 1.2 → 1.3; empty (= the first version) → 2 */
function revNext(v) { v = String(v || '').trim(); if (!v) return '2'; const m = /^(.*?)(\d+)$/.exec(v); if (m) return m[1] + (+m[2] + 1);
  if (/^[A-Ya-y]$/.test(v)) return String.fromCharCode(v.charCodeAt(0) + 1); return v + '.1'; }
/** 0.15.4: «Versie rapport» goes up by itself at the first change of the report after a signature. Every new signature (here, by link,
 *  or cleared for a new version) takes the report as it is then as the base; true when the version was raised */
function revCheck(p) {
  if (!p || !p.report || !p.info) return false;
  const sig = signers(p).filter(s => s.sig).map(s => s.id + '@' + (s.at || '')).join('|');
  const R = p.report.revAuto || (p.report.revAuto = {}); const ck = signCk(p);
  if (sig !== (R.sig || '')) { Object.assign(R, { sig, base: ck, bumped: false }); return false; }
  if (!sig || R.bumped || R.base === ck) return false;
  R.from = p.info.rev || ''; p.info.rev = revNext(p.info.rev); R.bumped = true; R.at = new Date().toISOString(); return true;
}
const signCkOf = (p) => { if (signCkMemo.id !== p.id || signCkMemo.at !== (p.updatedAt || '')) Object.assign(signCkMemo, { id: p.id, at: p.updatedAt || '', v: signCk(p) }); return signCkMemo.v; };
/** the steps of a request with their times: sent → opened → code → signed (or declined) */
function signSteps(s) {
  const q = s.req; if (!q) return '';
  const ev = Array.isArray(q.events) ? q.events : []; const at = (k) => (ev.filter(e => e.ev === k).pop() || {}).at;
  const t = (iso) => iso ? new Date(iso).toLocaleString(undefined, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';
  const steps = [['sent', __('sent'), q.sentAt || at('sent') || at('resent')], ['opened', __('link opened'), q.openedAt || at('opened')], ['code', __('code asked'), at('code')],
    q.status === 'declined' ? ['declined', __('declined'), at('declined')] : ['signed', __('signed'), q.signedAt || at('signed')]];
  return `<ol class="sg-steps">${steps.map(([k, l, w]) => `<li class="${w ? 'done' : ''}${k === 'declined' ? ' nok' : ''}"><span>${esc(l)}</span>${w ? `<time>${esc(t(w))}</time>` : ''}</li>`).join('')}</ol>`;
}
/** the state of a signer for the list in the app */
function signState(s) {
  if (s.sig) return { k: 'ok', t: !(s.req && s.req.status === 'signed') ? __('signed here · {d}', { d: fmtDate(s.at) })
    : s.req.method === 'account' ? __('signed with account + second factor · {d}', { d: fmtDate(s.at) }) : s.req.method === 'sms' ? __('signed by e-mail link + SMS code · {d}', { d: fmtDate(s.at) }) : __('signed by e-mail link · {d}', { d: fmtDate(s.at) }) };
  const q = s.req; if (!q) return { k: '', t: __('not signed') };
  if (q.status === 'declined') return { k: 'nok', t: __('declined: {r}', { r: q.declineReason || '-' }) };
  if (q.status === 'revoked') return { k: '', t: __('link withdrawn') };
  if (q.expired) return { k: 'nok', t: __('link expired') };
  if (q.status === 'opened') return { k: 'warn', t: __('opened · {d}', { d: fmtDate(q.openedAt) }) };
  return { k: 'warn', t: __('sent · {d}', { d: fmtDate(q.sentAt) }) };
}

/* ---------- the server ---------- */
const SignCloud = {
  /** remote signing needs a signed-in, writable organisation in the cloud */
  ok() { if (Demo.on()) return false; const o = Access.cur(); return o.status === 'cloud' && o.state === 'ok' && !!(o.org && /^[0-9a-f-]{36}$/.test(o.org.id)); },
  org() { return Access.cur().org.id; },
  /** 0.15.0: the project is in the cloud of this organisation (shared): only then can it be signed by e-mail */
  online(p) { return this.ok() && typeof SYNC !== 'undefined' && SYNC.shared(p) && (!p.cloud.org || p.cloud.org === this.org()); },
  quota: null,
  /** the open version for signing: frozen now when there is none */
  async round(p, step, fresh) {
    const r = p.report.signRound;
    if (r && r.id && r.status !== 'superseded' && !fresh) return r;
    // 0.15.1: the frozen version carries only the signatures made on this device; a signature by link belongs to the version it
    // was given on and comes back on the signatures page of the server
    step(__('Making the report…'));
    const q = Object.assign({}, p, { report: Object.assign({}, p.report, { signers: signers(p).map(s => s.req && s.req.status === 'signed' ? Object.assign({}, s, { sig: '', at: '' }) : s) }) });
    signSync(q); const blob = await buildPdf(q);
    step(__('Uploading the report ({mb} MB)…', { mb: nl(blob.size / 1048576, 1) }));
    const path = `${this.org()}/u-${crypto.randomUUID ? crypto.randomUUID() : uid() + '-' + uid()}.pdf`;
    await Auth.upload('signdocs', path, blob, 'application/pdf');
    step(__('Freezing the version for signing…'));
    const j = await this.call({ action: 'round', projectId: p.id, docPath: path, boxes: (blob.sigBoxes || []).slice(0, 60) });
    p.report.signRound = { id: j.round.id, n: j.round.n, hash: j.round.docHash, at: j.round.createdAt || new Date().toISOString(), ck: signCkOf(p), status: 'open', signedN: 0 };
    touch(p); return p.report.signRound;
  },
  /** 0.15.3: may «PDF» of the report give the signed version of the server? Only for the whole report, unchanged since it was frozen,
      when every signature on it is in that version (given by link in it, or on the device before it was frozen) */
  serverPdfOk(p) {
    const rd = p.report.signRound; if (!this.online(p) || !rd || rd.status === 'superseded' || !rd.signedN) return false;
    if (rd.ck && rd.ck !== signCkOf(p)) return false;
    return signers(p).every(s => !s.sig || (s.req && s.req.status === 'signed' && s.req.round === rd.id) || (s.at && s.at <= rd.at));
  },
  /** the signed version of the server (the frozen report + signatures page) */
  async signedPdf(p) {
    const r = p.report.signRound; if (!r) return null;
    const j = await this.call({ action: 'doc', roundId: r.id, name: p.info.nr || p.info.name || 'rapport' });
    const res = await fetch(j.url); if (!res.ok) throw new CloudError('offline'); return { blob: await res.blob(), n: j.round.n };
  },
  // 0.15.1: a tester (beta channel) runs the beta version even on the main site: his links go to the beta site, where the signing page matches
  site() { if (typeof Beta !== 'undefined' && Beta.on && Beta.on()) return 'https://beta.vstool.hvac-service.be'; const o = location.origin; return /^https:\/\/(beta\.)?vstool\.hvac-service\.be$/.test(o) ? o : 'https://vstool.hvac-service.be'; },
  call(body) { return Auth.call('/functions/v1/sign', { body: Object.assign({ org: this.org() }, body) }); },
  /** 0.14.1: the PDF of the report as it is now, uploaded once as a file (bucket signdocs) and reused for the next signers
      while the project does not change; a report with photos and plans no longer goes as base64 inside one request */
  doc: null,
  keyOf(p) { return p.id + '|' + (p.updatedAt || '') + '|' + (p.report.lang || 'nl') + '|' + this.org(); },
  /** sending only records the request in the project: the PDF stays the same for the next signer */
  keep(p) { if (this.doc) this.doc.key = this.keyOf(p); },
  async upload(p, step) {
    const key = this.keyOf(p);
    if (this.doc && this.doc.key === key) return this.doc.path;
    step(__('Making the report…'));
    const blob = await buildPdf(p);
    step(__('Uploading the report ({mb} MB)…', { mb: nl(blob.size / 1048576, 1) }));
    const path = `${this.org()}/u-${crypto.randomUUID ? crypto.randomUUID() : uid() + '-' + uid()}.pdf`;
    await Auth.upload('signdocs', path, blob, 'application/pdf');
    this.doc = { key, path }; return path;
  },
  /** send the report (PDF of now) to one signer */
  async send(p, s, step = () => { }) {
    if (!this.online(p)) throw new CloudError('not_online');
    const rd = await this.round(p, step);
    step(__('Sending the e-mail…'));
    const me = Access.cur();
    const j = await this.call({ action: 'create', projectId: p.id, projectTitle: [p.info.nr, p.info.name].filter(Boolean).join(' — ') || p.id, site: this.site(), lang: p.report.lang || 'nl',
      requester: { name: (me.user && me.user.name) || p.info.technician || '', company: p.info.company || (me.org && me.org.name) || '' },
      signer: { id: s.id, role: s.role, name: s.name, company: s.company, email: s.email, phone: s.phone || '', statement: s.statement }, roundId: rd.id });
    s.req = { id: j.id, status: 'sent', sentAt: new Date().toISOString(), docHash: j.docHash, expiresAt: j.expiresAt, expired: false, round: rd.id, n: rd.n }; s.method = 'mail';
  },
  /** the state of all requests of the project; a signature that came in is taken over */
  async refresh(p) {
    const j = await this.call({ action: 'list', projectId: p.id }); let n = 0; const ev = [];
    this.quota = j.quota || null;
    const rc = p.report.signRound; const rd = rc && (j.rounds || []).find(x => x.id === rc.id);
    if (rd && (rd.status !== rc.status || rd.signed_n !== rc.signedN)) { Object.assign(rc, { status: rd.status, signedN: rd.signed_n }); this.changed = true; }
    const nOf = (id) => ((j.rounds || []).find(x => x.id === id) || {}).n;
    for (const r of j.requests || []) {
      const s = signers(p).find(x => x.id === r.signer_id); if (!s) continue;
      if (s.req && s.req.id !== r.id && r.status === 'revoked') continue; // an older, replaced request
      if ((!s.req || s.req.id !== r.id) && rc && r.round_id !== rc.id) continue; // a request of an older version
      const req = { events: (r.audit || []).map(e => ({ at: e.at, ev: e.ev })), signedHash: r.signed_hash || '', id: r.id, status: r.status, sentAt: r.last_sent_at, openedAt: r.opened_at, signedAt: r.signed_at, docHash: r.doc_hash, expiresAt: r.expires_at, expired: r.expired, declineReason: r.decline_reason || '',
        ip: r.ip || '', ua: r.user_agent || '', email: r.signer_email, phone: r.signer_phone || '', method: r.method || '', signedName: r.signed_name || '', round: r.round_id || '', n: r.round_id ? nOf(r.round_id) : undefined };
      const was = s.req && s.req.id === r.id ? s.req.status : '';
      if (r.status === 'signed' && r.sig_png && s.sig !== r.sig_png) { s.sig = r.sig_png; s.at = r.signed_at; s.name = r.signed_name || s.name; s.dev = ''; n++; ev.push(__('{n} signed', { n: s.name })); }
      else if (r.status === 'opened' && was === 'sent') ev.push(__('{n} opened the link', { n: s.name }));
      else if (r.status === 'declined' && was !== 'declined') ev.push(__('{n} declined to sign', { n: s.name }));
      if (!s.req || JSON.stringify(s.req) !== JSON.stringify(req)) { s.req = req; this.changed = true; }
    }
    if (this.changed) { this.changed = false; signSync(p); touch(p); }
    this.events = ev; return n;
  },
  /** 0.14.2: the report with all signatures to every signer with an e-mail address (a link of 90 days) */
  async final(p, step = () => { }) {
    const rec = signers(p).filter(s => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s.email || '') || (s.req && s.req.email)).map(s => ({ email: s.email || s.req.email, name: s.name }));
    if (!rec.length) throw new CloudError('email');
    // the signed version of the server when it holds every signature (signed by link in this version, or on the device before it
    // was frozen); otherwise the report as it stands now on the device
    const rd = p.report.signRound; const inRound = (s) => !s.sig || (s.req && s.req.status === 'signed' && s.req.round === rd.id) || (s.at && s.at <= rd.at);
    const useRound = rd && rd.status !== 'superseded' && rd.signedN > 0 && signers(p).every(inRound);
    const docPath = useRound ? '' : await this.upload(p, step); step(__('Sending the e-mail…'));
    const me = Access.cur();
    const j = await this.call({ action: 'final', projectId: p.id, projectTitle: [p.info.nr, p.info.name].filter(Boolean).join(' — ') || p.id, lang: p.report.lang || 'nl', ...(useRound ? { roundId: rd.id } : { docPath }), recipients: rec,
      requester: { name: (me.user && me.user.name) || p.info.technician || '', company: p.info.company || (me.org && me.org.name) || '' } });
    p.report.signFinal = { at: new Date().toISOString(), n: j.sent, to: rec.map(x => x.email) }; touch(p); this.keep(p);
    if (j.failed && j.failed.length) throw new CloudError('mail', j.failed.join(', '));
    return j.sent;
  },
  async resend(p, s) { await this.call({ action: 'resend', id: s.req.id, site: this.site() }); s.req.status = 'sent'; s.req.sentAt = new Date().toISOString(); s.req.expired = false; },
  async revoke(p, s) { await this.call({ action: 'revoke', id: s.req.id }); s.req.status = 'revoked'; },
};
const signErr = (e) => {
  const c = e && (e.code || e.error || (e.body && e.body.error)) || String(e && e.message || '');
  if (c === 'auth' || (e && e.status === 401)) return __('Your session has ended: sign in again under Account.');
  if (/sms_not_configured/.test(c)) return __('Codes by SMS are not switched on on the server yet (an SMS service is needed). Leave the mobile number empty to send the code by e-mail.');
  if (/sms_limit/.test(c)) return __('The SMS codes of this month are used up. Leave the mobile number empty to send the code by e-mail.');
  if (/^phone$/.test(c)) return __('The mobile number is not valid (for example 0470 12 34 56 or +32 470 12 34 56).');
  if (/not_online/.test(c)) return __('Signing by e-mail works for a project in the cloud of the organisation: share the project first («Share in the organisation»).');
  if (/not_in_plan/.test(c)) return __('Signing by e-mail is not part of the plan of your organisation.');
  if (/limit_month/.test(c)) return __('The limit of projects signed by e-mail this month is reached ({u}/{l}).', { u: (e.data && e.data.quota && e.data.quota.month.used) ?? '?', l: (e.data && e.data.quota && e.data.quota.month.limit) ?? '?' });
  if (/limit_year/.test(c)) return __('The limit of projects signed by e-mail this year is reached ({u}/{l}).', { u: (e.data && e.data.quota && e.data.quota.year.used) ?? '?', l: (e.data && e.data.quota && e.data.quota.year.limit) ?? '?' });
  if (/superseded/.test(c)) return __('This version was replaced by a newer one: tap «Check status now».');
  if (/mail_not_configured/.test(c)) return __('Sending by e-mail is not switched on on the server yet (an e-mail service is needed).');
  if (/forbidden/.test(c)) return __('Your role in the organisation cannot send signature requests.');
  if (/too_many/.test(c)) return __('Too many requests: try again later.');
  if (/email/.test(c)) return __('The e-mail address is not valid.');
  if (/offline/.test(c)) return __('The report did not reach the server (connection broken off). Check the connection and try again.');
  if (/^mail$/.test(c)) return __('The e-mail could not be sent (mail server). The report was kept; try again later.');
  return typeof cloudMsg === 'function' ? cloudMsg(e) : String(c);
};

/* ---------- 0.14.2: the state follows by itself while links are out (every 30 s, and when the app comes back) ---------- */
const SignPoll = {
  t: 0, pid: '', busy: false,
  pending(p) { return signers(p).some(s => s.req && ['sent', 'opened'].includes(s.req.status) && !s.req.expired); },
  ensure(p) {
    if (!SignCloud.ok() || !this.pending(p)) { this.stop(); return; }
    if (this.t && this.pid === p.id) return;
    this.stop(); this.pid = p.id; this.t = setInterval(() => this.tick(), 30000);
  },
  stop() { if (this.t) clearInterval(this.t); this.t = 0; this.pid = ''; },
  async tick() {
    const p = cur(); if (!p || p.id !== this.pid || !document.getElementById('signCard')) { this.stop(); return; }
    if (this.busy || SG.busy || document.hidden) return; this.busy = true;
    try { await SignCloud.refresh(p); for (const e of SignCloud.events || []) toast(e); if ((SignCloud.events || []).length) renderKeepAll(); } catch (e) { /* the next tick tries again */ }
    this.busy = false; if (!this.pending(p)) this.stop();
  },
};
document.addEventListener('visibilitychange', () => { if (!document.hidden && SignPoll.t) SignPoll.tick(); });

/* ---------- the card on the Report page ---------- */
const SG = { open: '', busy: '', err: '', info: '', step: '', confirm: '' };
function signCardHTML(p) {
  const list = signers(p); const cloudOrg = SignCloud.ok(); const remote = SignCloud.online(p); const ro = !Access.can('report.edit');
  const rd = p.report.signRound && p.report.signRound.status !== 'superseded' ? p.report.signRound : null; const changed = rd && rd.ck && rd.ck !== signCkOf(p);
  const q = SignCloud.quota; const qTxt = [q && q.month && q.month.limit != null ? __h('{u} of {l} projects signed by e-mail this month', { u: q.month.used, l: q.month.limit }) : '',
    q && q.sms && q.sms.limit ? __h('SMS codes: {u} of {l} this month', { u: q.sms.used, l: q.sms.limit }) : ''].filter(Boolean).join(' · ');
  const verBox = remote && rd ? `<div class="sg-ver${changed ? ' warn' : ''}"><div><b>${__h('Version for signing v{n}', { n: rd.n })}</b>
      <span class="small muted">${__h('frozen on the server {d}', { d: fmtDate(rd.at) })} · SHA-256 ${esc((rd.hash || '').slice(0, 12))}…${rd.signedN ? ' · ' + __h('{n} signature(s) added', { n: rd.signedN }) : ''}</span>
      ${changed ? `<span class="small">${__h('The report changed after this version was frozen. The signers sign v{n}; make a new version to have the changes signed.', { n: rd.n })}</span>` : ''}</div>
      ${ro ? '' : SG.confirm === 'newVer' ? `<div class="row" style="flex-wrap:wrap"><span class="small">${__h('Open links of v{n} are withdrawn and every signature is asked again for the new version. Signatures of v{n} stay on v{n}.', { n: rd.n })}</span>
        <button type="button" class="btn sm primary" data-act="sgNewVer"${SG.busy ? ' disabled' : ''}>${SG.busy === 'newver' ? esc(SG.step || __('Sending…')) : __h('Make version v{n}', { n: rd.n + 1 })}</button><button type="button" class="btn sm ghost" data-act="sgNewVerNo">${__h('Cancel')}</button></div>`
        : `<button type="button" class="btn sm${changed ? ' primary' : ' ghost'}" data-act="sgNewVerAsk"${SG.busy ? ' disabled' : ''}>${__h('New version for signing')}</button>`}</div>` : '';
  setTimeout(() => SignPoll.ensure(p), 0);
  const fin = p.report.signFinal; const nRec = list.filter(s => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s.email || '')).length;
  const stmtSel = (s) => `<select data-sgf="statement" data-sg="${s.id}"${ro || signLocked(s) ? ' disabled' : ''}><option value="akkoord"${s.statement !== 'kennisname' ? ' selected' : ''}>${__h('for agreement')}</option><option value="kennisname"${s.statement === 'kennisname' ? ' selected' : ''}>${__h('for information only')}</option></select>`;
  const row = (s) => {
    const st = signState(s); const op = SG.open === s.id; const q = s.req; const live = q && ['sent', 'opened'].includes(q.status) && !q.expired;
    return `<div class="sg-row${op ? ' open' : ''}">
      <div class="sg-hd">${s.sig ? `<img class="sg-img" src="${esc(s.sig)}" alt="">` : `<span class="sg-img sg-none">${ICON.pen || '✎'}</span>`}
        <div class="sg-who"><b>${esc(s.name || '—')}</b><span class="small muted">${esc(signRoleUI(s.role))}${s.company ? ' · ' + esc(s.company) : ''}</span>
          <span class="small sg-st${st.k ? ' ' + st.k : ''}">${signLocked(s) ? '✓ ' + __h('verified by the server') + ' · ' : ''}${esc(st.t)}</span></div>
        <button type="button" class="btn sm ghost" data-act="sgOpen" data-v="${s.id}" aria-expanded="${op}">${op ? __h('Close') : __h('Edit')}</button></div>
      ${s.req && !op ? `<div class="sg-tl">${signSteps(s)}</div>` : ''}
      ${op ? `<div class="sg-ed">${s.req ? signSteps(s) : ''}
        ${signLocked(s) ? `<p class="small muted" style="margin:0">${__h('This signature was verified by the server (link by e-mail + code) and is locked: it cannot be cleared, signed again or removed. For a changed report, make a new version for signing.')}</p>` : ''}
        <div class="grid2">
          <label class="field">${lbl(__('Name'), 'Naam')}<input type="text" data-sgf="name" data-sg="${s.id}" value="${esc(s.name)}"${ro || signLocked(s) ? ' disabled' : ''}></label>
          <label class="field">${lbl(__('Company'), 'Firma')}<input type="text" data-sgf="company" data-sg="${s.id}" value="${esc(s.company)}"${ro || signLocked(s) ? ' disabled' : ''}></label>
          ${s.role !== 'tech' ? `<label class="field">${lbl(__('Signs'), 'Ondertekent')}${stmtSel(s)}</label>` : ''}
          <label class="field">${lbl(__('E-mail (for signing at a distance)'), 'E-mail')}<input type="email" inputmode="email" autocomplete="email" data-sgf="email" data-sg="${s.id}" value="${esc(s.email)}"${ro || signLocked(s) ? ' disabled' : ''}></label>
          ${s.role !== 'tech' ? `<label class="field">${lbl(__('Mobile (code by SMS, optional)'), 'Gsm')}<input type="tel" inputmode="tel" autocomplete="tel" data-sgf="phone" data-sg="${s.id}" value="${esc(s.phone || '')}" placeholder="04xx xx xx xx"${ro || signLocked(s) ? ' disabled' : ''}></label>` : ''}
        </div>
        ${SG.err && SG.busy === '' && SG.open === s.id ? `<div class="banner" style="background:var(--bad-soft);border-color:transparent">${esc(SG.err)}</div>` : ''}
        ${SG.info && SG.open === s.id ? `<div class="banner info">${esc(SG.info)}</div>` : ''}
        ${q && q.docHash ? `<p class="small muted" style="margin:0">${__h('Document sent: SHA-256 {h}', { h: q.docHash.slice(0, 16) + '…' })}${q.expiresAt ? ' · ' + __h('link valid until {d}', { d: fmtDate(q.expiresAt) }) : ''}</p>` : ''}
        <div class="row" style="flex-wrap:wrap">
          ${signLocked(s) ? `<button type="button" class="btn sm primary" data-act="sgDoc" data-v="${s.id}"${SG.busy ? ' disabled' : ''}>${__h('Signed report (PDF)')}</button>`
            : `<button type="button" class="btn sm primary" data-act="sgHere" data-v="${s.id}"${ro ? ' disabled' : ''}>${s.sig ? __h('Sign again here') : __h('Sign here')}</button>`}
          ${cloudOrg && !signLocked(s) ? (live ? `<button type="button" class="btn sm" data-act="sgResend" data-v="${s.id}"${SG.busy ? ' disabled' : ''}>${__h('Send a new link')}</button><button type="button" class="btn sm ghost" data-act="sgRevoke" data-v="${s.id}"${SG.busy ? ' disabled' : ''}>${__h('Withdraw the link')}</button>`
            : `<button type="button" class="btn sm" data-act="sgMail" data-v="${s.id}"${SG.busy || ro || !remote ? ' disabled' : ''}>${SG.busy === s.id ? esc(SG.step || __('Sending…')) : __h('Send for signature by e-mail')}</button>`) : ''}
          ${s.sig && !signLocked(s) ? `<button type="button" class="btn sm ghost" data-act="sgClear" data-v="${s.id}"${ro ? ' disabled' : ''}>${__h('Clear the signature')}</button>` : ''}
          <span class="spacer"></span>
          ${list.length > 1 && !signLocked(s) ? `<button type="button" class="btn sm ghost danger" data-act="sgDel" data-v="${s.id}"${ro ? ' disabled' : ''}>${__h('Remove')}</button>` : ''}
        </div>
        ${!cloudOrg ? `<p class="small muted" style="margin:0">${__h('Signing at a distance (link by e-mail) works with a cloud account of the organisation.')}</p>`
          : !remote ? `<p class="small muted" style="margin:0">${__h('Signing by e-mail works for a project in the cloud of the organisation: share the project first («Share in the organisation»).')}</p>` : ''}
        ${s.prev && s.prev.length ? `<p class="small muted" style="margin:0">${s.prev.map(x => __h('signed v{n} on {d}', { n: x.n || '?', d: fmtDate(x.at) })).join(' · ')}</p>` : ''}
      </div>` : ''}</div>`;
  };
  return `<section class="card" id="signCard"><div class="hd"><h2>${__h('Signatures')}</h2>
      ${remote && list.some(s => s.req) ? `<button type="button" class="btn sm" data-act="sgRefresh"${SG.busy ? ' disabled' : ''}>${SG.busy === 'refresh' ? __h('Updating…') : __h('Check status now')}</button>` : ''}</div>
    ${remote && list.some(s => s.req && ['sent', 'opened'].includes(s.req.status)) ? `<p class="small muted" style="margin:0">${__h('The status of the links follows by itself every 30 seconds while this page is open.')}</p>` : ''}
    <p class="small muted" style="margin:0">${__h('The technician checks and starts the installation; inspectors, the installer who hands over and the client sign here on the device or later with a link by e-mail. The report prints every signature and a signing protocol.')}</p>
    ${SG.err && (SG.busy === 'refresh' || !SG.open) ? `<div class="banner" style="background:var(--bad-soft);border-color:transparent">${esc(SG.err)}</div>` : ''}
    ${verBox}${remote && qTxt ? `<p class="small muted" style="margin:0">${qTxt}</p>` : ''}
    <div class="sg-list">${list.map(row).join('')}</div>
    ${remote && list.some(s => s.sig) ? `<div class="row" style="flex-wrap:wrap;align-items:center">
      <button type="button" class="btn sm${list.every(s => s.sig) ? ' primary' : ''}" data-act="sgFinal"${SG.busy || !nRec || ro ? ' disabled' : ''}>${SG.busy === 'final' ? esc(SG.step || __('Sending…')) : __h('Send the signed report to the signers ({n})', { n: nRec })}</button>
      <span class="small muted">${fin ? __h('sent on {d} to {n}', { d: fmtDate(fin.at), n: fin.n }) : !list.every(s => s.sig) ? __h('not everyone has signed yet') : ''}</span></div>
      ${SG.info && SG.busy === '' && SG.open === '' ? `<div class="banner info">${esc(SG.info)}</div>` : ''}` : ''}
    ${ro ? '' : `<div class="row" style="flex-wrap:wrap"><span class="small muted">${__h('Add:')}</span>${['inspector', 'installer', 'client', 'other', 'tech'].map(r => `<button type="button" class="btn sm ghost" data-act="sgAdd" data-v="${r}">+ ${esc(signRoleUI(r))}</button>`).join('')}</div>`}
  </section>`;
}
function signField(el, e) {
  const p = cur(); if (!p) return; const s = signers(p).find(x => x.id === el.dataset.sg); if (!s) return;
  const k = el.dataset.sgf; s[k] = k === 'email' || k === 'phone' ? el.value.trim() : el.value; signSync(p); touch(p);
  if (e.type === 'change' && k === 'statement') renderKeepAll();
}
async function signRun(id, fn, ok) {
  SG.busy = id; SG.err = ''; SG.info = ''; SG.step = ''; renderKeepAll();
  const step = (t) => { SG.step = t; const b = document.querySelector(id === 'final' ? '[data-act="sgFinal"]' : id === 'newver' ? '[data-act="sgNewVer"]' : `[data-act="sgMail"][data-v="${id}"]`); if (b) b.textContent = t; };
  try { await fn(step); SG.info = ok || ''; } catch (e) { console.error(e); SG.err = signErr(e); }
  SG.busy = ''; SG.step = ''; renderKeepAll();
}
function signAction(act, t) {
  if (!/^sg[A-Z]/.test(act)) return false;
  const p = cur(); if (!p) return true; const list = signers(p); const s = list.find(x => x.id === t.dataset.v);
  if (act !== 'sgOpen' && act !== 'sgRefresh' && !Access.can('report.edit')) { toast(Access.why('report.edit')); return true; }
  if (s && signLocked(s) && ['sgHere', 'sgClear', 'sgDel', 'sgMail'].includes(act)) { toast(__('This signature is verified and locked.')); return true; }
  switch (act) {
    case 'sgDoc': if (s) signRun(s.id, async (step) => { // 0.15.0: the signed version of the server; an older request: the report as it stands now
      const base = (p.info.nr || p.info.name || 'rapport').replace(/[^\w\-. ]+/g, '_');
      if (s.req && s.req.round && p.report.signRound && s.req.round === p.report.signRound.id) { step(__('Downloading the signed version…')); const d = await SignCloud.signedPdf(p); await offerFile(`${base}_v${d.n}_ondertekend.pdf`, d.blob, p); return; }
      step(__('Making the report…')); const blob = await buildPdf(p);
      await offerFile(`${base}_ondertekend.pdf`, blob, p); }); return true;
    case 'sgNewVerAsk': SG.confirm = 'newVer'; renderKeepAll(); return true;
    case 'sgNewVerNo': SG.confirm = ''; renderKeepAll(); return true;
    case 'sgNewVer': SG.open = ''; signRun('newver', async (step) => {
      // 0.15.1: the signatures of the old version are taken off first, so the new version is frozen without them
      const old = p.report.signRound; const keep = JSON.parse(JSON.stringify(signers(p)));
      for (const x of signers(p)) if (x.sig || x.req) {
        if (x.sig) x.prev = (x.prev || []).concat([{ n: old && old.n, at: x.at, how: x.req && x.req.status === 'signed' ? 'mail' : 'here' }]).slice(-5);
        Object.assign(x, { sig: '', at: '', dev: '', req: null });
      }
      signSync(p);
      try { await SignCloud.round(p, step, true); } // the server withdraws the open links of the old version
      catch (e) { p.report.signers = keep; signSync(p); throw e; }
      SG.confirm = ''; touch(p); SignCloud.keep(p);
    }, __('New version frozen: ask the signatures again.')); return true;
    case 'sgOpen': SG.open = SG.open === t.dataset.v ? '' : t.dataset.v; SG.err = SG.info = ''; renderKeepAll(); return true;
    case 'sgAdd': { const n = signerNew(p, t.dataset.v); list.push(n); SG.open = n.id; SG.err = SG.info = ''; signSync(p); touch(p); renderKeepAll(); return true; }
    case 'sgDel': if (s) { p.report.signers = list.filter(x => x !== s); if (SG.open === s.id) SG.open = ''; signSync(p); touch(p); renderKeepAll(); } return true;
    case 'sgClear': if (s) { Object.assign(s, { sig: '', at: '', dev: '' }); if (s.req && s.req.status === 'signed') s.req = null; signSync(p); touch(p); renderKeepAll(); } return true;
    case 'sgHere': if (s) {
      if (!s.name.trim()) { SG.open = s.id; SG.err = __('Fill in the name of the signer first.'); renderKeepAll(); return true; }
      openSigFS({ title: signRoleUI(s.role), sub: [s.name, s.company].filter(Boolean).join(' · '), note: s.role === 'tech' ? '' : (s.statement === 'kennisname' ? __('I have taken note of the balancing report.') : __('I agree with the balancing report: the measured values and the remarks.')),
        base: '', onSave: (png) => { if (!png) return; Object.assign(s, { sig: png, at: new Date().toISOString(), dev: [Access.cur().user && Access.cur().user.email, Platform.native ? (Platform.native() ? 'app' : 'web') : ''].filter(Boolean).join(' · '), method: 'here' }); signSync(p); touch(p); } });
    } return true;
    case 'sgMail': if (s) {
      if (!s.name.trim()) { SG.err = __('Fill in the name of the signer first.'); renderKeepAll(); return true; }
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s.email)) { SG.err = __('Fill in the e-mail address of the signer.'); renderKeepAll(); return true; }
      signRun(s.id, async (step) => { await SignCloud.send(p, s, step); signSync(p); touch(p); SignCloud.keep(p); }, __('Sent to {e}. The report shows the signature once it is signed: tap «Update».', { e: s.email }));
    } return true;
    case 'sgResend': if (s && s.req) signRun(s.id, async () => { await SignCloud.resend(p, s); touch(p); }, __('A new link was sent; the old one no longer works.')); return true;
    case 'sgRevoke': if (s && s.req) signRun(s.id, async () => { await SignCloud.revoke(p, s); touch(p); }, __('The link was withdrawn.')); return true;
    case 'sgRefresh': signRun('refresh', async () => { const n = await SignCloud.refresh(p); if (n) toast(__('{n} new signature(s) received', { n })); }); return true;
    case 'sgFinal': SG.open = ''; signRun('final', async (step) => { const n = await SignCloud.final(p, step); SG.done = n; }, __('The signed report was sent to the signers by e-mail (a download link, valid 90 days).')); return true;
  }
  return true;
}
