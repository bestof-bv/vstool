/* ---------- crews: work packages, result files, merge into the project; Excel measuring sheet for subcontractors ----------
   The coordinator's project is the master. A package is a copy of a part of it (points in scope + their masters as context).
   Crews measure in the app (result file) or on the printed Excel sheet; both are merged back per point and per group:
   eerste (initial measurement + position before), controle (control measurement + position after, locked), fld (method, k/Ak, damper data, status, note). */
const PKG_APP = 'inregelaar-ventilatie';
const MERGE_GROUPS = ['eerste', 'controle', 'fld', 'pin'];
const FLD = { top: ['method', 'k', 'kU', 'k2', 'aeff', 'size', 'ttype', 'note', 'status'], duct: ['shape', 'd', 'w', 'h'], reg: ['type', 'model', 'cat', 'vmin', 'vmax', 'vnom', 'dpmin', 'opmode', 'ctl', 'state', 'cond'], fd: ['from', 'to', 'pass', 'ei', 'act', 'sw', 'hatch', 'plate', 'test', 'sig', 'tby'] };
const PH_REG = { eerste: ['posBefore'], controle: ['posAfter', 'locked'] };
const STRUCT_PATHS = ['code', 'systemId', 'dir', 'designQ', 'parentId', 'kind', 'branch', 'zone', 'room'];

function fieldGroup(path) {
  if (/^meas\.eerste\./.test(path) || path === 'reg.posBefore') return 'eerste';
  if (/^meas\.controle\./.test(path) || path === 'reg.posAfter' || path === 'reg.locked') return 'controle';
  if (STRUCT_PATHS.includes(path) || path === 'duct.main') return 'struct';
  return 'fld';
}
function stampOf(pt, g) { return g === 'eerste' || g === 'controle' ? (pt.meas && pt.meas[g] && pt.meas[g].st) || null : g === 'fld' ? pt.fst || null : g === 'pin' ? pt.pst || null : pt.sst || null; }
/** who / when / with which fan frequency a group of a point was last changed */
function stampPt(p, pt, g) {
  const st = { at: Date.now(), by: Settings.v.technician || '', team: p.pkg ? p.pkg.name : '', dev: Settings.v.devId || '' };
  if (g === 'eerste' || g === 'controle') {
    const s = sysOf(p, pt.systemId); const c = s && dirSetting(s, g, pt.dir); if (c) { st.hz = c.v; st.hk = c.k; } // the fan setting at that moment (st.hz: value, st.hk: what — Hz, %, V …)
    pt.meas[g] = pt.meas[g] || { r: [] }; pt.meas[g].st = st;
  } else if (g === 'fld') pt.fst = st; else if (g === 'pin') pt.pst = st; else pt.sst = st;
}
function groupVal(pt, g) {
  if (g === 'eerste' || g === 'controle') { const m = Object.assign({ r: [] }, (pt.meas && pt.meas[g]) || {}); delete m.st; const o = { m, reg: {} }; for (const k of PH_REG[g]) o.reg[k] = pt.reg ? pt.reg[k] : undefined; return o; }
  if (g === 'struct') { const o = {}; for (const k of STRUCT_PATHS) o[k] = pt[k]; o.main = pt.duct ? !!pt.duct.main : false; return o; }
  if (g === 'pin') return { pin: pt.pin ? Object.assign({ doc: pt.pin.doc, page: pt.pin.page, x: pt.pin.x, y: pt.pin.y }, pt.pin.zone ? { zone: pt.pin.zone } : {}) : null };
  const o = { top: {}, duct: {}, reg: {}, fd: {} };
  for (const k of FLD.top) o.top[k] = pt[k]; for (const k of FLD.duct) o.duct[k] = pt.duct ? pt.duct[k] : undefined; for (const k of FLD.reg) o.reg[k] = pt.reg ? pt.reg[k] : undefined;
  for (const k of FLD.fd) o.fd[k] = pt.fd ? pt.fd[k] : undefined;
  return o;
}
function setGroup(pt, g, v, st) {
  v = clone(v);
  if (g === 'eerste' || g === 'controle') { pt.meas[g] = Object.assign(v.m || { r: [] }, st ? { st: clone(st) } : {}); for (const k of PH_REG[g]) pt.reg[k] = v.reg[k]; return; }
  if (g === 'struct') { for (const k of STRUCT_PATHS) pt[k] = v[k]; pt.duct = pt.duct || {}; pt.duct.main = !!v.main; if (st) pt.sst = clone(st); return; }
  if (g === 'pin') { if (v && v.pin) pt.pin = v.pin; else delete pt.pin; if (st) pt.pst = clone(st); return; }
  for (const k of FLD.top) pt[k] = v.top[k]; pt.duct = pt.duct || {}; for (const k of FLD.duct) pt.duct[k] = v.duct[k]; for (const k of FLD.reg) pt.reg[k] = v.reg[k];
  pt.fd = pt.fd || {}; for (const k of FLD.fd) pt.fd[k] = (v.fd || {})[k];
  if (st) pt.fst = clone(st);
}
const normV = (v) => JSON.stringify(v, (k, x) => (x === undefined || x === '' || x === null || x === false ? undefined : Array.isArray(x) ? x.filter(isNum) : x));
/* 0.9.8: short fingerprint of a group value (FNV-1a), stored as the baseline of a printed measuring sheet */
const snapHash = (str) => { let h = 0x811c9dc5; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(36); };

/* ---------- package-mode rules (crew device) ---------- */
const isPkg = (p) => !!(p && p.pkg);
const isCtx = (p, pt) => !!(p && p.pkg && (p.pkg.ctx || []).includes(pt.id));
/** structure of a point issued by the coordinator is read-only for the crew */
const roStruct = (p, pt) => (isPkg(p) && !pt.added) || (!Access.can('structure.edit') && !pt.added);
/** crews delete only points they added themselves and have not handed in yet */
const canDelete = (p, pt) => (!isPkg(p) || !!pt.added) && Access.canDeletePt(pt);
const PKG_STEPS = { eerste: [0, 1, 2, 3, 5], controle: [0, 1, 3, 4, 5] };
const stepAllowed = (p, i) => !isPkg(p) || (PKG_STEPS[p.pkg.phase] || PKG_STEPS.eerste).includes(i);
function markAdded(p, pt) {
  if (isPkg(p)) pt.added = { pkg: p.pkg.id, team: p.pkg.name, by: Settings.v.technician || '', at: Date.now() };
  else if (!Access.can('structure.edit')) pt.added = { pkg: '', team: '', by: Access.cur().user.name || Settings.v.technician || '', at: Date.now() };
  stampPt(p, pt, 'struct');
}

