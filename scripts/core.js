/** version of the app and date of the build (filled in by build.py from mobile/package.json) */
const APP_VERSION = '0.9.29', APP_BUILD = '2026-11-11';
/* ---------- labels: L (interface) and RL (reports) are filled from the language packs, see i18n.js ---------- */
const MEASURE_STEPS = { 2: 'eerste', 4: 'controle' };
const stepNames = () => [__('Project'), __('Points'), __('Measure 1'), __('Balancing'), __('Measure 2'), __('Report'), __('Handover')]; // step 4 «Balancing» (was «Dampers», 0.9.17)
/** short label of a step for the phone tab bar */
const stepShort = (i) => i === 3 ? __('Balancing (tab)') : stepNames()[i];
const STATUS_KEYS = ['noaccess', 'missing', 'mismatch'];
const DEVICE_ONLY = ['afsluit', 'brand', 'terugslag'];
/* fire / shut-off / non-return damper on the duct: no measurement, transparent in the master/slave tree */
const isDev = (pt) => !!pt && pt.kind === 'device';
/** damper types per point kind: plenum only on grilles, line dampers only as their own element */
function regTypesFor(kind, curType) {
  const keys = kind === 'device' ? DEVICE_ONLY : Object.keys(L.reg || {}).filter(k => !DEVICE_ONLY.includes(k) && !(kind === 'duct' && k === 'plenum'));
  if (curType && !keys.includes(curType) && (L.reg || {})[curType]) keys.push(curType);
  return keys;
}
const FD0 = () => ({ from: '', to: '', pass: '', ei: '', act: '', sw: false, hatch: '', plate: '', test: '', sig: '', tby: '' });

/* ---------- utils ---------- */
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const clone = (o) => JSON.parse(JSON.stringify(o));
const isNum = (v) => typeof v === 'number' && isFinite(v);
/** decimal sign of the data: the report language (Belgian NL / FR reports: comma, \u00ab.\u00bb groups thousands) */
function dataDec() { try { return (I18N.num('rep') || {}).dec || ','; } catch (e) { return ','; } }
/** text \u2192 { v, amb }. Accepts 1500 \u00b7 1 500 \u00b7 1.500 \u00b7 1,5 \u00b7 1.500,5 \u00b7 1,500.5 \u00b7 1.500.000 (also pasted from Excel or a report).
 *  One \u00ab.\u00bb or \u00ab,\u00bb followed by exactly three digits (1.500, 12,000) is ambiguous: when it is not the decimal sign of the data
 *  it groups thousands (1.500 = 1500 with a comma decimal); amb = true so the field can show how it was read.
 *  o.small: a field where small values with three decimals are normal (air density 1.205, k-factor, barometer 101.325 kPa)
 *  \u2014 there the single mark is always read as the decimal sign (still amb). o.dec forces the decimal sign.
 *  v: number, null for empty text, undefined for text that is not a number. */
