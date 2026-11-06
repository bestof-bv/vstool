/* ---------- catalogue of the manufacturers' technical sheets (TF): iris dampers, control dampers, CAV / VAV controllers ----------
   An entry is one product size. Built-in entries (CAT_LIB) come only from official manufacturer documents (source and date on every entry);
   own entries are typed in or imported from the Excel template and are kept on this device (Settings.v.catalog).
   A point links an entry with pt.reg.cat; the project keeps a copy in p.cat, so the project file, crew packages and reports carry the data along.
   entry = { id, maker, series, kind: iris | regelklep | cav | vav, dn (mm), size (text, rectangular), kU: 'ls' | 'm3h' (unit of k),
             k (one k for the measuring taps), kPos: [[position, k], …] (k per damper position), posOpen (position = fully open),
             qmin, qmax (m³/h), dpmin (Pa, constant), dpQmax (Pa at qmax — Δp min ~ Q²), dpmax (Pa, highest allowed Δp), src (URL of the official sheet), doc (title, date), note, lib } */
const CAT_KINDS = ['iris', 'regelklep', 'cav', 'vav'];
function CAT0() { return { id: '', maker: '', series: '', kind: 'iris', dn: null, size: '', kU: 'ls', k: null, kPos: [], posOpen: '', qmin: null, qmax: null, dpmin: null, dpQmax: null, dpmax: null, src: '', doc: '', note: '', lib: false }; }

