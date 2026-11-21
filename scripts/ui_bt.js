/* ---------- measuring instruments over Bluetooth (0.12.3), first the TSI capture hood (Alnor EBT731 / Airflow PH731) ----------
   Step 1 of the plan: capture what the instrument answers. TSI publishes the commands (application note TSI-150: I = identify,
   V = the displayed values, L = logged data; each ended by CR) but not the format of the answers. This card connects to the paired
   instrument (classic Bluetooth, SPP), sends a command, shows the raw answer (text and bytes) and sends the whole log to support,
   so the reader for «Take reading» in the measuring point can be built on real answers. Android app only (browsers have no SPP). */
const BT = {
  P() { return typeof Platform !== 'undefined' && Platform.native() ? Platform.plugin('TsiSpp') : null; },
  s: { devices: null, addr: '', name: '', conn: false, busy: false, err: '', info: '', log: [], poll: null, eol: '\r' },
  add(dir, txt, extra) { this.s.log.push(Object.assign({ t: new Date().toISOString().slice(11, 23), dir, txt }, extra || {})); if (this.s.log.length > 400) this.s.log.shift(); },
  /** numbers with a unit in an answer (a first, tolerant reading; the raw answer stays) */
  values(txt) {
    const out = []; const re = /(-?\d[\d,.]*)\s*(m3\/h(?:r)?|m³\/h|l\/s|m3\/s|m3\/min|cfm|ft3\/min|pa|in ?h2o|°?c|°?f|%\s?rh)\b/gi; let m;
    while ((m = re.exec(txt || ''))) out.push(m[1] + ' ' + m[2]);
    return out;
  },
  text() {
    return this.s.log.map(x => `${x.t} ${x.dir === 'tx' ? '→' : x.dir === 'rx' ? '←' : '·'} ${x.txt}${x.hex ? '\n           hex: ' + x.hex : ''}`).join('\n');
  },
};
function btCard() {
  const P = BT.P(); if (!P) return '';
  const s = BT.s; const busy = s.busy ? ' disabled' : '';
  const dev = s.devices ? s.devices.filter(d => d.classic !== false) : null;
  const cmds = [['I', __('Identify (I)')], ['V', __('Values (V)')], ['L1', __('Log of test 1 (L1)')]];
  const last = [...s.log].reverse().find(x => x.dir === 'rx');
  return `<section class="card" id="bt-card"><h3>${__h('Bluetooth instruments (TSI capture hood)')}</h3>
    <p class="small muted" style="margin:0">${__h('Test of the connection with a TSI Alnor EBT731 / Airflow PH731. Pair the instrument first in the Android Bluetooth settings (PIN 0000); on the instrument: Bluetooth discoverable, Auto-connect tries 0, main measuring screen.')}</p>
    <div class="row">${s.conn ? `<span class="chip">${__h('Connected')}: ${esc(s.name || s.addr)}</span><button class="btn sm" data-act="btClose"${busy}>${__h('Disconnect')}</button>`
      : `<button class="btn sm" data-act="btList"${busy}>${__h('Paired devices')}</button>`}</div>
    ${!s.conn && dev ? (dev.length ? `<div class="stack-s">${dev.map(d => `<div class="row small"><span>${esc(d.name || d.address)} <span class="muted">${esc(d.address)}</span></span><span class="spacer"></span><button class="btn sm" data-act="btConnect" data-v="${esc(d.address)}" data-n="${esc(d.name || '')}"${busy}>${__h('Connect')}</button></div>`).join('')}</div>`
      : `<span class="small muted">${__h('No paired devices: pair the instrument in the Android Bluetooth settings first.')}</span>`) : ''}
    ${s.conn ? `<div class="row">${cmds.map(([c, l]) => `<button class="btn sm" data-act="btSend" data-v="${c}"${busy}>${esc(l)}</button>`).join('')}
        <label class="small">${__h('Line end')} <select id="bt-eol">${[['\r', 'CR'], ['', __('none')], ['\r\n', 'CR LF']].map(([v, l]) => `<option value="${esc(JSON.stringify(v))}"${s.eol === v ? ' selected' : ''}>${l}</option>`).join('')}</select></label>
        <button class="btn sm ${s.poll ? 'primary' : ''}" data-act="btPoll">${s.poll ? __h('Stop V every second') : __h('V every second')}</button></div>
      ${last ? `<div class="small"><b>${__h('Last answer')}</b>${BT.values(last.txt).length ? ' · ' + esc(BT.values(last.txt).join(' · ')) : ''}</div>` : ''}` : ''}
    ${s.err ? `<div class="small warn">${esc(s.err)}</div>` : ''}${s.info ? `<div class="small" style="color:var(--ok)">${esc(s.info)}</div>` : ''}
    ${s.log.length ? `<pre class="small" style="max-height:240px;overflow:auto;white-space:pre-wrap;background:var(--bg);border:1px solid var(--line);border-radius:8px;padding:8px;margin:0">${esc(BT.text().split('\n').slice(-60).join('\n'))}</pre>
      <div class="row"><button class="btn sm primary" data-act="btSendLog"${busy}>${__h('Send the log to support')}</button><button class="btn sm ghost" data-act="btClear">${__h('Clear')}</button></div>` : ''}
  </section>`;
}
async function btRun(fn) { const s = BT.s; s.busy = true; s.err = ''; s.info = ''; renderSheet(); try { await fn(); } catch (e) { s.err = (e && e.message) || String(e); BT.add('·', 'ERROR ' + s.err); } s.busy = false; renderSheet(); }
async function btSend(cmd) {
  const s = BT.s; const r = await BT.P().send({ text: cmd, eol: s.eol, waitMs: 600, maxMs: cmd.startsWith('L') ? 15000 : 4000 });
  BT.add('tx', JSON.stringify(cmd + s.eol));
  BT.add('rx', r.bytes ? r.text.replace(/\r/g, '⏎').replace(/\n/g, '¶\n') : __('(no answer — main measuring screen? other line end?)'), { hex: r.bytes ? r.hex : '', ms: r.ms });
}
function btAction(act, t) {
  const s = BT.s; const P = BT.P(); if (!/^bt[A-Z]/.test(act)) return false; if (!P) return true;
  const eolEl = document.getElementById('bt-eol'); if (eolEl) { try { s.eol = JSON.parse(eolEl.value); } catch (e) { } }
  switch (act) {
    case 'btList': btRun(async () => { const r = await P.devices(); s.devices = r.devices || []; }); return true;
    case 'btConnect': btRun(async () => { const r = await P.connect({ address: t.dataset.v }); s.conn = true; s.addr = t.dataset.v; s.name = r.name || t.dataset.n || '';
      BT.add('·', `connected ${s.name} ${s.addr} (${r.how})`); Object.assign(BTI.s, { conn: true, addr: s.addr, name: s.name }); BTI.save({ addr: s.addr, name: s.name }); await btSend('I'); }); return true;
    case 'btClose': if (s.poll) { clearInterval(s.poll); s.poll = null; } BTI.stop(); btRun(async () => { await P.disconnect(); s.conn = false; BTI.s.conn = false; BT.add('·', 'disconnected'); }); return true;
    case 'btSend': btRun(() => btSend(t.dataset.v)); return true;
    case 'btPoll':
      if (s.poll) { clearInterval(s.poll); s.poll = null; renderSheet(); return true; }
      s.poll = setInterval(() => { if (!s.conn) { clearInterval(s.poll); s.poll = null; return; } if (s.busy) return; s.busy = true;
        btSend('V').catch(e => { s.err = e.message; clearInterval(s.poll); s.poll = null; }).finally(() => { s.busy = false; if (S.dlg && S.dlg.type === 'settings') renderSheet(); }); }, 1000);
      renderSheet(); return true;
    case 'btClear': s.log = []; renderSheet(); return true;
    case 'btTake': btTake(t.dataset.v); return true;
    case 'btAddIns': btAddIns(); return true;
    case 'btBarConnect': BTI.save({ auto: true }); btBarConnect(t.dataset.v, t.dataset.n); return true;
    case 'btBarPick': BTB.pick = null; BTI.s.err = ''; P.devices().then(r => { BTB.pick = (r.devices || []).filter(d => d.classic !== false); renderSheet(); }).catch(e => { BTI.s.err = (e && e.message) || String(e); renderSheet(); }); return true;
    case 'btBarStop': BTI.save({ auto: false }); BTI.disconnect().then(() => { s.conn = false; renderSheet(); }); return true;
    case 'btSendLog': btRun(async () => {
      if (typeof Support === 'undefined' || !Support.on()) throw new Error(__('Sign in to send the log'));
      await Support.send('TSI capture hood — Bluetooth log\n' + (s.name || '') + ' ' + (s.addr || '') + '\n\n' + BT.text().slice(-7500), 'bug', null);
      s.info = __('Sent to support');
    }); return true;
  }
  return true;
}

