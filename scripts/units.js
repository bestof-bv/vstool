/* ---------- air handling units: type, systems of several units, fans and motors, control and communication ----------
   unit  s = { …, type: 'TA' | 'T' | 'A', rec, fans: [FAN0], ctl: CTL0 }   (type: supply + extract, supply only, extract only)
   system p.groups = [{ id, name, link, shared, members: [unit ids], roles: { id: role }, note }] — two or more units that work together;
          the lists show such a system as one installation; a unit belongs to one system at most.
   fan   f = { id, pos, dir: 'T' | 'A' | 'TA' (one motor for both sides), n (identical fans), maker, model, motor, supply, drive, read: [what the controller shows],
               fmax, np: { P kW, I A, U V, rpm, cos, ie }, kc (cone k), pulley: { dm, df } mm, ctl, note }
   readings of a fan per phase: s.meas[phase].fan[f.id] = { hz, pct, volt, rpm, q, pa, stage, i | i1 i2 i3, u12 u23 u31, kw, dpc }
   control and communication (fan, unit controller, VAV / CAV actuator): CTL0 */

/* ---- unit type ---- */
const UNIT_TYPES = ['TA', 'T', 'A'];
const unitDirs = (s) => s && s.type === 'T' ? ['T'] : s && s.type === 'A' ? ['A'] : ['T', 'A'];
const unitHas = (s, dir) => unitDirs(s).includes(dir);
const REC_TYPES = ['plate', 'rotary', 'glycol', 'heatpipe', 'none', 'other'];