/* built-in library: values copied from the official documents named in src / doc (checked 28.10.2026; Grada 04.11.2026) */
const CAT_LIB = (() => {
  const out = [];
  // TROX IRIS — «Innreguleringsdata for IRIS», TROX Auranor (Norway), 06.11.2019: q [l/s] = k · √Δp [Pa], measured at the damper's taps; position 1 = open, 8 = closed
  const TP = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8];
  const TI = {
    80: [6.1, null, 4.1, null, 3.2, null, 2.3, null, 1.4, null, 0.9, null, 0.6, null, null],
    100: [10.4, 7.9, 7.5, 6.6, 6.0, 5.2, 4.5, 3.8, 3.4, 2.9, 2.5, 2.1, 1.7, 1.2, 0.9],
    125: [13.8, 10.4, 8.8, 7.3, 6.5, 5.5, 4.7, 4.0, 3.5, 3.1, 2.7, 2.2, 1.5, null, null],
    160: [22.1, 17.2, 14.8, 13.4, 12.5, 11.5, 10.7, 9.5, 8.5, 7.5, 6.8, 5.6, 4.9, 4.0, 3.5],
    200: [44.2, 36.6, 30.9, 26.9, 23.2, 20.6, 18.2, 15.9, 14.0, 12.3, 11.0, 9.6, 8.4, 6.5, 5.0],
    250: [64.4, 53.5, 45.6, 41.8, 38.7, 34.5, 30.7, 27.3, 24.1, 21.4, 18.4, 15.8, 12.8, 10.9, 8.9],
    315: [118, 88.3, 70.0, 64.5, 58.7, 53.0, 45.1, 42.4, 37.0, 33.3, 30.0, 25.9, 21.8, 19.0, 15.8],
    400: [131, null, 102, null, 88.3, null, 67.3, null, 52.7, null, 38.5, null, 28.4, null, 15.5],
    500: [230, null, 177, null, 146, null, 112, null, 88.5, null, 66.6, null, 48.0, null, 30],
    630: [451, null, 297, null, 238, null, 169, null, 127, null, 91.6, null, 62.8, null, 35.1],
    800: [489, null, 402, null, 344, null, 267, null, 217, null, 170, null, 122, null, 73.7],
  };
  for (const [dn, ks] of Object.entries(TI)) out.push(Object.assign(CAT0(), { id: 'lib:trox-iris-' + dn, maker: 'TROX', series: 'IRIS', kind: 'iris', dn: +dn, kU: 'ls', posOpen: '1',
    kPos: TP.map((a, i) => [a, ks[i]]).filter(([, k]) => k != null),
    src: 'https://cdn.trox.de/bd07a5c26d3b3c1c/37c752ff8bca/NO0813-K-faktorblad_-IRIS.pdf', doc: 'TROX — Innreguleringsdata for IRIS, 06.11.2019', note: 'q [l/s] = k · √Δp; stand 1 = open, 8 = dicht', lib: true }));
  // Halton PRA — halton.com product page «Adjustment and measurement unit PRA», k-factor tables (l/s with Δpm in Pa); opening a: 1 = most closed … 6 = open
  const HP = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6], HW = [1, 2, 3, 4, 5, 6];
  const HA = {
    100: [1.8, 2.1, 2.4, 2.7, 3.1, 3.6, 4.1, 4.7, 5.5, 6.4, 7.8], 125: [2.5, 2.9, 3.3, 3.8, 4.4, 5, 5.9, 6.8, 7.9, 9.5, 11.6],
    160: [4.1, 4.7, 5.5, 6.4, 7.6, 9, 10.6, 12.6, 15, 18.2, 22.9], 200: [7.1, 8, 8.8, 10, 11.4, 13.1, 15.1, 17.5, 20.5, 24.2, 29],
    250: [10.5, 11.9, 13.8, 16.1, 18.9, 22, 25.6, 30.1, 35.8, 42.9, 52.8], 315: [18.3, 21.8, 26, 30.7, 36.5, 43.3, 51.3, 61.5, 74.3, 92.6, 120.2],
    350: [17.6, 24.3, 35.2, 50, 71.6, 99], 400: [20.5, 26.5, 36.5, 55, 86, 137], 500: [27.5, 39, 59, 86, 123, 175], 630: [65, 90, 115, 154, 202, 295], 800: [98, 137, 198, 280, 393, 570],
  };
  for (const [dn, ks] of Object.entries(HA)) { const pos = ks.length === HP.length ? HP : HW;
    out.push(Object.assign(CAT0(), { id: 'lib:halton-pra-' + dn, maker: 'Halton', series: 'PRA', kind: 'iris', dn: +dn, kU: 'ls', posOpen: '6', kPos: pos.map((a, i) => [a, ks[i]]),
      src: 'https://www.halton.com/products/adjustment-and-measurement-unit-pra-en_us/', doc: 'Halton PRA — adjustment and measurement unit, k-factor tables', note: 'q [l/s] = k · √Δpm; opening a = 6 open, a = 1 most closed; installation corrections per Halton', lib: true })); }
  // TROX TVR (VAV, Easy controller, dynamic measurement, basic unit) — product data sheet PD-08/2026: qv min / qv max and Δpst,min at qv max
  const TV = { 100: [34, 341, 71], 125: [55, 558, 75], 160: [88, 896, 69], 200: [143, 1459, 67], 250: [216, 2212, 46], 315: [359, 3673, 31], 400: [591, 6058, 25] };
  for (const [dn, [a, b, dp]] of Object.entries(TV)) out.push(Object.assign(CAT0(), { id: 'lib:trox-tvr-' + dn, maker: 'TROX', series: 'TVR (Easy)', kind: 'vav', dn: +dn, qmin: a, qmax: b, dpQmax: dp,
    src: 'https://cdn.trox.de/aa453eca605bdc74/a2fc9207d71b/TVR_PD_2026_08_04_DE_en.pdf', doc: 'TROX TVR product data sheet PD-08/2026', note: 'Δpst,min basic unit, dynamic measurement; Δpst,min = 1 Pa at qv min', lib: true }));
  // TROX RN (mechanical CAV) — product data sheet PD-06/2026: volume flow range per nominal size; minimum differential pressure 50 Pa (NS 80: 100 Pa)
  const RN = { 80: [40, 162], 100: [79, 324], 125: [126, 504], 160: [216, 864], 200: [324, 1296], 250: [522, 2088], 315: [828, 3312], 400: [1260, 5040] };
  for (const [dn, [a, b]] of Object.entries(RN)) out.push(Object.assign(CAT0(), { id: 'lib:trox-rn-' + dn, maker: 'TROX', series: 'RN', kind: 'cav', dn: +dn, qmin: a, qmax: b, dpmin: +dn === 80 ? 100 : 50,
    src: 'https://cdn.trox.de/b05c440d9283e740/a68a74c9ba7e/RN_PD_2026_06_22_DE_en.pdf', doc: 'TROX RN product data sheet PD-06/2026', note: 'mechanical self-powered CAV; minimum differential pressure 50 Pa (NS 80: 100 Pa)', lib: true }));
  // TROX VFC (mechanical CAV for low flows, set by a rotary knob) — product data sheet PD-02/2026: Δp 30…500 Pa, accuracy ≈ ±10 % of the nominal flow;
  // flow per size = lowest and highest flow of the «Quick sizing» table (the sheet gives 6…370 l/s overall, control range ≈ 10…100 % of the nominal flow)
  const VF = { 80: [22, 151], 100: [22, 234], 125: [36, 360], 160: [65, 666], 200: [90, 900], 250: [133, 1332] };
  for (const [dn, [a, b]] of Object.entries(VF)) out.push(Object.assign(CAT0(), { id: 'lib:trox-vfc-' + dn, maker: 'TROX', series: 'VFC', kind: 'cav', dn: +dn, qmin: a, qmax: b, dpmin: 30, dpmax: 500,
    src: 'https://www.trox.de/en/downloads/190dad95da13642a/VFC_PD_2026_02_14_DE_en.pdf?type=product_info', doc: 'TROX VFC product data sheet PD-02/2026',
    note: 'mechanical CAV for low flows; Δp 30…500 Pa; accuracy ≈ ±10 % of the nominal flow; set value from the characteristic on the sticker', lib: true }));
  // Grada BR (round VAV, aluminium differential pressure sensor) — PF BR EN 11-10-2024, VNOM BR EN 30-09-2024, BR SelectionTool v6.0 (0.9.16):
  // k = Kv of the sensor (q m³/h = Kv · √Δp Pa; Kv · √150 = Vnom); Qmin = 1.2 m/s (recommended, error < 5 %); Qmax = Vnom @ 150 Pa;
  // Δp min at Qmax = ΔPs,min of the open damper: 0.5 · 1.2 · x · v², x = 612.844 · Ø^−1.38581
  const GBR = { 100: [19.23, 236], 125: [32.58, 399], 160: [57.14, 700], 200: [93.49, 1145], 250: [142.39, 1744], 315: [231.14, 2831], 355: [296.69, 3634], 400: [377.60, 4625], 500: [590.30, 7230], 630: [951.13, 11649] };
  const qRound = (d, v) => v * Math.PI * (d / 1000) ** 2 / 4 * 3600;
  const r1 = (x) => Math.round(x * 10) / 10;
  const grBRSrc = 'https://grada.be/en/products/detail/round-vav-unit-without-insulation';
  for (const [d, [kv, vnom]] of Object.entries(GBR)) {
    const dn = +d, x = 612.8442701178707 * dn ** -1.3858052487825891, v = vnom / 3600 / (Math.PI / 4 * (dn / 1000) ** 2);
    out.push(Object.assign(CAT0(), { id: 'lib:grada-br-' + dn, maker: 'Grada', series: 'BR', kind: 'vav', dn, kU: 'm3h', k: kv, qmin: Math.round(qRound(dn, 1.2)), qmax: vnom,
      dpQmax: Math.max(1, r1(0.5 * 1.2 * x * v * v)), src: grBRSrc, doc: 'Grada PF BR EN 11-10-2024; VNOM BR EN 30-09-2024; BR SelectionTool v6.0',
      note: `round VAV (BRS / BRD); k = Kv of the sensor, Vnom ${vnom} m³/h at 150 Pa; Qmin 1.2 m/s (absolute min 0.8 m/s = ${Math.round(qRound(dn, 0.8))} m³/h, error < 10 %); factory setting Vmin 1.5 m/s = ${Math.round(qRound(dn, 1.5))}, Vmax 6 m/s = ${Math.round(qRound(dn, 6))} m³/h; Δp min = ΔPs,min open damper (SelectionTool)`, lib: true }));
  }
  // Grada BS (rectangular VAV) — PF BS EN 11-10-2024, BS SelectionTool v8.0: Qmin = 1.5 m/s in B × H (recommended), Qmax = factory Vmax 6 m/s (no Vnom table for BS);
  // Δp min at Qmax = ΔPs,min: H int = H rounded up to 100 mm, L/R = 10 · H int · B / (2 · (H int + B)), x = −0.26919 · ln(L/R) + 0.20203, v = Q / (B · H int); sizes B 200…1200, H 200…800 per 100 mm, B ≥ H
  const grBSSrc = 'https://grada.be/en/products/detail/rectangular-variable-air-volume-controller-vav';
  for (let h = 200; h <= 800; h += 100) for (let b = h; b <= 1200; b += 100) {
    const a = b * h / 1e6, qmax = Math.round(6 * a * 3600), hi = Math.ceil(h / 100) * 100 / 1000, B = b / 1000;
    const lr = (hi * 10 * B) / (2 * (hi + B)), x = -0.26919026750279074 * Math.log(lr) + 0.20203028844552068, v = qmax / 3600 / (B * hi), dp = 0.5 * 1.2 * x * v * v;
    out.push(Object.assign(CAT0(), { id: `lib:grada-bs-${b}x${h}`, maker: 'Grada', series: 'BS', kind: 'vav', size: `${b}×${h}`, kU: 'm3h', qmin: Math.round(1.5 * a * 3600), qmax,
      dpQmax: dp < 1 ? 1 : r1(dp), src: grBSSrc, doc: 'Grada PF BS EN 11-10-2024; BS SelectionTool v8.0',
      note: `rectangular VAV (BSS / BSD) ${b} × ${h} mm; Qmin 1.5 m/s (absolute min 1.2 m/s = ${Math.round(1.2 * a * 3600)} m³/h); Qmax = factory Vmax 6 m/s; Δp min = ΔPs,min open damper (SelectionTool)${dp < 1 ? ', < 1 Pa' : ''}; no k-factor in the sheet`, lib: true }));
  }
  return out;
})();