/* ---------- 0.13.0: «Take from the instrument» in the measurement (TSI capture hood / micromanometer, session BTI in tsi.js) ----------
   The bar sits under the readings of the open measurement: live value of the quantity the method needs (hood/readout → Q, anemo/traverse → v,
   k-factor/Pitot → Δp), «Take» = the last value, «Fix» = the average of the last ≤ 5 values of 10 s, «→ p stat» = the pressure into the
   static pressure field. The instrument is matched by its serial number with the project instruments (or added from its answer to I). */
const BTB = { tried: '', pick: null, focus: null, warned: '' };
document.addEventListener('focusin', (e) => { const el = e.target; if (el && el.matches && el.matches('#sheet [data-rd]')) BTB.focus = el.id; });
const btRound = (kind, v) => kind === 'q' ? Math.round(v * 10) / 10 : kind === 'v' ? Math.round(v * 100) / 100 : Math.abs(v) < 100 ? Math.round(v * 100) / 100 : Math.round(v * 10) / 10;
const BT_UNIT = { q: 'm³/h', v: 'm/s', p: 'Pa' };
const btDig = (kind, v) => kind === 'q' ? 0 : kind === 'v' ? 2 : Math.abs(v) < 100 ? 2 : 1;
const BT_MODE = { hood: 'hood', readout: '', anemo: '', traverse: '', kfactor: '', pitot: '' };
/** the matching project instrument for the connected one: same serial, preferably one that fits the method */
function btIns(p, method) {
  const ser = String((BTI.s.info && BTI.s.info.serial) || '').trim().toUpperCase(); if (!ser || !p) return { ins: null, other: null };
  const same = p.instruments.filter(x => { const s = String(x.serial || '').trim().toUpperCase(); return s && (s === ser || ser.endsWith(s) || s.endsWith(ser)); });
  return { ins: same.find(x => insFits(x, method)) || null, other: same[0] || null };
}
function btLiveHTML(p, pt, phase) {
  const s = BTI.s; const kind = BT_TAKE[pt.method];
  if (!s.conn) return '';
  const ser = BTI.series(kind, BT_MODE[pt.method], 10).slice(-5);
  const last = s.last && (Date.now() - s.last.t < 4000) ? pickItem(s.last, kind, BT_MODE[pt.method]) : null;
  let val = '—', note = '';
  if (last && last.v != null) val = `${fmt(btRound(kind, last.v), btDig(kind, last.v))} ${__h(BT_UNIT[kind])}`;
  else if (last) note = __h('the instrument shows no value for this (-----)');
  else if (s.miss >= 3) note = __h('No answer: put the instrument on its main measuring screen.');
  else if (s.last) note = __h('the instrument shows no {x}', { x: kind === 'q' ? __('flow rate') : kind === 'v' ? __('velocity') : __('pressure') });
  if (ser.length >= 2) { const m = ser.reduce((a, x) => a + x.v, 0) / ser.length; const sd = Math.sqrt(ser.reduce((a, x) => a + (x.v - m) ** 2, 0) / (ser.length - 1));
    const cv = Math.abs(m) > 1e-9 ? sd / Math.abs(m) : 0; note = (note ? note + ' · ' : '') + (cv < 0.02 ? __h('stable') : __h('varies ±{x} %', { x: fmt(cv * 100, 0) })) + ` · ⌀${ser.length}: ${fmt(btRound(kind, m), btDig(kind, m))}`; }
  const ps = s.last ? pickItem(s.last, 'p', '') : null;
  const busy = s.busy && !s.timer ? ' disabled' : '';
  return `<div class="row" style="gap:8px;align-items:center"><b class="mono" style="font-size:1.25em">${val}</b><span class="small muted">${note}</span><span class="spacer"></span>
    <button class="btn sm" data-act="btTake" data-v="last"${last && last.v != null ? '' : ' disabled'}${busy}>${__h('Take')}</button>
    <button class="btn sm primary" data-act="btTake" data-v="avg"${ser.length ? '' : ' disabled'}${busy}>${__h('Fix ⌀')}</button>
    <button class="btn sm ghost" data-act="btTake" data-v="ps"${ps && ps.v != null ? '' : ' disabled'} title="${__h('the pressure of the instrument into «p stat»')}">→ ${__h('p stat.')}</button></div>`;
}
function btBarHTML(p, pt, phase) {
  if (!BTI.on() || !BT_TAKE[pt.method]) return '';
  const s = BTI.s; const sv = BTI.saved();
  let h = '';
  if (s.conn) {
    const { ins, other } = btIns(p, pt.method); const info = s.info || {};
    const insLine = !info.serial ? '' : ins ? `<span class="small muted">${esc(insLabel(ins))} · ${esc(ins.serial)}${ins.cal ? ' · ' + esc(__('calibration {d}', { d: fmtDate(ins.cal, false) })) : ''}</span>${insCalOld(ins) ? `<span class="small warn-t">${__h('The calibration is older than a year — have the instrument calibrated before you use it for a report.')}</span>` : ''}`
      : `<span class="small warn-t">${__h('{m} {s} is not in the instruments of the project', { m: info.model || 'TSI', s: info.serial })}</span><button class="btn sm ghost" data-act="btAddIns">${other ? __h('Add as micromanometer') : __h('Add')}</button>`;
    h = `<div class="row small" style="gap:6px"><span class="chip">ᛒ ${esc(s.name || s.addr)}</span>${insLine}<span class="spacer"></span><button class="btn sm ghost" data-act="btBarStop">${__h('Disconnect')}</button></div>
      <div id="bt-live">${btLiveHTML(p, pt, phase)}</div>`;
  } else if (s.connecting) h = `<div class="small muted">${__h('Connecting with {n}…', { n: esc(sv.name || s.name || '') })}</div>`;
  else if (BTB.pick) h = `<div class="stack-s">${BTB.pick.length ? BTB.pick.map(d => `<div class="row small"><span>${esc(d.name || d.address)} <span class="muted">${esc(d.address)}</span></span><span class="spacer"></span><button class="btn sm" data-act="btBarConnect" data-v="${esc(d.address)}" data-n="${esc(d.name || '')}">${__h('Connect')}</button></div>`).join('')
      : `<span class="small muted">${__h('No paired devices: pair the instrument in the Android Bluetooth settings first.')}</span>`}</div>`;
  else h = `<div class="row small" style="gap:6px"><span class="muted">${__h('Bluetooth instrument')}</span><span class="spacer"></span>
      ${sv.addr ? `<button class="btn sm" data-act="btBarConnect" data-v="${esc(sv.addr)}" data-n="${esc(sv.name || '')}">${__h('Connect {n}', { n: sv.name || sv.addr })}</button>` : ''}
      <button class="btn sm ghost" data-act="btBarPick">${sv.addr ? __h('Other…') : __h('Connect')}</button></div>`;
  if (s.err && !s.conn) h += `<div class="small warn">${esc(s.err)}</div>`;
  return `<div class="btbar" id="bt-bar" style="border:1px solid var(--line);border-radius:10px;padding:8px 10px;display:grid;gap:6px">${h}</div>`;
}
/** the editor that is open in a measuring phase, or null */
function btEd() { const p = typeof cur === 'function' ? cur() : null; if (!p || !S.ed || !['eerste', 'controle'].includes(S.ed.mode)) return null; const pt = p.points.find(x => x.id === S.ed.id); return pt && BT_TAKE[pt.method] ? { p, pt, phase: S.ed.mode } : null; }
function btTick() { const e = btEd(); const el = document.getElementById('bt-live'); if (!e) return BTI.stop(); if (el) el.innerHTML = btLiveHTML(e.p, e.pt, e.phase); else if (!document.getElementById('bt-bar')) BTI.stop(); }
/** after every render of the sheet: poll while a measurement is open, auto-connect to the remembered instrument once per opened point */
function btAfterRender() {
  if (!BTI.on()) return; const e = btEd();
  if (!e) { BTI.stop(); BTB.tried = ''; return; }
  const s = BTI.s;
  if (s.conn) { if (!s.timer) BTI.start(btTick); return; }
  const key = e.pt.id + '|' + e.phase; const sv = BTI.saved();
  if (sv.addr && sv.auto !== false && BTB.tried !== key && !s.connecting) { BTB.tried = key; btBarConnect(sv.addr, sv.name); }
}
async function btBarConnect(addr, name) {
  BTB.pick = null; const pr = BTI.connect(addr, name); renderSheet();
  try { await pr; BT.s.conn = true; BT.s.addr = addr; BT.s.name = BTI.s.name; } catch (e) { /* the error shows in the bar */ }
  renderSheet();
}
/** the target input: the reading last focused (if still empty or focused), else the first empty one; a new reading when all are filled */
function btTarget(pt, phase) {
  const sel = `#sheet [data-rd][data-pt="${pt.id}"]`;
  const all = [...document.querySelectorAll(sel)].filter(x => x.dataset.f.startsWith(`meas.${phase}.r.`));
  const f = BTB.focus && document.getElementById(BTB.focus);
  if (f && all.includes(f) && !String(f.value).trim()) return f;
  return all.find(x => !String(x.value).trim()) || null;
}
function btFill(el, v) { el.value = fmtIn(v); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); }
function btTake(how) {
  const e = btEd(); if (!e) return; const { p, pt, phase } = e; const kind = BT_TAKE[pt.method]; const s = BTI.s;
  let v = null;
  if (how === 'ps') { const it = s.last && pickItem(s.last, 'p', ''); if (!it || it.v == null) return toast(__('The instrument shows no pressure')); v = btRound('p', it.v);
    const el = document.getElementById(fid(pt.id, 'ps-ed', phase)); if (el) { btFill(el, v); toast(__('p stat = {v} Pa', { v: fmt(v, btDig('p', v)) })); } btLinkIns(p, pt, phase); return; }
  if (how === 'avg') { const ser = BTI.series(kind, BT_MODE[pt.method], 10).slice(-5); if (!ser.length) return; v = ser.reduce((a, x) => a + x.v, 0) / ser.length; }
  else { const it = s.last && pickItem(s.last, kind, BT_MODE[pt.method]); if (!it || it.v == null) return; v = it.v; }
  if (kind === 'q') { if ((pt.dir === 'A' && v > 0) || (pt.dir === 'T' && v < 0)) toast(pt.dir === 'A' ? __('The instrument measures supply here (positive flow) — check the direction setting of the hood.') : __('The instrument measures extract here (negative flow) — check the direction setting of the hood.')); v = Math.abs(v); }
  if (kind === 'p') v = Math.abs(v);
  v = btRound(kind, v);
  let el = btTarget(pt, phase);
  if (!el) {
    if (TRV.on(pt)) return toast(__('All points of the grid have a value'));
    S.ed.extra = S.ed.extra || {}; S.ed.extra[phase] = (S.ed.extra[phase] || 0) + 1; renderSheet(); el = btTarget(pt, phase); if (!el) return;
  }
  btFill(el, v); btLinkIns(p, pt, phase);
  const nx = btTarget(pt, phase); if (nx) { BTB.focus = nx.id; } toast(__('Taken: {v} {u}', { v: fmt(v, btDig(kind, v)), u: __(BT_UNIT[kind]) }));
}
/** the measurement gets the connected instrument when it has none yet */
function btLinkIns(p, pt, phase) {
  const { ins } = btIns(p, pt.method); if (!ins) return; if (pt.meas && pt.meas[phase] && pt.meas[phase].ins) return;
  const el = document.getElementById(fid(pt.id, 'ins', phase)); if (el) { el.value = ins.id; el.dispatchEvent(new Event('change', { bubbles: true })); }
}
function btAddIns() {
  const e = btEd(); if (!e) return; const { p, pt, phase } = e; const info = BTI.s.info || {}; if (!info.serial) return;
  const model = String(info.model || '').toUpperCase(); const pre = /PH73|EBT73/.test(model) ? INS_PRESETS.find(x => x.key === 'tsi-ph731') : null;
  const fits = (METHOD_KINDS[pt.method] || []);
  const kind = fits.includes('hood') ? 'hood' : fits.includes('dp') ? 'dp' : fits[0] || 'other';
  const ins = Object.assign(INS0(), kind === 'hood' && pre ? Object.assign({}, pre) : {}, {
    name: kind === 'dp' ? __('Micromanometer') : __('Capture hood'), type: 'TSI ' + (info.model || ''), serial: info.serial, kind,
    cal: TSI.calISO(info.cal, BTI.s.mf), src: kind === 'hood' && pre ? pre.src : '', acc: kind === 'hood' && pre ? pre.acc : '' });
  delete ins.key; if (info.rev) ins.note = 'REV ' + info.rev;
  p.instruments.push(ins); touch(p); renderSheet();
  btLinkIns(p, pt, phase);
  toast(__('Added to the instruments of the project: {n}', { n: insLabel(ins) }) + (typeof insCalOld === 'function' && insCalOld(ins) ? ' · ' + __('The calibration is older than a year — have the instrument calibrated before you use it for a report.') : ''));
}
