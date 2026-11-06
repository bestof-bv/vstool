/* ---------- checklist inbedrijfstelling ----------
   The steps of the commissioning checklist (template Aerolish, 20 steps) plus step 8 (rooms closed, design mode) and with the terminals (14)
   before the branches (15), bottom-up as the proportional method: one list for the project plus additions per unit (luchtgroep).
   when: 'ahu'   — in the unit menu, before the first measurement of that unit (rotation direction, coils, rooms closed / design mode)
         'auto'  — answered from the measurements and settings; a step without data becomes a question before the report
         'final' — question before the report (Excel / PDF)
   scope: 'ahu' = answered per unit; the project row then sums the units up.
   A stored answer of the technician wins over the rule (shown as «manual» in the report). Answers: ja · nee · nvt (n.v.t.); '' = open.
   Storage: p.checklist = { a: { key: entry }, s: { sysId: { key: entry } } }, entry = { v, note, at, by: 'user' }. */
const CL_V = ['ja', 'nee', 'nvt'];
const CL = [
  { n: 1, key: 'docs', when: 'final', en: N_('Check that the installation matches the design documents'), nl: 'Controle of de installatie overeenkomt met de ontwerpdocumentatie' },
  { n: 2, key: 'mount', when: 'final', en: N_('Fix visible installation faults and leaks'), nl: 'Verhelpen van zichtbare montagefouten en lekkages' },
  { n: 3, key: 'trial', when: 'final', vals: ['ja', 'nee'], en: N_('Trial start and uninterrupted run ≥ 7 hours'), nl: 'Proefstart en ononderbroken bedrijf ≥ 7 uur' },
  { n: 4, key: 'rot', when: 'ahu', scope: 'ahu', en: N_('Check the rotation direction of the fans'), nl: 'Controle draairichting ventilatoren' },
  { n: 5, key: 'amp', when: 'auto', scope: 'ahu', en: N_('Measure the motor currents and compare with the nameplate'), nl: 'Meting motorstromen en vergelijking met typeplaatgegevens' },
  { n: 6, key: 'coil', when: 'ahu', scope: 'ahu', en: N_('Check heating / cooling coils (if present)'), nl: 'Controle werking verwarmings- / koelbatterijen (indien aanwezig)' },
  { n: 7, key: 'filt', when: 'auto', scope: 'ahu', en: N_('Check the filters (fouling, pressure drop)'), nl: 'Controle filters (vervuilingsgraad, drukverschil)' },
  { n: 8, key: 'mode', when: 'ahu', scope: 'ahu', en: N_('Doors, windows and access hatches closed; unit in design mode (VAV at maximum)'), nl: 'Deuren, ramen en inspectieluiken gesloten; groep in ontwerpbedrijf (VAV op maximum)' },
  { n: 9, key: 'idx', when: 'auto', en: N_('Determine the index branch from the drawing'), nl: 'Bepaling van de indextak volgens het schema' },
  { n: 10, key: 'qtot', when: 'auto', scope: 'ahu', en: N_('Measure the total flow at the fan'), nl: 'Meting totaaldebiet bij de ventilator (Pitot)' },
  { n: 11, key: 'ps', when: 'auto', scope: 'ahu', en: N_('Measure the static pressure on the suction and discharge side'), nl: 'Meting statische druk aan zuig- en perszijde' },
  { n: 12, key: 'wp', when: 'final', scope: 'ahu', en: N_('Compare the working point with the fan curve'), nl: 'Vergelijking werkpunt met ventilatorkarakteristiek' },
  { n: 13, key: 'branch', when: 'auto', en: N_('Flow measurements on all branches (dampers open)'), nl: 'Debietmetingen op alle aftakkingen (kleppen open)' },
  { n: 14, key: 'term', when: 'auto', en: N_('Proportional balancing of the terminals per branch (grilles, diffusers)'), nl: 'Proportioneel inregelen van de eindapparaten per tak (roosters, diffusers)' },
  { n: 15, key: 'main', when: 'auto', en: N_('Proportional balancing of the branches and main branches against each other'), nl: 'Proportioneel inregelen van de takken en hoofdtakken onderling' },
  { n: 16, key: 'ctl', when: 'auto', en: N_('Control measurements after balancing'), nl: 'Controlemetingen na het inregelen' },
  { n: 17, key: 'pos', when: 'auto', en: N_('Record the damper / iris positions (paint, seal, record)'), nl: 'Vastleggen van klep- / Irisstanden (verf, verzegeling, registratie)' },
  { n: 18, key: 'bal', when: 'auto', scope: 'ahu', en: N_('Check the supply / extract balance'), nl: 'Controle balans toevoer / afvoer' },
  { n: 19, key: 'snd', when: 'final', en: N_('Sound measurements (if needed)'), nl: 'Geluidsmetingen (indien nodig)' },
  { n: 20, key: 'tab', when: 'auto', en: N_('Fill in the balancing table and the system passport'), nl: 'Invullen inregeltabel en systeempaspoort' },
  { n: 21, key: 'hand', when: 'final', en: N_('Draw up the handover report and hand over to the client'), nl: 'Opstellen opleveringsrapport en overdracht aan opdrachtgever' },
  // additions 0.9 (numbers 22–24, so that 1–21 stay the numbers of the template): drive settings, heat recovery, order of a cascade
  { n: 22, key: 'drv', when: 'auto', scope: 'ahu', en: N_('Record the settings of the fan drives (frequency converter, EC controller, steps, pulleys / belt)'), nl: 'Vastleggen van de instellingen van de ventilatoraandrijvingen (frequentieregelaar, EC-sturing, standen, poelies / riem)' },
  { n: 23, key: 'wtw', when: 'ahu', scope: 'ahu', en: N_('Check the heat recovery (wheel and purge sector, bypass, frost protection)'), nl: 'Controle warmteterugwinning (wiel en spoelsector, bypass, vorstbeveiliging)' },
  { n: 24, key: 'seq', when: 'auto', en: N_('Systems of several units: order of balancing and control measurement of the main unit'), nl: 'Systemen met meerdere groepen: volgorde van inregelen en controlemeting van de hoofdgroep' },
];
const clItem = (key) => CL.find(x => x.key === key);
const clVals = (it) => it.vals || CL_V;
/** units the per-unit steps apply to (every unit with a design flow or points) */
function clUnits(p) { return p.systems.filter(s => isNum(s.design?.T) || isNum(s.design?.A) || p.points.some(x => x.systemId === s.id)); }
const clDirs = (s) => ['T', 'A'].filter(d => unitHas(s, d) && isNum(s.design?.[d]));
function clStore(p) { if (!p.checklist || typeof p.checklist !== 'object') p.checklist = {}; p.checklist.a = p.checklist.a || {}; p.checklist.s = p.checklist.s || {}; return p.checklist; }
function clStored(p, key, sysId) { const c = p.checklist || {}; const e = sysId ? c.s && c.s[sysId] && c.s[sysId][key] : c.a && c.a[key]; return e && (e.v || (e.note || '').trim()) ? e : null; }
function clSet(p, key, sysId, patch) {
  const c = clStore(p); const box = sysId ? (c.s[sysId] = c.s[sysId] || {}) : c.a;
  const e = box[key] = Object.assign({ v: '', note: '' }, box[key] || {}, patch, { at: Date.now(), by: 'user' });
  if (!e.v && !(e.note || '').trim()) delete box[key];
}
function clReset(p, key, sysId) { const c = clStore(p); const box = sysId ? c.s[sysId] : c.a; if (box) delete box[key]; }

