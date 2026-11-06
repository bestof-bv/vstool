/* ---------- checklist inbedrijfstelling: screens ----------
   Unit menu: nameplate / datasheet data and the steps before the first measurement (4 rotation, 6 coils).
   Report step: the whole list (project + per unit), auto answers with their basis, change or back to auto.
   Excel / PDF: a window with the open questions first (1–3, 12, 19, 21 and auto steps without data). */
const CL_WORD = () => ({ ja: __('Yes'), nee: __('No'), nvt: __('n/a') });
const clId = (it, s) => `${it.key}|${s ? s.id : ''}`;
const canCl = (p) => !isPkg(p) && Access.can('checklist.edit');
function clSeg(act, it, s, v, ro) {
  const W = CL_WORD();
  return `<div class="seg cl-seg" role="group" aria-label="${__h('Answer')}">${clVals(it).map(k => `<button type="button" class="${k === v ? 'on ' + k : ''}" data-act="${act}" data-k="${it.key}" data-s="${s ? s.id : ''}" data-v="${k}"${ro ? ' disabled' : ''}>${esc(W[k])}</button>`).join('')}</div>`;
}
const clSrcChip = (r) => r.pending ? `<span class="chip" title="${__h('filled in when the report is built')}">${__h('with the report')}</span>` : r.src === 'auto' ? `<span class="chip acc" title="${__h('filled in from the measurements')}">${__h('auto')}</span>`
  : r.src === 'user' ? `<span class="chip" title="${__h('answered by hand')}">${__h('manual')}</span>` : `<span class="chip nok">${__h('open')}</span>`;