/* ---- systems of several units ---- */
const LINKS = ['cascade', 'supplement', 'compensation', 'parallel'];
const UROLES = ['main', 'secondary', 'supplement', 'compensation', 'standby'];
function GRP0() { return { id: 'g' + uid(), name: '', link: 'cascade', shared: false, members: [], roles: {}, note: '' }; }
const defaultRole = (link) => ({ cascade: 'secondary', supplement: 'supplement', compensation: 'compensation', parallel: 'main' })[link] || 'main';
const grpOf = (p, sid) => ((p && p.groups) || []).find(g => g.members.includes(sid)) || null;
const grpUnits = (p, g) => p.systems.filter(s => g.members.includes(s.id));
function roleOf(p, sid) { const g = grpOf(p, sid); if (!g) return 'main'; const r = g.roles && g.roles[sid]; return UROLES.includes(r) ? r : (g.members[0] === sid ? 'main' : defaultRole(g.link)); }
/** the units that share one duct network (a system marked «common network»); otherwise the unit alone */
function netIds(p, sid) { const g = grpOf(p, sid); return g && g.shared ? g.members.slice() : [sid]; }
/** the systems as the lists show them: one entry per system (a combined system once), in the order of the units */
function sysEntries(p) {
  const out = [], seen = new Set();
  for (const s of p.systems) {
    if (seen.has(s.id)) continue; const g = grpOf(p, s.id);
    if (g) { const us = grpUnits(p, g); us.forEach(u => seen.add(u.id)); out.push({ key: 'g:' + g.id, g, units: us }); }
    else { seen.add(s.id); out.push({ key: s.id, g: null, units: [s] }); }
  }
  return out;
}
const entryCode = (e) => e.units.map(s => s.code || '?').join('+');
const entryOf = (p, sid) => sysEntries(p).find(e => e.units.some(s => s.id === sid)) || null;
const entryByKey = (p, key) => sysEntries(p).find(e => e.key === key) || null;
/** label in the lists: «LG01 Kantoren» or «LG01+LG02 · cascade — name» */
function entryLabel(e) {
  if (!e.g) { const s = e.units[0]; return `${s.code || '?'}${s.name ? ' ' + s.name : ''}`; }
  return `${entryCode(e)} · ${ULab().link[e.g.link] || e.g.link}${e.g.name ? ' — ' + e.g.name : ''}`;
}
function entryLabelR(e) {
  if (!e.g) { const s = e.units[0]; return `${s.code || '?'}${s.name ? ' — ' + s.name : ''}`; }
  return `${entryCode(e)} (${RLab().link[e.g.link] || e.g.link})${e.g.name ? ' — ' + e.g.name : ''}`;
}
/** the unit ids of a filter / scope key: 'all', a unit id or 'g:<system id>' */
function keyUnits(p, key) {
  if (!key || key === 'all') return new Set(p.systems.map(s => s.id));
  if (String(key).startsWith('g:')) { const g = (p.groups || []).find(x => 'g:' + x.id === key); return new Set(g ? g.members : []); }
  return new Set(p.systems.some(s => s.id === key) ? [key] : []);
}
const inKey = (p, key, sid) => !key || key === 'all' || keyUnits(p, key).has(sid);
/** one unit for a key (new points): the unit itself, the main unit of a system, null for «all» */
function keyMainUnit(p, key) {
  if (!key || key === 'all') return null;
  if (String(key).startsWith('g:')) { const e = entryByKey(p, key); return e ? (e.units.find(u => roleOf(p, u.id) === 'main') || e.units[0]).id : null; }
  return p.systems.some(s => s.id === key) ? key : null;
}
/** keep the systems consistent: known units, two or more members, one system per unit; members next to each other at the place of the first one */
function sysNormalize(p) {
  const ids = new Set(p.systems.map(s => s.id)); const seen = new Set();
  p.groups = (Array.isArray(p.groups) ? p.groups : []).filter(g => g && typeof g === 'object').map(g => { const d = GRP0(); for (const k of Object.keys(d)) if (g[k] === undefined) g[k] = d[k]; // in place: callers keep their object
      g.members = (Array.isArray(g.members) ? g.members : []).filter(id => ids.has(id) && !seen.has(id)); g.members.forEach(id => seen.add(id)); g.roles = g.roles && typeof g.roles === 'object' ? g.roles : {}; return g; })
    .filter(g => { if (g.members.length < 2) { g.members.forEach(id => seen.delete(id)); return false; } return true; });
  for (const g of p.groups) { if (!LINKS.includes(g.link)) g.link = 'cascade'; for (const k of Object.keys(g.roles)) if (!g.members.includes(k) || !UROLES.includes(g.roles[k])) delete g.roles[k]; }
  const out = [], done = new Set();
  for (const s of p.systems) { if (done.has(s.id)) continue; const g = grpOf(p, s.id); for (const u of g ? p.systems.filter(x => g.members.includes(x.id)) : [s]) { out.push(u); done.add(u.id); } }
  p.systems = out;
  for (const g of p.groups) g.members = p.systems.filter(s => g.members.includes(s.id)).map(s => s.id);
}
/** add a unit to the system of another unit (or start one); link of a new system */
function sysJoin(p, sid, otherKey, link) {
  sysLeave(p, sid, true);
  let g = String(otherKey).startsWith('g:') ? (p.groups || []).find(x => 'g:' + x.id === otherKey) : grpOf(p, otherKey);
  if (!g) { const other = p.systems.find(s => s.id === otherKey); if (!other || other.id === sid) return null; g = Object.assign(GRP0(), { link: LINKS.includes(link) ? link : 'cascade', members: [other.id] }); g.roles[other.id] = 'main'; g.shared = g.link === 'parallel'; p.groups = (p.groups || []).concat([g]); }
  // the new member goes right after the last unit of the system
  const s = p.systems.find(x => x.id === sid); if (!s) return null;
  p.systems = p.systems.filter(x => x.id !== sid); const last = Math.max(...g.members.map(id => p.systems.findIndex(x => x.id === id))); p.systems.splice(last + 1, 0, s);
  g.members.push(sid); g.roles[sid] = defaultRole(g.link);
  sysNormalize(p); return g;
}
function sysLeave(p, sid, quiet) { const g = grpOf(p, sid); if (!g) return; g.members = g.members.filter(id => id !== sid); delete g.roles[sid]; if (!quiet) sysNormalize(p); else p.groups = (p.groups || []).filter(x => x.members.length >= 1); }
/** move a system entry one place up (-1) or down (+1) in the order of the report */
function sysMove(p, key, d) {
  const es = sysEntries(p); const i = es.findIndex(e => e.key === key); const j = i + d; if (i < 0 || j < 0 || j >= es.length) return false;
  [es[i], es[j]] = [es[j], es[i]]; p.systems = es.flatMap(e => e.units); return true;
}
/** order by code: systems by their first code, in a system the main unit first */
function sysSortByCode(p) {
  const es = sysEntries(p).map(e => Object.assign({}, e, { units: e.units.slice().sort((a, b) => (e.g ? (roleOf(p, a.id) === 'main' ? 0 : 1) - (roleOf(p, b.id) === 'main' ? 0 : 1) : 0) || natCmp(a.code, b.code)) }));
  es.sort((a, b) => natCmp(a.units[0].code, b.units[0].code)); p.systems = es.flatMap(e => e.units); sysNormalize(p);
}
/** units counted in the totals of a system: a cascade's secondary units are fed by the main unit, a standby unit does not run at the same time */
const countedIn = (p, s) => !['secondary', 'standby'].includes(roleOf(p, s.id));
const unitQ = (p, s, dir, phase) => systemQ(p, s, dir, phase) ?? mainDuctQ(p, s.id, dir, phase);
/** one side of a system entry: design and measured flow of the counted units, terminals of all units */
function entrySide(p, e, dir, phase) {
  const us = e.units.filter(s => unitHas(s, dir)); const counted = us.filter(s => !e.g || countedIn(p, s));
  let qd = 0, nd = 0, q = 0, nq = 0, miss = 0;
  for (const s of counted) { if (isNum(s.design[dir])) { qd += s.design[dir]; nd++; } const v = unitQ(p, s, dir, phase); if (isNum(v)) { q += v; nq++; } else miss++; }
  let t = 0, nt = 0, td = 0, ntd = 0;
  for (const s of e.units) { const a = sumTerminals(p, s.id, dir, phase); if (isNum(a)) { t += a; nt++; } const b = sumDesign(p, s.id, dir); if (isNum(b)) { td += b; ntd++; } }
  return { dir, qd: nd ? qd : null, q: nq ? q : null, partial: nq > 0 && miss > 0, t: nt ? t : null, td: ntd ? td : null, units: counted, any: us.length > 0 };
}
/** supply / extract balance of a system entry (design and measured) */
function entryBalance(p, e, phase) {
  const T = entrySide(p, e, 'T', phase), A = entrySide(p, e, 'A', phase);
  return { T, A, d: isNum(T.q) && isNum(A.q) ? T.q - A.q : null, dd: isNum(T.qd) && isNum(A.qd) ? T.qd - A.qd : null };
}

