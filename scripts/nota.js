/* ---------- explanatory note (toelichtende nota): foreword, normative framework, way of working, conclusion ----------
   Texts in the report language. The normative framework comes from the project block «Normen» (p.norm): region, use,
   kind of works, date of the permit application, workplace, open to the public, IDA class, occupancy.
   NORMS is the one list of rules the note can cite; checked on the official sites on 28.10.2026 (links in README, «Источники норм»):
   Vlaanderen — EPB-pedia Energiebesluit bijlage IX (woongebouwen, NBN D 50-001) and bijlage X (niet-residentieel, IDA3 / NBN EN 13779,
   NBN EN 12599; versions per permit date), kwaliteitskader ventilatie (STS-P 73-1); Wallonie — AGW PEB 2026 annexes C2 / C3;
   Brussel — Arrêté Exigences PEB annexe XXVII (VHNR); federal — KB 2.5.2019 (werklokalen), law on indoor air in places open to the public.
   Bijlage X for applications from 1.1.2027 («HVNR», bvr 29.05.2026, BS 10.07.2026) read in full on 28.10.2026: same requirements as the
   previous version, the only change (marked in blue) is a new row in table 1 — tennishal, padelhal, petanquehal 10 m² per person.
   Used here: § 7.1 IDA3 in m³/h, § 7.2.2 toilets / showers, § 7.4 no IDA-C1 / IDA-C2, § 6.2.1 + § 7.5 pressure condition, § 7.13 NBN EN 12599. */