/** own entries; an own copy of a built-in Grada entry (imported from Grada_VAV_catalogus.xlsx, id «grada-…») is left out — the built-in one replaces it (0.9.16) */
const catOwn = () => (Settings.v.catalog || []).filter(e => !(e && /^grada-(br|bs)-/.test(e.id || '') && CAT_LIB.some(l => l.id === 'lib:' + e.id))).map(e => Object.assign(CAT0(), e, { lib: false }));
const catAll = () => [...CAT_LIB, ...catOwn()];
const catById = (id) => id ? catAll().find(e => e.id === id) || null : null;
/** an editable copy of an entry (built-in or own): new id, own entry, «(copy)» after the type so both stay apart in the lists */
function catCopyOf(e, word, from) {
  const c = Object.assign(CAT0(), clone(e), { id: 'c' + uid(), lib: false });
  const w = word || 'copy'; if (!String(c.series || '').endsWith('(' + w + ')')) c.series = (c.series ? c.series + ' ' : '') + '(' + w + ')';
  if (e.lib && from) c.note = [c.note, from].filter(Boolean).join(' · ');
  return c;
}
/** the entry linked to a point: the project's copy first (it travels with the file), else the catalogue */
function ptCat(p, pt) { const id = pt && pt.reg && pt.reg.cat; if (!id) return null; return (p && p.cat && p.cat[id]) ? Object.assign(CAT0(), p.cat[id]) : catById(id); }
const catName = (e) => [e.maker, e.series, e.dn ? 'Ø' + e.dn : e.size].filter(Boolean).join(' ');
const catKind = (e) => (L.reg || {})[e.kind] || e.kind;
/** position typed at the damper («open», «4», «stand 4,5», «a = 3») → number on the entry's scale; null if not readable */
function catPos(e, txt) {
  const t = String(txt ?? '').trim().toLowerCase(); if (!t) return null;
  if (/^(open|vol|volledig open|ouvert|max|100\s*%)/.test(t)) return e && e.posOpen !== '' && e.posOpen != null && isNum(+String(e.posOpen).replace(',', '.')) ? +String(e.posOpen).replace(',', '.') : null;
  const m = t.replace(',', '.').match(/\d+(\.\d+)?/); return m ? +m[0] : null;
}
/** k (in the entry's unit) at a position: a listed position, or linear between two listed ones; null outside the table */
function catKAt(e, pos) {
  if (!e || !isNum(pos) || !(e.kPos || []).length) return null;
  const pts = e.kPos.filter(([a, k]) => isNum(a) && isNum(k)).sort((a, b) => a[0] - b[0]);
  for (const [a, k] of pts) if (Math.abs(a - pos) < 1e-9) return k;
  for (let i = 0; i < pts.length - 1; i++) { const [a1, k1] = pts[i], [a2, k2] = pts[i + 1]; if (pos > a1 && pos < a2) return k1 + (k2 - k1) * (pos - a1) / (a2 - a1); }
  return null;
}
/** position of the damper in a phase: before = measurement 1, after = control measurement (falls back to «before» while nothing was changed) */
const posOfPhase = (pt, phase) => phase === 'controle' ? (String(pt.reg?.posAfter || '').trim() || pt.reg?.posBefore) : pt.reg?.posBefore;
/** the k-factor (m³/h) of a point in a phase, with where it comes from:
 *  a linked sheet with k per position → the k of the position in that phase; else «k after adjusting» for the control measurement; else the k of the point */