/* ---- fans and motors ---- */
const MOTORS = ['EC', 'AC', 'DC'];
const SUPPLIES = ['1~230', '3~230', '3~400', 'dc24', 'dc48', 'other'];
const DRIVES = ['vfd', 'ec', 'speed2', 'trafo', 'fixed', 'belt', 'cflow', 'cpress', 'other'];
const READS = ['pct', 'volt', 'rpm', 'hz', 'q', 'pa'];
const READ_DEC = { hz: 1, pct: 0, volt: 1, rpm: 0, q: 0, pa: 0, stage: 0 };
const READ_U = { hz: 'Hz', pct: '%', volt: 'V', rpm: 'min⁻¹', q: 'm³/h', pa: 'Pa', stage: '' };
/** EC controllers of known makers in the field list (the reading is chosen per fan and remembered per maker in the company settings) */
const EC_MAKERS = ['ebm-papst', 'Ziehl-Abegg', 'Rosenberg', 'Nicotra Gebhardt', 'Fläkt / FläktGroup', 'Systemair', 'Swegon', 'Trane', 'Daikin', 'Comefri', 'Soler & Palau', 'Orcon', 'Zehnder', 'Itho Daalderop', 'Brink', 'Vent-Axia'];
function CTL0() { return { pwr: '', mode: '', bus: '', addr: '', baud: '', par: '', stop: '', mac: '', inst: '', maxm: '', ip: '', port: '', uid: '', sig0: '', sig1: '', fb: '', bms: '', note: '' }; }
function FAN0(dir) { return { id: 'f' + uid(), pos: '', dir: dir || 'T', n: 1, maker: '', model: '', motor: '', supply: '', drive: '', read: [], fmax: null, np: { P: null, I: null, U: null, rpm: null, cos: null, ie: '' }, kc: null, pulley: { dm: null, df: null }, ctl: CTL0(), note: '' }; }
const fanFix = (f) => { const o = Object.assign(FAN0(f.dir), f); o.np = Object.assign(FAN0().np, f.np || {}); o.pulley = Object.assign({ dm: null, df: null }, f.pulley || {}); o.ctl = Object.assign(CTL0(), f.ctl || {}); o.read = Array.isArray(f.read) ? f.read.filter(k => READS.includes(k)) : []; if (!isNum(o.n) || o.n < 1) o.n = 1; return o; };
const fansOf = (s, dir) => ((s && s.fans) || []).filter(f => f.dir === dir || f.dir === 'TA');
const fanName = (s, f) => f.pos || ('M' + (((s && s.fans) || []).indexOf(f) + 1));
const is3ph = (f) => f && (f.supply === '3~230' || f.supply === '3~400');
const fanM = (s, phase, f) => (s && s.meas && s.meas[phase] && s.meas[phase].fan && s.meas[phase].fan[f.id]) || {};
/** what is read / set at the controller of a fan, by its drive */
function fanReads(f) {
  switch (f && f.drive) {
    case 'vfd': return ['hz']; case 'speed2': case 'trafo': return ['stage']; case 'belt': return ['rpm']; case 'cflow': return ['q']; case 'cpress': return ['pa']; case 'fixed': return [];
    case 'ec': case 'other': return f.read && f.read.length ? f.read.filter(k => READS.includes(k)) : ['pct'];
    default: return ['hz']; // drive not given: the frequency, as before 0.9
  }
}
/** first control value of a fan that is filled in: { k, v } */
function fanCtlVal(s, phase, f) { const m = fanM(s, phase, f); for (const k of fanReads(f)) if (isNum(m[k])) return { k, v: m[k] }; return null; }
/** setting of a unit side (first fan with a value) — a measurement made at another setting is not representative */
function dirSetting(s, phase, dir) { for (const f of fansOf(s, dir)) { const c = fanCtlVal(s, phase, f); if (c) return c; } return null; }
const dirSetV = (s, phase, dir) => { const c = dirSetting(s, phase, dir); return c ? c.v : null; };
const ctlValUI = (c) => !c ? '' : c.k === 'stage' ? __('step {n}', { n: fmt(c.v) }) : `${fmt(c.v, READ_DEC[c.k] ?? 1)} ${c.k === 'rpm' ? READ_U.rpm : c.k === 'q' ? __('m³/h') : c.k === 'pa' ? __('Pa') : READ_U[c.k]}`;
const ctlValR = (c) => !c ? '' : c.k === 'stage' ? _r('stand {n}', { n: nl(c.v) }) : `${nl(c.v, READ_DEC[c.k] ?? 1)} ${READ_U[c.k]}`;
/** settings of all fans of a side in one line («M1 38,5 Hz · M2 38,5 Hz»); R = report language */
function dirSetText(s, phase, dir, R) {
  const fs = fansOf(s, dir); const parts = fs.map(f => { const c = fanCtlVal(s, phase, f); return c ? (fs.length > 1 ? fanName(s, f) + ' ' : '') + (R ? ctlValR(c) : ctlValUI(c)) : ''; }).filter(Boolean);
  return parts.join(' · ');
}
/** motor current of a fan: one value (1~, DC) or per phase with the unbalance max |I − Iavg| / Iavg */
function fanCur(s, phase, f) {
  const m = fanM(s, phase, f); const three = is3ph(f);
  const vals = three ? [m.i1, m.i2, m.i3].filter(isNum) : (isNum(m.i) ? [m.i] : [m.i1, m.i2, m.i3].filter(isNum).slice(0, 1));
  if (!vals.length) return null;
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length, max = Math.max(...vals);
  const unb = three && vals.length === 3 && avg > 0 ? Math.max(...vals.map(v => Math.abs(v - avg))) / avg * 100 : null;
  const In = f.np && isNum(f.np.I) ? f.np.I : null;
  return { vals, avg, max, unb, In, over: In != null && max > In, three, n: vals.length };
}
const unbLimit = (p) => isNum(p && p.tol && p.tol.iunb) && p.tol.iunb > 0 ? p.tol.iunb : null;
const unbBad = (p, c) => !!(c && isNum(c.unb) && unbLimit(p) != null && c.unb > unbLimit(p));
function fanVolt(s, phase, f) {
  const m = fanM(s, phase, f); const vals = [m.u12, m.u23, m.u31].filter(isNum); if (!vals.length) return null;
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
  return { vals, avg, unb: vals.length === 3 && avg > 0 ? Math.max(...vals.map(v => Math.abs(v - avg))) / avg * 100 : null };
}
/** electric power of one fan: read at the drive, or estimated from U, I and cos φ (nameplate) */
function fanPow(s, phase, f) {
  const m = fanM(s, phase, f); if (isNum(m.kw)) return { kw: m.kw, est: false };
  const c = fanCur(s, phase, f); if (!c) return null; const v = fanVolt(s, phase, f);
  const U = v ? v.avg : isNum(f.np && f.np.U) ? f.np.U : null; const cos = isNum(f.np && f.np.cos) ? f.np.cos : null;
  if (!isNum(U) || !isNum(cos) || f.supply === 'dc24' || f.supply === 'dc48') return null;
  return { kw: (c.three ? Math.sqrt(3) : 1) * U * c.avg * cos / 1000, est: true };
}
/** rated electric input of the motor from the nameplate: (√3) · Un · In · cos φ — compared with the power read or estimated (also an electric input) */
function fanPinRated(f) { const np = f.np || {}; return isNum(np.U) && isNum(np.I) && isNum(np.cos) ? (is3ph(f) ? Math.sqrt(3) : 1) * np.U * np.I * np.cos / 1000 : null; }
/** setting after balancing from the fan laws (Q ~ n, Δp ~ n², P ~ n³); factor = Qtarget / Qnow.
 *  { k, v (new value), now, approx (EC signal: about linear with the speed), over (above fmax / 100 % / 10 V), dm (new motor pulley), up (stage) , kw (power after) } */