const PKG = {
  defName(p) { return __('Crew {x}', { x: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[(p.packages || []).length % 26] }); },
  /** points of a scope: sys, dir, branches[], zones[], node (subtree), todo (without measurement in the phase) */
  scope(p, sc) {
    let pts = p.points.filter(x => (sc.sys === 'all' || x.systemId === sc.sys) && (sc.dir === 'all' || x.dir === sc.dir));
    if (sc.branches && sc.branches.length) pts = pts.filter(x => sc.branches.includes(x.branch || ''));
    if (sc.zones && sc.zones.length) pts = pts.filter(x => sc.zones.includes(x.zone || ''));
    if (sc.node) { const ids = descendantIds(p, sc.node); ids.add(sc.node); pts = pts.filter(x => ids.has(x.id)); }
    if (sc.todo) pts = pts.filter(x => !measurable(x) || !isNum(ptQ(p, x, sc.phase)));
    return sortPoints(p, pts);
  },
  /** balancing groups cut by the scope, and overlap with other open packages of the same phase */
  warnings(p, ids, phase, except) {
    const set = new Set(ids); const split = [];
    for (const m of p.points.filter(isNode)) {
      const kids = childrenOf(p, m.id).filter(measurable); if (kids.length < 2) continue;
      const n = kids.filter(k => set.has(k.id)).length; if (n && n < kids.length) split.push(m.code || '?');
    }
    const overlap = [];
    for (const r of p.packages || []) {
      if (r.id === except || r.phase !== phase || r.status === 'merged' || r.status === 'closed') continue;
      const n = r.ids.filter(id => set.has(id)).length; if (n) overlap.push({ name: r.name, n });
    }
    return { split, overlap };
  },
  create(p, o) {
    const rec = { id: 'k' + uid(), name: o.name || this.defName(p), note: o.note || '', phase: o.phase || 'eerste', kind: o.kind || 'app', lang: o.lang || p.report.lang || 'nl',
      ids: o.ids.slice(), issuedAt: Date.now(), by: Settings.v.technician || p.info.technician || '', status: 'issued', merges: [], scope: o.scopeText || '' };
    p.packages = p.packages || []; p.packages.push(rec); return rec;
  },
  progress(p, rec) {
    const pts = rec.ids.map(id => byId(p, id)).filter(Boolean); const meas = pts.filter(measurable);
    return { total: pts.length, n: meas.length, done: meas.filter(x => isNum(ptQ(p, x, rec.phase))).length, st: pts.filter(x => x.status).length, added: p.points.filter(x => x.added && x.added.pkg === rec.id).length };
  },
  /** open package (issued, not merged) that holds the point */
  of(p, pt) { return (p.packages || []).filter(r => r.status === 'issued' && r.ids.includes(pt.id)).pop() || null; },
  /** package file for the crew: points in scope + their masters (read-only context), systems with the fan setting */
  async packageFile(p, rec) {
    const ids = new Set(rec.ids.filter(id => byId(p, id))); const ctx = new Set();
    for (const id of ids) { let q = rawParent(p, byId(p, id)), g = 0; while (q && g++ < 30) { if (!ids.has(q.id)) ctx.add(q.id); q = rawParent(p, q); } }
    const pts = p.points.filter(x => ids.has(x.id) || ctx.has(x.id)).map(x => Object.assign(clone(x), { photos: [] }));
    const systems = p.systems.filter(s => pts.some(x => x.systemId === s.id)).map(s => Object.assign(clone(s), { photos: [], note: s.note || '' }));
    const { docs, files } = await this.planPages(p, pts);
    const project = { id: p.id, v: 1, info: clone(p.info), tol: clone(p.tol), rho: p.rho, instruments: clone(p.instruments), systems, groups: clone(p.groups || []), points: pts, notes: {}, cover: { title: '', subtitle: '', band: '', items: [null, null, null] }, report: { lang: p.report.lang || 'nl', remarks: '', conclusion: '', signName: '', signature: '' }, packages: [], docs };
    const obj = { app: PKG_APP, type: 'package', version: 1, exportedAt: new Date().toISOString(),
      pkg: { id: rec.id, name: rec.name, note: rec.note, phase: rec.phase, issuedAt: rec.issuedAt, by: rec.by, masterId: p.id, masterName: p.info.name || '', masterNr: p.info.nr || '', ctx: [...ctx] }, project, files };
    return new Blob([JSON.stringify(obj)], { type: 'application/json' });
  },
  /** only the plan pages that hold points of the package, as pictures (a plan of 20 MB does not travel to every crew) */
  async planPages(p, pts) {
    const need = new Map(); for (const x of pts) if (x.pin && docById(p, x.pin.doc)) { const k = x.pin.doc; if (!need.has(k)) need.set(k, new Set()); need.get(k).add(Number(x.pin.page)); }
    const docs = [], files = {};
    for (const [id, pages] of need) {
      const d = docById(p, id); const r = docCur(d); const imgs = {}, sizes = {}, list = [];
      for (const pg of [...pages].sort((a, b) => a - b)) {
        try {
          const c = await renderEdit(Docs.source(r, pg), { rot: 0, fine: 0 }, { outMax: 3200, upscale: true, noMarks: true });
          const b = await canvasBlob(c, 'image/jpeg', 0.86); const key = 'pk' + (await sha256hex(await b.arrayBuffer())).slice(0, 40);
          files[key] = await blobToDataURL(b); imgs[pg] = key; sizes[pg] = [c.width, c.height]; list.push(pg);
        } catch (e) { console.warn('plan page', e); }
      }
      if (list.length) docs.push({ id: d.id, name: d.name, titles: clone(d.titles || {}), views: clone(d.views || {}), zones: clone((d.zones || []).filter(z => list.includes(Number(z.page)))), revs: [{ rev: r.rev, kind: 'img', file: imgs[list[0]], imgs, pages: list, sizes, bytes: 0, at: Date.now(), pkg: true }] });
    }
    return { docs, files };
  },
  fileBase(p, rec, kind) { return [kind, safeName(p.info.nr || p.info.name || 'project'), safeName(rec.name)].filter(Boolean).join('_'); },
  /** crew device: open a package file as its own project (or the one already opened) */
  async open(obj) {
    const ex = Object.values(Store.projects).find(x => x.pkg && x.pkg.id === obj.pkg.id);
    if (ex) return { p: ex, existed: true };
    for (const [key, durl] of Object.entries(obj.files || {})) { if (await Photos.getLocal('doc:' + key)) continue; try { await Photos.put('doc:' + key, await (await fetch(durl)).blob()); } catch (e) { } }
    const np = migrate(Object.assign(newProject(), clone(obj.project)));
    np.id = 'k' + uid(); np.pkg = Object.assign(clone(obj.pkg), { openedAt: Date.now() }); np.packages = []; delete np.example;
    if (Settings.v.technician) np.info.technician = Settings.v.technician;
    Store.projects[np.id] = np; Store.touch(np);
    return { p: np, existed: false };
  },
  /** crew device: result file (all points of the package except the context, page notes, instruments, photos) */
  async resultFile(p, withPhotos) {
    const ctx = new Set(p.pkg.ctx || []);
    const points = p.points.filter(x => !ctx.has(x.id));
    const photos = {};
    if (withPhotos) for (const ph0 of [...points.flatMap(x => x.photos || []), ...Object.values(p.notes || {}).flatMap(n => n.photos || [])]) for (const ph of [ph0, ph0.orig].filter(Boolean)) { const b = await Photos.blob(ph); if (b) photos[ph.id] = await blobToDataURL(b); }
    const obj = { app: PKG_APP, type: 'result', version: 1, at: new Date().toISOString(), by: Settings.v.technician || p.info.technician || '', dev: Settings.v.devId || '',
      pkg: clone(p.pkg), points: clone(points), instruments: clone(p.instruments), notes: clone(p.notes || {}), cat: clone(p.cat || {}), photos };
    return new Blob([JSON.stringify(obj)], { type: 'application/json' });
  },
  photoBytes(p) { return [...p.points.flatMap(x => x.photos || []), ...Object.values(p.notes || {}).flatMap(n => n.photos || [])].length; },
  master(res) {
    if (res.pkg && Store.projects[res.pkg.masterId] && !Store.projects[res.pkg.masterId].pkg) return Store.projects[res.pkg.masterId];
    return Object.values(Store.projects).find(x => !x.pkg && (x.packages || []).some(r => r.id === res.pkg.id)) || null;
  },
  /** what a result changes in the master project */
  diff(m, res) {
    const rec = (m.packages || []).find(x => x.id === res.pkg.id) || null;
    const I = rec ? rec.issuedAt : (res.pkg.issuedAt || 0);
    const d = { rec, I, upd: [], conflicts: [], added: [], gone: [], skipped: [], noAir: [], photos: 0, notes: 0, instruments: [], status: 0 };
    for (const rp of res.points || []) {
      const mp = byId(m, rp.id);
      if (!mp) { if (rp.added) d.added.push(rp); else d.gone.push(rp); continue; }
      for (const g of rp.added ? [...MERGE_GROUPS, 'struct'] : MERGE_GROUPS) {
        const rs = stampOf(rp, g); if (!rs) continue;
        const ms = stampOf(mp, g); const same = normV(groupVal(mp, g)) === normV(groupVal(rp, g));
        if (rs.at <= I) { if (!same) d.skipped.push({ mp, rp, g }); continue; } // before the issue date (or a clock off): not merged, but shown
        if (same) { if (!ms || ms.at < rs.at) d.upd.push({ mp, rp, g, quiet: true }); continue; }
        if (ms && ms.at > I && ms.at !== rs.at) d.conflicts.push({ key: rp.id + '|' + g, mp, rp, g, choice: res.src !== 'xlsx' && rs.at >= ms.at ? 'theirs' : 'mine' });
        else { d.upd.push({ mp, rp, g }); if (g === 'fld' && (rp.status || '') !== (mp.status || '')) d.status++; }
      }
      d.photos += (rp.photos || []).filter(ph => !(mp.photos || []).some(x => x.id === ph.id)).length;
    }
    for (const rp of d.added) d.photos += (rp.photos || []).length;
    d.noAir = d.added.filter(rp => !(m.systems || []).some(x => x.id === rp.systemId)); // not added: the air handling unit is not in the project
    for (const [k, n] of Object.entries(res.notes || {})) {
      const mine = (m.notes && m.notes[k]) || { text: '', photos: [] };
      if (String(n.text || '').trim() && !String(mine.text || '').includes(String(n.text).trim())) d.notes++;
      d.photos += (n.photos || []).filter(ph => !(mine.photos || []).some(x => x.id === ph.id)).length;
    }
    for (const ins of res.instruments || []) if (!m.instruments.some(x => x.id === ins.id || (x.name === ins.name && x.serial === ins.serial && x.type === ins.type))) d.instruments.push(ins);
    return d;
  },
  /** merge a result (app file or Excel sheet) into the master project */
  async apply(m, res, d, choices = {}) {
    let n = 0;
    if (res && res.cat && typeof res.cat === 'object') { m.cat = m.cat || {}; for (const [id, e] of Object.entries(res.cat)) if (!m.cat[id]) m.cat[id] = clone(e); } // technical sheets the crew linked
    for (const u of d.upd) { setGroup(u.mp, u.g, groupVal(u.rp, u.g), stampOf(u.rp, u.g)); if (!u.quiet) n++; }
    let nc = 0;
    for (const c of d.conflicts) if ((choices[c.key] || c.choice) === 'theirs') { setGroup(c.mp, c.g, groupVal(c.rp, c.g), stampOf(c.rp, c.g)); nc++; }
    const sys = new Set(m.systems.map(s => s.id)); const addIds = new Set(d.added.map(x => x.id)); let na = 0;
    for (const rp of d.added) {
      if (!sys.has(rp.systemId)) continue;
      const np = newPoint(m, clone(rp)); np.id = rp.id; if (np.parentId && !byId(m, np.parentId) && !addIds.has(np.parentId)) np.parentId = '';
      np.photos = []; m.points.push(np); na++;
    }
    const allPh = [];
    for (const rp of res.points || []) {
      const mp = byId(m, rp.id); if (!mp) continue; mp.photos = mp.photos || [];
      for (const ph of rp.photos || []) if (!mp.photos.some(x => x.id === ph.id)) { mp.photos.push(clone(ph)); allPh.push(mp.photos[mp.photos.length - 1]); }
    }
    const team = res.pkg.name || '';
    for (const [k, nn] of Object.entries(res.notes || {})) {
      m.notes = m.notes || {}; const mine = m.notes[k] || (m.notes[k] = { text: '', photos: [] }); mine.photos = mine.photos || [];
      const txt = String(nn.text || '').trim();
      if (txt && !String(mine.text || '').includes(txt)) mine.text = (mine.text ? mine.text + '\n' : '') + (team ? `[${team}] ` : '') + txt;
      for (const ph of nn.photos || []) if (!mine.photos.some(x => x.id === ph.id)) { mine.photos.push(clone(ph)); allPh.push(mine.photos[mine.photos.length - 1]); }
    }
    for (const ins of d.instruments) m.instruments.push(Object.assign(INS0(), clone(ins)));
    { // the crew's copy of an instrument the master already has under another id: point the measurements to the master's one
      const remap = new Map();
      for (const ins of res.instruments || []) { if (m.instruments.some(x => x.id === ins.id)) continue; const same = m.instruments.find(x => x.name === ins.name && x.serial === ins.serial && x.type === ins.type); if (same) remap.set(ins.id, same.id); }
      if (remap.size) for (const x of m.points) for (const g of ['eerste', 'controle']) { const v = x.meas && x.meas[g] && x.meas[g].ins; if (v && remap.has(v)) x.meas[g].ins = remap.get(v); }
    }
    for (const ph of allPh) if (ph.src) { // a fragment made on the crew's picture of the plan: back to the plan of the master
      const d = docById(m, ph.src.doc); const r = d && docCur(d);
      if (r && r.pages.includes(Number(ph.src.page))) ph.src.file = r.kind === 'img' ? (r.imgs || {})[ph.src.page] || r.file : r.file; else { delete ph.src; if (ph.edit) ph.edit.pins = false; }
    }
    await restorePhotos([...allPh, ...allPh.map(x => x.orig).filter(Boolean)], res.photos || {});
    let rec = d.rec;
    if (!rec) { rec = { id: res.pkg.id, name: res.pkg.name || '?', note: res.pkg.note || '', phase: res.pkg.phase || 'eerste', kind: res.src === 'xlsx' ? 'excel' : 'app', lang: m.report.lang, ids: (res.points || []).map(x => x.id), issuedAt: res.pkg.issuedAt || 0, by: res.pkg.by || '', status: 'issued', merges: [] }; m.packages.push(rec); }
    for (const x of d.added) if (!rec.ids.includes(x.id) && sys.has(x.systemId)) rec.ids.push(x.id); // points that are not added (unknown air handling unit) stay out of the package
    rec.status = 'merged'; rec.mergedAt = Date.now();
    rec.merges.push({ at: Date.now(), by: res.by || '', src: res.src || 'app', upd: n, conflicts: d.conflicts.length, theirs: nc, added: na, photos: allPh.length });
    return { upd: n, conflicts: d.conflicts.length, theirs: nc, added: na, photos: allPh.length };
  },
};
async function restorePhotos(list, map) {
  const a = await Photos.assets();
  for (const ph of list) {
    const durl = map[ph.id]; if (!durl || await Photos.getLocal(ph.id)) continue;
    try {
      const blob = await (await fetch(durl)).blob(); await Photos.put(ph.id, blob);
      if (a) { ph.assetId = ''; ph.url = ''; try { const r = await a.upload(blob); ph.assetId = r.id; ph.url = r.url; } catch (e) { } }
    } catch (e) { }
  }
}
function conflictText(p, pt, g) {
  if (g === 'eerste' || g === 'controle') {
    const c = calcQ(pt, g, p); const parts = [];
    if (isNum(c.q)) parts.push(`Q ${fmt(c.q)} m³/h`); const ps = psOf(pt, g); if (ps != null) parts.push(`p ${fmt(ps)} Pa`);
    const pos = g === 'eerste' ? pt.reg.posBefore : pt.reg.posAfter; if (pos) parts.push(__('position {v}', { v: pos }));
    const st = stampOf(pt, g); return (parts.join(' · ') || '—') + (st ? ` · ${[st.by || st.team, fmtDate(st.at)].filter(Boolean).join(', ')}` : '');
  }
  if (g === 'struct') return [pt.code, pt.room, fmt(pt.designQ)].filter(Boolean).join(' · ');
  if (g === 'pin') { const st = stampOf(pt, g); return (pt.pin ? __('on the plan, p. {n}', { n: pt.pin.page }) : __('not on the plan')) + (st ? ` · ${[st.by || st.team, fmtDate(st.at)].filter(Boolean).join(', ')}` : ''); }
  return [L.method[pt.method], pt.status ? L.status[pt.status] : '', pt.reg && pt.reg.state ? L.state[pt.reg.state] : '', pt.note].filter(Boolean).join(' · ') || '—';
}