function kInfo(p, pt, phase) {
  const e = ptCat(p, pt);
  if (e && (e.kPos || []).length) { const pos = catPos(e, posOfPhase(pt, phase)); const k = catKAt(e, pos); if (isNum(k)) return { k: +(k * K_F[e.kU === 'm3h' ? 'm3h' : 'ls']).toPrecision(12), src: 'cat', pos, e }; }
  if (e && isNum(e.k) && e.k > 0) return { k: +(e.k * K_F[e.kU === 'm3h' ? 'm3h' : 'ls']).toPrecision(12), src: 'cat', e };
  if (phase === 'controle' && isNum(pt.k2) && pt.k2 > 0) return { k: pt.k2, src: 'k2' };
  return { k: isNum(pt.k) ? pt.k : null, src: 'pt' };
}
const kFor = (p, pt, phase) => kInfo(p, pt, phase).k;
/** minimum Δp before a CAV / VAV for the design flow: constant (mechanical CAV) or ~ Q² from the value at qmax (electronic VAV) */
function catDpMin(e, q) {
  if (!e) return null; if (isNum(e.dpmin)) return e.dpmin;
  if (isNum(e.dpQmax) && isNum(e.qmax) && e.qmax > 0 && isNum(q)) return Math.max(1, Math.round(e.dpQmax * (q / e.qmax) ** 2));
  return null;
}
/** nominal size read from a point: duct diameter, «Ø200», «Iris-200», «200» in the model or size */
function ptDN(pt) {
  if (pt.duct && isNum(pt.duct.d) && pt.duct.shape !== 'rect') return pt.duct.d;
  for (const t of [pt.reg && pt.reg.model, pt.size]) { const m = String(t || '').match(/(?:ø|Ø|dn|d)?\s*(\d{2,4})(?!\s*[x×])/i); if (m && !/\d\s*[x×]\s*\d/.test(String(t))) return +m[1]; }
  return null;
}
/** «400×300», «400 x 300» → [400, 300]; null otherwise */
function rectOf(t) { const m = String(t || '').match(/(\d{2,4})\s*[x×*]\s*(\d{2,4})/i); return m ? [+m[1], +m[2]] : null; }
/** B × H of a rectangular point: the duct, else the model or size text (0.9.16) */
function ptRect(pt) {
  if (pt.duct && pt.duct.shape === 'rect' && isNum(pt.duct.w) && isNum(pt.duct.h)) return [pt.duct.w, pt.duct.h];
  return rectOf(pt.reg && pt.reg.model) || rectOf(pt.size);
}
/* ---- preset of a damper and the flows of a controller (0.9.18) ---- */
/** Δp at the taps from measurement 1 (k-factor method: the mean of the readings); null otherwise */
function tapDp1(pt) { if (pt.method !== 'kfactor') return null; const r = readings(pt, 'eerste'); return r.length ? r.reduce((a, b) => a + b, 0) / r.length : null; }
/** inverse of the k table: the position where k = kNeed (unit of the entry), linear between two rows; null outside the table */
function catPosFor(e, kNeed) {
  const pts = (e.kPos || []).filter(([a, k]) => isNum(a) && isNum(k)).sort((a, b) => a[0] - b[0]);
  for (const [a, k] of pts) if (Math.abs(k - kNeed) < 1e-9) return a;
  for (let i = 0; i < pts.length - 1; i++) { const [a1, k1] = pts[i], [a2, k2] = pts[i + 1]; if (k1 !== k2 && (kNeed - k1) * (kNeed - k2) < 0) return a1 + (a2 - a1) * (kNeed - k1) / (k2 - k1); }
  return null;
}
/** preset for the design flow: an iris / control damper with a k table → the position (Δp from measurement 1, the Δp typed for the preset, or 50 Pa);
 *  a CAV / VAV → the set value = design flow, checked against the range of the sheet */