function fanRec(s, f, now, factor, phase) {
  if (!now || !isNum(now.v) || !isNum(factor) || !(factor > 0)) return null;
  const out = { k: now.k, now: now.v };
  switch (now.k) {
    case 'hz': out.v = now.v * factor; out.over = isNum(f.fmax) && out.v > f.fmax; out.max = f.fmax; break;
    case 'pct': out.v = now.v * factor; out.over = out.v > 100; out.max = 100; out.approx = true; break;
    case 'volt': out.v = now.v * factor; out.over = out.v > 10; out.max = 10; out.approx = true; break;
    case 'rpm': out.v = now.v * factor; out.over = isNum(f.np && f.np.rpm) && out.v > f.np.rpm; out.max = f.np && f.np.rpm; if (f.drive === 'belt' && isNum(f.pulley && f.pulley.dm)) out.dm = f.pulley.dm * factor; break;
    case 'q': out.v = now.v * factor; break;
    case 'pa': out.v = now.v * factor * factor; break;
    case 'stage': out.v = null; out.up = factor > 1.02 ? 1 : factor < 0.98 ? -1 : 0; break;
    default: return null;
  }
  const pw = fanPow(s, phase || 'eerste', f); if (pw) { out.kw = pw.kw * factor ** 3; out.kwNow = pw.kw; out.kwEst = pw.est; out.kwMax = fanPinRated(f); out.kwOver = isNum(out.kwMax) && out.kw > out.kwMax; }
  return out;
}
/** the cone pressure of one fan for its share of the design flow of its side */
function fanDpcFor(s, f, p) {
  const np = s.np || {}; const k = f.kc, dir = f.dir === 'TA' ? 'T' : f.dir, q = s.design && s.design[dir];
  if (np.flowM !== 'cone' || !isNum(k) || !(k > 0) || !isNum(q)) return null;
  const all = fansOf(s, dir).filter(x => isNum(x.kc) && x.kc > 0); const nAll = all.reduce((a, x) => a + (x.n || 1), 0) || 1; const qi = q * (f.n || 1) / nAll / (f.n || 1);
  if (np.kcF === 'rho') { const v = qi / 3600 / k; return rhoOf(p) * v * v / 2; }
  return (qi / (k * (np.kcU === 'ls' ? 3.6 : 1))) ** 2;
}