function NORM0() { return { region: '', use: '', works: '', permit: '', work: false, pub: false, ida: '', occ: null, vol: null }; }
const normOf = (p) => Object.assign(NORM0(), p.norm || {});
const NORM_REGION = () => ({ vl: _r('Vlaams Gewest'), bru: _r('Brussels Hoofdstedelijk Gewest'), wal: _r('Waals Gewest') });
const NORM_USE = () => ({ res: _r('residentieel'), nres: _r('niet-residentieel'), ind: _r('industrieel') });
const NORM_WORKS = () => ({ new: _r('nieuwbouw'), ier: _r('ingrijpende energetische renovatie'), reno: _r('renovatie') });
/** version of an EPB annex by the date of the permit application */
function normVersion(n, cuts) { if (!n.permit) return ''; for (const [from, txt] of cuts) if (n.permit >= from) return txt; return _r('versie volgens de datum van de bouwaanvraag'); }
const isNres = (n) => n.use === 'nres' || n.use === 'ind';
/** the documents the note cites: { id, title, text } */
const NORMS = [
  { id: 'en12599', when: () => true,
    title: () => 'NBN EN 12599', text: () => _r('Ventilatie voor gebouwen — beproevings- en meetmethoden voor de oplevering van luchtbehandelings- en ventilatiesystemen. De metingen en controles bij de oplevering volgen deze norm.') },
  { id: 'vl-res', when: (n) => n.region === 'vl' && n.use === 'res',
    title: (n) => [_r('Energiebesluit, bijlage IX'), normVersion(n, [['2022-01-01', _r('versie voor bouwaanvragen vanaf 1 januari 2022')]])].filter(Boolean).join(' — '),
    text: () => _r('Ventilatie van woongebouwen volgens NBN D 50-001, met de uitzonderingen en aanvullingen van de bijlage.') },
  { id: 'vl-vpv', when: (n) => n.region === 'vl' && n.use === 'res' && (n.works === 'new' || n.works === 'ier') && (!n.permit || n.permit >= '2016-01-01'),
    title: () => _r('Kwaliteitskader ventilatie (STS-P 73-1)'), text: () => _r('Voor nieuwbouw en ingrijpende energetische renovatie van woningen is een ventilatieprestatieverslag vereist, op te maken door een ventilatieverslaggever.') },
  { id: 'vl-nres', when: (n) => n.region === 'vl' && isNres(n),
    title: (n) => [_r('Energiebesluit, bijlage X'), normVersion(n, [['2027-01-01', _r('versie voor bouwaanvragen vanaf 1 januari 2027')], ['2022-01-01', _r('versie voor bouwaanvragen van 1 januari 2022 tot en met 31 december 2026')]])].filter(Boolean).join(' — '),
    text: () => _r('Ventilatie van niet-residentiële gebouwen: ontwerpdebiet minstens het minimum van binnenluchtklasse IDA3 volgens NBN EN 13779 (bezette ruimten 22 m³/h per persoon, bezetting minstens volgens tabel 1 van de bijlage; toiletten 25 m³/h per wc of 15 m³/h per m²; douches en badkamers 5 m³/h per m², minstens 50 m³/h); regelsystemen IDA-C1 en IDA-C2 zijn niet toegelaten; de drukvoorwaarde ligt in elke ventilatiezone tussen −5 Pa en +10 Pa. De prestaties van mechanische systemen worden bepaald volgens NBN EN 12599; het debiet van elke toevoer- en afvoeropening wordt uitgedrukt in m³/h, afgerond op de eenheid.') },
  { id: 'wal-res', when: (n) => n.region === 'wal' && n.use === 'res',
    title: (n) => [_r('AGW PEB, annexe C2 (VHR) — Waals Gewest'), normVersion(n, [['2026-01-01', _r('versie voor aanvragen na 31 december 2025')]])].filter(Boolean).join(' — '),
    text: () => _r('Ventilatie van woongebouwen volgens NBN D 50-001, met de uitzonderingen van de bijlage; bij nominaal toerental moeten de minimale debieten overal tegelijk gehaald worden.') },
  { id: 'wal-nres', when: (n) => n.region === 'wal' && isNres(n),
    title: (n) => [_r('AGW PEB, annexe C3 (VHN) — Waals Gewest'), normVersion(n, [['2026-01-01', _r('versie voor aanvragen na 31 december 2025')]])].filter(Boolean).join(' — '),
    text: () => _r('Ventilatie van niet-residentiële gebouwen: ontwerpdebiet minstens volgens binnenluchtklasse IDA3 van NBN EN 13779; de prestaties worden bepaald volgens NBN EN 12599.') },
  { id: 'bru-res', when: (n) => n.region === 'bru' && n.use === 'res',
    title: () => _r('EPB-eisen Brussels Hoofdstedelijk Gewest — woningen'), text: () => _r('Ventilatie van woningen volgens NBN D 50-001, met de afwijkingen van de EPB-eisen.') },
  { id: 'bru-nres', when: (n) => n.region === 'bru' && isNres(n),
    title: () => _r('Besluit Eisen EPB, bijlage XXVII (VHNR) — Brussels Hoofdstedelijk Gewest'),
    text: () => _r('Ventilatie van niet-residentiële gebouwen: ontwerpdebiet minstens volgens binnenluchtklasse IDA3 van NBN EN 13779 (bezette ruimten minstens 22 m³/h per persoon); de prestaties worden bepaald volgens NBN EN 12599.') },
  { id: 'work', when: (n) => n.work,
    title: () => _r('Codex over het welzijn op het werk — binnenluchtkwaliteit in werklokalen (KB 2 mei 2019)'),
    text: () => _r('CO₂ doorgaans onder 900 ppm of minstens 40 m³/h verse lucht per aanwezige persoon; met een risicoanalyse 1200 ppm of 25 m³/h per persoon. Geldt voor nieuwe gebouwen en ingrijpende renovaties vanaf 1 januari 2020; voor bestaande werklokalen een actieplan.') },
  { id: 'pub', when: (n) => n.pub,
    title: () => _r('Wet betreffende de verbetering van de binnenluchtkwaliteit in gesloten plaatsen die toegankelijk zijn voor het publiek'),
    text: () => _r('Luchtkwaliteitsmeter, risicoanalyse en actieplan verplicht vanaf 1 januari 2027. Richtwaarden: niveau A CO₂ < 900 ppm of 40 m³/h per persoon, niveau B < 1200 ppm of 25 m³/h per persoon.') },
];
function normsFor(p) { const n = normOf(p); return NORMS.filter(x => x.when(n)).map(x => ({ id: x.id, title: x.title(n), text: x.text(n) })); }
/** outdoor air per person: Σ supply after balancing / occupancy, against the rule that applies */
function perPersonText(p) {
  const n = normOf(p); if (!isNum(n.occ) || n.occ <= 0) return '';
  let q = 0, k = 0; for (const s of p.systems) { if (!isNum(s.design?.T)) continue; const v = systemQ(p, s, 'T', 'controle') ?? mainDuctQ(p, s.id, 'T', 'controle'); if (isNum(v)) { q += v; k++; } }
  if (!k) return '';
  const pp = q / n.occ; const ref = n.work || n.pub ? 40 : (n.region === 'bru' || n.region === 'vl') && isNres(n) ? 22 : null;
  return _r('Verse lucht na het inregelen: {q} m³/h voor {n} personen = {pp} m³/h per persoon', { q: nl(q), n: nl(n.occ), pp: nl(pp, 1) })
    + (ref ? ' — ' + (pp >= ref ? _r('voldoet aan {r} m³/h per persoon', { r: ref }) : _r('lager dan {r} m³/h per persoon', { r: ref })) : '') + '.';
}
/** pressure condition, Vlaanderen bijlage X § 6.2.1 and § 7.5: PC = sign(qs − qe) · (|qs − qe| / V50)^(1 / 0,65) · 50 Pa with V50 = V m³/h
 *  (V = volume on outer dimensions); −5 Pa ≤ PC ≤ +10 Pa. Flows after balancing, all units together; null when something is missing. */