function catPreset(p, pt, e) {
  const q = designOf(p, pt); if (!e || !isNum(q) || q <= 0) return null;
  if ((e.kPos || []).length) {
    const m1 = tapDp1(pt), dpSet = pt.reg && pt.reg.dpPre;
    const src = isNum(m1) && m1 > 0 ? 'm1' : isNum(dpSet) && dpSet > 0 ? 'set' : 'assumed';
    const dp = src === 'm1' ? m1 : src === 'set' ? dpSet : 50;
    const f = K_F[e.kU === 'm3h' ? 'm3h' : 'ls'], kNeed = q / Math.sqrt(dp) / f;
    const tab = (e.kPos || []).filter(([a, k]) => isNum(a) && isNum(k)); const ks = tab.map(([, k]) => k), kmax = Math.max(...ks), kmin = Math.min(...ks);
    const pos = catPosFor(e, kNeed); const near = isNum(pos) ? tab.map(([a]) => a).sort((a, b) => Math.abs(a - pos) - Math.abs(b - pos))[0] : null;
    const atMax = tab.find(([, k]) => k === kmax), atMin = tab.find(([, k]) => k === kmin);
    return { kind: 'pos', q, dp, src, kNeed, pos, near, unit: e.kU === 'm3h' ? 'm3h' : 'ls', over: kNeed > kmax, under: kNeed < kmin,
      dpNeed: kNeed > kmax ? Math.ceil((q / (kmax * f)) ** 2) : null, open: atMax ? atMax[0] : null, closed: atMin ? atMin[0] : null };
  }
  if (e.kind === 'cav' || e.kind === 'vav') return { kind: 'set', q, low: isNum(e.qmin) && q < e.qmin, high: isNum(e.qmax) && q > e.qmax };
  return null;
}
/** Vnom, Vmax and Vmin of a CAV / VAV, only where empty: Vnom = top of the range of the sheet, Vmax = design flow,
 *  Vmin = design flow for a CAV, the lowest flow of the sheet for a VAV (to be checked against the project) */