/* ---- control and communication ---- */
const CTL_MODES = ['onoff', 'v010', 'v210', 'mrtu', 'mtcp', 'bmstp', 'bip', 'mpbus', 'other'];
const CTL_PWR = ['24ac', '24dc', '24acdc', '230ac', 'other'];
const CTL_BAUD = ['9600', '19200', '38400', '57600', '76800', '115200'];
const ctlBus = (c) => !!c && ['mrtu', 'bmstp', 'mpbus'].includes(c.mode);
const ctlIP = (c) => !!c && ['mtcp', 'bip'].includes(c.mode);
const ctlBac = (c) => !!c && ['bmstp', 'bip'].includes(c.mode);
const ctlAnalog = (c) => !!c && ['v010', 'v210'].includes(c.mode);
const ctlOn = (c) => !!(c && c.mode);
/** address in one line, the same in every language except «on / off» and «other»: «Modbus RTU 12 · 19200 8E1», «BACnet/IP 10.0.0.21:47808 · DI 1201» */
function ctlAddr(c, R) {
  if (!ctlOn(c)) return '';
  const T = R ? RLab() : ULab(); const m = T.ctl[c.mode] || c.mode; const fr = [c.baud, c.par || c.stop ? `8${c.par || 'N'}${c.stop || '1'}` : ''].filter(Boolean).join(' ');
  switch (c.mode) {
    case 'mrtu': return [m + (c.addr ? ' ' + c.addr : ''), fr, c.bus].filter(Boolean).join(' · ');
    case 'mtcp': return [m + (c.ip ? ' ' + c.ip + (c.port ? ':' + c.port : '') : ''), c.uid ? 'ID ' + c.uid : ''].filter(Boolean).join(' · ');
    case 'bmstp': return [m + (c.mac ? ' MAC ' + c.mac : ''), c.inst ? 'DI ' + c.inst : '', fr, c.bus].filter(Boolean).join(' · ');
    case 'bip': return [m + (c.ip ? ' ' + c.ip + (c.port ? ':' + c.port : '') : ''), c.inst ? 'DI ' + c.inst : ''].filter(Boolean).join(' · ');
    case 'mpbus': return [m + (c.addr ? ' ' + c.addr : ''), c.bus].filter(Boolean).join(' · ');
    case 'v010': case 'v210': return [m, c.sig0 || c.sig1 ? `${c.sig0 || '…'} → ${c.sig1 || '…'}` : ''].filter(Boolean).join(' · ');
    default: return [m, c.note].filter(Boolean).join(' · ');
  }
}
/** every controlled device of a project: unit controllers, fans, VAV / CAV actuators — for the address list and the duplicate check */
function ctlEntries(p) {
  const out = [];
  for (const s of p.systems) {
    if (ctlOn(s.ctl)) out.push({ kind: 'unit', s, name: s.code || '?', ctl: s.ctl });
    for (const f of s.fans || []) if (ctlOn(f.ctl)) out.push({ kind: 'fan', s, f, name: `${s.code || '?'} ${fanName(s, f)}`, ctl: f.ctl });
  }
  for (const pt of p.points) if (pt.reg && (pt.reg.type === 'cav' || pt.reg.type === 'vav') && ctlOn(pt.reg.ctl)) out.push({ kind: 'reg', s: sysOf(p, pt.systemId), pt, name: pt.code || '?', ctl: pt.reg.ctl });
  const si = new Map(p.systems.map((s, i) => [s.id, i])); const kr = { unit: 0, fan: 1, reg: 2 };
  return out.sort((a, b) => ((a.s && si.get(a.s.id)) ?? 99) - ((b.s && si.get(b.s.id)) ?? 99) || kr[a.kind] - kr[b.kind] || natCmp(a.name, b.name)); // in the order of the systems
}
/** devices with the same address: on one bus (bus name, else the system), the same IP address and port, the same BACnet device instance */
function ctlDupes(p) {
  const m = new Map(); const add = (k, e) => { if (!m.has(k)) m.set(k, []); m.get(k).push(e); };
  for (const e of ctlEntries(p)) {
    const c = e.ctl; const busName = String(c.bus || '').trim().toLowerCase() || (e.s ? (entryOf(p, e.s.id) || {}).key || '' : '');
    if (c.mode === 'mrtu' && String(c.addr).trim()) add(`mrtu|${busName}|${String(c.addr).trim()}`, e);
    if (c.mode === 'mpbus' && String(c.addr).trim()) add(`mpbus|${busName}|${String(c.addr).trim()}`, e);
    if (c.mode === 'bmstp' && String(c.mac).trim()) add(`bmstp|${busName}|${String(c.mac).trim()}`, e);
    if (ctlIP(c) && String(c.ip).trim()) add(`ip|${String(c.ip).trim()}|${String(c.port || (c.mode === 'bip' ? '47808' : '502')).trim()}|${c.mode === 'mtcp' ? String(c.uid || '').trim() : ''}`, e);
    if (ctlBac(c) && String(c.inst).trim()) add(`di|${String(c.inst).trim()}`, e);
  }
  return [...m.entries()].filter(([, arr]) => arr.length > 1).map(([k, arr]) => ({ k, kind: k.split('|')[0], items: arr }));
}
const ctlDupOf = (p, ctl) => ctlDupes(p).filter(d => d.items.some(e => e.ctl === ctl));

/* ---- labels: interface (ULab) and reports (RLab) ---- */
function ULab() {
  return {
    type: { TA: __('Supply and extract'), T: __('Supply only'), A: __('Extract only') },
    rec: { '': '—', plate: __('plate heat exchanger'), rotary: __('rotary wheel'), glycol: __('run-around coil (glycol)'), heatpipe: __('heat pipe'), none: __('no heat recovery'), other: __('other') },
    link: { cascade: __('cascade'), supplement: __('supplement'), compensation: __('compensation'), parallel: __('parallel / standby') },
    role: { main: __('main unit'), secondary: __('secondary (fed by the main unit)'), supplement: __('supplementary'), compensation: __('compensating'), standby: __('standby') },
    motor: { '': '—', EC: 'EC', AC: 'AC', DC: 'DC' },
    supply: { '': '—', '1~230': '1~ 230 V', '3~230': '3~ 230 V', '3~400': '3~ 400 V', dc24: '24 V DC', dc48: '48 V DC', other: __('other') },
    drive: { '': '—', vfd: __('frequency converter (Hz)'), ec: __('EC controller'), speed2: __('two speeds / steps'), trafo: __('step transformer / triac'), fixed: __('fixed speed (on / off)'), belt: __('belt drive (pulleys)'), cflow: __('constant flow (setpoint m³/h)'), cpress: __('constant pressure (setpoint Pa)'), other: __('other') },
    read: { pct: __('% (setpoint / output)'), volt: __('V (0–10 V signal)'), rpm: __('rpm'), hz: __('Hz'), q: __('m³/h (setpoint)'), pa: __('Pa (setpoint)') },
    dir: { T: __('Supply'), A: __('Extract'), TA: __('Supply and extract (one motor)') },
    ctl: { '': '—', onoff: __('On / Off'), v010: '0–10 V DC', v210: '2–10 V DC', mrtu: 'Modbus RTU', mtcp: 'Modbus TCP', bmstp: 'BACnet MS/TP', bip: 'BACnet/IP', mpbus: 'MP-Bus', other: __('other') },
    pwr: { '': '—', '24ac': '24 V AC', '24dc': '24 V DC', '24acdc': '24 V AC/DC', '230ac': '230 V AC', other: __('other') },
    par: { '': '—', N: __('none (N)'), E: __('even (E)'), O: __('odd (O)') },
    opmode: { '': '—', vav: 'VAV', cav: 'CAV', open: __('open'), closed: __('closed') },
  };
}
function RLab() {
  return {
    type: { TA: _r('toevoer en afvoer'), T: _r('enkel toevoer'), A: _r('enkel afvoer') },
    rec: { '': '', plate: _r('platenwarmtewisselaar'), rotary: _r('warmtewiel'), glycol: _r('twin-coil (glycol)'), heatpipe: _r('heat pipe'), none: _r('geen warmteterugwinning'), other: _r('andere') },
    link: { cascade: _r('cascade'), supplement: _r('aanvulling'), compensation: _r('compensatie'), parallel: _r('parallel / reserve') },
    role: { main: _r('hoofdgroep'), secondary: _r('secundair, gevoed door de hoofdgroep'), supplement: _r('aanvullend'), compensation: _r('compenserend'), standby: _r('reserve') },
    supply: { '': '', '1~230': '1~ 230 V', '3~230': '3~ 230 V', '3~400': '3~ 400 V', dc24: '24 V DC', dc48: '48 V DC', other: _r('andere') },
    drive: { '': '', vfd: _r('frequentieregelaar'), ec: _r('EC-sturing'), speed2: _r('twee snelheden / standen'), trafo: _r('trappentransformator / triac'), fixed: _r('vaste snelheid (aan / uit)'), belt: _r('riemaandrijving'), cflow: _r('constant debiet (setpoint m³/h)'), cpress: _r('constante druk (setpoint Pa)'), other: _r('andere') },
    dir: { T: _r('toevoer'), A: _r('afvoer'), TA: _r('toevoer en afvoer (één motor)') },
    ctl: { '': '', onoff: _r('aan / uit'), v010: '0–10 V DC', v210: '2–10 V DC', mrtu: 'Modbus RTU', mtcp: 'Modbus TCP', bmstp: 'BACnet MS/TP', bip: 'BACnet/IP', mpbus: 'MP-Bus', other: _r('andere') },
    pwr: { '': '', '24ac': '24 V AC', '24dc': '24 V DC', '24acdc': '24 V AC/DC', '230ac': '230 V AC', other: _r('andere') },
    opmode: { '': '', vav: 'VAV', cav: 'CAV', open: _r('open'), closed: _r('dicht') },
  };
}