/* ---- rules: { v, note } or null (no data yet); notes in the report language ---- */
const clN = (v, d = 0) => nl(v, d);
const clList = (arr, n = 10) => arr.map(x => x.code || '?').slice(0, n).join(', ') + (arr.length > n ? ' …' : '');
const flowMethodText = (s) => ({ pitot: _r('Pitotbuis in het hoofdkanaal'), cone: _r('conusdruk en k-factor van de ventilator') + ' (' + coneFormula(s.np) + ')', display: _r('display van de luchtgroep'), other: _r('andere meetmethode') })[s.np?.flowM] || '';
const CL_RULES = {
  amp(p, s) { // per fan: current (per phase for 3~) against the nameplate, unbalance against the limit of the project
    const fs = (s.fans || []).filter(f => f.dir === 'TA' || unitHas(s, f.dir)); if (!fs.length) return null; const parts = []; let over = false, miss = false, any = false;
    for (const f of fs) {
      const c = fanCur(s, 'controle', f) || fanCur(s, 'eerste', f);
      if (!c) { miss = true; continue; } any = true;
      const unb = isNum(c.unb) ? ` · ${_r('onbalans')} ${clN(c.unb, 1)} %` : '';
      parts.push(`${fanName(s, f)} ${RL.pe[f.dir === 'TA' ? 'T' : f.dir]} ${c.vals.map(v => clN(v, 1)).join(' / ')} A` + (isNum(c.In) ? ` (${_r('typeplaat')} ${clN(c.In, 1)} A)` : '') + unb);
      if (!isNum(c.In)) miss = true; else if (c.over) over = true;
      if (unbBad(p, c)) over = true; if (c.three && c.n < 3) miss = true;
    }
    if (!any) return null;
    return { v: over ? 'nee' : miss ? '' : 'ja', note: parts.join(' · ') };
  },
  coil(p, s) { return s.np?.coils === 'none' ? { v: 'nvt', note: _r('geen batterijen') } : null; },
  drv(p, s) { // what has to be recorded per fan, by its drive; answered «yes» when every fan has a setting after balancing
    const fs = (s.fans || []).filter(f => f.dir === 'TA' || unitHas(s, f.dir)); if (!fs.length) return null;
    const what = { vfd: _r('fmin / fmax, aan- en uitloop'), ec: _r('setpoint van de EC-sturing'), speed2: '', trafo: '', belt: _r('riemspanning en uitlijning, poelies'), cflow: _r('setpoint debiet'), cpress: _r('setpoint druk'), fixed: _r('geen instelling') };
    const parts = fs.map(f => { const c = fanCtlVal(s, 'controle', f) || fanCtlVal(s, 'eerste', f); return `${fanName(s, f)}: ${[what[f.drive] || '', c ? ctlValR(c) : ''].filter(Boolean).join(' · ') || '-'}`; });
    if (fs.every(f => f.drive === 'fixed')) return { v: 'nvt', note: parts.join(' · ') };
    const done = fs.every(f => f.drive === 'fixed' || fanCtlVal(s, 'controle', f));
    return { v: done ? 'ja' : '', note: parts.join(' · ') };
  },
  wtw(p, s) { if (s.type !== 'TA' || s.rec === 'none') return { v: 'nvt', note: s.type !== 'TA' ? RLab().type[s.type] : RLab().rec.none }; return s.rec ? { v: '', note: RLab().rec[s.rec] } : null; },
  seq(p) {
    const gs = (p.groups || []).filter(g => g.members.length > 1); if (!gs.length) return { v: 'nvt', note: '' };
    return { v: '', note: gs.map(g => { const e = entryOf(p, g.members[0]); if (!e) return ''; const main = e.units.filter(u => roleOf(p, u.id) === 'main').map(u => u.code), rest = e.units.filter(u => roleOf(p, u.id) !== 'main').map(u => u.code);
      return g.link === 'cascade' ? `${entryCode(e)}: ${main.join(', ')} → ${rest.join(', ')} → ${_r('controle')} ${main.join(', ')}` : `${entryCode(e)}: ${RLab().link[g.link]}`; }).filter(Boolean).join(' · ') };
  },
  filt(p, s) {
    const ds = clDirs(s); const parts = []; let any = false, bad = false;
    for (const d of ds) {
      const f = s.meas?.controle?.['f' + d] ?? s.meas?.eerste?.['f' + d], end = s.np?.fEnd?.[d], cls = (s.np?.fClass?.[d] || '').trim();
      if (!isNum(f)) continue; any = true; if (isNum(end) && Math.abs(f) >= end) bad = true;
      parts.push(`${RL.pe[d]}${cls ? ' ' + cls : ''}: Δp ${clN(Math.abs(f))} Pa` + (isNum(end) ? ` (${_r('eind')} ${clN(end)} Pa)` : ''));
    }
    return any ? { v: bad ? 'nee' : 'ja', note: parts.join(' · ') } : null;
  },
  idx(p) {
    const parts = [];
    for (const s of clUnits(p)) for (const d of clDirs(s)) { const ix = pressureIndex(p, s.id, d, 'eerste'); if (ix) parts.push(`${s.code} ${RL.pe[d]}: ${ix.code}`); }
    return parts.length ? { v: 'ja', note: _r('drukindex') + ' ' + parts.join(' · ') } : null;
  },
  qtot(p, s) {
    const ds = clDirs(s); if (!ds.length) return null; const parts = []; let n = 0;
    for (const d of ds) { const q = systemQ(p, s, d, 'eerste') ?? mainDuctQ(p, s.id, d, 'eerste'); if (isNum(q)) { n++; parts.push(`${RL.pe[d]} ${clN(q)} m³/h`); } }
    if (!n) return null; const m = flowMethodText(s);
    return { v: n === ds.length ? 'ja' : '', note: parts.join(' · ') + (m ? ` (${m})` : '') };
  },
  ps(p, s) {
    const ds = clDirs(s); if (!ds.length) return null; const parts = []; let both = 0, pa = false;
    for (const d of ds) {
      const g = (k) => s.meas?.eerste?.[k + d] ?? s.meas?.controle?.[k + d]; const z = g('psz'), q = g('psp');
      if (isNum(z) && isNum(q)) { both++; parts.push(`${RL.pe[d]} ${_r('zuig')} ${clN(z)} Pa · ${_r('pers')} ${clN(q)} Pa`); }
      else if (isNum(g('pa'))) { pa = true; parts.push(`${RL.pe[d]} ${_r('externe druk')} ${clN(g('pa'))} Pa`); }
    }
    if (!both && !pa) return null;
    return { v: both === ds.length ? 'ja' : '', note: parts.join(' · ') };
  },
  branch(p) {
    const nodes = p.points.filter(x => isNode(x)); if (!nodes.length) return { v: 'nvt', note: '' };
    const done = nodes.filter(x => isNum(ptQ(p, x, 'eerste')) || x.status), miss = nodes.filter(x => !done.includes(x));
    if (!done.length) return null;
    return miss.length ? { v: 'nee', note: _r('niet gemeten: {list}', { list: clList(miss) }) } : { v: 'ja', note: _r('{n} knooppunten gemeten', { n: nodes.length }) };
  },
  main(p) { return clPos(p, p.points.filter(x => isNode(x) && hasReg(x) && !DEVICE_ONLY.includes(x.reg.type))); },
  term(p) { return clPos(p, p.points.filter(x => !isNode(x) && !isDev(x) && hasReg(x) && !DEVICE_ONLY.includes(x.reg.type))); },
  ctl(p) {
    const all = p.points.filter(measurable); if (!all.length) return null;
    const done = all.filter(x => isNum(ptQ(p, x, 'controle'))), skip = all.filter(x => x.status && !done.includes(x)), miss = all.filter(x => !done.includes(x) && !skip.includes(x));
    if (!done.length) return null;
    const ok = done.filter(x => ptStatus(x, p) === 'ok').length;
    const txt = _r('{a} van {b} binnen ±{t} %', { a: ok, b: done.length, t: clN(p.tol.terminal) });
    return miss.length ? { v: 'nee', note: txt + ' · ' + _r('niet gemeten: {list}', { list: clList(miss) }) } : { v: 'ja', note: txt };
  },
  pos(p) {
    const regs = p.points.filter(x => !isDev(x) && hasReg(x) && !DEVICE_ONLY.includes(x.reg.type)); if (!regs.length) return { v: 'nvt', note: '' };
    const done = regs.filter(x => String(x.reg.posAfter || '').trim()), locked = regs.filter(x => x.reg.locked).length;
    if (!done.length) return null;
    const txt = _r('{a} van {b} standen geregistreerd, {c} vergrendeld', { a: done.length, b: regs.length, c: locked });
    return { v: done.length === regs.length ? 'ja' : 'nee', note: txt };
  },
  bal(p, s) {
    const e = grpOf(p, s.id) ? entryOf(p, s.id) : null;
    if (e) { // a system of several units: the balance of the system
      const b = entryBalance(p, e, 'controle'); if (!isNum(b.T.qd) || !isNum(b.A.qd)) return { v: 'nvt', note: '' }; if (!isNum(b.T.q) || !isNum(b.A.q)) return null;
      const dT = devOf(b.T.q, b.T.qd), dA = devOf(b.A.q, b.A.qd), ok = inTol(dT, p.tol.system) && inTol(dA, p.tol.system); const pc = (x) => (x >= 0 ? '+' : '') + clN(x * 100, 1) + ' %';
      return { v: ok ? 'ja' : 'nee', note: `${_r('systeem')} ${entryCode(e)}: ${RL.pe.T} ${clN(b.T.q)} m³/h (${pc(dT)}) · ${RL.pe.A} ${clN(b.A.q)} m³/h (${pc(dA)}) · A/T ${clN(b.A.q / b.T.q, 2)} (${_r('ontwerp')} ${clN(b.A.qd / b.T.qd, 2)})` };
    }
    if (!isNum(s.design?.T) || !isNum(s.design?.A)) return { v: 'nvt', note: '' };
    const q = (d) => systemQ(p, s, d, 'controle') ?? mainDuctQ(p, s.id, d, 'controle'); const qT = q('T'), qA = q('A');
    if (!isNum(qT) || !isNum(qA)) return null;
    const dT = devOf(qT, s.design.T), dA = devOf(qA, s.design.A), ok = inTol(dT, p.tol.system) && inTol(dA, p.tol.system);
    const pc = (x) => (x >= 0 ? '+' : '') + clN(x * 100, 1) + ' %';
    return { v: ok ? 'ja' : 'nee', note: `${RL.pe.T} ${clN(qT)} m³/h (${pc(dT)}) · ${RL.pe.A} ${clN(qA)} m³/h (${pc(dA)}) · A/T ${clN(qA / qT, 2)} (${_r('ontwerp')} ${clN(s.design.A / s.design.T, 2)})` };
  },
  tab(p, s, o) { return o && o.building || p.report?.generatedAt ? { v: 'ja', note: '' } : { v: '', note: '', pending: true }; },
};
function clPos(p, regs) {
  if (!regs.length) return { v: 'nvt', note: '' };
  const done = regs.filter(x => String(x.reg.posAfter || '').trim()), miss = regs.filter(x => !done.includes(x));
  if (!done.length) return null;
  return miss.length ? { v: 'nee', note: _r('stand na ontbreekt: {list}', { list: clList(miss) }) } : { v: 'ja', note: _r('{n} regelorganen ingesteld', { n: regs.length }) };
}
/** a hint for a question before the report (not an answer): { v, note } */
const CL_SUGGEST = {
  docs(p) { const bad = p.points.filter(x => x.status === 'mismatch' || x.status === 'missing'); return bad.length ? { v: 'nee', note: _r('afwijkend of ontbrekend: {list}', { list: bad.map(x => `${x.code || '?'} (${(RL.status[x.status] || '').toLowerCase()})`).slice(0, 10).join(', ') }) } : null; },
  snd() { return { v: 'nvt', note: '' }; },
};
/** the answer of a step: the technician's, otherwise the rule's. { v, note, src: 'user' | 'auto' | '', auto, pending } */
function clGet(p, it, s, o) {
  const e = clStored(p, it.key, s && s.id);
  const r = CL_RULES[it.key] ? CL_RULES[it.key](p, s, o) : null;
  const un = e ? (e.note || '').trim() : '';
  if (e && !e.v && r && r.v) return { v: r.v, note: [r.note, un].filter(Boolean).join(' — '), src: 'auto', auto: r, at: e.at }; // auto answer with a remark of the technician
  if (e) return { v: e.v || '', note: un || (r && e.v === r.v ? r.note || '' : ''), src: e.v ? 'user' : '', auto: r, at: e.at };
  if (r && r.v) return { v: r.v, note: r.note || '', src: 'auto', auto: r };
  return { v: '', note: r ? r.note || '' : '', src: '', auto: r, pending: !!(r && r.pending) };
}
/** a per-unit step summed up for the project row */
function clSum(p, it, o) {
  const us = clUnits(p); if (!us.length) return { v: '', note: '', src: '' };
  const rs = us.map(s => ({ s, r: clGet(p, it, s, o) })); const vs = rs.map(x => x.r.v);
  const v = vs.every(x => x === 'nvt') ? 'nvt' : vs.includes('nee') ? 'nee' : vs.every(x => x === 'ja' || x === 'nvt') ? 'ja' : '';
  const src = rs.every(x => x.r.src === 'auto') ? 'auto' : rs.some(x => x.r.src) ? 'user' : '';
  const note = us.length > 1 ? rs.map(x => `${x.s.code}: ${x.r.v ? clWord(x.r.v) : _r('open')}`).join(' · ') : (rs[0].r.note || '');
  return { v, note, src };
}
/** answer word in the report */
function clWord(v) { return v === 'ja' ? RL.yes[1] : v === 'nee' ? RL.yes[0] : v === 'nvt' ? _r('n.v.t.') : _r('niet ingevuld'); }
/** project rows + per unit rows */
function clRows(p, o) {
  const main = CL.map(it => ({ it, r: it.scope === 'ahu' ? clSum(p, it, o) : clGet(p, it, null, o) }));
  const units = clUnits(p).map(s => ({ s, rows: CL.filter(it => it.scope === 'ahu').map(it => ({ it, r: clGet(p, it, s, o) })) }));
  return { main, units };
}
/** steps that are still open: final questions and auto steps without data (per unit for unit steps) */
function clOpen(p, o) {
  const out = [];
  for (const it of CL) {
    if (it.scope === 'ahu') { for (const s of clUnits(p)) { const r = clGet(p, it, s, o); if (!r.v && !r.pending) out.push({ it, s, r }); } }
    else { const r = clGet(p, it, null, o); if (!r.v && !r.pending) out.push({ it, s: null, r }); }
  }
  return out;
}
/** steps of the unit menu (before the first measurement) still open for a unit */
const clUnitOpen = (p, s) => CL.filter(it => it.when === 'ahu').filter(it => !clGet(p, it, s).v);
function clCounts(p, o) { const { main } = clRows(p, o); const c = { ja: 0, nee: 0, nvt: 0, open: 0 }; for (const x of main) c[x.r.v || 'open']++; return c; }