/** one step: number, text, answer, remark; per unit (s) or for the project */
function clRowHTML(p, it, s, o = {}) {
  const r = clGet(p, it, s); const ro = !canCl(p); const e = clStored(p, it.key, s && s.id);
  const back = r.src === 'user' && r.auto && r.auto.v ? `<button class="btn sm ghost" data-act="clReset" data-k="${it.key}" data-s="${s ? s.id : ''}"${ro ? ' disabled' : ''}>${__h('back to auto: {v}', { v: CL_WORD()[r.auto.v] })}</button>` : '';
  const autoNote = r.auto && r.auto.note && !(e && (e.note || '').trim()) ? r.auto.note : '';
  const hint = it.key === 'wp' && s ? wpText(p, s) : '';
  return `<div class="cl-row${r.v ? ' ' + r.v : ''}" data-cl="${clId(it, s)}">
    <span class="cl-n mono">${it.n}</span>
    <div class="cl-t"><div><b>${__h(it.en)}</b> ${o.noChip ? '' : clSrcChip(r)}</div>${repHint(it.nl, __(it.en)) ? `<div class="small muted">${esc(_r(it.nl))}</div>` : ''}
      ${autoNote ? `<div class="small cl-auto">${esc(autoNote)}</div>` : ''}${hint ? `<div class="small cl-auto">${esc(hint)}</div>` : ''}</div>
    <div class="cl-a">${clSeg('clSet', it, s, r.src === 'user' || r.src === 'auto' ? r.v : '', ro)}
      <input type="text" class="cl-note" data-cl-note="${clId(it, s)}" value="${esc(e ? e.note || '' : '')}" placeholder="${esc(autoNote ? __('own remark (optional)') : __('remark'))}" aria-label="${__h('Remark')} ${it.n}"${ro ? ' disabled' : ''}>${back}</div>
  </div>`;
}
/** working point of a unit (for step 11): flow, fan pressure, frequency */
function wpText(p, s) {
  const ph = ['controle', 'eerste'].find(f => clDirs(s).some(d => isNum(systemQ(p, s, d, f) ?? mainDuctQ(p, s.id, d, f)))); if (!ph) return '';
  return __('Working point: ') + clDirs(s).map(d => {
    const m = s.meas[ph] || {}; const q = systemQ(p, s, d, ph) ?? mainDuctQ(p, s.id, d, ph);
    const dp = isNum(m['psp' + d]) && isNum(m['psz' + d]) ? Math.abs(m['psp' + d] - m['psz' + d]) : isNum(m['pa' + d]) ? Math.abs(m['pa' + d]) : null;
    return [L.dir[d], isNum(q) ? fmt(q) + ' ' + __('m³/h') : '', isNum(dp) ? fmt(dp) + ' Pa' : '', dirSetText(s, ph, d, false)].filter(Boolean).join(' ');
  }).join(' · ');
}
/** report step: the whole checklist */
function clCardHTML(p) {
  if (isPkg(p)) return '';
  const { main, units } = clRows(p); const c = clCounts(p);
  const rows = main.map(({ it, r }) => it.scope === 'ahu'
    ? `<div class="cl-row sum${r.v ? ' ' + r.v : ''}"><span class="cl-n mono">${it.n}</span><div class="cl-t"><div><b>${__h(it.en)}</b> <span class="chip">${r.v ? esc(CL_WORD()[r.v]) : __h('open')}</span></div><div class="small muted">${__h('per unit, below')}${units.length > 1 ? ' · ' + esc(r.note) : ''}</div></div></div>`
    : clRowHTML(p, it, null)).join('');
  const per = units.map(({ s, rows: rs }) => { const open = rs.filter(x => !x.r.v).length;
    return `<details class="more cl-unit"${open ? ' open' : ''}><summary>${__h('Unit {s}', { s: s.code })} ${esc(s.name || '')} <span class="small muted">· ${open ? __h('{n} open', { n: open }) : __h('complete')}</span></summary><div class="inner">${rs.map(x => clRowHTML(p, x.it, s)).join('')}</div></details>`; }).join('');
  return `<section class="card cl-card" id="clCard"><div class="hd"><h2>${__h('Commissioning checklist')}</h2><span class="small muted">${__h('yes {a} · no {b} · n/a {c} · open {d}', { a: c.ja, b: c.nee, c: c.nvt, d: c.open })}</span></div>
    <p class="small muted" style="margin:0">${__h('Steps with «auto» are filled in from the measurements; any answer can be changed. Open steps are asked before the report.')}</p>
    <div class="cl-list">${rows}</div>${per}</section>`;
}
/** unit menu: nameplate and datasheet */
function unitNpHTML(p, s) {
  npFix(s); const np = s.np;
  const pair = (key, label, nlT, unit, o = {}) => `<div class="stack-s"><span style="font-weight:600;font-size:14px">${label}${repHint(nlT, label) ? ` <span class="small muted" style="font-weight:400">· ${esc(repHint(nlT, label))}</span>` : ''}</span><div class="grid2">
      ${unitDirs(s).map(d => inp({ sys: s.id, f: `np.${key}.${d}` }, np[key][d], Object.assign({ label: d === 'T' ? __('Supply') : __('Extract'), unit }, o))).join('')}</div></div>`;
  return `<section class="card"><div class="hd"><h3>${__h('Filters, coils and total flow')}</h3><span class="small muted">${__h('for the checklist and the report')}</span></div>
    ${pair('fClass', __('Filter class (ISO 16890)'), 'Filterklasse', '', { ph: 'ePM1 55 %' })}
    ${pair('f0', __('Filter Δp clean (datasheet)'), 'Begindrukval filter', __('Pa'), { num: true })}
    ${pair('fEnd', __('Filter Δp final (datasheet)'), 'Einddrukval filter', __('Pa'), { num: true })}
    <div class="grid2">
      ${sel({ sys: s.id, f: 'np.coils' }, np.coils, { '': __('— not given —'), none: __('no coils'), heat: __('heating coil'), cool: __('cooling coil'), both: __('heating and cooling coil') }, { label: __('Coils'), nl: 'Batterijen' })}
      ${sel({ sys: s.id, f: 'np.flowM' }, np.flowM, { '': __('— not given —'), pitot: __('Pitot tube in the main duct'), cone: __('Cone pressure + k-factor of the fan'), display: __('Display of the unit'), other: __('Other') }, { label: __('Total flow at the fan'), nl: 'Totaaldebiet ventilator', rr: true })}
    </div>
    ${np.flowM === 'cone' ? `<div class="grid2">${sel({ sys: s.id, f: 'np.kcF' }, np.kcF || 'std', { std: __('Q = k · √Δp (most fans)'), rho: __('Q = k · √(2 · Δp / ρ) (Trane)') }, { label: __('Formula of the k-factor'), nl: 'Formule k-factor', rr: true })}
      ${np.kcF === 'rho' ? `<div class="small muted" style="align-self:end">${__h('k in m², Q in m³/s; ρ = {rho} kg/m³ from the project (Tolerances and parameters).', { rho: fmt(rhoOf(p), 2) })}</div>`
        : sel({ sys: s.id, f: 'np.kcU' }, np.kcU, { m3h: __('Q in m³/h = k · √Δp'), ls: __('Q in l/s = k · √Δp') }, { label: __('Unit of k'), rr: true })}</div>
      <div class="small muted">${__h('The k-factor of each fan is entered with the fan (card «Fans and motors»); the cone pressure per fan with the measurements.')}</div>` : ''}
  </section>`;
}
/** unit menu: checklist steps before the first measurement */
function unitClHTML(p, s) {
  if (isPkg(p)) return '';
  const its = CL.filter(it => it.when === 'ahu');
  return `<section class="card"><div class="hd"><h3>${__h('Before the first measurement')}</h3><span class="small muted">${__h('checklist, steps {n}', { n: its.map(x => x.n).join(', ') })}</span></div>${its.map(it => clRowHTML(p, it, s, { noChip: true })).join('')}</section>`;
}
/** measuring step: open unit steps as a reminder above the unit values */
function unitClReminder(p, s, phase) {
  if (phase !== 'eerste' || isPkg(p)) return ''; const open = clUnitOpen(p, s); if (!open.length) return '';
  return `<div class="banner info cl-remind"><b>${__h('Before measuring {s}', { s: s.code })}</b>${open.map(it => clRowHTML(p, it, s, { noChip: true })).join('')}</div>`;
}
/** live line under the cone pressure */
function coneLive(p, sysId, phase) {
  const s = sysOf(p, sysId); if (!s) return '';
  return clDirs(s).map(d => { const q = coneQ(s, d, phase, p);
    const want = fansOf(s, d).filter(f => isNum(f.kc) && f.kc > 0).map(f => { const w = fanDpcFor(s, f, p); return isNum(w) ? (fansOf(s, d).length > 1 ? esc(fanName(s, f)) + ' ' : '') + fmt(w) + ' Pa' : ''; }).filter(Boolean).join(' · ');
    return [`<b>${esc(L.dir[d])}</b>`, isNum(q) ? __h('{f}: {q} m³/h', { f: coneFormula(s.np), q: fmt(q) }) : '', want ? __h('cone Δp for the design flow: {v}', { v: want }) : ''].filter(Boolean).join(' '); }).join('<br>');
}
/** one toast per unit and session when a reading is entered while steps 4 / 6 / 8 are open */
const clReminded = new Set();
function clRemind(p, pt) {
  if (isPkg(p) || clReminded.has(pt.systemId)) return; const s = sysOf(p, pt.systemId); if (!s) return;
  const open = clUnitOpen(p, s); if (!open.length) return; clReminded.add(s.id);
  toast(__('Unit {s}: checklist before measuring — {list}', { s: s.code, list: open.map(it => __(it.en).toLowerCase()).join('; ') }));
}
/* ---- window before the report ---- */
function clDraftInit(p) {
  const d = {}; for (const x of clOpen(p)) { const sg = !x.s && CL_SUGGEST[x.it.key] ? CL_SUGGEST[x.it.key](p) : null; d[clId(x.it, x.s)] = { v: sg ? sg.v : '', note: sg ? sg.note || '' : '', sug: !!sg }; }
  return d;
}
function clDialogHTML(p, d) {
  const open = clOpen(scopeView(p, repScope(p))); const W = CL_WORD();
  const row = (x) => { const id = clId(x.it, x.s), dr = d.draft[id] || { v: '', note: '' };
    const basis = x.r.note || (x.it.key === 'wp' && x.s ? wpText(p, x.s) : '');
    return `<div class="cl-row${dr.v ? ' ' + dr.v : ''}"><span class="cl-n mono">${x.it.n}</span>
      <div class="cl-t"><div><b>${__h(x.it.en)}</b>${x.s ? ` <span class="tag">${esc(x.s.code)}</span>` : ''}</div>${basis ? `<div class="small cl-auto">${esc(basis)}</div>` : ''}${dr.sug ? `<div class="small muted">${__h('suggestion from the project data')}</div>` : ''}</div>
      <div class="cl-a"><div class="seg cl-seg" role="group">${clVals(x.it).map(k => `<button type="button" class="${k === dr.v ? 'on ' + k : ''}" data-act="clDraft" data-id="${esc(id)}" data-v="${k}">${esc(W[k])}</button>`).join('')}</div>
        <input type="text" class="cl-note" data-cl-dnote="${esc(id)}" value="${esc(dr.note || '')}" placeholder="${esc(x.it.key === 'hand' ? __('to whom and when') : __('remark'))}"></div></div>`; };
  const fmtName = d.act === 'pdf' ? 'PDF' : 'Excel';
  return sheetFrame(__('Questions before the report'), `
    <section class="card"><p class="small muted" style="margin:0">${__h('These checklist steps are still open. Answer them now or build the report with them open («not filled in»). A «no» needs a remark.')}</p>
      <div class="cl-list">${open.map(row).join('')}</div></section>`,
    `<button class="btn" data-act="clGo" data-save="0">${__h('Build without answering')}</button><button class="btn primary" data-act="clGo" data-save="1">${__h('Save and build {f}', { f: fmtName })}</button>`);
}
/** save the answers of the window; false when a «no» has no remark */
function clDraftSave(p, d) {
  const bad = [];
  for (const [id, dr] of Object.entries(d.draft)) { if (dr.v === 'nee' && !(dr.note || '').trim()) { const [k, sid] = id.split('|'); const r = clGet(p, clItem(k), sid ? sysOf(p, sid) : null); if (!(r.note || '').trim()) bad.push(clItem(k).n); } }
  if (bad.length) { toast(__('A «no» needs a remark: step {list}', { list: bad.join(', ') })); return false; }
  for (const [id, dr] of Object.entries(d.draft)) { if (!dr.v && !(dr.note || '').trim()) continue; const [k, sid] = id.split('|'); clSet(p, k, sid || null, { v: dr.v, note: dr.note || '' }); }
  return true;
}
/* ---- events ---- */
document.addEventListener('click', async (e) => {
  const t = e.target.closest('[data-act]'); if (!t) return; const act = t.dataset.act;
  if (!['clSet', 'clReset', 'clDraft', 'clGo'].includes(act)) return;
  const p = cur(); if (!p || !Access.allow(act)) return;
  const rr = () => { if (S.dlg) renderSheet(); else renderKeepAll(); };
  if (act === 'clSet') {
    const it = clItem(t.dataset.k), s = t.dataset.s ? sysOf(p, t.dataset.s) : null; if (!it) return;
    const r = clGet(p, it, s); const e0 = clStored(p, it.key, s && s.id);
    const v = r.v === t.dataset.v && r.src === 'user' ? '' : t.dataset.v; // a second tap on the stored answer clears it
    if (r.src === 'auto' && r.v === t.dataset.v && !e0) return; // already the auto answer
    clSet(p, it.key, s && s.id, { v }); touch(p); rr(); return;
  }
  if (act === 'clReset') { clReset(p, t.dataset.k, t.dataset.s || null); touch(p); rr(); return; }
  if (act === 'clDraft') { const d = S.dlg; if (!d || d.type !== 'cl') return; const dr = d.draft[t.dataset.id] = d.draft[t.dataset.id] || { v: '', note: '' }; dr.v = dr.v === t.dataset.v ? '' : t.dataset.v; renderSheet(); return; }
  if (act === 'clGo') {
    const d = S.dlg; if (!d || d.type !== 'cl') return;
    if (t.dataset.save === '1') { if (!clDraftSave(p, d)) return; touch(p); }
    const what = d.act; closeSheet(); setTimeout(() => exportReport(p, what, document.querySelector(`[data-act="${what}"]`)), 60);
  }
});
document.addEventListener('input', (e) => {
  const el = e.target; const p = cur(); if (!p) return;
  if (el.dataset.clNote !== undefined) { const [k, sid] = el.dataset.clNote.split('|'); const e0 = clStored(p, k, sid || null); const r = clGet(p, clItem(k), sid ? sysOf(p, sid) : null);
    clSet(p, k, sid || null, { v: e0 ? e0.v : '', note: el.value }); touch(p); return; } // a remark alone keeps the auto answer
  if (el.dataset.clDnote !== undefined && S.dlg && S.dlg.type === 'cl') { const dr = S.dlg.draft[el.dataset.clDnote] = S.dlg.draft[el.dataset.clDnote] || { v: '', note: '' }; dr.note = el.value; }
});
/* ---- project step: block «Normen» (which Belgian rules the explanatory note cites) ---- */
function normsCardHTML(p) {
  const n = normOf(p); if (!p.norm) p.norm = n;
  const none = { '': __('— not given —') };
  return `<section class="card"><div class="hd"><h2>${__h('Standards · Normen')}</h2><span class="small muted">${__h('for the foreword of the explanatory note')}</span></div>
    <div class="grid2">
      ${sel({ f: 'norm.region' }, n.region, Object.assign({}, none, { vl: __('Flanders (Vlaanderen)'), bru: __('Brussels'), wal: __('Wallonia (Wallonie)') }), { label: __('Region'), nl: 'Gewest', rrw: true })}
      ${sel({ f: 'norm.use' }, n.use, Object.assign({}, none, { res: __('Residential'), nres: __('Non-residential'), ind: __('Industrial') }), { label: __('Use of the building'), nl: 'Bestemming', rrw: true })}
      ${sel({ f: 'norm.works' }, n.works, Object.assign({}, none, { new: __('New build'), ier: __('Major energy renovation (IER)'), reno: __('Renovation') }), { label: __('Kind of works'), nl: 'Aard van de werken' })}
      ${inp({ f: 'norm.permit' }, n.permit, { label: __('Date of the permit application'), nl: 'Datum bouwaanvraag', type: 'date' })}
      ${sel({ f: 'norm.ida' }, n.ida, Object.assign({}, none, { IDA1: 'IDA1', IDA2: 'IDA2', IDA3: 'IDA3', IDA4: 'IDA4' }), { label: __('Indoor air class (design)'), nl: 'Binnenluchtklasse' })}
      ${inp({ f: 'norm.occ' }, n.occ, { label: __('Occupancy (persons)'), nl: 'Bezetting (personen)', num: true })}
      ${n.region === 'vl' && isNres(n) ? inp({ f: 'norm.vol' }, n.vol, { label: __('Volume V, outer dimensions — pressure condition'), nl: 'Volume V (buitenafmetingen)', num: true, unit: 'm³' }) : ''}
    </div>
    <div class="stack-s">${chk({ f: 'norm.work' }, n.work, __('Workplaces — people work here (Codex welzijn op het werk)'))}${chk({ f: 'norm.pub' }, n.pub, __('Enclosed place open to the public'))}</div>
    <div class="small norms-live" data-live="norms">${normsLive(p)}</div>
  </section>`;
}
function normsLive(p) {
  const ns = normsFor(p);
  const n = normOf(p), r = pcCheck(p);
  const pc = r ? `<div class="${r.ok ? '' : 'warn-t'}">${__x('Pressure condition PC = <b class="mono">{pc} Pa</b> (allowed −5 … +10 Pa): supply {qs}, extract {qe} m³/h', { pc: esc(pcFmt(r.pc)), qs: esc(fmt(r.qs)), qe: esc(fmt(r.qe)) })}</div>`
    : n.region === 'vl' && isNres(n) && isNum(n.vol) ? `<div class="muted">${__h('Pressure condition: calculated once every unit has a control measurement')}</div>` : '';
  return `<span class="label">${__h('The note will cite')}</span><ul>${ns.map(x => `<li><b>${esc(x.title)}</b></li>`).join('')}</ul>${pc}${n.region ? '' : `<span class="muted">${__h('Choose the region and the use to add the EPB rules.')}</span>`}`;
}