/* ---- migration (projects before 0.9): type from the design flows, one fan per side with the frequency, current and cone k of before ---- */
function unitsMigrate(p) {
  for (const s of p.systems) {
    if (!UNIT_TYPES.includes(s.type)) { const t = isNum(s.design && s.design.T), a = isNum(s.design && s.design.A); s.type = t && !a ? 'T' : a && !t ? 'A' : 'TA'; }
    if (typeof s.rec !== 'string') s.rec = '';
    s.ctl = Object.assign(CTL0(), s.ctl || {});
    if (!Array.isArray(s.fans)) {
      s.fans = [];
      for (const d of unitDirs(s)) {
        const f = FAN0(d); f.pos = d === 'T' ? 'M1' : (s.type === 'TA' ? 'M2' : 'M1');
        if (isNum(s.np && s.np.iNom && s.np.iNom[d])) f.np.I = s.np.iNom[d];
        if (isNum(s.np && s.np.kc && s.np.kc[d])) f.kc = s.np.kc[d];
        for (const ph of ['eerste', 'controle']) {
          const m = s.meas && s.meas[ph]; if (!m) continue; const fm = {};
          if (isNum(m['hz' + d])) { fm.hz = m['hz' + d]; f.drive = 'vfd'; }
          if (isNum(m['a' + d])) fm.i = m['a' + d];
          if (isNum(m['dpc' + d])) fm.dpc = m['dpc' + d];
          if (Object.keys(fm).length) { m.fan = m.fan || {}; m.fan[f.id] = fm; }
          delete m['hz' + d]; delete m['a' + d]; delete m['dpc' + d];
        }
        s.fans.push(f);
      }
    } else s.fans = s.fans.map(fanFix);
    for (const ph of ['eerste', 'controle']) { const m = s.meas && s.meas[ph]; if (m && m.fan && typeof m.fan !== 'object') m.fan = {}; }
  }
  sysNormalize(p);
  for (const pt of p.points) if (pt.reg) { pt.reg.ctl = Object.assign(CTL0(), pt.reg.ctl || {}); if (pt.reg.vnom === undefined) pt.reg.vnom = null; if (typeof pt.reg.opmode !== 'string') pt.reg.opmode = ''; }
  if (p.tol && p.tol.iunb === undefined) p.tol.iunb = null;
  p.report.scopes = p.report.scopes && typeof p.report.scopes === 'object' ? p.report.scopes : {};
  return p;
}
/** a unit changed its type: fans of a side it no longer has go, a side without a fan gets one */
function unitTypeFix(s) {
  const ds = unitDirs(s); s.fans = (s.fans || []).filter(f => f.dir === 'TA' ? ds.length === 2 : ds.includes(f.dir));
  for (const d of ds) if (!fansOf(s, d).length) { const f = FAN0(d); f.pos = 'M' + (s.fans.length + 1); s.fans.push(f); }
  if (s.fans.every(f => !f.pos || /^M\d+$/.test(f.pos))) s.fans.forEach((f, i) => { f.pos = 'M' + (i + 1); }); // automatic names follow the fans that are left
  for (const d of ['T', 'A']) if (!ds.includes(d) && s.design) s.design[d] = null;
}