function pcCheck(p) {
  const n = normOf(p); if (n.region !== 'vl' || !isNres(n) || !isNum(n.vol) || n.vol <= 0) return null;
  const tot = { T: 0, A: 0 }; let k = 0;
  for (const s of p.systems) for (const d of ['T', 'A']) {
    if (!isNum(s.design?.[d])) continue;
    const v = systemQ(p, s, d, 'controle') ?? mainDuctQ(p, s.id, d, 'controle'); if (!isNum(v)) return null; tot[d] += v; k++;
  }
  if (!k) return null;
  const dq = tot.T - tot.A, pc = Math.sign(dq) * Math.pow(Math.abs(dq) / n.vol, 1 / 0.65) * 50;
  return { qs: tot.T, qe: tot.A, v: n.vol, pc, ok: pc >= -5 && pc <= 10, multi: p.systems.length > 1 };
}
const pcFmt = (pc) => (pc >= 0.05 ? '+' : '') + nl(pc, 1);
function pcText(p) {
  const r = pcCheck(p); if (!r) return '';
  return _r('Drukvoorwaarde (bijlage X, § 7.5): toevoer {qs} m³/h, afvoer {qe} m³/h, volume {v} m³ — PC = {pc} Pa, {res}.', { qs: nl(r.qs), qe: nl(r.qe), v: nl(r.v), pc: pcFmt(r.pc),
    res: r.ok ? _r('binnen de grenzen van −5 Pa tot +10 Pa') : _r('buiten de grenzen van −5 Pa tot +10 Pa') })
    + (r.multi ? ' ' + _r('Berekend voor alle gemeten systemen samen; de eis geldt per ventilatiezone.') : '');
}
/** rooms: the sum of the grilles per room against the design (EN 12599 table 3) */
function roomText(p) {
  const rs = roomSums(p); if (!rs.length) return '';
  const done = rs.filter(r => r.dev != null), bad = done.filter(r => !r.ok), part = rs.filter(r => r.dev == null);
  if (!done.length && !part.length) return '';
  return _r('Debiet per ruimte (som van de eindapparaten, NBN EN 12599 tabel 3): {a} van {b} ruimten binnen ±{t} %.', { a: done.length - bad.length, b: done.length, t: nl(p.tol.room) })
    + (bad.length ? ' ' + _r('Buiten tolerantie: {list}.', { list: bad.map(r => `${r.room} ${RL.pe[r.dir]} ${(r.dev >= 0 ? '+' : '') + nl(r.dev * 100, 1)} %`).join(', ') }) : '')
    + (part.length ? ' ' + _r('Onvolledig (niet alle eindapparaten gemeten of zonder ontwerpdebiet): {n}.', { n: part.length }) : '');
}
/** foreword of the note: what, where, under which rules, in which order */
function notaVoorwoord(p) {
  const n = normOf(p); const lg = p.systems.map(s => s.code).filter(Boolean).join(', ');
  const what = [n.use ? _r('een {u} gebouw', { u: NORM_USE()[n.use] }) : '', n.region ? _r('in het {g}', { g: NORM_REGION()[n.region] }) : '', n.works ? '(' + NORM_WORKS()[n.works] + ')' : ''].filter(Boolean).join(' ');
  const s1 = _r('Deze nota beschrijft de inbedrijfstelling en het inregelen van de ventilatie-installatie {lg} van {gebouw}', { lg: lg || '-', gebouw: p.info.name || _r('het project') })
    + (p.info.address ? ', ' + p.info.address : '') + (what ? ', ' + what : '') + '.';
  const ns = normsFor(p).filter(x => x.id !== 'en12599' && x.id !== 'work' && x.id !== 'pub');
  const s2 = ns.length ? _r('De ontwerpdebieten volgen {doc}; de metingen en controles bij de oplevering volgen NBN EN 12599.', { doc: ns.map(x => x.title).join(_r(' en ')) }) : _r('De metingen en controles bij de oplevering volgen NBN EN 12599.');
  const n2 = normOf(p); const s3 = n2.ida ? ' ' + _r('Ontwerp: binnenluchtklasse {c}.', { c: n2.ida }) : '';
  const s4 = _r('De nota volgt de werkvolgorde op de werf: controle van de installatie en proefdraaien, eerste meting bij open kleppen, proportioneel inregelen, controlemeting en vastleggen van de standen.');
  return [s1, s2 + s3, s4].join(' ');
}
/** way of working, in the order of the works; the checklist answers decide what is said */
function notaWerkwijze(p) {
  const ja = (k, s) => clGet(p, clItem(k), s || null).v === 'ja';
  const units = clUnits(p); const allU = (k) => units.length && units.every(s => ['ja', 'nvt'].includes(clGet(p, clItem(k), s).v));
  const out = [];
  const pre = [ja('docs') && _r('controle van de installatie aan de hand van de ontwerpdocumentatie'), ja('mount') && _r('herstel van zichtbare montagefouten en lekkages'), ja('trial') && _r('proefdraaien gedurende minstens 7 uur'),
    allU('rot') && _r('controle van de draairichting van de ventilatoren'), allU('filt') && _r('controle van de filters')].filter(Boolean);
  out.push(_r('Voorbereiding: {list}.', { list: pre.length ? pre.join(', ') : _r('zie de checklist inbedrijfstelling') }));
  out.push(_r('Eerste meting bij volledig open kleppen: debiet per meetpunt en statische druk vóór elk knooppunt; het punt met de laagste druk is de drukindex.'));
  out.push(_r('Proportioneel inregelen van onder naar boven: eindorganen per master naar de verhouding van de debietindex, daarna de masters onderling en de takken; binnen elk niveau van de hoogste naar de laagste verhouding, de indexgroep blijft open en komt als laatste.'));
  const fan = p.systems.flatMap(s => (s.fans || []).map(f => { const a = fanCtlVal(s, 'eerste', f), b = fanCtlVal(s, 'controle', f); return a && b && a.k === b.k && Math.abs(a.v - b.v) > 0.05 ? `${s.code} ${fanName(s, f)} ${ctlValR(a)} → ${ctlValR(b)}` : ''; })).filter(Boolean);
  out.push(_r('Ventilator bijstellen tot de debietindex het ontwerpdebiet haalt') + (fan.length ? ' (' + fan.join(' · ') + ')' : '') + '.');
  out.push(_r('Controlemeting na het inregelen, statische drukken herhalen en de standen vastleggen (verf, verzegeling of registratie).'));
  return out;
}
/** methods and instruments actually used: [{ m, n, ins: [instrument] }] */
function methodsUse(p) {
  const by = {};
  for (const pt of p.points.filter(measurable)) for (const ph of ['eerste', 'controle']) {
    if (!readings(pt, ph).length && !isNum(calcQ(pt, ph, p).q)) continue;
    const o = by[pt.method] = by[pt.method] || { m: pt.method, pts: new Set(), ins: new Set() }; o.pts.add(pt.id); const id = pt.meas?.[ph]?.ins; if (id) o.ins.add(id);
  }
  return Object.values(by).map(o => ({ m: o.m, n: o.pts.size, ins: [...o.ins].map(id => p.instruments.find(i => i.id === id)).filter(Boolean) })).sort((a, b) => b.n - a.n);
}
const insLabelR = (i) => [i.name, i.type].filter(Boolean).join(' ') + [i.serial && 'SN ' + i.serial, i.cal && _r('gekalibreerd op {d}', { d: dateNL(i.cal) })].filter(Boolean).map(x => ', ' + x).join('');
/** the conclusion in three paragraphs: methods and instruments · start-up and order of the works · result */
function genConclusionParts(p) {
  const P1 = [];
  const mu = methodsUse(p);
  const lc1 = (t) => t ? t[0].toLowerCase() + t.slice(1) : t;
  if (mu.length) P1.push(_r('De debieten werden gemeten met {list}.', { list: mu.map(x => {
    const m = lc1(RL.method[x.m] || x.m), ins = x.ins.map(insLabelR); const nm = x.ins.length === 1 ? [x.ins[0].name, x.ins[0].type].filter(Boolean).join(' ') : '';
    const same = nm && nm.toLowerCase().startsWith(m.split(' ')[0]); const det = same ? [x.ins[0].serial && 'SN ' + x.ins[0].serial, x.ins[0].cal && _r('gekalibreerd op {d}', { d: dateNL(x.ins[0].cal) })].filter(Boolean).join(', ') : '';
    return `${same ? lc1(nm) + (det ? ' (' + det + ')' : '') : m + (ins.length ? ' (' + ins.join('; ') + ')' : '')} ${x.n === 1 ? _r('op 1 meetpunt') : _r('op {n} meetpunten', { n: x.n })}`; }).join(', ') }));
  for (const s of p.systems) { const m = flowMethodText(s); if (m) P1.push(_r('Het totaaldebiet van {s} werd bepaald via {m}.', { s: s.code, m })); }
  P1.push(_r('Het inregelen gebeurde volgens de proportionele methode: van onder naar boven, binnen elk niveau van de groep met de hoogste verhouding naar de indexgroep, met de debietindex volledig open als referentie.'));
  const P2 = [];
  const units = clUnits(p);
  const pre = [clGet(p, clItem('docs')).v === 'ja' && _r('de installatie werd gecontroleerd aan de hand van de ontwerpdocumentatie'), clGet(p, clItem('mount')).v === 'ja' && _r('zichtbare montagefouten en lekkages werden hersteld'),
    clGet(p, clItem('trial')).v === 'ja' && _r('de installatie werd minstens 7 uur proefgedraaid'), units.length && units.every(s => clGet(p, clItem('rot'), s).v === 'ja') && _r('de draairichting van de ventilatoren werd gecontroleerd')].filter(Boolean);
  if (pre.length) P2.push(_r('Vóór de metingen: {list}.', { list: pre.join('; ') }));
  const nee = clRows(p).main.filter(x => x.r.v === 'nee'); if (nee.length) P2.push(_r('Afwijkend in de checklist: {list}.', { list: nee.map(x => `${x.it.n}. ${_r(x.it.nl)}${x.r.note ? ' (' + x.r.note + ')' : ''}`).join('; ') }));
  P2.push(_r('De eerste meting gebeurde met alle kleppen open; daarna werd van onder naar boven ingeregeld en werden de standen vastgelegd.'));
  for (const s of p.systems) for (const f of s.fans || []) { const a = fanCtlVal(s, 'eerste', f), b = fanCtlVal(s, 'controle', f); if (!a || !b || a.k !== b.k) continue;
    const nm = `${s.code} ${fanName(s, f)}`, pe = RL.pe[f.dir === 'TA' ? 'T' : f.dir];
    P2.push(Math.abs(a.v - b.v) > 0.05 ? _r('Ventilator {s} {pe}: bijgesteld van {a} naar {b}.', { s: nm, pe, a: ctlValR(a), b: ctlValR(b) }) : _r('Ventilator {s} {pe}: {a}, ongewijzigd.', { s: nm, pe, a: ctlValR(a) })); }
  const P3 = [];
  for (const s of p.systems) for (const dir of ['T', 'A']) {
    const qd = s.design[dir]; const q = systemQ(p, s, dir, 'controle') ?? mainDuctQ(p, s.id, dir, 'controle'); const d = devOf(q, qd);
    if (isNum(d)) P3.push(_r('{s} {dir}: gemeten {q} m³/h t.o.v. ontwerp {qd} m³/h ({d} %), {inout} de tolerantie van ±{t} %.', { s: s.code, dir: RL.dir[dir].toLowerCase(), q: nl(q), qd: nl(qd), d: (d >= 0 ? '+' : '') + nl(d * 100, 1), inout: inTol(d, p.tol.system) ? _r('binnen') : _r('buiten'), t: nl(p.tol.system) }));
  }
  const all = p.points.filter(measurable); const done = all.filter(pt => isNum(ptQ(p, pt, 'controle'))); const nok = done.filter(pt => ptStatus(pt, p) === 'nok');
  if (done.length) {
    const worst = done.map(pt => ({ pt, d: ptDev(pt, p) })).filter(x => isNum(x.d)).sort((a, b) => Math.abs(b.d) - Math.abs(a.d))[0];
    P3.push((nok.length ? _r('{a} van {b} meetpunten liggen binnen de tolerantie van ±{t} %. Buiten tolerantie: {list}.', { a: done.length - nok.length, b: done.length, t: nl(p.tol.terminal), list: nok.map(x => x.code).join(', ') })
      : _r('Alle {n} meetpunten liggen binnen de tolerantie van ±{t} % van het ontwerpdebiet.', { n: done.length, t: nl(p.tol.terminal) }))
      + (worst ? ' ' + _r('De grootste afwijking is {d} % ({code}).', { d: (worst.d >= 0 ? '+' : '') + nl(worst.d * 100, 1), code: worst.pt.code || '?' }) : ''));
  }
  { const rt = roomText(p); if (rt) P3.push(rt); }
  for (const g of pressureGroups(p)) { const a = indexText(g, 'eerste'), b = indexText(g, 'controle'); if (a || b) P3.push(_r('Drukindex {s} {pe} — vóór: {a}; na: {b}.', { s: g.s.code, pe: RL.pe[g.dir], a: a || '-', b: b || '-' })); }
  for (const e of sysEntries(p)) { const s = e.units[0]; const r = CL_RULES.bal(p, s); if (r && r.v && r.v !== 'nvt') P3.push(e.g ? _r('Balans {note}.', { note: r.note }) : _r('Balans {s}: {note}.', { s: s.code, note: r.note })); } // a system of several units once
  const pp = perPersonText(p); if (pp) P3.push(pp);
  const pcT = pcText(p); if (pcT) P3.push(pcT);
  const stp = all.filter(pt => pt.status && !isNum(ptQ(p, pt, 'controle'))); if (stp.length) P3.push(_r('Niet gemeten zoals voorzien: {list}.', { list: stp.map(x => `${x.code} (${RL.status[x.status].toLowerCase()})`).join(', ') }));
  const rest = all.length - done.length - stp.length; if (rest > 0) P3.push(_r('{n} meetpunt(en) niet gecontroleerd.', { n: rest }));
  const ds = damperSentence(p); if (ds) P3.push(ds);
  const open = clOpen(p).length; if (open) P3.push(_r('Open stappen in de checklist inbedrijfstelling: {n}.', { n: open }));
  return [P1.join(' '), P2.join(' '), P3.join(' ')].filter(Boolean);
}
function genConclusion(p) { return genConclusionParts(p).join('\n\n'); }