function parseNumX(s, o = {}) {
  s = String(s ?? '').trim().replace(/[\s\u00a0\u202f\u2009']/g, '').replace(/[\u2212\u2013]/g, '-'); // spaces / apostrophes as thousand marks, typographic minus or dash from some keyboards
  if (s === '') return { v: null, amb: false };
  const m = /^([+-]?)([\d.,]*)$/.exec(s); if (!m || !/\d/.test(m[2])) return { v: undefined, amb: false };
  const sign = m[1] === '-' ? -1 : 1, b = m[2];
  const dots = (b.match(/\./g) || []).length, commas = (b.match(/,/g) || []).length;
  const grouped = (t, sep) => t.split(sep).every((g, i) => i === 0 ? /^\d{1,3}$/.test(g) : /^\d{3}$/.test(g));
  let out, amb = false;
  if (dots && commas) { // both marks: the last one is the decimal sign, the other groups thousands
    const dec = b.lastIndexOf(',') > b.lastIndexOf('.') ? ',' : '.', grp = dec === ',' ? '.' : ',';
    const parts = b.split(dec); if (parts.length !== 2 || parts[1].includes(grp) || !grouped(parts[0], grp)) return { v: undefined, amb: false };
    out = Number(parts[0].split(grp).join('') + '.' + (parts[1] || '0'));
  } else if (!dots && !commas) out = Number(b);
  else {
    const sep = dots ? '.' : ',';
    if (dots + commas > 1) { if (!grouped(b, sep)) return { v: undefined, amb: false }; out = Number(b.split(sep).join('')); } // 1.500.000
    else {
      const [ip, fp] = b.split(sep);
      const couldGroup = /^[1-9]\d{0,2}$/.test(ip) && /^\d{3}$/.test(fp); // 1.500 \u00b7 12,000 \u2014 not 0.500
      if (couldGroup && sep !== (o.dec || dataDec()) && !o.small) out = Number(ip + fp);
      else out = Number((ip || '0') + '.' + (fp || '0'));
      amb = couldGroup;
    }
  }
  return isFinite(out) ? { v: sign * out, amb } : { v: undefined, amb: false };
}
function parseNum(s, o) { return parseNumX(s, o).v; }
/** number → text with the separators of a language pack */
/** one formatter per number of decimals: toLocaleString with options builds a new formatter on every call, which made a screen of 900 cells slow (0.9.4) */
const NUM_FMT = new Map();
function numText(v, d, nf) {
  let f = NUM_FMT.get(d); if (!f) { f = new Intl.NumberFormat('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }); NUM_FMT.set(d, f); }
  return f.format(v).replace(/[,.]/g, ch => ch === ',' ? nf.group : nf.dec);
}
/** a number in an input field: written with the decimal sign the field reads back (that of the data / report), so it survives an edit */
const fmtIn = (v) => isNum(v) ? String(v).replace('.', dataDec()) : '';
function fmt(v, d = 0) { return isNum(v) ? numText(v, d, I18N.num('ui')) : '—'; }
function fmtPct(r, d = 0) { return isNum(r) ? numText(r * 100, d, I18N.num('ui')) + ' %' : '—'; }
function fmtDev(r) { if (!isNum(r)) return '—'; const v = r * 100; return (v > 0 ? '+' : v < 0 ? '−' : '') + numText(Math.abs(v), 1, I18N.num('ui')) + ' %'; }
function fmtDate(ts, withTime = true) { if (!ts) return ''; const d = new Date(ts); const loc = (I18N.pack('ui') || {}).locale || 'en-GB'; try { return d.toLocaleString(loc, withTime ? { dateStyle: 'short', timeStyle: 'short' } : { dateStyle: 'short' }); } catch (e) { return d.toISOString().slice(0, 16).replace('T', ' '); } }
/** one collator for all comparisons: localeCompare with options builds a collator on every call, and sorting 400 points made thousands of them (0.9.4) */
const NAT_COLL = new Intl.Collator('nl', { numeric: true, sensitivity: 'base' });
function natCmp(a, b) { return NAT_COLL.compare(String(a || ''), String(b || '')); }
function getPath(o, path) { return path.split('.').reduce((a, k) => (a == null ? undefined : a[k]), o); }
function setPath(o, path, v) {
  const ks = path.split('.'); let cur = o;
  for (let i = 0; i < ks.length - 1; i++) {
    const k = ks[i];
    if (cur[k] == null || typeof cur[k] !== 'object') cur[k] = /^\d+$/.test(ks[i + 1]) ? [] : {};
    cur = cur[k];
  }
  cur[ks[ks.length - 1]] = v;
}
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
function dateNL(iso) { if (!iso) return ''; const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso); return m ? `${m[3]}/${m[2]}/${m[1]}` : iso; }

/* ---------- settings (per device) ----------
   Company data of a first start and of the demo are fictional (Voorbeeld Klimaattechniek bv); a company adds its own
   data in the settings or with its style file (*.inregelstijl.json, e.g. Matthijs nv). The demo keeps its own settings. */
const SETTINGS0 = {
  company: 'Voorbeeld Klimaattechniek bv', technician: '',
  tagline: '',
  address: 'Voorbeeldstraat 10 · 9000 Gent · www.voorbeeld-klimaat.example',
  footer: 'Voorbeeld Klimaattechniek bv · Voorbeeldstraat 10, 9000 Gent · BTW BE 0000.000.000 · +32 9 000 00 00 · info@voorbeeld-klimaat.example · www.voorbeeld-klimaat.example',
  logo: '', logoW: 0, logoH: 0, logoSrc: 'default', updatedAt: 0,
  styleId: 'freshair', styles: [], catalog: [], instruments: [], auto: null,
  uiLang: 'en', repLang: 'nl', hints: 'auto', devId: '',
};
const Settings = {
  v: JSON.parse(JSON.stringify(SETTINGS0)),
  key() { return Demo.on() ? 'inregelaar.demo.settings' : 'inregelaar.settings'; },
  load() {
    const v = JSON.parse(JSON.stringify(SETTINGS0));
    try {
      const raw = localStorage.getItem(this.key());
      if (raw) { const st = JSON.parse(raw) || {}; if (st.logo && !st.logoSrc) st.logoSrc = 'custom'; Object.assign(v, st); }
      else if (Demo.on()) { // a new demo: the device's language and id, the rest fictional and in the Fresh Air style
        const main = JSON.parse(localStorage.getItem('inregelaar.settings') || '{}') || {};
        for (const k of ['uiLang', 'repLang', 'hints', 'devId', 'theme']) if (main[k] != null) v[k] = main[k];
        v.technician = 'Jan Voorbeeld';
      }
    } catch (e) { }
    this.v = v;
    if (!this.v.devId) this.v.devId = 'd' + uid();
    try { if (!localStorage.getItem(this.key())) localStorage.setItem(this.key(), JSON.stringify(this.v)); } catch (e) { }
  },
  save() { this.v.updatedAt = Date.now(); try { localStorage.setItem(this.key(), JSON.stringify(this.v)); } catch (e) { } if (Store.mode === 'cloud' && !Demo.on()) Store.saveSettings(); },
};

/* ---------- measuring instruments: kind, range from the manufacturer's data sheet, which kinds fit which method ---------- */
const INS_KINDS = ['hood', 'funnel', 'vane', 'hotwire', 'dp', 'clamp', 'tacho', 'other'];
const METHOD_KINDS = { hood: ['hood', 'funnel'], readout: [], anemo: ['vane', 'hotwire', 'funnel'], kfactor: ['dp'], pitot: ['dp'], traverse: ['hotwire', 'vane'] };
const INS0 = () => ({ id: uid(), name: '', type: '', serial: '', cal: '', kind: '', qmin: null, qmax: null, qacc: null, vmin: null, vmax: null, pmax: null, imax: null, rmin: null, rmax: null, acc: '', src: '', park: '' });
/** ranges from the manufacturers' official data sheets (checked 10/2026); the user confirms them in the instrument card */
const INS_PRESETS = [
  { key: 'tsi-ph731', type: 'TSI Airflow ProHood PH731', kind: 'hood', qmin: 42, qmax: 4250, qacc: 85, acc: '±3 % ±12 m³/h (> 85 m³/h)', src: 'https://tsi.com/getmedia/43e67f65-965c-43ac-89e0-0f99667dad3d/PH730_PH731_A4_5001433_RevE_Web?ext=.pdf' },
  { key: 'testo-417', type: 'testo 417 (Ø100 mm)', kind: 'vane', vmin: 0.3, vmax: 20, acc: '±(0,1 m/s + 1,5 %)', src: 'https://www.testo.com/en-UK/p/0560-4170' },
  { key: 'testo-417-f', type: 'testo 417 + testovent 417', kind: 'funnel', vmin: 0.3, vmax: 20, acc: '±(0,1 m/s + 1,5 %) — vane', src: 'https://www.testo.com/en-UK/p/0563-4170' },
  { key: 'testo-512-2', type: 'testo 512 (0…2 hPa)', kind: 'dp', pmax: 200, vmin: 2, vmax: 17.5, acc: '0,5 % FS (±1 Pa)', src: 'https://www.testo.com/en-AU/p/0560-5126' },
  { key: 'testo-512-20', type: 'testo 512 (0…20 hPa)', kind: 'dp', pmax: 2000, vmin: 5, vmax: 55, acc: '0,5 % FS (±10 Pa)', src: 'https://www.testo.com/en-US/testo-512/p/0560-5127' },
  /* testo 440 / 440 dP: data sheet 1981 1214 (10.2026, linked on the product pages) and the BE-NL sheet 1983 1214 (08.2021) the user sent;
     where they differ the current one wins (hot wire 0635 1571/1572: 0…30 m/s now, 0…50 m/s in 2021). Pitot range = Pitot tube 0635 2045 (factor 1,0). */
  { key: 'testo-440-dp', type: 'testo 440 dP (0560 4402)', kind: 'dp', pmax: 15000, vmin: 1, vmax: 100, acc: '±0,05 hPa (0…1 hPa); ±(0,2 hPa + 1,5 % v. mw.) (1,01…150 hPa); pitotbuis 0635 2045: 1…100 m/s', src: 'https://www.testo.com/en-DK/testo-440-dp/p/0560-4402' },
  { key: 'testo-440-v100', type: 'testo 440 + 0635 9431/9432 (Ø100 mm)', kind: 'vane', vmin: 0.3, vmax: 35, acc: '±(0,1 m/s + 1,5 % v. mw.) (0,3…20 m/s); ±(0,2 m/s + 1,5 % v. mw.) (20,01…35 m/s)', src: 'https://www.testo.com/en-DK/testo-440/p/0560-4401' },
  { key: 'testo-440-v100hp', type: 'testo 440 + 0635 9371/9372 (Ø100 mm, vanaf 0,1 m/s)', kind: 'vane', vmin: 0.1, vmax: 15, acc: '±(0,1 m/s + 1,5 % v. mw.)', src: 'https://www.testo.com/en-DK/testo-440/p/0560-4401' },
  { key: 'testo-440-v16', type: 'testo 440 + 0635 9571/9572 (Ø16 mm)', kind: 'vane', vmin: 0.6, vmax: 50, acc: '±(0,2 m/s + 1 % v. mw.) (0,6…40 m/s); ±(0,2 m/s + 2 % v. mw.) (40,1…50 m/s)', src: 'https://www.testo.com/en-DK/testo-440/p/0560-4401' },
  { key: 'testo-440-hw', type: 'testo 440 + 0635 1571/1572 (hittedraad)', kind: 'hotwire', vmin: 0, vmax: 30, acc: '±(0,03 m/s + 4 % v. mw.) (0…20 m/s); ±(0,5 m/s + 5 % v. mw.) (20,01…30 m/s)', src: 'https://www.testo.com/en-DK/testo-440/p/0560-4401' },
  { key: 'testo-440-f', type: 'testo 440 + 0635 9431/9432 + testovent 417', kind: 'funnel', vmin: 0.3, vmax: 35, acc: '±(0,1 m/s + 1,5 % v. mw.) (0,3…20 m/s) — vleugelrad', src: 'https://www.testo.com/en-DK/testo-440/p/0560-4401' },
];
/** kind from the name in an imported list («Debietkap», «Trechter Testo 417», «dPa Testo 512» …) — shown in the card for the user to confirm */
function insKindGuess(text) {
  const t = String(text || '').toLowerCase();
  return /trechter|funnel|testovent|воронк/.test(t) ? 'funnel' : /kap\b|debietkap|hood|balomet|балометр/.test(t) ? 'hood' : /pitot|d\s?pa|drukverschil|manomet|дифман|\b51[0-2]\b|\b440\s?dp\b/.test(t) ? 'dp'
    : /hittedraad|thermisch|hot.?wire|термоанем/.test(t) ? 'hotwire' : /schoep|vleugel|vane|крыльчат|\b417\b/.test(t) ? 'vane'
      : /stroomtang|tang|clamp|pince|клещ/.test(t) ? 'clamp' : /toerental|tacho|тахом|rpm/.test(t) ? 'tacho' : ''; // a bare «testo 440» can be any probe: no guess
}
const insOf = (p, pt, phase) => { const id = pt && pt.meas && pt.meas[phase] && pt.meas[phase].ins; return id ? (p.instruments || []).find(x => x.id === id) || null : null; };
const insFits = (ins, method) => !ins.kind || (METHOD_KINDS[method] || []).includes(ins.kind) || ins.kind === 'other';
/** instrument used for a point when none is chosen yet: the last one used with this method, else the only one that fits */
function insDefaultFor(p, method) {
  const last = p.insLast && p.insLast[method]; if (last && p.instruments.some(x => x.id === last)) return last;
  const fit = p.instruments.filter(x => x.kind && (METHOD_KINDS[method] || []).includes(x.kind));
  return fit.length === 1 ? fit[0].id : '';
}
const insGuess = (p, pt) => pt.method === 'readout' ? '' : insDefaultFor(p, pt.method);
/** readings outside the range of the instrument: [{ k: 'kind' | 'low' | 'high' | 'acc', v, lim, unit }] */
function insCheck(p, pt, phase) {
  const ins = insOf(p, pt, phase); if (!ins) return [];
  const out = [];
  if (ins.kind && ins.kind !== 'other' && !(METHOD_KINDS[pt.method] || []).includes(ins.kind)) out.push({ k: 'kind' });
  const rd = readings(pt, phase); if (!rd.length) return out;
  const rho = isNum(p.rho) && p.rho > 0 ? p.rho : 1.2;
  let vals = [], unit = '', lo = null, hi = null, acc = null;
  if (pt.method === 'hood' || pt.method === 'readout') { vals = rd; unit = 'm³/h'; lo = ins.qmin; hi = ins.qmax; acc = ins.qacc; }
  else if (pt.method === 'anemo' || pt.method === 'traverse') { vals = rd; unit = 'm/s'; lo = ins.vmin; hi = ins.vmax; }
  else if (pt.method === 'pitot') { vals = rd.map(pd => Math.sqrt(2 * Math.max(pd, 0) / rho)); unit = 'm/s'; lo = ins.vmin; hi = ins.vmax; if (isNum(ins.pmax) && rd.some(x => Math.abs(x) > ins.pmax)) out.push({ k: 'high', v: Math.max(...rd.map(Math.abs)), lim: ins.pmax, unit: 'Pa' }); }
  else if (pt.method === 'kfactor') { if (isNum(ins.pmax) && rd.some(x => Math.abs(x) > ins.pmax)) out.push({ k: 'high', v: Math.max(...rd.map(Math.abs)), lim: ins.pmax, unit: 'Pa' }); return out; }
  if (!vals.length) return out;
  const mn = Math.min(...vals), mx = Math.max(...vals);
  if (isNum(lo) && mn < lo) out.push({ k: 'low', v: mn, lim: lo, unit });
  if (isNum(hi) && mx > hi) out.push({ k: 'high', v: mx, lim: hi, unit });
  if (isNum(acc) && mn < acc && !(isNum(lo) && mn < lo)) out.push({ k: 'acc', v: mn, lim: acc, unit });
  return out;
}
const insBad = (p, pt, phase) => insCheck(p, pt, phase).some(x => x.k !== 'acc');

/* ---------- k-factor of a damper / grille: kept in m³/h (Q = k·√Δp); shown and typed in the unit of the catalogue ---------- */
const K_F = { m3h: 1, ls: 3.6 };
/** unit of the k-factor of a point: as chosen, else l/s for an Iris damper (catalogues usually give it in l/s) and m³/h otherwise */
const kUnitOf = (pt) => K_F[pt.kU] ? pt.kU : (pt.reg && pt.reg.type === 'iris' ? 'ls' : 'm3h');

/* ---------- model ---------- */
function newProject() {
  return {
    id: 'p' + uid(), v: 1, createdAt: Date.now(), updatedAt: Date.now(),
    info: { nr: '', name: '', client: '', address: '', designer: '', schema: '', company: Settings.v.company, technician: Settings.v.technician, date: today(), rev: '1', tempC: null, pressure: null },
    tol: { terminal: 10, system: 10, room: 15, iunb: null }, rho: 1.2,
    notes: {},
    cover: { title: '', subtitle: '', band: '', items: [null, null, null] },
    instruments: [], insLast: {},
    systems: [], groups: [],
    points: [],
    report: { remarks: '', conclusion: '', signName: Settings.v.technician, signature: '', lang: Settings.v.repLang || 'nl', scopes: {} },
    checklist: { a: {}, s: {} }, norm: NORM0(), cat: {},
    packages: [], docs: [],
  };
}
function newSystem(p) {
  const n = p.systems.length + 1;
  const s = { id: 's' + uid(), code: 'LG' + String(n).padStart(2, '0'), name: '', location: '', unit: '', type: 'TA', rec: '', design: { T: null, A: null }, meas: { eerste: {}, controle: {} }, np: NP0(), fans: [], ctl: CTL0(), note: '', photos: [] };
  unitTypeFix(s); return s;
}
function newPoint(p, base = {}) {
  return Object.assign({
    id: 'q' + uid(), systemId: p.systems[0]?.id || '', parentId: '', kind: 'terminal', dir: 'T', branch: '', zone: '', room: '', code: '', status: '', added: null, fst: null,
    ttype: 'plafonddiffusor', size: '', designQ: null, method: 'hood', aeff: null, k: null, k2: null,
    duct: { shape: 'round', d: null, w: null, h: null, main: false },
    reg: { type: 'none', model: '', cat: '', vmin: null, vmax: null, vnom: null, dpmin: null, opmode: '', posBefore: '', posAfter: '', locked: false, state: '', cond: '', ctl: CTL0() },
    fd: FD0(),
    meas: { eerste: { r: [] }, controle: { r: [] } }, note: '', photos: [],
  }, base);
}
/** fill fields added in later versions */
function migrate(p) {
  if (!p) return p;
  const np = newProject();
  p.info = Object.assign({}, np.info, p.info || {}); p.report = Object.assign({}, np.report, p.report || {});
  p.tol = Object.assign({}, np.tol, p.tol || {}); p.notes = p.notes || {}; p.instruments = (p.instruments || []).map(i => Object.assign(INS0(), i)); p.insLast = p.insLast || {};
  p.cover = Object.assign({ title: '', subtitle: '', band: '' }, p.cover || {}); p.cover.items = [0, 1, 2].map(i => (p.cover.items || [])[i] || null);
  p.systems = (p.systems || []).map(s => npFix(Object.assign({ note: '', photos: [], unit: '', location: '', design: { T: null, A: null }, meas: { eerste: {}, controle: {} } }, s)));
  p.norm = Object.assign(NORM0(), p.norm || {}); p.cat = p.cat && typeof p.cat === 'object' ? p.cat : {};
  if (!p.checklist || typeof p.checklist !== 'object') p.checklist = { a: {}, s: {} }; p.checklist.a = p.checklist.a || {}; p.checklist.s = p.checklist.s || {};
  p.packages = p.packages || []; p.docs = Array.isArray(p.docs) ? p.docs : [];
  p.points = (p.points || []).map(pt => { const b = newPoint(p, {}); const o = Object.assign(b, pt); o.duct = Object.assign(b.duct, pt.duct || {}); o.reg = Object.assign(newPoint(p).reg, pt.reg || {}); o.fd = Object.assign(FD0(), pt.fd || {});
    if (o.reg.state === 'ok' || o.reg.state === 'defect') { if (!o.reg.cond) o.reg.cond = o.reg.state; o.reg.state = ''; }
    if (o.kind === 'duct' && o.reg.type === 'plenum') o.reg.type = 'regelklep';
    if (isNum(o.k) && !K_F[o.kU]) o.kU = 'm3h'; // before 0.7.4 every k was typed in m³/h: it keeps showing as typed
    o.meas = { eerste: Object.assign({ r: [] }, pt.meas?.eerste), controle: Object.assign({ r: [] }, pt.meas?.controle) }; o.photos = pt.photos || []; o.parentId = pt.parentId || ''; return o; });
  const ids = new Set(p.points.map(x => x.id)); for (const x of p.points) if (x.parentId && (!ids.has(x.parentId) || x.parentId === x.id)) x.parentId = '';
  if (!isNum(p.rho)) p.rho = 1.2;
  unitsMigrate(p);
  return p;
}
const measurable = (pt) => pt.kind !== 'device';
const hasReg = (pt) => pt.reg && pt.reg.type && pt.reg.type !== 'none';

/* ---------- calculations ---------- */
const mean = (a) => a.length ? a.reduce((s, x) => s + x, 0) / a.length : null;
function readings(pt, phase) { return ((pt.meas?.[phase]?.r) || []).filter(isNum); }
function ductArea(pt) {
  const d = pt.duct || {};
  if (d.shape === 'round') return isNum(d.d) && d.d > 0 ? Math.PI * Math.pow(d.d / 1000, 2) / 4 : null;
  return isNum(d.w) && isNum(d.h) && d.w > 0 && d.h > 0 ? (d.w * d.h) / 1e6 : null;
}
/** returns {q, v, n, detail, need} — q in m³/h */
function calcQ(pt, phase, p) {
  const rd = readings(pt, phase); const n = rd.length; const rho = isNum(p?.rho) && p.rho > 0 ? p.rho : 1.2;
  const out = { q: null, v: null, n, detail: '', need: '' };
  if (!n) { const dq = pt.meas?.[phase]?.q; if (isNum(dq)) { out.q = dq; out.detail = 'overgenomen'; } return out; }
  const m = mean(rd);
  switch (pt.method) {
    case 'hood': case 'readout': out.q = m; break;
    case 'anemo':
      out.v = m;
      if (isNum(pt.aeff) && pt.aeff > 0) out.q = m * pt.aeff * 3600; else out.need = 'Aeff';
      out.detail = `v ${nl(m, 2)} m/s × Ak ${nl(pt.aeff, 4)} m²`; break;
    case 'kfactor': { // k of this phase: from the linked technical sheet at the damper position, «k after adjusting», or the k of the point
      const ki = kInfo(p, pt, phase); out.k = ki.k; out.kSrc = ki.src;
      if (isNum(ki.k) && ki.k > 0) out.q = ki.k * Math.sqrt(Math.max(m, 0)); else out.need = 'k';
      out.detail = `dp ${nl(m, 1)} Pa, k ${nl(ki.k, 2)}`; break; }
    case 'pitot': {
      const vs = rd.map(pd => Math.sqrt(2 * Math.max(pd, 0) / rho)); out.v = mean(vs);
      const A = ductArea(pt); if (A) out.q = out.v * A * 3600; else out.need = __('duct dimensions');
      out.detail = `${n} pt, pd gem. ${nl(m, 1)} Pa, v ${nl(out.v, 2)} m/s`; break;
    }
    case 'traverse': {
      out.v = m; const A = ductArea(pt); if (A) out.q = m * A * 3600; else out.need = __('duct dimensions');
      out.detail = `${n} pt, v gem. ${nl(m, 2)} m/s`; break;
    }
  }
  return out;
}
/** number in the report language */
function nl(v, d = 0) { return isNum(v) ? numText(v, d, I18N.num('rep')) : '-'; }
const ratioOf = (q, qd) => isNum(q) && isNum(qd) && qd > 0 ? q / qd : null;
const devOf = (q, qd) => isNum(q) && isNum(qd) && qd > 0 ? (q - qd) / qd : null;
function ptRatio(pt, p) { return ratioOf(ptQ(p, pt, 'eerste'), designOf(p, pt)); }
function ptDev(pt, p) { return devOf(ptQ(p, pt, 'controle'), designOf(p, pt)); }
function inTol(dev, tolPct) { return isNum(dev) ? Math.abs(dev) * 100 <= tolPct + 1e-9 : null; }
/** flow per room: grilles / diffusers with the same room name, per side. EN 12599:2012 table 3 — permissible uncertainty «each individual room» ±15 %,
 *  «each system» ±10 % — so the room sum is checked against p.tol.room (default 15). Rooms with a point not measured or without design flow are «incomplete». */
function roomSums(p, phase = 'controle') {
  const m = new Map();
  for (const pt of p.points) {
    if (pt.kind !== 'terminal' || !measurable(pt)) continue; const room = String(pt.room || '').trim(); if (!room) continue;
    const key = room.toLowerCase().replace(/\s+/g, ' ') + '|' + pt.dir;
    if (!m.has(key)) m.set(key, { room, dir: pt.dir, pts: [], d: 0, q: 0, nD: 0, nQ: 0, sys: [] });
    const r = m.get(key); r.pts.push(pt); if (!r.sys.includes(pt.systemId)) r.sys.push(pt.systemId);
    const d = designOf(p, pt), q = ptQ(p, pt, phase); if (isNum(d)) { r.d += d; r.nD++; } if (isNum(q)) { r.q += q; r.nQ++; }
  }
  const tol = isNum(p.tol?.room) ? p.tol.room : 15;
  return [...m.values()].map(r => { const full = r.nD === r.pts.length && r.nQ === r.pts.length && r.d > 0; const dev = full ? (r.q - r.d) / r.d : null; return Object.assign(r, { full, dev, ok: dev == null ? null : inTol(dev, tol) }); })
    .sort((a, b) => (p.systems.findIndex(s => s.id === a.sys[0]) - p.systems.findIndex(s => s.id === b.sys[0])) || (a.dir === b.dir ? 0 : a.dir === 'T' ? -1 : 1) || natCmp(a.room, b.room));
}
function ptStatus(pt, p) { const d = ptDev(pt, p); const ok = inTol(d, p.tol.terminal); return ok === null ? null : ok ? 'ok' : 'nok'; }

/** system order → supply before extract → master/slave tree (depth-first). 0.9.5: mode 'room' → floor / zone, room, supply before extract (one room is measured in one go) */
function sortPoints(p, pts, mode) { return mode === 'room' ? [...pts].sort((a, b) => roomCmp(p, a, b)) : sortTree(p, pts).map(o => o.pt); }
/** floor / zone, then room: empty last; then supply before extract, the unit order, the code */
function roomCmp(p, a, b) {
  const sysIdx = (x) => p.systems.findIndex(s => s.id === x.systemId);
  const emptyLast = (x, y) => (!!x === !!y ? 0 : x ? -1 : 1);
  return emptyLast(a.zone, b.zone) || natCmp(a.zone || '', b.zone || '') || emptyLast(a.room, b.room) || natCmp(a.room || '', b.room || '')
    || (a.dir === b.dir ? 0 : a.dir === 'T' ? -1 : 1) || (sysIdx(a) - sysIdx(b)) || natCmp(a.code, b.code);
}
/** 0.9.5: points split per floor / zone and room, in the order of roomCmp. A group = { zone, room, pts } */
function roomGroups(p, pts) {
  const m = new Map(); // grouped by the exact names: «Gang» and «gang» are two rooms, even if the collator reads them as one
  for (const pt of [...pts].sort((a, b) => roomCmp(p, a, b))) {
    const zone = pt.zone || '', room = pt.room || '', k = zone + '\u0001' + room;
    if (!m.has(k)) m.set(k, { zone, room, pts: [] });
    m.get(k).pts.push(pt);
  }
  return [...m.values()];
}
function sortTree(p, pts) {
  const sysIdx = new Map(p.systems.map((s, i) => [s.id, i]));
  const groups = new Map();
  for (const x of pts) { const k = x.systemId + '|' + x.dir; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(x); }
  const keys = [...groups.keys()].sort((a, b) => { const [sa, da] = a.split('|'), [sb, db] = b.split('|'); return (sysIdx.get(sa) ?? 99) - (sysIdx.get(sb) ?? 99) || (da === db ? 0 : da === 'T' ? -1 : 1); });
  return keys.flatMap(k => treeOrder(p, groups.get(k)));
}
function groupKey(pt) { return `${pt.systemId}|${pt.dir}|${pt.branch || ''}`; }
function sysOf(p, id) { return p.systems.find(s => s.id === id); }
function sumTerminals(p, sysId, dir, phase) {
  const pts = p.points.filter(x => x.systemId === sysId && x.dir === dir && isEndFlow(p, x));
  let s = 0, n = 0; for (const pt of pts) { const q = calcQ(pt, phase, p).q; if (isNum(q)) { s += q; n++; } }
  return n ? s : null;
}
function sumDesign(p, sysId, dir) {
  const pts = p.points.filter(x => x.systemId === sysId && x.dir === dir && isEndFlow(p, x));
  let s = 0, n = 0; for (const pt of pts) if (isNum(pt.designQ)) { s += pt.designQ; n++; }
  return n ? s : null;
}
function mainDuctQ(p, sysId, dir, phase) {
  const pt = p.points.find(x => x.systemId === sysId && x.dir === dir && x.kind === 'duct' && x.duct?.main);
  return pt ? calcQ(pt, phase, p).q : null;
}
/** flow of a unit side: from the cone pressure and k-factor of the fan when that is the method, otherwise as entered */
function systemQ(p, s, dir, phase) { const c = coneQ(s, dir, phase, p); if (isNum(c)) return c; const v = s.meas?.[phase]?.['q' + dir]; return isNum(v) ? v : null; }
/** flow index of a unit side: the measured grille / diffuser with the lowest ratio after measurement 1 — it stays open, so after balancing its ratio is the ratio of the whole side */
function sysFlowIndex(p, s, dir) {
  let best = null, br = Infinity;
  for (const x of p.points) { if (x.systemId !== s.id || x.dir !== dir || x.kind !== 'terminal' || !measurable(x) || x.status) continue; const r = ptRatio(x, p); if (isNum(r) && r > 0 && r < br) { br = r; best = x; } }
  return best;
}
/* fan setting after balancing: fanRec / netFactor (units.js, ui_units.js) */

/* step progress 0..1 */
function progress(p) {
  const meas = p.points.filter(measurable);
  const regs = p.points.filter(hasReg);
  const f = (arr, pred) => arr.length ? arr.filter(pred).length / arr.length : 0;
  return [
    p.info.nr && p.info.name ? 1 : (p.info.nr || p.info.name ? .5 : 0),
    p.systems.length && meas.length ? 1 : (p.systems.length ? .5 : 0),
    f(meas, pt => isNum(ptQ(p, pt, 'eerste'))),
    regs.length ? f(regs, pt => DEVICE_ONLY.includes(pt.reg.type) ? !!pt.reg.state : !!String(pt.reg.posAfter || '').trim()) : (meas.length && f(meas, pt => isNum(ptQ(p, pt, 'eerste'))) >= 1 ? 1 : 0),
    f(meas, pt => isNum(ptQ(p, pt, 'controle'))),
    p.report.generatedAt ? 1 : (p.report.conclusion ? .5 : 0),
    p.handover?.completedAt ? 1 : [p.handover?.reportShared, p.handover?.labelsChecked, p.handover?.clientBriefed].filter(Boolean).length / 3,
  ];
}

/* ---------- storage: device cache + cloud (artifact db) ---------- */
const LS_KEY = 'inregelaar.projects.v1', LS_DEL = 'inregelaar.deleted.v1';
/** the demo keeps its own projects in the app and the PWA (the preview in the chat has no accounts: one set of projects) */
const lsKey = (k) => (STANDALONE && Demo.on() ? k.replace('inregelaar.', 'inregelaar.demo.') : k);
const SPACES = ['inregelaar.projects.v1', 'inregelaar.demo.projects.v1'];
/** the projects of a space in IndexedDB (0.9.4): one record per project, hundreds of MB; localStorage (about 5 MB) was the first copy */
const PDB = {
  _p: null,
  open() {
    if (!this._p) this._p = new Promise((res) => {
      if (!('indexedDB' in window)) return res(null);
      let r; try { r = indexedDB.open('inregelaar-projects', 1); } catch (e) { return res(null); }
      r.onupgradeneeded = () => r.result.createObjectStore('p');
      r.onsuccess = () => res(r.result); r.onerror = () => res(null); r.onblocked = () => res(null);
    });
    return this._p;
  },
  /** every project of a space: {id: project}, or null without IndexedDB */
  async all(space) {
    const db = await this.open(); if (!db) return null;
    return new Promise((res, rej) => {
      const out = {}; const rq = db.transaction('p').objectStore('p').openCursor(IDBKeyRange.bound(space + '|', space + '|￿'));
      rq.onsuccess = () => { const c = rq.result; if (c) { out[c.key.slice(space.length + 1)] = c.value; c.continue(); } else res(out); };
      rq.onerror = () => rej(rq.error);
    });
  },
  /** the changed projects and the deleted ones, in one transaction */
  async write(space, put, del) {
    const db = await this.open(); if (!db) return false;
    return new Promise((res) => {
      const tx = db.transaction('p', 'readwrite'); const st = tx.objectStore('p');
      for (const id of Object.keys(put)) st.put(put[id], space + '|' + id);
      for (const id of del) st.delete(space + '|' + id);
      tx.oncomplete = () => res(true); tx.onerror = () => res(false); tx.onabort = () => res(false);
    });
  },
};
/* 0.9.25: automatic backups on this device — a copy of the projects of both spaces at the first start of every new version and once a day
   (the photo and plan files stay in their own stores and are not copied again). The last 10 copies are kept; Settings can put back
   the projects that are no longer there. A copy never replaces a project that exists. */
const AutoBackup = {
  KEEP: 10, LS: 'vst.backup.v1', _p: null,
  open() {
    if (!this._p) this._p = new Promise((res) => {
      if (!('indexedDB' in window)) return res(null);
      let r; try { r = indexedDB.open('inregelaar-backup', 1); } catch (e) { return res(null); }
      r.onupgradeneeded = () => r.result.createObjectStore('b');
      r.onsuccess = () => res(r.result); r.onerror = () => res(null); r.onblocked = () => res(null);
    });
    return this._p;
  },
  req(mode, fn) { return this.open().then((db) => db ? new Promise((res) => { const tx = db.transaction('b', mode); const q = fn(tx.objectStore('b')); tx.oncomplete = () => res(q && q.result); tx.onerror = tx.onabort = () => res(null); }) : null); },
  state() { try { return JSON.parse(localStorage.getItem(this.LS) || '{}') || {}; } catch (e) { return {}; } },
  /** the copies, newest first: {key, at, version, reason, n} */
  async list() {
    const all = await this.req('readonly', (st) => st.getAll()); if (!all) return [];
    return all.map((b) => ({ key: 'b' + b.at, at: b.at, version: b.version, reason: b.reason, n: Object.values(b.spaces || {}).reduce((k, o) => k + Object.values(o).filter((x) => x && !x.example).length, 0) })).sort((a, b) => b.at - a.at);
  },
  /** a copy of every project now on the device; nothing when there is no own project */
  async take(reason) {
    if (!Store.device) return null;
    const spaces = {}; let n = 0;
    for (const k of SPACES) { const o = Store.spaces[k] || (await PDB.all(k)) || {}; const own = Object.fromEntries(Object.entries(o).filter(([, x]) => x && !x.example)); spaces[k] = own; n += Object.keys(own).length; }
    if (!n) return null;
    const at = Date.now(); const ok = await this.req('readwrite', (st) => { st.put(JSON.parse(JSON.stringify({ at, version: APP_VERSION, reason, spaces })), 'b' + at); });
    if (ok === null) return null;
    const keys = (await this.req('readonly', (st) => st.getAllKeys())) || [];
    const old = keys.sort().slice(0, Math.max(0, keys.length - this.KEEP)); if (old.length) await this.req('readwrite', (st) => { old.forEach((k) => st.delete(k)); });
    try { localStorage.setItem(this.LS, JSON.stringify({ at, version: APP_VERSION })); } catch (e) { }
    return { at, n };
  },
  /** at the start: after an update, or a day after the last copy */
  auto() { const s = this.state(); if (s.version !== APP_VERSION) return this.take('update'); if (!s.at || Date.now() - s.at > 864e5) return this.take('daily'); return Promise.resolve(null); },
  /** put back the projects of a copy that are no longer on this device: {added, kept} */
  async restore(key) {
    const b = await this.req('readonly', (st) => st.get(key)); if (!b || !b.spaces) return null;
    let added = 0, kept = 0;
    for (const k of SPACES) {
      const rows = b.spaces[k] || {}; const obj = Store.spaces[k] || (Store.spaces[k] = (await PDB.all(k)) || {}); const put = {};
      for (const id of Object.keys(rows)) { if (obj[id]) { kept++; continue; } obj[id] = migrate(rows[id]); put[id] = obj[id]; added++; }
      if (Object.keys(put).length) await PDB.write(k, put, []);
    }
    this.restored = true;
    return { added, kept };
  },
};
const Store = {
  projects: {}, spaces: {}, device: false, dirtyIds: new Set(), gone: new Set(), deleted: [], mode: 'local', db: null, uid: null, timers: {}, writing: {}, pending: {}, state: 'local', lastErr: '',
  onState: null,
  /** the projects of the current space: from memory once loaded, else from localStorage (the first start) */
  loadLocal() {
    const k = lsKey(LS_KEY);
    if (this.spaces[k]) this.projects = this.spaces[k];
    else { try { this.projects = JSON.parse(localStorage.getItem(k) || '{}') || {}; } catch (e) { this.projects = {}; } this.spaces[k] = this.projects; }
    for (const id of Object.keys(this.projects)) migrate(this.projects[id]);
    try { this.deleted = JSON.parse(localStorage.getItem(lsKey(LS_DEL)) || '[]') || []; } catch (e) { this.deleted = []; }
  },
  /** the device copy of both spaces, read once at start; the copy in localStorage is moved over and removed (0.9.4) */
  loadDevice() { if (!this._dev) this._dev = this.loadDeviceNow(); return this._dev; },
  async loadDeviceNow() {
    let changed = false;
    try {
      for (const k of SPACES) {
        const rows = await PDB.all(k); if (!rows) return false;
        let legacy = null, raw = null; try { raw = localStorage.getItem(k); legacy = JSON.parse(raw || 'null'); } catch (e) { legacy = null; }
        const obj = this.spaces[k] || (this.spaces[k] = {});
        for (const id of Object.keys(rows)) { const r = migrate(rows[id]); if (!obj[id] || (r.updatedAt || 0) > (obj[id].updatedAt || 0)) { obj[id] = r; changed = true; } }
        if (legacy) for (const id of Object.keys(legacy)) { const l = legacy[id]; if (l && (!obj[id] || (l.updatedAt || 0) > (obj[id].updatedAt || 0))) { obj[id] = migrate(l); changed = true; } }
        // 0.9.8: projects changed before the device store was ready are kept and written to it
        if (k === lsKey(LS_KEY)) for (const id of Object.keys(this.projects || {})) { const mine = this.projects[id]; if (mine && (!obj[id] || (mine.updatedAt || 0) > (obj[id].updatedAt || 0))) { obj[id] = mine; changed = true; } }
        const put = {}; for (const id of Object.keys(obj)) if (!rows[id] || (obj[id].updatedAt || 0) > (rows[id].updatedAt || 0)) put[id] = obj[id];
        if (Object.keys(put).length && !(await PDB.write(k, put, []))) return false;
        if (legacy) { try { if (localStorage.getItem(k) === raw) localStorage.removeItem(k); } catch (e) { } } // only when nothing was saved to it meanwhile
      }
      this.projects = this.spaces[lsKey(LS_KEY)] || this.projects;
      this.device = true;
      try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) { }
      return changed;
    } catch (e) { return false; }
  },
  /** what the device keeps for this app: used and available space (Settings) */
  async memory() {
    try {
      const e = navigator.storage && navigator.storage.estimate ? await navigator.storage.estimate() : null;
      const persisted = navigator.storage && navigator.storage.persisted ? await navigator.storage.persisted() : null;
      return { used: e ? e.usage : null, quota: e ? e.quota : null, persisted };
    } catch (e) { return null; }
  },
  /** after entering or leaving the demo: the projects of that space */
  space() { for (const k of Object.keys(this.timers)) clearTimeout(this.timers[k]); this.timers = {}; this.loadLocal(); },
  saveLocal() {
    try { localStorage.setItem(lsKey(LS_KEY), JSON.stringify(this.projects)); localStorage.setItem(lsKey(LS_DEL), JSON.stringify(this.deleted)); return true; }
    catch (e) { return false; }
  },
  setState(s, err) { this.state = s; this.lastErr = err || ''; this.onState && this.onState(s); },
  col() { return this.db.collection('data/users/' + this.uid); },
  async connect() {
    if (!(window.claude && typeof window.claude.use === 'function')) return false;
    try {
      const [db, user] = await Promise.all([window.claude.use('db'), window.claude.use('user')]);
      if (!db || !user) return false;
      const id = await user.id(); if (!id) return false;
      this.db = db; this.uid = id; this.mode = 'cloud';
      const snap = await this.col().get();
      const remoteIds = new Set(); let changed = false;
      for (const d of snap.docs) {
        const body = d.data();
        if (d.id === '_settings' && body && body.settings) { if ((body.settings.updatedAt || 0) > (Settings.v.updatedAt || 0)) { Object.assign(Settings.v, body.settings); try { localStorage.setItem('inregelaar.settings', JSON.stringify(Settings.v)); } catch (e) { } changed = true; } else if ((Settings.v.updatedAt || 0) > (body.settings.updatedAt || 0)) this.saveSettings(); continue; }
        if (!body || !body.data) continue; remoteIds.add(d.id);
        if (this.deleted.includes(d.id)) { this.col().doc(d.id).delete().catch(() => { }); continue; }
        const local = this.projects[d.id];
        if (!local || (body.updatedAt || 0) > (local.updatedAt || 0)) { this.projects[d.id] = migrate(clone(body.data)); this.dirtyIds.add(d.id); changed = true; }
        else if ((local.updatedAt || 0) > (body.updatedAt || 0)) this.schedule(d.id, 50);
      }
      for (const id2 of Object.keys(this.projects)) if (!remoteIds.has(id2)) this.schedule(id2, 80);
      this.deleted = []; this.flushLocal();
      this.setState('cloud');
      return changed;
    } catch (e) { this.setState('error', e && e.message); return false; }
  },
  saveSettings() { if (this.mode !== 'cloud') return; clearTimeout(this._st); this._st = setTimeout(async () => { try { await this.col().doc('_settings').set({ settings: JSON.parse(JSON.stringify(Settings.v)) }); } catch (e) { } }, 1500); },
  /** a change is saved on the device 0,4 s after the last one (typing a reading does not write the whole project list per digit); at once when the page is hidden or the space changes */
  touch(p) {
    p.updatedAt = Date.now(); this.projects[p.id] = p; this.dirtyIds.add(p.id);
    if (this.mode === 'cloud') this.schedule(p.id);
    clearTimeout(this._saveT); this._saveT = setTimeout(() => this.flushLocal(), 400);
  },
  /** writes the changes of the current space: to the device copy (IndexedDB), and to localStorage only while that copy is not there */
  flushLocal() {
    clearTimeout(this._saveT); this._saveT = null;
    if (!this.dirtyIds.size && !this.gone.size) return true;
    if (!this.device) {
      const ok = this.saveLocal(); if (ok) { this.dirtyIds.clear(); this.gone.clear(); } // 0.9.8: cleared only when saved; a full storage keeps the changes marked
      if (this.mode !== 'cloud') this.setState(ok ? 'local' : 'error', ok ? '' : __('Device storage is full'));
      return ok;
    }
    const put = {}; for (const id of this.dirtyIds) if (this.projects[id]) put[id] = this.projects[id];
    const del = [...this.gone]; this.dirtyIds.clear(); this.gone.clear();
    if (this.mode !== 'cloud') this.setState('local');
    PDB.write(lsKey(LS_KEY), put, del).then((ok) => {
      if (ok) return;
      for (const id of Object.keys(put)) this.dirtyIds.add(id); for (const id of del) this.gone.add(id);
      if (this.mode !== 'cloud') this.setState('error', __('Device storage is full'));
    });
    return true;
  },
  schedule(id, ms = 1200) {
    clearTimeout(this.timers[id]); if (this.mode !== 'cloud') return;
    this.setState('saving');
    this.timers[id] = setTimeout(() => this.flush(id), ms);
  },
  async flush(id, retried) {
    if (this.writing[id]) { this.pending[id] = true; return; }
    const p = this.projects[id]; if (!p) return;
    this.writing[id] = true;
    try {
      await this.col().doc(id).set({ v: 1, updatedAt: p.updatedAt, name: p.info?.name || '', data: p });
      this.setState(Object.values(this.writing).filter(Boolean).length > 1 ? 'saving' : 'cloud');
    } catch (e) {
      const code = e && e.code;
      if (code === 'unavailable' && !retried) { this.writing[id] = false; setTimeout(() => this.flush(id, true), 800 + Math.random() * 800); return; }
      this.setState('error', code === 'invalid_argument' ? __('Project too large for the cloud — kept on the device') : (code === 'quota_exceeded' ? __('Cloud storage is full') : __('No connection — data saved on the device')));
    }
    this.writing[id] = false;
    if (this.pending[id]) { this.pending[id] = false; this.flush(id); }
  },
  async remove(id) {
    delete this.projects[id]; this.dirtyIds.delete(id); this.gone.add(id);
    if (this.mode === 'cloud') { try { await this.col().doc(id).delete(); } catch (e) { this.deleted.push(id); } }
    else this.deleted.push(id);
    this.flushLocal();
  },
};

/* a change still waiting for its 0,4 s is written when the page goes to the background or closes */
window.addEventListener('pagehide', () => Store.flushLocal());
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') Store.flushLocal(); });

/* ---------- example project ---------- */
function exampleProject() {
  const p = newProject();
  p.example = true;
  Object.assign(p.info, { nr: 'VB-2026-001', name: 'Voorbeeld kantoorgebouw', client: 'Voorbeeld nv', address: 'Voorbeeldstraat 1, 9000 Gent', designer: 'Voorbeeld studiebureau', schema: 'Ventilatieplan VB-01 (uitvoering)', rev: '1', tempC: 19.5, pressure: 101.3 });
  p.notes = { eerste: { text: 'Filters vóór de meting vervangen. Alle regelkleppen volledig open bij de eerste meting.', photos: [] } };
  p.instruments = [
    Object.assign(INS0(), { name: 'Debietkap', type: 'TSI Alnor EBT731', serial: 'VB-0001', cal: '2026-03-12', kind: 'hood' }),
    Object.assign(INS0(), INS_PRESETS.find(x => x.key === 'testo-440-dp'), { key: undefined, name: 'Drukverschilmeter + pitotbuis', serial: 'VB-0002', cal: '2026-02-04' }),
  ];
  const s = newSystem(p); Object.assign(s, { code: 'LG01', name: 'Kantoren verdieping 1', location: 'Technische ruimte dak', unit: 'Luchtgroep met WTW', design: { T: 1800, A: 1700 } });
  s.rec = 'plate';
  const [fT, fA] = s.fans; // M1 supply, M2 extract: AC motors 3~ 400 V on a frequency converter (fictitious nameplate)
  for (const [f, I, P] of [[fT, 4.2, 1.5], [fA, 3.9, 1.1]]) Object.assign(f, { motor: 'AC', supply: '3~400', drive: 'vfd', fmax: 50, np: Object.assign(f.np, { P, I, U: 400, rpm: 2850, cos: 0.82, ie: 'IE3' }) });
  s.meas.eerste = { qT: 1690, qA: 1810, paT: 210, paA: 175, fT: 85, fA: 62, fan: { [fT.id]: { hz: 42, i1: 3.1, i2: 3.0, i3: 3.2 }, [fA.id]: { hz: 40, i1: 2.8, i2: 2.8, i3: 2.9 } } };
  s.meas.controle = { qT: 1795, qA: 1712, paT: 238, paA: 168, fT: 86, fA: 62, fan: { [fT.id]: { hz: 45, i1: 3.6, i2: 3.5, i3: 3.7 }, [fA.id]: { hz: 38, i1: 2.6, i2: 2.6, i3: 2.7 } } };
  p.systems.push(s);
  const add = (o) => p.points.push(newPoint(p, o));
  const sup = [
    ['Tak 1', 'T1.01', 'Lokaal 1.01', 150, 141, 152, 'Iris-125', '4', '3'], ['Tak 1', 'T1.02', 'Lokaal 1.02', 150, 168, 147, 'Iris-125', '5', '3'],
    ['Tak 1', 'T1.03', 'Lokaal 1.03', 150, 133, 149, 'Iris-125', 'open', 'open'], ['Tak 1', 'T1.04', 'Lokaal 1.04', 150, 175, 155, 'Iris-125', '5', '2'],
    ['Tak 2', 'T2.01', 'Vergaderzaal', 150, 122, 146, 'Iris-160', 'open', 'open'], ['Tak 2', 'T2.02', 'Vergaderzaal', 150, 139, 151, 'Iris-160', '4', '4'],
    ['Tak 2', 'T2.03', 'Gang', 150, 158, 143, 'Iris-160', '6', '4'], ['Tak 2', 'T2.04', 'Refter', 150, 147, 150, 'Iris-160', '5', '4'],
  ];
  for (const [br, code, room, qd, q1, q2, model, pb, pa] of sup) add({ systemId: s.id, dir: 'T', branch: br, code, room, ttype: 'plafonddiffusor', size: '600x600', designQ: qd, method: 'hood', reg: { type: 'iris', model, vmin: null, vmax: null, posBefore: pb, posAfter: pa, locked: true, state: '' }, meas: { eerste: { r: [q1] }, controle: { r: [q2] } } });
  // Tak 3: CAV → 2 × IRIS → grilles (master / slave)
  const node = (o) => { const x = newPoint(p, Object.assign({ systemId: s.id, kind: 'duct', ttype: 'overig' }, o)); p.points.push(x); return x; };
  const cav = node({ dir: 'T', branch: 'Tak 3', code: 'CAV-T3', room: 'Plafond open kantoor', designQ: 600, method: 'readout', reg: { type: 'cav', model: 'CAV-250', vmin: 600, vmax: 600, dpmin: 50, posBefore: '600 m³/h', posAfter: '600 m³/h', locked: true, state: '' }, meas: { eerste: { r: [548], ps: 150 }, controle: { r: [596], ps: 168 } } });
  const ir1 = node({ dir: 'T', branch: 'Tak 3', code: 'IR-T3.1', room: 'Open kantoor noord', parentId: cav.id, designQ: 300, method: 'kfactor', k: 110.88, kU: 'ls', reg: { type: 'iris', model: 'Iris-200', vmin: null, vmax: null, dpmin: null, posBefore: 'open', posAfter: '5', locked: true, state: '' }, meas: { eerste: { r: [6.5], ps: 112 }, controle: { r: [7.1], ps: 138 } } });
  const ir2 = node({ dir: 'T', branch: 'Tak 3', code: 'IR-T3.2', room: 'Open kantoor zuid', parentId: cav.id, designQ: 300, method: 'kfactor', k: 110.88, kU: 'ls', reg: { type: 'iris', model: 'Iris-200', vmin: null, vmax: null, dpmin: null, posBefore: 'open', posAfter: 'open', locked: true, state: '' }, meas: { eerste: { r: [5.0], ps: 96 }, controle: { r: [7.3], ps: 104 } } });
  for (const [par, code, room, qd, q1, q2] of [[ir1, 'T3.01', 'Open kantoor noord', 150, 152, 151], [ir1, 'T3.02', 'Open kantoor noord', 150, 131, 148], [ir2, 'T3.03', 'Open kantoor zuid', 300, 248, 296]])
    add({ systemId: s.id, dir: 'T', branch: 'Tak 3', parentId: par.id, code, room, ttype: 'plafonddiffusor', size: '600x600', designQ: qd, method: 'hood', reg: { type: 'none', model: '', vmin: null, vmax: null, dpmin: null, posBefore: '', posAfter: '', locked: false, state: '' }, meas: { eerste: { r: [q1] }, controle: { r: [q2] } } });
  const ext = [
    ['Tak 1', 'A1.01', 'Lokaal 1.01', 140, 2.05, 1.82], ['Tak 1', 'A1.02', 'Lokaal 1.02', 140, 2.21, 1.86], ['Tak 1', 'A1.03', 'Lokaal 1.03', 140, 1.98, 1.85],
    ['Tak 1', 'A1.04', 'Sanitair', 140, 2.30, 1.90], ['Tak 2', 'A2.01', 'Gang', 140, 1.76, 1.79], ['Tak 2', 'A2.02', 'Archief', 140, 1.92, 1.83],
  ];
  for (const [br, code, room, qd, v1, v2] of ext) add({ systemId: s.id, dir: 'A', branch: br, code, room, ttype: 'rooster', size: '425x125', designQ: qd, method: 'anemo', aeff: 0.0212, reg: { type: 'regelklep', model: 'Lamellen', vmin: null, vmax: null, posBefore: '100%', posAfter: br === 'Tak 1' ? '70%' : '90%', locked: false, state: '' }, meas: { eerste: { r: [v1, v1 + .04, v1 - .03] }, controle: { r: [v2, v2 + .02, v2 - .02] } } });
  add({ systemId: s.id, dir: 'A', branch: 'Tak 3', code: 'A3.01', room: 'Keuken', ttype: 'ventiel', size: 'Ø200', designQ: 430, method: 'kfactor', k: 61.5, reg: { type: 'cav', model: 'CAV-200', vmin: 430, vmax: 430, posBefore: '430 m³/h', posAfter: '430 m³/h', locked: false, state: '' }, meas: { eerste: { r: [62] }, controle: { r: [47] } } });
  add({ systemId: s.id, dir: 'A', branch: 'Tak 3', code: 'A3.02', note: 'Regelaar haalt het ontwerpdebiet niet: instelling nakijken.', room: 'Kopieerruimte', ttype: 'ventiel', size: 'Ø160', designQ: 430, method: 'kfactor', k: 58.2, reg: { type: 'cav', model: 'CAV-160', vmin: 430, vmax: 430, posBefore: '430 m³/h', posAfter: '430 m³/h', locked: false, state: '' }, meas: { eerste: { r: [70] }, controle: { r: [44] } } });
  add({ systemId: s.id, dir: 'T', kind: 'duct', branch: 'Hoofdkanaal', code: 'K-T1', room: 'Technische ruimte', designQ: 1800, method: 'pitot', duct: { shape: 'round', d: 400, w: null, h: null, main: true }, meas: { eerste: { r: [7.9, 8.6, 9.4, 9.1, 8.3, 7.7] }, controle: { r: [9.2, 9.9, 10.6, 10.3, 9.6, 8.9] } } });
  add({ systemId: s.id, dir: 'A', kind: 'duct', branch: 'Hoofdkanaal', code: 'K-A1', room: 'Technische ruimte', designQ: 1700, method: 'traverse', duct: { shape: 'rect', d: null, w: 500, h: 300, main: true }, meas: { eerste: { r: [3.2, 3.5, 3.4, 3.3, 3.6, 3.1] }, controle: { r: [3.0, 3.3, 3.2, 3.1, 3.4, 2.9] } } });
  // line dampers on the duct: fire dampers between shaft and floor, the points behind them as slaves
  const byCode = (c) => p.points.find(q => q.code === c);
  const damper = (o, kids) => { const x = newPoint(p, Object.assign({ systemId: s.id, kind: 'device', ttype: 'overig' }, o)); x.reg = Object.assign(newPoint(p).reg, o.reg); x.fd = Object.assign(FD0(), o.fd || {}); p.points.push(x); for (const c of kids) { const k = byCode(c); if (k) k.parentId = x.id; } return x; };
  damper({ dir: 'T', branch: 'Tak 1', zone: 'V1', code: 'BK-T1', room: 'Schachtwand gang V1', reg: { type: 'brand', model: 'CU-LT Ø315', state: 'open', cond: 'ok' }, fd: { from: 'Schacht', to: 'V1', pass: 'schacht', ei: 'EI 60 S', act: 'smelt', hatch: 'ok', plate: 'ok' } }, ['T1.01', 'T1.02', 'T1.03', 'T1.04']);
  damper({ dir: 'T', branch: 'Tak 3', zone: 'V1', code: 'BK-T3', room: 'Plafond open kantoor', parentId: cav.id, reg: { type: 'brand', model: 'CR60 Ø250', state: 'open', cond: 'ok' }, fd: { from: 'Gang V1', to: 'Open kantoor', pass: 'wand', ei: 'EI 60 S', act: 'm24', sw: true, hatch: 'ok', plate: 'ok', test: 'ok', sig: 'ok', tby: 'Eigen ploeg + GBS-integrator' } }, ['IR-T3.1', 'IR-T3.2']);
  damper({ dir: 'A', branch: 'Tak 2', zone: 'V0', code: 'BK-A2', room: 'Archief', reg: { type: 'brand', model: 'CU-LT 400x200', state: 'open', cond: 'ok' }, fd: { from: 'Archief', to: 'Gang V0', pass: 'wand', ei: 'EI 60 S', act: 'smelt', hatch: 'nok', plate: 'ok' }, note: 'Inspectieluik niet bereikbaar (boven vast plafond).' }, ['A2.01', 'A2.02']);
  damper({ dir: 'A', branch: 'Hoofdkanaal', zone: 'Dak', code: 'AK-01', room: 'Technische ruimte', reg: { type: 'afsluit', model: '500x300', state: 'open', cond: 'ok' }, fd: { act: 'm24', sw: true } }, []);
  const setPs = (code, a, b, dpmin) => { const x = p.points.find(q => q.code === code); if (!x) return; x.meas.eerste.ps = a; x.meas.controle.ps = b; if (dpmin) x.reg.dpmin = dpmin; };
  setPs('K-T1', 205, 228); setPs('T1.01', 72, 70); setPs('T1.04', 60, 66); setPs('T2.01', 41, 52); setPs('T2.04', 47, 50);
  setPs('K-A1', -168, -160); setPs('A1.04', -45, -48); setPs('A2.01', -38, -42); setPs('A3.01', -118, -112, 100); setPs('A3.02', -86, -84, 100);
  p.report.remarks = 'Voorbeeldproject met fictieve meetwaarden.\nCAV-regelaar A3.02 haalt het ontwerpdebiet niet (-10 %): instelling van de regelaar nakijken.';
  p.instruments.push(Object.assign(INS0(), { name: 'Thermische anemometer', type: 'Testo 405i', serial: 'VB-0003', cal: '2026-01-20', kind: 'hotwire' }));
  for (const x of p.points) if (measurable(x)) for (const ph of ['eerste', 'controle']) if (readings(x, ph).length) { const id = insGuess(p, x); if (id) x.meas[ph].ins = id; }
  return p;
}

/* ---------- photos: device cache (IndexedDB) + artifact assets ---------- */
const isPdfFile = (f) => f && (f.type === 'application/pdf' || /\.pdf$/i.test(f.name || ''));
const isHeic = (f) => f && (/hei[cf]/i.test(f.type || '') || /\.hei[cf]$/i.test(f.name || ''));
async function decodeImage(file) {
  try { return await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch (e) { }
  return await new Promise((res, rej) => { const u = URL.createObjectURL(file); const im = new Image(); im.onload = () => { res(im); setTimeout(() => URL.revokeObjectURL(u), 1000); }; im.onerror = () => { URL.revokeObjectURL(u); const er = new Error('decode'); er.code = isHeic(file) ? 'heic' : 'decode'; rej(er); }; im.src = u; });
}
const canvasBlob = (c, type, q) => new Promise(r => c.toBlob(r, type, q));
/** any decodable image (or canvas) → {blob, w, h, mime}; keeps PNG for drawings/screenshots when it stays small */
async function compressImage(file, max = 1600, q = 0.82, opts = {}) {
  const src = file instanceof HTMLCanvasElement ? file : await decodeImage(file);
  const W = src.width || src.naturalWidth, H = src.height || src.naturalHeight;
  if (!W || !H) { const er = new Error('decode'); er.code = 'decode'; throw er; }
  const sc = Math.min(1, max / Math.max(W, H)); const w = Math.max(1, Math.round(W * sc)), h = Math.max(1, Math.round(H * sc));
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.drawImage(src, 0, 0, w, h);
  const wantPng = opts.png || (opts.keepPng && /png|gif|svg|bmp/i.test(file.type || ''));
  if (wantPng) { const b = await canvasBlob(c, 'image/png'); if (b && b.size <= (opts.pngMax || 1.8e6)) return { blob: b, w, h, mime: 'image/png' }; }
  const blob = await canvasBlob(c, 'image/jpeg', q);
  return { blob, w, h, mime: 'image/jpeg' };
}
const Photos = {
  _db: null, _assets: undefined, urls: new Map(),
  async idb() {
    if (this._db) return this._db;
    this._db = await new Promise((res, rej) => { const r = indexedDB.open('inregelaar-photos', 1); r.onupgradeneeded = () => r.result.createObjectStore('p'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
    return this._db;
  },
  async put(id, blob) { try { const db = await this.idb(); await new Promise((res, rej) => { const tx = db.transaction('p', 'readwrite'); tx.objectStore('p').put(blob, id); tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); }); return true; } catch (e) { return false; } },
  async getLocal(id) { try { const db = await this.idb(); return await new Promise((res) => { const rq = db.transaction('p').objectStore('p').get(id); rq.onsuccess = () => res(rq.result || null); rq.onerror = () => res(null); }); } catch (e) { return null; } },
  async delLocal(id) { try { const db = await this.idb(); await new Promise((res) => { const tx = db.transaction('p', 'readwrite'); tx.objectStore('p').delete(id); tx.oncomplete = () => res(); tx.onerror = () => res(); }); } catch (e) { } },
  async assets() {
    if (this._assets !== undefined) return this._assets;
    this._assets = null;
    if (window.claude && typeof window.claude.use === 'function') { try { this._assets = await window.claude.use('assets'); } catch (e) { this._assets = null; } }
    return this._assets;
  },
  async add(file, opts = {}) {
    const r = await compressImage(file, opts.max || 1600, opts.q || 0.82, { keepPng: true, png: opts.png });
    return this.addBlob(r.blob, { w: r.w, h: r.h, mime: r.mime, caption: opts.caption || '' });
  },
  async addBlob(blob, meta = {}) {
    const ph = { id: 'f' + uid(), caption: meta.caption || '', w: meta.w || 0, h: meta.h || 0, mime: meta.mime || blob.type || 'image/jpeg', ts: Date.now(), assetId: '', url: '' };
    const okLocal = await this.put(ph.id, blob);
    const a = await this.assets();
    if (a) { try { const r = await a.upload(blob); ph.assetId = r.id; ph.url = r.url; } catch (e) { } }
    if (!okLocal && !ph.url) throw new Error('nowhere to store');
    return ph;
  },
  async blob(ph) {
    let b = await this.getLocal(ph.id);
    if (!b && ph.url) { try { const r = await fetch(ph.url); if (r.ok) { b = await r.blob(); this.put(ph.id, b); } } catch (e) { } }
    if (!b && ph.data) { try { b = await (await fetch(ph.data)).blob(); this.put(ph.id, b); } catch (e) { } }
    return b;
  },
  async src(ph) {
    if (this.urls.has(ph.id)) return this.urls.get(ph.id);
    const b = await this.blob(ph); if (!b) return ph.url || '';
    const u = URL.createObjectURL(b); this.urls.set(ph.id, u); return u;
  },
  /** JPEG data URL, longest side ≤ max, for reports */
  async dataURL(ph, max = 1400) {
    const b = await this.blob(ph); if (!b) return null;
    try { const r = await compressImage(b, max, 0.8); return await new Promise((res) => { const fr = new FileReader(); fr.onload = () => res({ url: fr.result, w: r.w, h: r.h }); fr.readAsDataURL(r.blob); }); } catch (e) { return null; }
  },
  async remove(ph) {
    await this.delLocal(ph.id); const u = this.urls.get(ph.id); if (u) { URL.revokeObjectURL(u); this.urls.delete(ph.id); }
    if (ph.assetId) { const a = await this.assets(); if (a) { try { await a.delete(ph.assetId); } catch (e) { } } }
  },
};
/** owner: 'page:<step>' | 'pt:<id>' | 'sys:<id>' */
function photoList(p, owner, create = true) {
  const i = owner.indexOf(':'); const t = owner.slice(0, i), k = owner.slice(i + 1);
  if (t === 'page') { p.notes = p.notes || {}; if (!p.notes[k] && !create) return []; const n = p.notes[k] || (p.notes[k] = { text: '', photos: [] }); n.photos = n.photos || []; return n.photos; }
  const arr = t === 'pt' ? p.points : t === 'sys' ? p.systems : [];
  const o = arr.find(x => x.id === k); if (!o) return []; o.photos = o.photos || []; return o.photos;
}
/** every stored picture of a project (renders and originals) — for backups, packages and deleting */
function allPhotos(p) {
  const out = [];
  for (const it of (p.cover && p.cover.items) || []) if (it) { if (it.photo) out.push(it.photo); if (it.orig) out.push(it.orig); }
  const add = (list) => { for (const ph of list || []) { out.push(ph); if (ph.orig) out.push(ph.orig); } };
  for (const n of Object.values(p.notes || {})) add(n.photos);
  for (const s of p.systems) add(s.photos);
  for (const pt of p.points) add(pt.photos);
  return out;
}
const PAGE_KEYS = ['project', 'points', 'eerste', 'devices', 'controle', 'report', null];

/* ---------- PDF pages → images (pdf.js, main thread) ---------- */
const PDFX = {
  lib: null,
  async load() {
    if (this.lib) return this.lib;
    await import(LIB.pdfjsWorker);
    const lib = await import(LIB.pdfjs);
    try { lib.GlobalWorkerOptions.workerSrc = LIB.pdfjsWorker; } catch (e) { }
    this.lib = lib; return lib;
  },
  async open(file) {
    const lib = await this.load();
    const data = new Uint8Array(await file.arrayBuffer());
    return lib.getDocument({ data, isEvalSupported: false, enableXfa: false, useSystemFonts: true, stopAtErrors: false }).promise;
  },
  async render(pdf, n, maxSide) {
    const page = await pdf.getPage(n); const v1 = page.getViewport({ scale: 1 });
    const sc = Math.min(maxSide / Math.max(v1.width, v1.height), 8); const vp = page.getViewport({ scale: sc });
    const c = document.createElement('canvas'); c.width = Math.max(1, Math.floor(vp.width)); c.height = Math.max(1, Math.floor(vp.height));
    const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
    await page.render({ canvasContext: g, viewport: vp, background: 'white' }).promise; page.cleanup();
    return c;
  },
};

/* ---------- master / slave hierarchy ---------- */
const byId = (p, id) => p.points.find(x => x.id === id);
/** the point directly above (can be a line damper) */
function rawParent(p, pt) { return pt && pt.parentId ? byId(p, pt.parentId) || null : null; }
/** master for flows, balancing and pressures: the nearest point above that is not a line damper */
function parentOf(p, pt) { let q = rawParent(p, pt), g = 0; while (q && isDev(q) && g++ < 30) q = rawParent(p, q); return q; }
function rawChildren(p, id) { return p.points.filter(x => x.parentId === id); }
/** slaves of a master: line dampers in between are looked through */
function childrenOf(p, id, d = 0) { const out = []; for (const x of rawChildren(p, id)) { if (isDev(x)) { if (d < 30) out.push(...childrenOf(p, x.id, d + 1)); } else out.push(x); } return out; }
/** end flow of a unit (what the report sums as «eindorganen»): a grille, or any measured point with nothing hanging under it,
 *  e.g. a VAV/CAV/iris at the end of a branch. Line dampers (kind device) and the main-duct measurement are not end flows. */
function isEndFlow(p, pt) { return !!pt && (pt.kind === 'terminal' || pt.kind === 'duct') && !(pt.kind === 'duct' && pt.duct?.main) && childrenOf(p, pt.id).length === 0; }
function levelOf(p, pt) { let l = 1, q = parentOf(p, pt), g = 0; while (q && g++ < 30) { l++; q = parentOf(p, q); } return l; }
function descendantIds(p, id) { const out = new Set(); const st = [id]; while (st.length) { const c = st.pop(); for (const k of p.points) if (k.parentId === c && !out.has(k.id)) { out.add(k.id); st.push(k.id); } } return out; }
const isNode = (pt) => pt && pt.kind === 'duct';
/** a point can hang under a node or under a line damper of the same unit and direction */
function canBeMaster(p, pt, cand) { return cand && cand.id !== pt.id && (isNode(cand) || isDev(cand)) && cand.systemId === pt.systemId && cand.dir === pt.dir && !descendantIds(p, pt.id).has(cand.id); }
function pathOf(p, pt) { const a = []; let q = pt, g = 0; while (q && g++ < 30) { a.unshift(q); q = parentOf(p, q); } return a; }
/** line dampers above the point, nearest first */
function dampersAbove(p, pt) { const out = []; let q = rawParent(p, pt), g = 0; while (q && g++ < 30) { if (isDev(q)) out.push(q); q = rawParent(p, q); } return out; }
/** closed or defective line damper above the point: the measurement behind it is not representative */
const devBad = (d) => !!d && (d.reg.state === 'dicht' || d.reg.cond === 'defect');
function blockedBy(p, pt) { return dampersAbove(p, pt).find(devBad) || null; }
/** measurable points behind a line damper */
function behind(p, dev) { const ids = descendantIds(p, dev.id); return p.points.filter(x => ids.has(x.id) && measurable(x)); }
const kindRank = (x) => x.kind === 'device' ? 0 : x.kind === 'duct' ? 1 : 2;
/** order set by hand within one branch (pt.ord, 0.9.18): points with an order first, in that order; then the usual rule */
const ordCmp = (a, b) => isNum(a.ord) && isNum(b.ord) ? a.ord - b.ord : isNum(a.ord) ? -1 : isNum(b.ord) ? 1 : 0;
const sibCmp = (a, b) => natCmp(a.branch, b.branch) || ordCmp(a, b) || (kindRank(a) - kindRank(b)) || natCmp(a.code, b.code);
/** points that share the place of pt: same unit, side, branch and master — the list ↑ / ↓ moves within */
function siblingsOf(p, pt) {
  const pid = (x) => (rawParent(p, x) || {}).id || '';
  return p.points.filter(x => x.systemId === pt.systemId && x.dir === pt.dir && (x.branch || '') === (pt.branch || '') && pid(x) === pid(pt)).sort(sibCmp);
}
/** move a point one place up (−1) or down (+1) among its siblings; the whole branch gets numbers 10, 20, 30 … */
function moveSibling(p, pt, d) {
  const sib = siblingsOf(p, pt); const i = sib.indexOf(pt), j = i + d; if (i < 0 || j < 0 || j >= sib.length) return false;
  [sib[i], sib[j]] = [sib[j], sib[i]]; sib.forEach((x, k) => { x.ord = (k + 1) * 10; }); return true;
}
/** depth-first order with levels; the parent is the nearest point above that is in the given set (else the item is a root) */
function treeOrder(p, pts) {
  const set = new Set(pts.map(x => x.id)); const kids = new Map();
  const up = (x) => { let q = rawParent(p, x), g = 0; while (q && g++ < 30) { if (q.id !== x.id && set.has(q.id)) return q.id; q = rawParent(p, q); } return ''; };
  for (const x of pts) { const pid = up(x); if (!kids.has(pid)) kids.set(pid, []); kids.get(pid).push(x); }
  for (const arr of kids.values()) arr.sort(sibCmp);
  const out = []; const seen = new Set();
  const walk = (x, lvl) => { if (seen.has(x.id)) return; seen.add(x.id); out.push({ pt: x, lvl }); for (const c of kids.get(x.id) || []) walk(c, lvl + 1); };
  for (const r of kids.get('') || []) walk(r, 1);
  for (const x of pts) if (!seen.has(x.id)) walk(x, 1);
  return out;
}
/** measured flow of a point; a master without its own measurement = Σ of its slaves (when all are known) */
function nodeQ(p, pt, phase, d = 0) {
  const c = calcQ(pt, phase, p); if (isNum(c.q)) return { q: c.q, derived: false };
  if (d > 30) return { q: null };
  const kids = childrenOf(p, pt.id).filter(measurable); if (!kids.length) return { q: null, derived: false };
  let s = 0, n = 0; for (const k of kids) { const r = nodeQ(p, k, phase, d + 1); if (isNum(r.q)) { s += r.q; n++; } }
  return { q: n === kids.length ? s : null, derived: true, n, m: kids.length, partial: n ? s : null };
}
function ptQ(p, pt, phase) { return nodeQ(p, pt, phase).q; }
/** design flow; a master without its own design = Σ design of its slaves */
/** Σ of the design flows of the slaves — like the measured Σ, only when every slave has one: a partial sum is no target.
 *  { v: Σ or null, n: slaves with a design flow, m: slaves, partial: Σ of the known ones when some are missing } */
function kidsDesignInfo(p, pt, d = 0) {
  const kids = childrenOf(p, pt.id).filter(measurable); if (!kids.length) return { v: null, n: 0, m: 0, partial: null };
  let s = 0, n = 0; for (const k of kids) { const v = designOf(p, k, d + 1); if (isNum(v)) { s += v; n++; } }
  return { v: n === kids.length ? s : null, n, m: kids.length, partial: n && n < kids.length ? s : null };
}
/** design flow of a point: its own, otherwise the Σ of its slaves (only when all of them have one) */
function designOf(p, pt, d = 0) { if (isNum(pt.designQ)) return pt.designQ; if (d > 30) return null; return kidsDesignInfo(p, pt, d).v; }
function kidsDesign(p, pt) { return kidsDesignInfo(p, pt).v; }
/** sibling groups for proportional balancing: slaves of one master, or roots of one branch */
function balanceGroups(p, pts) {
  const map = new Map();
  for (const x of pts) {
    const par = parentOf(p, x); const key = par ? 'm:' + par.id : `r:${x.systemId}|${x.dir}|${x.branch || ''}`;
    if (!map.has(key)) map.set(key, { key, master: par, sysId: x.systemId, dir: x.dir, branch: par ? (par.branch || '') : (x.branch || ''), items: [] });
    map.get(key).items.push(x);
  }
  const sysIdx = new Map(p.systems.map((s, i) => [s.id, i]));
  const out = [...map.values()];
  for (const g of out) { g.items.sort(sibCmp); g.depth = g.master ? levelOf(p, g.master) + 1 : 1; const ps = g.items.map(x => psOf(x, 'eerste')).filter(v => v != null).map(Math.abs); g.minP = ps.length ? Math.min(...ps) : Infinity; g.lam = groupRatio(p, g.items); }
  // proportional method: bottom-up by level; within a level from the most overloaded group (highest ratio) to the group with the lowest ratio (index group), which comes last
  const lamCmp = (a, b) => isNum(a.lam) && isNum(b.lam) ? b.lam - a.lam : isNum(a.lam) ? -1 : isNum(b.lam) ? 1 : 0;
  out.sort((a, b) => (sysIdx.get(a.sysId) ?? 99) - (sysIdx.get(b.sysId) ?? 99) || (a.dir === b.dir ? 0 : a.dir === 'T' ? -1 : 1) || b.depth - a.depth || lamCmp(a, b) || b.minP - a.minP || natCmp(a.master?.code || a.branch, b.master?.code || b.branch));
  // groups the balancing step shows (a lone main duct without a damper is not adjusted): only these get an order on their level
  for (const g of out) g.show = g.items.some(x => x.kind === 'terminal' || hasReg(x) || isNode(x)) && !(g.items.length === 1 && !g.master && g.items[0].kind === 'duct' && !hasReg(g.items[0]));
  const lv = new Map(); for (const g of out.filter(x => x.show)) { const k = `${g.sysId}|${g.dir}|${g.depth}`; if (!lv.has(k)) lv.set(k, []); lv.get(k).push(g); }
  for (const arr of lv.values()) { const withL = arr.filter(g => isNum(g.lam)); arr.forEach((g, i) => { g.lvlRank = i + 1; g.lvlN = arr.length; g.lvlIdx = withL.length > 1 && g === withL[withL.length - 1]; }); }
  return out;
}
/** ratio of a group of points after measurement 1: Σ measured / Σ design over the points that have both */
function groupRatio(p, items) { let q = 0, d = 0, n = 0; for (const x of items) { const a = ptQ(p, x, 'eerste'), b = designOf(p, x); if (isNum(a) && isNum(b) && b > 0) { q += a; d += b; n++; } } return n ? q / d : null; }
/* ---------- duct pressures: index of the system and losses ---------- */
function psOf(pt, phase) { const v = pt && pt.meas && pt.meas[phase] && pt.meas[phase].ps; return isNum(v) ? v : null; }
function fanP(p, pt, phase) { const s = sysOf(p, pt.systemId); const v = s && s.meas && s.meas[phase] && s.meas[phase]['pa' + pt.dir]; return isNum(v) ? v : null; }
function upstreamP(p, pt, phase) {
  let q = parentOf(p, pt), g = 0;
  while (q && g++ < 30) { const v = psOf(q, phase); if (v != null) return { v, ref: q.code || '?', pt: q }; q = parentOf(p, q); }
  const f = fanP(p, pt, phase); return f != null ? { v: f, ref: __('fan'), fan: true } : null;
}
/** {ps, up, dUp: loss from the nearest measured master (or fan), dFan: loss from the fan} — magnitudes, so supply and extract read the same */
function lossOf(p, pt, phase) {
  const v = psOf(pt, phase); if (v == null) return null;
  const up = upstreamP(p, pt, phase); const f = fanP(p, pt, phase);
  return { ps: v, up, dUp: up ? Math.abs(up.v) - Math.abs(v) : null, dFan: f != null ? Math.abs(f) - Math.abs(v) : null };
}
/** index of the system: measured point with the lowest available static pressure (largest loss from the fan) */
function pressureIndex(p, sysId, dir, phase) {
  let best = null;
  for (const x of p.points) if (x.systemId === sysId && x.dir === dir && measurable(x)) { const v = psOf(x, phase); if (v != null && (!best || Math.abs(v) < Math.abs(psOf(best, phase)))) best = x; }
  return best;
}
function dpLow(pt, phase) { const v = psOf(pt, phase); return isNum(pt.reg?.dpmin) && v != null && Math.abs(v) < pt.reg.dpmin; }