/* ---- report scope: whole project, a system (combined or single unit), one unit of a combined system ---- */
function scopeList(p) {
  const out = [{ key: 'all', label: __('Whole project'), sub: false }];
  for (const e of sysEntries(p)) { out.push({ key: e.key, label: entryLabel(e), sub: false }); if (e.g) for (const s of e.units) out.push({ key: s.id, label: `${s.code || '?'}${s.name ? ' ' + s.name : ''}`, sub: true }); }
  return out;
}
const scopeOK = (p, key) => !key || key === 'all' || keyUnits(p, key).size > 0;
/** the scope chosen in the «Report» step (per session): 'all', a system entry or a unit */
function repScope(p) { const r = typeof S !== 'undefined' && S.repScope; return r && p && r.pid === p.id && r.key && scopeOK(p, r.key) ? r.key : 'all'; }
function scopeCode(p, key) { if (!key || key === 'all') return ''; const e = entryByKey(p, key); if (e) return entryCode(e); const s = sysOf(p, key); return s ? s.code || '' : ''; }
function scopeLabelR(p, key) { if (!key || key === 'all') return ''; const e = entryByKey(p, key); if (e) return entryLabelR(e); const s = sysOf(p, key); return s ? `${s.code || '?'}${s.name ? ' — ' + s.name : ''}` : ''; }
/** the project as the report of a scope sees it: units, points, checklist, packages, instruments and conclusion of that part only */
function scopeView(p, key, o = {}) {
  if (!key || key === 'all' || !scopeOK(p, key)) return p;
  const ids = keyUnits(p, key); const v = Object.assign({}, p);
  v.systems = p.systems.filter(s => ids.has(s.id));
  v.points = p.points.filter(x => ids.has(x.systemId));
  const pids = new Set(v.points.map(x => x.id));
  v.groups = (p.groups || []).filter(g => g.members.every(id => ids.has(id)));
  v.checklist = { a: (p.checklist || {}).a || {}, s: Object.fromEntries(Object.entries((p.checklist || {}).s || {}).filter(([sid]) => ids.has(sid))) };
  v.packages = (p.packages || []).filter(pk => (pk.ids || []).some(id => pids.has(id)));
  const used = new Set(); for (const x of v.points) for (const ph of ['eerste', 'controle']) { const id = x.meas && x.meas[ph] && x.meas[ph].ins; if (id) used.add(id); }
  for (const s of v.systems) for (const ph of ['eerste', 'controle']) for (const k of ['insI', 'insN']) { const id = s.meas && s.meas[ph] && s.meas[ph][k]; if (id) used.add(id); }
  v.instruments = used.size ? (p.instruments || []).filter(i => used.has(i.id)) : (p.instruments || []);
  v.scope = { key, code: scopeCode(p, key), label: scopeLabelR(p, key) };
  if (o.raw) return v;
  const sc = (p.report.scopes || {})[key] || {};
  v.report = Object.assign({}, p.report, { conclusion: String(sc.conclusion || '').trim() ? sc.conclusion : genConclusion(v) });
  return v;
}