function fillVFlows(p, pt, e) {
  const r = pt.reg; if (!r || !(r.type === 'cav' || r.type === 'vav')) return;
  const qd = designOf(p, pt);
  if (!isNum(r.vnom) && e && isNum(e.qmax)) r.vnom = e.qmax;
  if (!isNum(r.vmax) && isNum(qd)) r.vmax = qd;
  if (!isNum(r.vmin)) { if (r.type === 'cav' && isNum(qd)) r.vmin = qd; else if (r.type === 'vav' && e && isNum(e.qmin)) r.vmin = e.qmin; }
}
/** link a point to an entry: copy into the project, fill model and Δp min; k comes from the sheet at the positions */
function catLink(p, pt, id) {
  if (!id) { if (pt.reg) pt.reg.cat = ''; return; }
  const e = catById(id) || (p.cat && p.cat[id]); if (!e) return;
  p.cat = p.cat || {}; p.cat[id] = clone(Object.assign(CAT0(), e));
  pt.reg.cat = id; pt.reg.model = catName(e);
  if ((e.kind === 'cav' || e.kind === 'vav') && (pt.reg.type === 'cav' || pt.reg.type === 'vav')) { fillVFlows(p, pt, e); const d = catDpMin(e, designOf(p, pt) ?? pt.reg.vmax); if (isNum(d)) pt.reg.dpmin = d; }
  if (isNum(e.k) && e.k > 0) { pt.kU = e.kU === 'm3h' ? 'm3h' : 'ls'; pt.k = +(e.k * K_F[pt.kU]).toPrecision(12); }
  if ((e.kPos || []).length) pt.kU = e.kU === 'm3h' ? 'm3h' : 'ls';
}
/** the sheets used in a project: [{ e, pts }] */
function catUsed(p) {
  const m = new Map();
  for (const pt of p.points) { const e = ptCat(p, pt); if (!e) continue; if (!m.has(e.id)) m.set(e.id, { e, pts: [] }); m.get(e.id).pts.push(pt); }
  return [...m.values()].sort((a, b) => natCmp(catName(a.e), catName(b.e)));
}
/** a check of the linked sheet against the point: CAV / VAV design flow outside the controller range */
function catRangeNote(p, pt) {
  const e = ptCat(p, pt); if (!e || !(e.kind === 'cav' || e.kind === 'vav')) return '';
  const q = designOf(p, pt); if (!isNum(q) || !isNum(e.qmin) || !isNum(e.qmax)) return '';
  return q < e.qmin || q > e.qmax ? __('design flow {q} m³/h outside the range of {name}: {a}–{b} m³/h', { q: fmt(q), name: catName(e), a: fmt(e.qmin), b: fmt(e.qmax) }) : '';
}
/** measured Δp before a CAV / VAV above the highest Δp of its sheet (noise, the controller may not hold its flow) */
function catDpHigh(p, pt, phase) {
  const e = ptCat(p, pt); if (!e || !isNum(e.dpmax) || !(e.kind === 'cav' || e.kind === 'vav')) return null;
  const v = psOf(pt, phase); return v != null && Math.abs(v) > e.dpmax ? { v: Math.abs(v), max: e.dpmax } : null;
}

/* ---- Excel template: sheet «Catalogus» (one row per product size) + «k per stand» (position, k) ---- */
const CAT_COLS = [['id', 'ID', 12], ['maker', 'Fabrikant', 14], ['series', 'Type / serie', 16], ['kind', 'Soort (iris / regelklep / CAV / VAV)', 14], ['dn', 'DN mm', 8], ['size', 'Afmeting (rechthoekig)', 12],
  ['kU', 'Eenheid k (l/s of m³/h)', 10], ['k', 'k vast (meetnippels)', 10], ['posOpen', 'Stand volledig open', 10], ['qmin', 'Qmin m³/h', 9], ['qmax', 'Qmax m³/h', 9], ['dpmin', 'Δp min Pa (vast)', 10],
  ['dpQmax', 'Δp min Pa bij Qmax', 10], ['dpmax', 'Δp max Pa', 9], ['src', 'Bron: officiële TF (URL)', 40], ['doc', 'Document / datum', 28], ['note', 'Opmerking', 30]];