/* ---------- Excel measuring sheet (meetblad) for subcontractors: print, fill in by hand or in Excel, import back ---------- */
const MB_KEYS = { eerste: ['id', 'code', 'master', 'zone', 'room', 'type', 'size', 'design', 'method', 'kak', 'rd', 'q', 'ps', 'pos', 'status', 'note'],
  controle: ['id', 'code', 'master', 'zone', 'room', 'type', 'size', 'design', 'q1', 'method', 'kak', 'rd', 'q', 'ps', 'pos', 'locked', 'status', 'note'] };
const MB_UNIT = { hood: 'm³/h', readout: 'm³/h', anemo: 'm/s', kfactor: 'Pa', pitot: 'Pa', traverse: 'm/s' };
async function buildMeetblad(p, rec) {
  return withRepLang(rec.lang || p.report.lang, async () => {
    useStyle();
    const ph = rec.phase; const keys = MB_KEYS[ph] || MB_KEYS.eerste;
    // 0.9.8: baseline of this sheet = the project as it is now, per point: the groups the crew fills in. The import compares with this, not with the project of later.
    const sheetAt = Date.now(); const snap = {};
    for (const id of rec.ids) { const pt = byId(p, id); if (pt) snap[id] = { [ph]: snapHash(normV(groupVal(pt, ph))), fld: snapHash(normV(groupVal(pt, 'fld'))) }; }
    rec.snaps = Object.assign(rec.snaps || {}, { [sheetAt]: snap }); for (const k of Object.keys(rec.snaps).sort().slice(0, -5)) delete rec.snaps[k]; Store.touch(p);
    const wb = new XLSXW.Workbook(); wb.title = _r('Meetblad') + ' ' + (p.info.nr || ''); wb.creator = Settings.v.company || '';
    const B = { all: true, color: HS.line }; const f = (sz = 9, b = false, color = HS.ink, i = false) => ({ sz, b, color, i });
    const S = {
      title: { font: f(14, true, HS.navy), align: { v: 'center' } }, sub: { font: f(8.5, false, HS.muted, true) },
      lab: { font: f(8.5, true, HS.navy), align: { h: 'right', v: 'center' } }, val: { font: f(9, false, HS.ink), align: { v: 'center', wrap: true } },
      inp: { font: f(10, true, HS.blue), fill: HS.cream, border: B, align: { v: 'center', wrap: true }, unlocked: true },
      th: { font: f(8, true, 'FFFFFF'), fill: HS.navy, border: { all: { style: 'thin', color: 'FFFFFF' } }, align: { h: 'center', v: 'center', wrap: true } },
      band: { font: f(9, true, 'FFFFFF'), fill: HS.navy, align: { v: 'center' } }, bandO: { font: f(8.5, true, 'FFFFFF'), fill: HS.orange, align: { h: 'center', v: 'center' } },
      td: { font: f(8.5), border: B, align: { v: 'center', wrap: true } }, tdC: { font: f(8.5), border: B, align: { h: 'center', v: 'center', wrap: true } },
      node: { font: f(8.5, true, HS.navy), fill: HS.grey, border: B, align: { v: 'center', wrap: true } },
      cin: { font: f(10, true, HS.blue), fill: HS.cream, border: B, align: { h: 'center', v: 'center', wrap: true }, unlocked: true },
      legend: { font: f(7.5, false, '555555', true), align: { v: 'center', wrap: true } }, key: { font: f(6, false, 'BBBBBB') },
      newr: { font: f(10, true, HS.blue), fill: 'FFFDF2', border: B, align: { v: 'center', wrap: true }, unlocked: true },
    };
    const HEAD = { id: ['id', 2], code: [_r('Code'), 11], master: [_r('Master'), 9], zone: [_r('Verdieping / zone'), 9], room: [_r('Ruimte'), 17], type: [_r('Type eindorgaan / regelorgaan'), 19],
      size: [_r('Afmeting'), 9], design: [_r('Ontwerp m³/h'), 8], q1: [_r('Q vóór m³/h'), 8], method: [_r('Meetmethode (eenheid)'), 15], kak: [_r('k / Ak'), 7],
      rd: [_r('Meetwaarden (gescheiden door ;)'), 22], q: [_r('Debiet m³/h (rechtstreeks)'), 9], ps: [_r('p stat Pa'), 7], pos: [ph === 'eerste' ? _r('Stand vóór') : _r('Stand na'), 9],
      locked: [_r('Vergrendeld'), 7], status: [_r('Status'), 13], note: [_r('Opmerking'), 24] };
    const ws = wb.sheet(_r('Meetblad')); ws.landscape = true; ws.paper = 9; ws.protect = true; ws.tab = HS.bar;
    const NC = keys.length; const col = (k) => keys.indexOf(k) + 1;
    keys.forEach((k, i) => ws.width(i + 1, HEAD[k][1])); ws.hideCol(1);
    const logo = logoInfo();
    ws.height(1, 30); ws.height(2, 16); ws.height(3, 4);
    if (logo) ws.image(logo.url, 1, 2, Math.min(170, Math.round(30 * logo.w / logo.h)), 30, { dx: 2, dy: 3 });
    ws.set(1, 5, `${_r('MEETBLAD')} — ${RL.phase[ph].toUpperCase()}`, S.title); ws.set(2, 5, [[p.info.nr, p.info.name].filter(Boolean).join(' — '), p.info.client, rec.name + (rec.note ? ' · ' + rec.note : '')].filter(Boolean).join(' · '), S.sub);
    for (let c = 1; c <= NC; c++) ws.style(3, c, { border: { bottom: { style: 'medium', color: HS.navy } }, fill: c <= 4 ? HS.bar : undefined });
    ws.footer = `&L&"Arial"&7${String(rec.name).replace(/&/g, '&&')}&C&"Arial"&7${String(Settings.v.footer || p.info.company || '').replace(/&/g, '&&')}&R&"Arial"&7&P / &N`;
    // info block: left = package, right = fields for the crew (hidden keys in column A)
    const ahu = p.systems.filter(s => rec.ids.some(id => (byId(p, id) || {}).systemId === s.id)).map(s => `${s.code}: ` + unitDirs(s).map(d => { const t = dirSetText(s, ph, d, true); return t ? `${RL.dir[d].toLowerCase()} ${t}` : ''; }).filter(Boolean).join(' · ')).filter(x => !/:\s*$/.test(x)).join('   ');
    const infoL = [[_r('Pakket :'), rec.name + (rec.note ? ' — ' + rec.note : '')], [_r('Fase :'), RL.phase[ph]], [_r('Uitgereikt :'), [dateNL(new Date(rec.issuedAt).toISOString().slice(0, 10)), rec.by].filter(Boolean).join(' · ')], [_r('Instelling luchtgroep :'), ahu ? ahu + ' — ' + _r('ingesteld door de coördinator, niet wijzigen') : _r('ingesteld door de coördinator, niet wijzigen')]];
    const infoR = [['by', _r('Uitgevoerd door :')], ['date', _r('Datum :')], ['instr', _r('Meettoestel (merk, type, nr.) :')], ['sign', _r('Handtekening :')]];
    const half = Math.max(5, Math.floor(NC / 2));
    for (let i = 0; i < 4; i++) {
      const r = 4 + i; ws.height(r, 18);
      ws.set(r, 2, infoL[i][0], S.lab); ws.merge(r, 2, r, 3); ws.set(r, 4, infoL[i][1], S.val); ws.merge(r, 4, r, half);
      ws.set(r, 1, infoR[i][0], S.key); ws.set(r, half + 1, infoR[i][1], S.lab); ws.merge(r, half + 1, r, half + 3);
      ws.set(r, half + 4, '', S.inp); ws.fillRange(r, half + 5, NC, S.inp); ws.merge(r, half + 4, r, NC);
    }
    ws.set(9, 2, _r('Invullen: {cellen}. Meetwaarden in de eenheid van de methode (debietkap m³/h, anemometer m/s, k-factor Pa, Pitot Pa), gescheiden door ; — of meteen het debiet. p stat = statische druk in het kanaal vóór het knooppunt. Status alleen bij een probleem: {a}. Nieuwe punten: lege rijen onderaan elke groep (Code, Master, Type, Ontwerp). Punten schrappen kan alleen de coördinator.', { cellen: cellsWord(), a: STATUS_KEYS.map(k => RL.status[k]).join(' / ') }), S.legend);
    ws.merge(9, 2, 9, NC); ws.height(9, 30);
    const KR = 11; keys.forEach((k, i) => ws.set(KR, i + 1, k, S.key)); ws.hideRow(KR);
    const HB = 12;
    const bandDef = ph === 'eerste'
      ? [['code', 'room', _r('MEETPUNT')], ['type', 'design', _r('ONTWERP')], ['method', 'pos', _r('METING — vóór inregeling')], ['status', 'note', _r('OPMERKING')]]
      : [['code', 'room', _r('MEETPUNT')], ['type', 'q1', _r('ONTWERP / VÓÓR')], ['method', 'locked', _r('CONTROLEMETING — na inregeling')], ['status', 'note', _r('OPMERKING')]];
    for (const [a, b, txt] of bandDef) { ws.set(HB, col(a), txt, S.bandO); for (let c = col(a) + 1; c <= col(b); c++) ws.style(HB, c, S.bandO); ws.merge(HB, col(a), HB, col(b)); }
    keys.forEach((k, i) => ws.set(HB + 1, i + 1, k === 'id' ? '' : HEAD[k][0], S.th)); ws.height(HB + 1, 34);
    ws.freeze = { r: HB + 2, c: 3 }; ws.printTitles = [HB, HB + 1];
    let r = HB + 2; const FIRST = r;
    const pts = rec.ids.map(id => byId(p, id)).filter(Boolean);
    const groups = reportGroups(p, pts);
    const methNames = Object.keys(RL.method).map(k => RL.method[k]);
    const statNames = ['', ...STATUS_KEYS.map(k => RL.status[k])];
    const yn = [RL.yes[1], RL.yes[0]];
    const NEW_ROWS = 3;
    for (const g of groups) {
      ws.set(r, 1, `sec:${g.s ? g.s.id : ''}|${g.dir}`, S.key);
      ws.set(r, 2, `▶ ${g.s ? g.s.code : ''} ${g.s ? g.s.name || '' : ''} — ${RL.peLong[g.dir]}`.replace(/\s+/g, ' '), S.band); ws.fillRange(r, 3, NC, S.band); ws.merge(r, 2, r, NC); ws.height(r, 16); r++;
      for (const pt of g.pts) {
        const lvl = g.lvl.get(pt.id) || 1; const node = isNode(pt); const dev = pt.kind === 'device';
        const base = node ? S.node : S.td; const baseC = { ...base, align: { h: 'center', v: 'center', wrap: true } };
        const m = (pt.meas && pt.meas[ph]) || {}; const rd = (m.r || []).filter(isNum);
        const v = {
          id: pt.id, code: (lvl > 1 ? '› ' : '') + (pt.code || ''), master: (rawParent(p, pt) || {}).code || '', zone: pt.zone || '', room: pt.room || '', type: typeText(pt) || (node ? _r('Kanaal') : ''), size: pt.kind === 'duct' ? ductDims(pt) : (pt.size || ''),
          design: isNum(designOf(p, pt)) ? designOf(p, pt) : null, q1: isNum(ptQ(p, pt, 'eerste')) ? Math.round(ptQ(p, pt, 'eerste')) : null,
          method: dev ? '' : (RL.method[pt.method] || '') + (MB_UNIT[pt.method] ? ` (${MB_UNIT[pt.method]}${pt.method === 'kfactor' ? ' · k ' + (kUnitOf(pt) === 'ls' ? 'l/s' : 'm³/h') : ''})` : ''),
          kak: pt.method === 'kfactor' ? (isNum(pt.k) ? +(pt.k / K_F[kUnitOf(pt)]).toPrecision(10) : null) : pt.method === 'anemo' ? pt.aeff : null,
          rd: rd.map(x => nl(x, pt.method === 'anemo' || pt.method === 'traverse' ? 2 : 1)).join('; '), q: !rd.length && isNum(m.q) ? m.q : null, ps: isNum(m.ps) ? m.ps : null,
          pos: dev ? [RL.state[pt.reg.state || ''], pt.reg.cond ? RL.cond[pt.reg.cond] : ''].filter(Boolean).join(' / ') : ph === 'eerste' ? pt.reg.posBefore || '' : pt.reg.posAfter || '', locked: hasReg(pt) && !dev ? (pt.reg.locked ? RL.yes[1] : '') : '',
          status: pt.status ? RL.status[pt.status] : '', note: pt.note || '',
        };
        for (const k of keys) {
          const c = col(k); const isIn = ['method', 'kak', 'rd', 'q', 'ps', 'pos', 'locked', 'status', 'note'].includes(k);
          let st = isIn ? (k === 'rd' || k === 'note' ? S.inp : k === 'method' ? { ...S.cin, font: f(8, false, HS.blue) } : S.cin) : (k === 'code' ? { ...base, align: { h: lvl > 1 ? 'left' : 'center', v: 'center', indent: lvl > 1 ? Math.min(lvl - 1, 4) : 0 } } : (['master', 'zone', 'size', 'design', 'q1'].includes(k) ? baseC : base));
          if (dev && ['method', 'kak', 'rd', 'q', 'ps', 'locked'].includes(k)) st = { ...base, fill: HS.lgrey };
          if (k === 'id') st = S.key;
          const val = v[k];
          ws.set(r, c, val === '' ? null : val, (k === 'design' || k === 'q1' || k === 'q') ? { ...st, numFmt: '#,##0' } : k === 'kak' ? { ...st, numFmt: pt.method === 'anemo' ? '0.0000' : '0.0' } : st);
        }
        ws.height(r, 21); r++;
      }
      for (let i = 0; i < NEW_ROWS; i++) {
        ws.set(r, 1, `new:${g.s ? g.s.id : ''}|${g.dir}`, S.key);
        for (const k of keys) if (k !== 'id') ws.set(r, col(k), null, k === 'q1' ? { ...S.td, fill: HS.lgrey } : S.newr);
        if (i === 0) ws.set(r, col('code'), null, S.newr);
        ws.height(r, 21); r++;
      }
    }
    const LAST = r - 1;
    const cl = (k) => XLSXW.colName(col(k));
    ws.addList(`${cl('method')}${FIRST}:${cl('method')}${LAST}`, methNames.map(x => x.replace(/,/g, ' ')));
    ws.addList(`${cl('status')}${FIRST}:${cl('status')}${LAST}`, statNames.filter(Boolean).map(x => x.replace(/,/g, ' ')));
    if (col('locked') > 0) ws.addList(`${cl('locked')}${FIRST}:${cl('locked')}${LAST}`, yn);
    r += 1;
    ws.set(r, 2, _r('Teruggeven aan de coördinator: dit bestand (ingevuld) of een foto / scan van het afgedrukte blad.'), S.legend); ws.merge(r, 2, r, NC); r += 2;
    for (const [c1, t] of [[2, _r('Uitgevoerd door')], [Math.max(6, half), _r('Gecontroleerd (coördinator)')]]) { ws.set(r, c1, t, { font: f(9, true, HS.navy) }); ws.set(r + 3, c1, '______________________ / ' + _r('datum') + ' ________', { font: f(8.5, false, '444444') }); }
    // hidden technical sheet: package identity for the import
    const meta = wb.sheet('_meta'); meta.hidden = true;
    [['app', PKG_APP], ['type', 'meetblad'], ['version', 1], ['pkg', rec.id], ['master', p.id], ['phase', ph], ['lang', I18N.cur.rep], ['issuedAt', rec.issuedAt], ['name', rec.name], ['keys', keys.join(',')], ['sheetAt', sheetAt]].forEach(([k, v2], i) => { meta.set(i + 1, 1, k); meta.set(i + 1, 2, v2); });
    return wb.blob();
  });
}
/** labels of all report languages → key (method, status), to read sheets in any language */
function labelKey(group, text) {
  const cut = (x) => String(x ?? '').trim().toLowerCase().replace(/(\s*\([^)]*\))+\s*$/, '').replace(/,.*$/, '').replace(/\s+/g, ' ').trim();
  const t0 = cut(text); if (!t0) return '';
  for (const d of ['rep', 'ui']) for (const pk of Object.values(I18N.packs[d])) { const m = (pk.labels || {})[group] || {}; for (const [k, v] of Object.entries(m)) if (k !== '' && cut(v) === t0) return k; }
  return null;
}
const yesNo = (v) => { const s = String(v ?? '').trim().toLowerCase(); if (!s) return null; if (/^(ja|j|yes|y|oui|o|да|x|1|true|waar)$/.test(s)) return true; if (/^(nee|n|no|non|нет|0|false)$/.test(s)) return false; return null; };
function rdParse(v) {
  if (v == null || v === '') return [];
  if (typeof v === 'number') return isFinite(v) ? [v] : [];
  // readings are separated by ; | / or by spaces. A space is a thousands mark only inside a number with decimals (1 200,0 — how the app writes it)
  const toks = String(v).split(/[;|\/]+/).flatMap(part => part.match(/\d{1,3}(?:[\s\u00a0\u202f']\d{3})+[.,]\d+|\S+/g) || []);
  return toks.map(x => parseNum(x)).filter(isNum);
}
/** Excel sheet → result object (same shape as an app result) against the master project */
function meetbladResult(m, sheets) {
  const metaSh = sheets.find(s => s.name === '_meta'); if (!metaSh) return null;
  const meta = {}; for (const row of metaSh.rows) if (row && row[0] != null) meta[String(row[0])] = row[1];
  if (meta.type !== 'meetblad') return null;
  let ws = null, kr = -1;
  for (const sh of sheets) { if (sh === metaSh) continue; for (let i = 0; i < Math.min(sh.rows.length, 40); i++) { const row = sh.rows[i] || []; if (row[0] === 'id' && row[1] === 'code') { ws = sh; kr = i; break; } } if (ws) break; }
  if (!ws) return null;
  const keys = (ws.rows[kr] || []).map(x => String(x ?? '')); const ci = (k) => keys.indexOf(k);
  const ph = meta.phase === 'controle' ? 'controle' : 'eerste';
  const get = (row, k) => ci(k) >= 0 ? row[ci(k)] : null;
  const str = (v) => v == null ? '' : String(v).trim();
  const info = {}; for (let i = 0; i < kr; i++) { const row = ws.rows[i] || []; const k = row[0]; if (['by', 'date', 'instr', 'sign'].includes(k)) { const vals = row.slice(1).filter(x => x != null && String(x).trim() !== ''); info[k] = vals.length ? String(vals[vals.length - 1]).trim() : ''; } }
  for (const k of Object.keys(info)) if (/:\s*$/.test(info[k])) info[k] = '';
  const rec = (m.packages || []).find(x => x.id === meta.pkg) || null;
  const snap = rec && rec.snaps ? (rec.snaps[Number(meta.sheetAt) || 0] || null) : null; // baseline of the sheet as printed (0.9.8); none for sheets printed before
  const at = Date.now(); const by = info.by || ''; const team = rec ? rec.name : (meta.name || '');
  const st = () => ({ at, by, team, dev: 'xlsx' });
  // instrument written on the sheet: every measurement of the sheet was made with it
  const insKey = (x) => [x.name, x.type, x.serial].filter(Boolean).join(' ').toLowerCase();
  const exIns = info.instr ? m.instruments.find(x => insKey(x) === info.instr.toLowerCase() || (x.type && x.type.toLowerCase() === info.instr.toLowerCase())) : null;
  const newIns = info.instr && !exIns ? Object.assign(INS0(), { name: info.instr }) : null; const insId = exIns ? exIns.id : newIns ? newIns.id : '';
  const out = []; let sec = null; const newRows = []; const warn = [];
  for (let i = kr + 1; i < ws.rows.length; i++) {
    const row = ws.rows[i] || []; const a = str(row[0]);
    if (a.startsWith('sec:')) { sec = a.slice(4); continue; }
    const code = str(get(row, 'code')).replace(/^[›>\s]+/, '');
    const any = ['code', 'room', 'rd', 'q', 'ps', 'pos', 'status', 'note', 'type', 'design', 'master'].some(k => str(get(row, k)) !== '');
    if (a.startsWith('new:')) { if (any) newRows.push({ row, sec: a.slice(4), line: i + 1 }); continue; }
    if (!a || a === 'id' || !any) continue;
    const mp = byId(m, a) || (code ? m.points.find(x => x.code === code) : null); if (!mp) { warn.push(__('Row {r}: point {c} not found in the project', { r: i + 1, c: code || a })); continue; }
    const q = clone(mp);
    const mw = readRow(q, row, get, ph); if (mw) warn.push(__('Row {r}: method «{m}» not recognised — check the method and the measurements of this row', { r: i + 1, m: mw })); if (insId && readings(q, ph).length && !q.meas[ph].ins) q.meas[ph].ins = insId;
    let changed = false;
    for (const g of [ph, 'fld']) {
      const base = snap && snap[mp.id] ? snap[mp.id][g] : undefined; // what the sheet held when it was printed
      const crew = base !== undefined ? snapHash(normV(groupVal(q, g))) !== base : normV(groupVal(q, g)) !== normV(groupVal(mp, g));
      if (!crew) { setGroup(q, g, groupVal(mp, g)); continue; } // not changed on the sheet: the project's current value stays, also when the project changed after printing
      if (g === 'fld') q.fst = st(); else q.meas[g].st = Object.assign(st(), (() => { const s = sysOf(m, q.systemId); const c = s && dirSetting(s, g, q.dir); return c ? { hz: c.v, hk: c.k } : {}; })());
      changed = true;
    }
    if (changed) out.push(q);
  }
  for (const nr of newRows) {
    const { row, line } = nr; const [sysId, dir] = nr.sec.split('|');
    const code = str(get(row, 'code')); const mc = str(get(row, 'master'));
    const master = mc ? m.points.find(x => x.code === mc && x.systemId === sysId && x.dir === dir && (isNode(x) || isDev(x))) || m.points.find(x => x.code === mc) : null;
    const tt = str(get(row, 'type')); const cl = IMP.classify(tt);
    let kind = IMP.kindOf(tt, { room: str(get(row, 'room')), code, method: null }) || (cl.reg && DEVICE_ONLY.includes(cl.reg) ? 'device' : (cl.reg === 'cav' || cl.reg === 'vav' || cl.reg === 'iris') && !cl.ttype ? 'duct' : 'terminal');
    const np = newPoint(m, { systemId: master ? master.systemId : sysId, dir: master ? master.dir : (dir || 'T'), kind, parentId: master && (isNode(master) || isDev(master)) ? master.id : (mc ? '' : guessBranch(m, sysId, dir, code).parentId), branch: master ? master.branch : guessBranch(m, sysId, dir, code).branch, code, room: str(get(row, 'room')), zone: str(get(row, 'zone')) || (master ? master.zone || '' : guessBranch(m, sysId, dir, code).zone),
      size: str(get(row, 'size')), designQ: IMP.num(get(row, 'design')), ttype: cl.ttype || (kind === 'terminal' ? 'overig' : 'overig'), reg: Object.assign(newPoint(m).reg, { type: cl.reg || (kind === 'device' ? 'brand' : 'none') }) });
    if (!sysOf(m, np.systemId)) { warn.push(__('Row {r}: unknown air handling unit', { r: line })); continue; }
    const mwn = readRow(np, row, get, ph); if (mwn) warn.push(__('Row {r}: method «{m}» not recognised — check the method and the measurements of this row', { r: line, m: mwn })); if (insId && readings(np, ph).length) np.meas[ph].ins = insId;
    np.added = { pkg: meta.pkg, team, by, at, src: 'xlsx' };
    np.sst = st(); np.fst = st(); np.meas[ph].st = st();
    out.push(np);
  }
  const instruments = newIns ? [newIns] : [];
  return { app: PKG_APP, type: 'result', src: 'xlsx', version: 1, at: new Date(at).toISOString(), by, pkg: { id: meta.pkg, masterId: meta.master, name: team, phase: ph, issuedAt: Number(meta.issuedAt) || (rec ? rec.issuedAt : 0) }, points: out, instruments, notes: {}, photos: {}, warnings: warn, info };
}
/** branch / zone of a new point without a master: taken from the points with the same code stem (T1.05 → T1.xx) */
function guessBranch(m, sysId, dir, code) {
  const stem = String(code || '').replace(/[^.\-\s_/]+$/, ''); if (stem.length < 2) return { branch: '', zone: '', parentId: '' };
  const cnt = new Map();
  for (const x of m.points) if (x.systemId === sysId && x.dir === dir && measurable(x) && x.code && x.code.startsWith(stem)) { const k = [x.branch || '', x.zone || '', x.parentId || ''].join('\u0001'); cnt.set(k, (cnt.get(k) || 0) + 1); }
  const best = [...cnt.entries()].sort((a, b) => b[1] - a[1])[0]; if (!best) return { branch: '', zone: '', parentId: '' };
  const [branch, zone, parentId] = best[0].split('\u0001'); return { branch, zone, parentId };
}
function readRow(q, row, get, ph) {
  const str = (v) => v == null ? '' : String(v).trim();
  const mtxt = str(get(row, 'method')); const mk = labelKey('method', mtxt); if (mk) q.method = mk; const mWarn = mtxt && !mk ? mtxt : '';
  const kak = IMP.num(get(row, 'kak')); if (isNum(kak)) { if (q.method === 'anemo') q.aeff = kak; else if (q.method === 'kfactor') q.k = +(kak * K_F[kUnitOf(q)]).toPrecision(12); } // k in the sheet is in the unit of the point (l/s or m³/h)
  q.meas[ph] = q.meas[ph] || { r: [] };
  const rd = rdParse(get(row, 'rd')); const qv = IMP.num(get(row, 'q'));
  if (rd.length) { q.meas[ph].r = rd; q.meas[ph].q = null; } else if (isNum(qv)) { q.meas[ph].r = []; q.meas[ph].q = qv; }
  const ps = IMP.num(get(row, 'ps')); if (isNum(ps)) q.meas[ph].ps = ps;
  const pos = str(get(row, 'pos'));
  if (q.kind === 'device') { for (const tok of pos.split(/\s*[\/,;·+]\s*/).filter(Boolean)) { const sk = labelKey('state', tok); const ck = labelKey('cond', tok); if (ck) q.reg.cond = ck; else if (sk === 'ok' || sk === 'defect') q.reg.cond = sk; else if (sk) q.reg.state = sk; } }
  else if (pos) q.reg[ph === 'eerste' ? 'posBefore' : 'posAfter'] = pos;
  const lk = yesNo(get(row, 'locked')); if (lk != null && ph === 'controle') q.reg.locked = lk;
  const sraw = str(get(row, 'status')); const sk = sraw ? labelKey('status', sraw) : ''; q.status = sk && STATUS_KEYS.includes(sk) ? sk : (sraw ? 'mismatch' : '');
  if (sraw && !sk) q.note = [str(get(row, 'note')), sraw].filter(Boolean).join(' · '); else q.note = str(get(row, 'note'));
  return mWarn;
}