/* ---- report texts and rows (report language) ---- */
/** motor, supply, drive, control and nameplate of a fan in one line */
function fanDetailR(f) {
  const R = RLab(); const np = f.np || {};
  return [[f.maker, f.model].filter(Boolean).join(' '), f.n > 1 ? _r('{n} identieke ventilatoren', { n: f.n }) : '', f.motor, R.supply[f.supply] || '', R.drive[f.drive] || '', ctlAddr(f.ctl, true),
    [isNum(np.P) ? nl(np.P, 2) + ' kW' : '', isNum(np.I) ? nl(np.I, 1) + ' A' : '', isNum(np.U) ? nl(np.U) + ' V' : '', isNum(np.rpm) ? nl(np.rpm) + ' min⁻¹' : '', isNum(np.cos) ? 'cos φ ' + nl(np.cos, 2) : '', np.ie || ''].filter(Boolean).join(' · ')].filter(Boolean).join(' · ');
}
/** rows of the fans of a unit: setting, current (per phase, unbalance), power, cone pressure — { name, unit, d, e, c, fm, dev, st, note } */
function fanRowsR(p, s) {
  const out = []; const R = RLab(); const fs = (s.fans || []).filter(f => f.dir === 'TA' ? unitDirs(s).length === 2 : unitHas(s, f.dir));
  const NOK = _r('NAZIEN');
  for (const f of fs) {
    const nm = `${fanName(s, f)} ${String(R.dir[f.dir] || '').toLowerCase()}`;
    const a = fanCtlVal(s, 'eerste', f), b = fanCtlVal(s, 'controle', f); const k = (b || a || {}).k || fanReads(f)[0] || '';
    const sv = (c) => !c ? '' : c.k === 'stage' ? ctlValR(c) : c.v;
    out.push({ name: `${_r('Instelling')} ${nm}`, unit: k && k !== 'stage' ? READ_U[k] : '', d: '', e: sv(a), c: sv(b), fm: (READ_DEC[k] ?? 1) ? '0.0' : '0', note: fanDetailR(f) });
    const c1 = fanCur(s, 'eerste', f), c2 = fanCur(s, 'controle', f);
    if (c1 || c2) {
      const cv = (c) => !c ? '' : c.vals.length > 1 ? c.vals.map(v => nl(v, 1)).join(' / ') : c.vals[0];
      const cc = c2 || c1; const bad = cc.over || unbBad(p, cc);
      out.push({ name: `${_r('Stroom')} ${fanName(s, f)}${is3ph(f) ? ' L1 / L2 / L3' : ''}`, unit: 'A', d: isNum(cc.In) ? cc.In : '', e: cv(c1), c: cv(c2), fm: '0.0',
        dev: isNum(cc.unb) ? `${_r('onbalans')} ${nl(cc.unb, 1)} %` : '', st: isNum(cc.In) || isNum(cc.unb) ? (bad ? NOK : RL.stat.ok) : '',
        note: [cc.over ? _r('boven de nominale stroom') : '', unbBad(p, cc) ? _r('onbalans boven {l} %', { l: nl(unbLimit(p), 1) }) : '', isNum(cc.unb) && unbLimit(p) == null ? _r('grens voor de onbalans niet opgegeven') : ''].filter(Boolean).join(' · ') });
      const v = fanVolt(s, 'controle', f) || fanVolt(s, 'eerste', f); if (v) out.push({ name: `${_r('Spanning')} ${fanName(s, f)} L1-L2 / L2-L3 / L3-L1`, unit: 'V', d: isNum(f.np.U) ? f.np.U : '', e: (() => { const x = fanVolt(s, 'eerste', f); return x ? x.vals.map(y => nl(y)).join(' / ') : ''; })(), c: (() => { const x = fanVolt(s, 'controle', f); return x ? x.vals.map(y => nl(y)).join(' / ') : ''; })(), fm: '0', dev: isNum(v.unb) ? `${_r('onbalans')} ${nl(v.unb, 1)} %` : '', st: '', note: '' });
    }
    const p1 = fanPow(s, 'eerste', f), p2 = fanPow(s, 'controle', f);
    if (p1 || p2) { const pp = p2 || p1; const pin = fanPinRated(f); const over = isNum(pin) && pp.kw > pin; out.push({ name: `${_r('Opgenomen vermogen')} ${fanName(s, f)}`, unit: 'kW', d: isNum(pin) ? +pin.toFixed(2) : '', e: p1 ? +p1.kw.toFixed(2) : '', c: p2 ? +p2.kw.toFixed(2) : '', fm: '0.00', dev: '', st: isNum(pin) ? (over ? NOK : RL.stat.ok) : '', note: [pp.est ? _r('berekend: U · I · cos φ') : _r('afgelezen op de sturing'), isNum(pin) ? _r('ontwerp = nominaal opgenomen vermogen (typeplaat)') : ''].filter(Boolean).join(' · ') }); }
    if (s.np && s.np.flowM === 'cone' && isNum(f.kc)) { const w = fanDpcFor(s, f, p); out.push({ name: `${_r('Conusdruk')} ${fanName(s, f)}`, unit: 'Pa', d: isNum(w) ? Math.round(w) : '', e: isNum(fanM(s, 'eerste', f).dpc) ? fanM(s, 'eerste', f).dpc : '', c: isNum(fanM(s, 'controle', f).dpc) ? fanM(s, 'controle', f).dpc : '', fm: '0', dev: '', st: '', note: `k = ${nl(f.kc, 3)} · ${coneFormula(s.np)}` }); }
  }
  return out;
}
/** a system in words: members with their role, how they work together */
function sysTextR(p, e) {
  const R = RLab();
  const how = { cascade: _r('Cascade: de hoofdgroep voedt de secundaire groepen; hun debiet telt niet dubbel in de totalen van het systeem. Volgorde van inregelen: hoofdgroep, secundaire groepen, controlemeting van de hoofdgroep.'),
    supplement: _r('Aanvulling: bijkomende groepen (bv. lokale afzuiging) vullen de hoofdgroep aan; alle groepen tellen mee in de balans van het systeem.'),
    compensation: _r('Compensatie: een groep compenseert een afzuiging (keukenkap, proces); de balans toevoer / afvoer van het systeem wordt gecontroleerd.'),
    parallel: _r('Parallel / reserve: meerdere groepen op één kanaalnet; een reservegroep telt niet mee.') }[e.g.link] || '';
  return [_r('Groepen: {list}.', { list: e.units.map(s => `${s.code} (${R.role[roleOf(p, s.id)]})`).join(', ') }), how, e.g.shared ? _r('Gemeenschappelijk kanaalnet: de meetpunten horen bij het systeem.') : '', e.g.note || ''].filter(Boolean).join(' ');
}
/** rows of the balance of a system: supply, extract, supply − extract — { name, qd, q1, q2, dev, st, note } */
function sysBalRowsR(p, e) {
  const b1 = entryBalance(p, e, 'eerste'), b2 = entryBalance(p, e, 'controle'); const out = [];
  for (const d of ['T', 'A']) { const x1 = b1[d], x2 = b2[d]; if (!x2.any) continue; const dv = devOf(x2.q, x2.qd);
    out.push({ dir: d, name: `${_r('Systeem')} ${RL.dir[d].toLowerCase()}`, qd: x2.qd, q1: x1.q, q2: x2.q, dev: dv, st: dv == null ? '' : inTol(dv, p.tol.system) ? RL.stat.ok : RL.stat.nok, note: [x2.units.map(s => s.code).join(' + '), x2.partial ? _r('niet alle groepen gemeten') : ''].filter(Boolean).join(' · ') }); }
  if (b2.T.any && b2.A.any) out.push({ dir: '', name: _r('Toevoer − afvoer'), qd: b2.dd, q1: b1.d, q2: b2.d, dev: null, st: '', note: _r('positief = overdruk') });
  return out;
}
/** control of a VAV / CAV in one line: mode at commissioning, supply, address */
function regCtlR(pt) { const r = pt.reg || {}; const R = RLab(); return [R.opmode[r.opmode] || '', R.pwr[(r.ctl || {}).pwr] || '', ctlAddr(r.ctl, true)].filter(Boolean).join(' · '); }
/** 0.9.25: a motorised damper (the «Regelorganen» table of the report): a VAV (always with an actuator), or a damper — CAV included — with a motor or a
 *  control filled in. A mechanical CAV without a drive is not one: its setting is in the balancing report. */
function motorised(pt) { const r = pt.reg; return !!(r && hasReg(pt) && !isDev(pt) && !DEVICE_ONLY.includes(r.type) && (r.type === 'vav' || String(r.act || '').trim() || ctlOn(r.ctl))); }
/** supply, control and address of a damper's motor in one line (without the mode: its own column) */
function regCtlLineR(pt) { const c = (pt.reg || {}).ctl || {}; return [RLab().pwr[c.pwr] || '', ctlAddr(c, true)].filter(Boolean).join(' · '); }
/** 0.9.25: a duct traverse that was measured (pitot / velocity traverse with a result) — the «Kanaalmetingen» table */
function ductMeasured(p, pt) { return pt.kind === 'duct' && ['pitot', 'traverse'].includes(pt.method) && (isNum(calcQ(pt, 'eerste', p).q) || isNum(calcQ(pt, 'controle', p).q)); }
/** what a controlled device is, in the report language */
function ctlKindR(p, e) {
  if (e.kind === 'unit') return [_r('regelaar luchtgroep'), e.s.unit].filter(Boolean).join(' · ');
  if (e.kind === 'fan') return [_r('ventilator'), RLab().dir[e.f.dir], [e.f.maker, e.f.model].filter(Boolean).join(' ')].filter(Boolean).join(' · ');
  return [RL.reg[e.pt.reg.type], e.pt.reg.model].filter(Boolean).join(' · ');
}