async function catTemplate(entries) {
  const wb = new XLSXW.Workbook(); wb.title = 'Ventilation Setup Tool — catalogus technische fiches';
  const H = { font: { b: true, sz: 9, color: 'FFFFFF' }, fill: '262157', align: { v: 'center', wrap: true } };
  const T = { font: { sz: 9 }, align: { v: 'top', wrap: true } }, IN = { font: { sz: 9, color: '0000FF' }, fill: 'FFF8E1', border: { all: true, color: 'CFCFD8' }, align: { v: 'top', wrap: true } };
  const LIB = { font: { sz: 9, color: '777777' }, align: { v: 'top', wrap: true } };
  const ws = wb.sheet('Catalogus'); ws.landscape = true;
  ws.set(1, 1, 'Catalogus technische fiches (TF) — één rij per type en maat. Waarden alleen uit de officiële TF van de fabrikant; vul Bron en Document in. Grijze rijen (ID «lib:…») zijn de ingebouwde bibliotheek en worden bij het importeren overgeslagen.', { font: { b: true, sz: 10 }, align: { wrap: true } });
  ws.merge(1, 1, 1, CAT_COLS.length); ws.height(1, 30);
  CAT_COLS.forEach(([, h, w], i) => { ws.set(3, i + 1, h, H); ws.width(i + 1, w); }); ws.height(3, 30); ws.freeze = { r: 4, c: 4 };
  let r = 4;
  for (const e of entries) { CAT_COLS.forEach(([k], i) => { let v = e[k]; if (k === 'kU') v = e.kU === 'm3h' ? 'm³/h' : 'l/s'; if (k === 'kind') v = e.kind; ws.set(r, i + 1, v == null ? '' : v, e.lib ? LIB : IN); }); r++; }
  for (let i = 0; i < 20; i++, r++) CAT_COLS.forEach((c, j) => ws.set(r, j + 1, '', IN));
  const wk = wb.sheet('k per stand');
  ['ID', 'Fabrikant', 'Type / serie', 'DN mm', 'Stand', 'k'].forEach((h, i) => { wk.set(1, i + 1, h, H); wk.width(i + 1, [12, 14, 16, 8, 8, 10][i]); }); wk.freeze = { r: 2, c: 1 };
  r = 2;
  for (const e of entries) for (const [a, k] of e.kPos || []) { [e.id, e.maker, e.series, e.dn, a, k].forEach((v, i) => wk.set(r, i + 1, v == null ? '' : v, e.lib ? LIB : IN)); r++; }
  for (let i = 0; i < 40; i++, r++) for (let j = 1; j <= 6; j++) wk.set(r, j, '', IN);
  const wi = wb.sheet('Instructie'); wi.width(1, 110);
  ['Catalogus technische fiches — invullen', '',
    '1. Blad «Catalogus»: één rij per type en nominale maat (DN). Soort: iris, regelklep, CAV of VAV.',
    '2. Iris en regelklep met k per stand: blad «k per stand», één rij per stand (Fabrikant, Type / serie en DN zoals op «Catalogus»). Kolom «Stand volledig open» = de stand die bij «open» hoort.',
    '3. k vast: één k voor de meetnippels (bv. CAV met meetkruis). Eenheid: l/s of m³/h — q = k · √Δp met Δp in Pa.',
    '4. CAV / VAV: Qmin–Qmax van het toestel; Δp min vast (mechanische CAV) of Δp min bij Qmax (elektronische VAV: de app rekent ~ Q² naar het ontwerpdebiet); Δp max = de hoogste toegelaten drukval volgens de TF.',
    '5. Bron: link naar de officiële technische fiche van de fabrikant, met documentnaam en datum.',
    '6. Importeren: Instellingen → Catalogus → Excel importeren. Rijen met een bestaande ID worden vervangen, nieuwe rijen toegevoegd.'].forEach((t, i) => wi.set(i + 1, 1, t, i ? T : { font: { b: true, sz: 12 } }));
  return wb.blob();
}
/** read the template back: own entries (built-in rows skipped) */
async function catRead(buf) {
  const sheets = await XLSXR.read(buf); const sh = sheets.find(s => /catalog/i.test(s.name)) || sheets[0]; if (!sh) throw new Error('format');
  const hr = sh.rows.findIndex(row => (row || []).some(c => /^(fabrikant|manufacturer|maker)$/i.test(String(c ?? '').trim())));
  if (hr < 0) throw new Error('format');
  const head = sh.rows[hr].map(c => String(c ?? '').toLowerCase());
  const col = {}; CAT_COLS.forEach(([k, h]) => { col[k] = head.findIndex(x => x.trim() === h.toLowerCase()); }); // the headers of the template
  if (col.maker < 0) throw new Error('format');
  const num = (v) => { if (v == null || v === '') return null; if (typeof v === 'number') return v; const r = parseNumX(String(v), { small: true }); return isNum(r.v) ? r.v : null; };
  const str = (v) => v == null ? '' : String(v).trim();
  const kindOf = (v) => { const t = str(v).toLowerCase(); return /iris/.test(t) ? 'iris' : /vav/.test(t) ? 'vav' : /cav/.test(t) ? 'cav' : /klep|damper|regel/.test(t) ? 'regelklep' : ''; };
  const out = [];
  for (let i = hr + 1; i < sh.rows.length; i++) {
    const row = sh.rows[i] || []; const g = (k) => col[k] >= 0 ? row[col[k]] : null;
    const id = str(g('id')); if (id.startsWith('lib:')) continue;
    const maker = str(g('maker')), series = str(g('series')); if (!maker && !series) continue;
    const kind = kindOf(g('kind')) || 'iris';
    const e = Object.assign(CAT0(), { id: id || 'c' + uid(), maker, series, kind, dn: num(g('dn')), size: str(g('size')), kU: /m/.test(str(g('kU')).toLowerCase()) && !/l\s*\/\s*s/i.test(str(g('kU'))) ? 'm3h' : 'ls',
      k: num(g('k')), posOpen: str(g('posOpen')), qmin: num(g('qmin')), qmax: num(g('qmax')), dpmin: num(g('dpmin')), dpQmax: num(g('dpQmax')), dpmax: num(g('dpmax')), src: str(g('src')), doc: str(g('doc')), note: str(g('note')) });
    out.push(e);
  }
  const ks = sheets.find(s => /k\s*per\s*stand/i.test(s.name));
  if (ks) {
    const kh = ks.rows.findIndex(row => (row || []).some(c => /^stand$/i.test(String(c ?? '').trim()))); const h = kh >= 0 ? ks.rows[kh].map(c => String(c ?? '').trim().toLowerCase()) : [];
    const ci = (n) => h.findIndex(x => x === n);
    for (let i = kh + 1; kh >= 0 && i < ks.rows.length; i++) {
      const row = ks.rows[i] || []; const id = str(row[ci('id')]); if (id.startsWith('lib:')) continue;
      const a = num(row[ci('stand')]), k = num(row[ci('k')]); if (!isNum(a) || !isNum(k)) continue;
      const maker = str(row[ci('fabrikant')]).toLowerCase(), series = str(row[ci('type / serie')]).toLowerCase(), dn = num(row[ci('dn mm')]);
      const e = out.find(x => (id && x.id === id) || (x.maker.toLowerCase() === maker && x.series.toLowerCase() === series && (x.dn ?? null) === (dn ?? null)));
      if (e) e.kPos.push([a, k]);
    }
  }
  for (const e of out) e.kPos.sort((a, b) => a[0] - b[0]);
  return out;
}
/** data of a sheet in the report language: k per position, k at the taps, flow range, minimum Δp */
function catDataR(e) {
  const u = e.kU === 'm3h' ? 'm³/h' : 'l/s';
  const kp = (e.kPos || []).filter(([, k]) => isNum(k));
  return [kp.length ? _r('k ({u}) per stand: {list}', { u, list: kp.map(([a, k]) => `${nl(a, a % 1 ? 1 : 0)}: ${nl(k, k < 10 ? 1 : k < 100 ? 1 : 0)}`).join(' · ') }) + (e.posOpen ? ' — ' + _r('open = stand {o}', { o: e.posOpen }) : '') : '',
    isNum(e.k) ? _r('k = {k} {u} (meetnippels)', { k: nl(e.k, 1), u }) : '',
    isNum(e.qmin) && isNum(e.qmax) ? _r('debietbereik {a}–{b} m³/h', { a: nl(e.qmin), b: nl(e.qmax) }) : '',
    isNum(e.dpmin) ? _r('Δp min {v} Pa', { v: nl(e.dpmin) }) : isNum(e.dpQmax) ? _r('Δp min {v} Pa bij Qmax', { v: nl(e.dpQmax) }) : '',
    isNum(e.dpmax) ? _r('Δp max {v} Pa', { v: nl(e.dpmax) }) : ''].filter(Boolean).join('; ');
}