/* ---- unit: cone pressure + k-factor (flow at the fan) ---- */
/** flow at the inlet cone of the fan, in m³/h; k per side from the unit's documentation. Two formulas (np.kcF):
 *  'std' Q = k · √Δp, k for Q in m³/h or l/s (np.kcU) — most fan makers;
 *  'rho' Q = k · √(2 · Δp / ρ), k in m², Q in m³/s, ρ = air density of the project — the formula Trane units use (stated by the user, 28.10.2026). */
const rhoOf = (p) => isNum(p?.rho) && p.rho > 0 ? p.rho : 1.2;
function coneQ(s, dir, phase, p) {
  const np = s.np || {}; if (np.flowM !== 'cone') return null;
  const g = (k, dp) => np.kcF === 'rho' ? k * Math.sqrt(2 * Math.abs(dp) / rhoOf(p)) * 3600 : k * Math.sqrt(Math.abs(dp)) * (np.kcU === 'ls' ? 3.6 : 1);
  const fs = fansOf(s, dir).filter(f => isNum(f.kc) && f.kc > 0);
  if (fs.length) { let q = 0, n = 0; for (const f of fs) { const dp = fanM(s, phase, f).dpc; if (isNum(dp)) { q += (f.n || 1) * g(f.kc, dp); n++; } } return n === fs.length ? q : null; } // every fan of the side needs its reading
  const k = np.kc && np.kc[dir], dp = s.meas && s.meas[phase] && s.meas[phase]['dpc' + dir]; // before 0.9: one k and one cone pressure per side
  if (!isNum(k) || !(k > 0) || !isNum(dp)) return null;
  return np.kcF === 'rho' ? k * Math.sqrt(2 * Math.abs(dp) / rhoOf(p)) * 3600 : k * Math.sqrt(Math.abs(dp)) * (np.kcU === 'ls' ? 3.6 : 1);
}
/** the cone pressure that gives the design flow */
function coneDpFor(s, dir, p) {
  const np = s.np || {}; const k = np.kc && np.kc[dir], q = s.design && s.design[dir];
  if (np.flowM !== 'cone' || !isNum(k) || !(k > 0) || !isNum(q)) return null;
  if (np.kcF === 'rho') { const v = q / 3600 / k; return rhoOf(p) * v * v / 2; }
  return (q / (k * (np.kcU === 'ls' ? 3.6 : 1))) ** 2;
}
const coneFormula = (np) => np && np.kcF === 'rho' ? 'Q = k·√(2·Δp/ρ)' : 'Q = k·√Δp';
/** nameplate and datasheet data of a unit */
function NP0() { return { iNom: { T: null, A: null }, coils: '', fClass: { T: '', A: '' }, f0: { T: null, A: null }, fEnd: { T: null, A: null }, flowM: '', kc: { T: null, A: null }, kcU: 'm3h', kcF: 'std' }; }
function npFix(s) { const d = NP0(); const n = Object.assign(d, s.np || {}); for (const k of ['iNom', 'fClass', 'f0', 'fEnd', 'kc']) n[k] = Object.assign({}, d[k], (s.np || {})[k] || {}); s.np = n; return s; }
/** working point of a unit in the report language (step 11) */
function wpTextR(p, s) {
  const ph = ['controle', 'eerste'].find(f => clDirs(s).some(d => isNum(systemQ(p, s, d, f) ?? mainDuctQ(p, s.id, d, f)))); if (!ph) return '';
  return _r('werkpunt') + ' ' + clDirs(s).map(d => {
    const m = s.meas[ph] || {}; const q = systemQ(p, s, d, ph) ?? mainDuctQ(p, s.id, d, ph);
    const dp = isNum(m['psp' + d]) && isNum(m['psz' + d]) ? Math.abs(m['psp' + d] - m['psz' + d]) : isNum(m['pa' + d]) ? Math.abs(m['pa' + d]) : null;
    return [RL.pe[d], isNum(q) ? nl(q) + ' m³/h' : '', isNum(dp) ? nl(dp) + ' Pa' : '', dirSetText(s, ph, d, true)].filter(Boolean).join(' ');
  }).join(' · ');
}
