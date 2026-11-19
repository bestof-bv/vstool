/* ---------- 0.10.0: shared projects in the cloud of the organisation, a team per project (migration 0014) ----------
   Only a project someone shares («Delen») goes to the cloud; he becomes its lead. The lead adds colleagues of the organisation:
   · lead / tech — a full copy on their device; every change goes up, the changes of the others come down;
   · crew — the points of its package (as a package of a crew), hands its result in through the cloud; the lead merges it.
   Merging: per point and field group by the time stamps (the same groups as the crew packages: measurement 1, control, fields,
   pin, structure); the other parts of the project (data, units, packages …) three-way against the last synchronised copy —
   changed on one side → taken, changed on both → this device keeps its own. A save only lands on the revision it read
   (rev): when someone else saved in between, the app merges first. Photos and plan files stay on the device (not yet shared). */
const SYNC = {
  SECT: ['info', 'tol', 'rho', 'notes', 'cover', 'instruments', 'insLast', 'systems', 'groups', 'report', 'checklist', 'norm', 'cat', 'packages', 'docs'],
  /** 0.10.1: one synchronisation per 15 minutes (and when the project opens or closes, the app goes to the background, «Synchronise now») */
  EVERY: 15 * 60000,
  timers: {}, busy: {}, list: null, listAt: 0, team: {}, res: {},
  on() { return typeof Cloud !== 'undefined' && typeof Auth !== 'undefined' && !!Auth.user() && !!Cloud.orgId(); },
  shared: (p) => !!(p && p.cloud && p.cloud.id),
  lead: (p) => !!(p && p.cloud && (p.cloud.role === 'lead' || p.cloud.role === 'admin')),
  /** the cloud copy: without photos (stay on the device), plan files and local state */
  payload(p) {
    const o = clone(p); delete o.cloud; delete o.pkg; delete o.updatedAt; // 0.10.1: the time of the last save is no change (it made every save go up again)
    // 0.10.2: the photos travel as metadata only (who has which photo, «delen met het team»); the images go with the full synchronisation
    const c = p.cloud || {}; const del = new Set(c.delPh || []); const rph = c.rph || {};
    for (const [k, ow] of this.owners(o)) {
      const by = new Map(); for (const ph of rph[k] || []) if (!del.has(ph.id)) by.set(ph.id, ph);
      for (const ph of ow.photos || []) if (ph && ph.id) by.set(ph.id, ph); // this device's metadata wins (the lead sets «team»)
      ow.photos = [...by.values()].map(ph => this.slim(ph));
    }
    return o;
  },
  /** the owners of photos: points, units, notes */
  owners(o) { return [...(o.points || []).map(x => ['pt:' + x.id, x]), ...(o.systems || []).map(x => ['sys:' + x.id, x]), ...Object.entries(o.notes || {}).filter(([, n]) => n && typeof n === 'object').map(([k, n]) => ['note:' + k, n])]; },
  slim(ph) { const m = clone(ph); delete m.data; delete m.url; if (m.orig) { delete m.orig.data; delete m.orig.url; } return m; },
  /** photos removed on this device since the last synchronisation stay removed (they are not taken back from the cloud copy) */
  trackDel(p) {
    const c = p.cloud; if (!c) return; const now = new Set(); for (const [, ow] of this.owners(p)) for (const ph of ow.photos || []) if (ph && ph.id) now.add(ph.id);
    const del = new Set(c.delPh || []); for (const id of c.lph || []) if (!now.has(id)) del.add(id); c.delPh = [...del].slice(-2000); c.lph = [...now];
  },
  hashOf(v) { return snapHash(JSON.stringify(v === undefined ? null : v)); },
  sectHash(o, s) {
    let v = clone(o[s] === undefined ? null : o[s]);
    if (s === 'systems') for (const x of v || []) x.photos = [];
    if (s === 'notes') for (const n of Object.values(v || {})) if (n && typeof n === 'object') n.photos = [];
    return this.hashOf(v);
  },
  /** the state both sides agreed on last time: hashes of the parts and the ids of the points */
  base(o) { const h = {}; for (const s of this.SECT) h[s] = this.sectHash(o, s); return { h, ids: (o.points || []).map(x => x.id) }; },
  remember(p, data, rev) { const b = this.base(data); this.trackDel(p); Object.assign(p.cloud, { rev, h: b.h, ids: b.ids, ph: this.hashOf(this.payload(p)), at: Date.now(), err: '' }); },
  /** the changes of the cloud copy into this device's project */
  merge(p, r) {
    const c = p.cloud || {}; const bh = c.h || {}; let took = 0, kept = 0;
    c.rph = {}; for (const [k, ow] of this.owners(r)) if ((ow.photos || []).length) c.rph[k] = ow.photos.map(ph => this.slim(ph));
    for (const s of this.SECT) {
      const lh = this.sectHash(p, s), rh = this.sectHash(r, s); if (lh === rh) continue;
      if (rh !== bh[s] && lh === bh[s]) { // only the cloud changed: take it, keep the photos of this device
        const v = clone(r[s] === undefined ? null : r[s]);
        if (s === 'systems') for (const x of v || []) { const m = (p.systems || []).find(y => y.id === x.id); x.photos = (m && m.photos) || []; }
        if (s === 'notes') for (const [k, n] of Object.entries(v || {})) if (n && typeof n === 'object') n.photos = ((p.notes || {})[k] || {}).photos || [];
        if (v === null) delete p[s]; else p[s] = v; took++;
      } else if (rh !== bh[s]) kept++; // both changed: this device keeps its own, it goes up with the next save
    }
    const known = new Set(c.ids || []); const rIds = new Set((r.points || []).map(x => x.id));
    for (const rp of r.points || []) {
      const lp = p.points.find(x => x.id === rp.id);
      if (!lp) { if (!known.has(rp.id)) { const np = clone(rp); np.photos = []; p.points.push(np); took++; } continue; } // new in the cloud (deleted here: stays deleted)
      for (const g of [...MERGE_GROUPS, 'struct']) {
        const rs = stampOf(rp, g); if (!rs) continue; const ls = stampOf(lp, g);
        if (normV(groupVal(lp, g)) === normV(groupVal(rp, g))) continue;
        if (!ls || rs.at > ls.at) { setGroup(lp, g, groupVal(rp, g), rs); took++; } else kept++;
      }
    }
    const before = p.points.length; p.points = p.points.filter(x => rIds.has(x.id) || !known.has(x.id)); // deleted in the cloud
    took += before - p.points.length;
    return { took, kept };
  },
  async row(id, cols = 'rev,deleted,data') { const a = await Auth.call(`/rest/v1/projects?id=eq.${encodeURIComponent(id)}&select=${cols}`, { method: 'GET' }); return (a && a[0]) || null; },
  /** share: the project goes to the cloud of the organisation, this user leads it */
  async share(p) {
    const org = Cloud.orgId(); if (!org) throw new CloudError('no_org');
    const data = this.payload(p);
    const a = await Auth.call('/rest/v1/projects', { body: { id: p.id, org_id: org, data }, prefer: 'return=representation' });
    const row = a && a[0]; p.cloud = { id: p.id, org, role: 'lead', pkg: '' }; this.remember(p, data, row ? row.rev : 1); Store.touch(p);
    this.list = null; return p.cloud;
  },
  /** a change waits for the next synchronisation (at most 15 minutes); ms: sooner (online again, closing the project) */
  schedule(p, ms) {
    if (!this.shared(p) || p.pkg) return;
    const at = Date.now() + (ms == null ? this.EVERY : ms); const t = this.timers[p.id];
    if (t && t.at <= at) return; if (t) clearTimeout(t.h);
    this.timers[p.id] = { at, h: setTimeout(() => { delete this.timers[p.id]; this.sync(p).catch(e => console.warn('sync', e)); }, Math.max(0, at - Date.now())) };
    this.state(p, p.cloud && p.cloud.st);
  },
  /** one synchronisation: the changes of the others in, the own changes out, the plan files both ways */
  async sync(p) { if (!this.shared(p)) return; await this.pull(p); await this.push(p); }, // 0.10.2: data, points and measurements only
  /** 0.10.2: «Volledige synchronisatie»: the data, the plans both ways and the photos — of the technicians to the lead,
   *  of the lead to the technicians only the photos marked «delen met het team». Returns { up, down, wait, plans } */
  async full(p) {
    if (p.pkg && p.pkg.cloud) return this.fullCrew(p);
    if (!this.shared(p)) return null;
    await this.pull(p); await this.push(p); const plans = await this.files(p); // a save only when something changed (no new version for nothing)
    const c = p.cloud, lead = this.lead(p), org = c.org, pid = c.id; let up = 0, down = 0, wait = 0;
    const upSet = new Set(c.upPh || []); const del = new Set(c.delPh || []);
    const imgs = (ph) => [ph, ph.orig].filter(x => x && x.id && /^[A-Za-z0-9_-]+$/.test(x.id));
    for (const ph0 of allPhotos(p)) { if (!ph0 || (lead && !ph0.team)) continue;
      for (const ph of imgs(ph0)) { if (upSet.has(ph.id)) continue; const b = await Photos.getLocal(ph.id); if (!b) continue;
        try { await Auth.upload('files', `${org}/${pid}/ph-${ph.id}`, b, b.type || 'image/jpeg'); up++; upSet.add(ph.id); }
        catch (e) { if (/exist|duplicate|409/i.test(String(e && (e.code + ' ' + e.message + ' ' + e.status)))) upSet.add(ph.id); } } }
    const fetchImg = async (ph) => { if (await Photos.getLocal(ph.id)) return true; try { const b = await Auth.download('files', `${org}/${pid}/ph-${ph.id}`); if (b && b.size) { await Photos.put(ph.id, b); return true; } } catch (e) { } return false; };
    const own = new Map(this.owners(p));
    for (const [k, list] of Object.entries(c.rph || {})) { const ow = own.get(k); if (!ow) continue; ow.photos = ow.photos || [];
      for (const m of list) { if (del.has(m.id) || (!lead && !m.team) || ow.photos.some(x => x.id === m.id)) continue;
        let ok = true; for (const ph of imgs(m)) ok = (await fetchImg(ph)) && ok;
        if (ok) { ow.photos.push(clone(m)); down++; } else wait++; } }
    for (const ph0 of allPhotos(p)) { if (!ph0 || !(lead || ph0.team)) continue; for (const ph of imgs(ph0)) if (!(await Photos.getLocal(ph.id))) { if (await fetchImg(ph)) down++; else wait++; } } // merged from a crew: the images follow
    c.upPh = [...upSet].slice(-5000); c.fullAt = Date.now(); Store.touch(p); if (down) this.redraw(p);
    return { up, down, wait, plans };
  },
  /** a crew: the marked photos of its points from the cloud copy, the plans */
  async fullCrew(p) {
    const k = p.pkg.cloud; const f = await this.row(k.project); if (!f) return null; let down = 0, wait = 0;
    const plans = await this.files(p);
    const by = new Map((f.data.points || []).map(x => [x.id, x]));
    for (const pt of p.points) { const rp = by.get(pt.id); if (!rp) continue; pt.photos = pt.photos || [];
      for (const m of rp.photos || []) { if (!m.team || pt.photos.some(x => x.id === m.id)) continue;
        try { const b = await Auth.download('files', `${k.org}/${k.project}/ph-${m.id}`); if (b && b.size) { await Photos.put(m.id, b); pt.photos.push(this.slim(m)); down++; } else wait++; } catch (e) { wait++; } } }
    Store.touch(p); if (down) this.redraw(p); return { up: 0, down, wait, plans };
  },
  /** 0.10.1: the plan files (PDF / images) in the storage of the project: up what the cloud does not have, down what this device misses */
  fileKeys(p) { const out = new Set(); for (const d of p.docs || []) for (const r of d.revs || []) { if (r.file) out.add(r.file); for (const f of Object.values(r.imgs || {})) if (f) out.add(f); } return [...out]; },
  async files(p) {
    const c = p.cloud || (p.pkg && p.pkg.cloud); if (!c) return; const org = c.org, pid = c.id || c.project; if (!org || !pid) return;
    const up = new Set(c.up || []); let got = 0, failed = 0;
    for (const h of this.fileKeys(p)) {
      if (!/^[A-Za-z0-9_-]+$/.test(h)) continue; const path = `${org}/${pid}/doc-${h}`;
      const b = await Photos.getLocal(Docs.key(h));
      if (b && !up.has(h) && !p.pkg) { try { await Auth.upload('files', path, b, b.type || 'application/octet-stream'); up.add(h); } catch (e) { failed++; } continue; }
      if (!b) { try { const nb = await Auth.download('files', path); if (nb && nb.size) { await Photos.put(Docs.key(h), nb); up.add(h); got++; } } catch (e) { failed++; } }
      else up.add(h);
    }
    c.up = [...up]; if (failed) c.fileErr = failed; else delete c.fileErr;
    if (got) { Store.touch(p); this.redraw(p); }
    return got;
  },
  /** save: merge what others saved first, then write on the revision that was read */
  async push(p, force) {
    if (!this.shared(p) || p.pkg || p.cloud.role === 'crew' || this.busy[p.id]) return;
    this.trackDel(p); if (!force && this.hashOf(this.payload(p)) === p.cloud.ph) return;
    this.busy[p.id] = true; this.state(p, 'saving');
    try {
      for (let i = 0; i < 4; i++) {
        const r = await this.row(p.cloud.id, 'rev,deleted');
        if (!r) { p.cloud.err = 'gone'; break; }
        if (r.rev !== p.cloud.rev) { const f = await this.row(p.cloud.id); const m = this.merge(p, f.data); this.remember(p, f.data, f.rev); if (m.took) this.redraw(p); }
        const data = this.payload(p);
        const a = await Auth.call(`/rest/v1/projects?id=eq.${encodeURIComponent(p.cloud.id)}&rev=eq.${p.cloud.rev}`, { method: 'PATCH', body: { data }, prefer: 'return=representation' });
        if (a && a[0]) { this.remember(p, data, a[0].rev); break; } // else someone saved in between: read, merge, again
      }
      Store.touch(p); this.state(p, 'ok');
    } catch (e) { p.cloud.err = e && e.code || 'error'; this.state(p, e && e.code === 'offline' ? 'offline' : 'error'); }
    finally { this.busy[p.id] = false; }
  },
  /** the changes of the others: when a project opens, comes back to the screen, and every 45 s while it is open */
  async pull(p) {
    if (!this.shared(p) || this.busy[p.id]) return;
    if (p.pkg) return this.pullCrew(p);
    this.busy[p.id] = true;
    try {
      const r = await this.row(p.cloud.id, 'rev,deleted'); if (!r) { p.cloudGone = { at: Date.now(), archivedAt: p.cloud.archivedAt || null }; delete p.cloud; Store.touch(p); this.redraw(p); return; } // removed after the handover: the copy stays here
      if (r.rev === p.cloud.rev) { this.state(p, 'ok'); return; }
      const f = await this.row(p.cloud.id); const m = this.merge(p, f.data); this.remember(p, f.data, f.rev);
      if (m.kept) p.cloud.ph = ''; // own changes on both sides: they go up next
      Store.touch(p); this.state(p, 'ok'); if (m.took) { this.redraw(p); toast(__('Changes of the team taken over: {n}', { n: m.took })); }
    } catch (e) { this.state(p, e && e.code === 'offline' ? 'offline' : 'error'); }
    finally { this.busy[p.id] = false; }
  },
  async pullCrew(p) { /* a crew copy only hands in; the lead's changes come with a new package */ },
  state(p, s) { if (p.cloud) p.cloud.st = s; const el = document.querySelector('[data-sync-st]'); if (el) el.textContent = this.stText(p); },
  stText(p) {
    const c = p.cloud || {}; const t = c.at ? fmtDate(c.at) : '—';
    const w = this.timers[p.id]; if (w && c.st !== 'saving') return __('changes wait for the synchronisation at {t}', { t: new Date(w.at).toTimeString().slice(0, 5) }) + ' · ' + __('version {r}', { r: c.rev || '—' });
    return ({ saving: __('saving…'), offline: __('offline — saved on the device, goes up when there is a connection'), error: __('could not synchronise: {e}', { e: c.err || '?' }) }[c.st]) || __('synchronised {t} · version {r}', { t, r: c.rev || '—' });
  },
  redraw(p) { if (S.pid === p.id) { if (S.ed && byId(p, S.ed.id)) { renderSheet(); } render(); updateLive(); } },
  /** the shared projects of this user (without their data) */
  async refreshList(force) {
    if (!this.on() || (!force && this.list && Date.now() - this.listAt < 30000)) return this.list;
    if (this._listing) return this.list; this._listing = true; this.listAt = Date.now(); // also after a failure: no request per render
    const before = JSON.stringify(this.list);
    try { this.list = await Auth.rpc('my_projects') || []; } catch (e) { this.list = this.list || []; } finally { this._listing = false; }
    if (S.view !== 'project' && !S.dlg && !S.ed && JSON.stringify(this.list) !== before) render(); return this.list;
  },
  /** open a shared project on this device: lead / tech a full copy, crew its package */
  async open(row) {
    const f = await this.row(row.id); if (!f || f.deleted) throw new CloudError('not_found');
    if (row.role === 'crew' || row.role === 'package') return this.openCrew(row, f.data);
    const np = migrate(Object.assign(newProject(), clone(f.data))); np.id = row.id; np.cloud = { id: row.id, org: row.org_id, role: row.role, pkg: '' };
    np.cloud.rph = {}; for (const [k, ow] of this.owners(np)) { if ((ow.photos || []).length) np.cloud.rph[k] = ow.photos.map(ph => this.slim(ph)); ow.photos = []; } // 0.10.2: photos come with the full synchronisation
    this.remember(np, this.payload(np), f.rev); Store.projects[np.id] = np; Store.touch(np); return np;
  },
  openCrew(row, m) {
    const rec = (m.packages || []).find(r => r.id === row.package_id);
    if (!rec) throw new CloudError('no_package');
    const ids = new Set(rec.ids.filter(id => (m.points || []).some(x => x.id === id))); const ctx = new Set(); const by = (id) => (m.points || []).find(x => x.id === id);
    for (const id of ids) { let q = by(by(id).parentId), g = 0; while (q && g++ < 30) { if (!ids.has(q.id)) ctx.add(q.id); q = q.parentId ? by(q.parentId) : null; } }
    const pts = (m.points || []).filter(x => ids.has(x.id) || ctx.has(x.id)).map(x => Object.assign(clone(x), { photos: [] }));
    const systems = (m.systems || []).filter(s => pts.some(x => x.systemId === s.id)).map(s => Object.assign(clone(s), { photos: [] }));
    const project = { id: m.id || row.id, v: 1, info: clone(m.info || {}), tol: clone(m.tol || {}), rho: m.rho, instruments: clone(m.instruments || []), systems, groups: clone(m.groups || []), points: pts, notes: {}, docs: clone(m.docs || []),
      report: { lang: (m.report || {}).lang || 'nl' } };
    const ex = Object.values(Store.projects).find(x => x.pkg && x.pkg.id === rec.id && x.pkg.cloud);
    if (ex) return ex;
    const np = migrate(Object.assign(newProject(), clone(project))); np.id = 'k' + uid(); np.packages = [];
    np.pkg = { id: rec.id, name: rec.name, note: rec.note || '', phase: rec.phase, issuedAt: rec.issuedAt, by: rec.by || '', masterId: row.id, masterName: (m.info || {}).name || '', masterNr: (m.info || {}).nr || '',
      ctx: [...ctx], openedAt: Date.now(), cloud: { project: row.id, org: row.org_id } };
    if (Settings.v.technician) np.info.technician = Settings.v.technician;
    Store.projects[np.id] = np; Store.touch(np); return np;
  },
  /** 0.10.2: the archive after the handover (mandatory): first everything to this device, then one .zip with the data, all photos and plans */
  async archive(p) {
    const r = await this.full(p); const b = await backupZip(p);
    const ok = await offerFile(reportBase(p, __('Archive')) + '.zip', b, p);
    if (ok !== false) { p.cloud.archivedAt = Date.now(); Store.touch(p); this.push(p, true).catch(() => { }); }
    return r;
  },
  /** 0.10.2: after the handover and the archive: the files of the project out of the storage and the project out of the cloud
   *  (the copies on the devices stay; they stop synchronising) */
  async removeCloud(p) {
    const c = p.cloud; const dir = `${c.org}/${c.id}`; let n = 0;
    for (let i = 0; i < 100; i++) {
      const list = await Auth.call('/storage/v1/object/list/files', { body: { prefix: dir, limit: 100, offset: 0 } }) || [];
      const names = list.filter(x => x && x.name).map(x => dir + '/' + x.name); if (!names.length) break;
      const gone = await Auth.call('/storage/v1/object/files', { method: 'DELETE', body: { prefixes: names } }) || [];
      if (!gone.length) throw new CloudError('forbidden'); n += gone.length;
    }
    await Auth.call(`/rest/v1/projects?id=eq.${encodeURIComponent(c.id)}`, { method: 'DELETE', prefer: 'return=minimal' });
    if (await this.row(c.id, 'rev')) throw new CloudError('forbidden');
    p.cloudGone = { at: Date.now(), files: n, archivedAt: c.archivedAt || null }; delete p.cloud; Store.touch(p); this.list = null; return n;
  },
  /** crew: the result of the package to the lead, through the cloud */
  async handIn(p) {
    const k = p.pkg.cloud; const ctx = new Set(p.pkg.ctx || []);
    for (const pt of p.points) if (!ctx.has(pt.id)) for (const ph0 of pt.photos || []) for (const ph of [ph0, ph0.orig].filter(x => x && x.id)) {
      const ib = await Photos.getLocal(ph.id); if (!ib) continue;
      try { await Auth.upload('files', `${k.org}/${k.project}/ph-${ph.id}`, ib, ib.type || 'image/jpeg'); } catch (e) { if (!/exist|duplicate|409/i.test(String(e && (e.code + ' ' + e.message + ' ' + e.status)))) throw e; } }
    const b = await PKG.resultFile(p, false); const data = JSON.parse(await b.text());
    await Auth.call('/rest/v1/results', { body: { org_id: p.pkg.cloud.org, project_id: p.pkg.cloud.project, package_id: p.pkg.id, data }, prefer: 'return=minimal' });
    p.pkg.returnedAt = Date.now(); p.pkg.cloudAt = Date.now(); Store.touch(p);
  },
  /** lead: results handed in and not merged yet */
  async results(p, force) {
    if (!this.shared(p) || !this.lead(p)) return [];
    const r = this.res[p.id]; if (!force && r && Date.now() - r.at < 30000) return r.list;
    if (!force) this.res[p.id] = { at: Date.now(), list: (r && r.list) || [] }; // one request at a time
    try { const list = await Auth.call(`/rest/v1/results?project_id=eq.${encodeURIComponent(p.cloud.id)}&merged_at=is.null&select=id,package_id,created_at,data&order=created_at`, { method: 'GET' }) || [];
      const ch = JSON.stringify(list) !== JSON.stringify((r || {}).list); this.res[p.id] = { at: Date.now(), list }; if (S.pid === p.id && ch) render(); return list; } catch (e) { this.res[p.id] = { at: Date.now(), list: (r && r.list) || [] }; return this.res[p.id].list; }
  },
  async merged(id, p) { await Auth.call(`/rest/v1/results?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', body: { merged_at: new Date().toISOString() }, prefer: 'return=minimal' }); if (p) delete this.res[p.id]; },
  async loadTeam(p, force) {
    const t = this.team[p.id]; if (!force && t && Date.now() - t.at < 30000) return t;
    if (!force && this._tl === p.id) return t; this._tl = p.id; setTimeout(() => { if (this._tl === p.id) this._tl = null; }, 15000);
    try {
      const [team, people] = await Promise.all([Auth.rpc('project_team', { p: p.cloud.id }), this.lead(p) ? Auth.rpc('project_people', { p: p.cloud.id }) : Promise.resolve([])]);
      this.team[p.id] = { at: Date.now(), team: team || [], people: people || [] };
    } catch (e) { this.team[p.id] = { at: Date.now(), team: (t && t.team) || [], people: (t && t.people) || [], err: e && e.code }; }
    this._tl = null;
    if (S.pid === p.id && JSON.stringify(this.team[p.id].team) !== JSON.stringify((t || {}).team)) render(); return this.team[p.id];
  },
};

/* the store tells the sync about every change of a shared project */
{ const t0 = Store.touch.bind(Store); Store.touch = function (p) { t0(p); try { if (SYNC.shared(p) && !p.pkg) SYNC.schedule(p); } catch (e) { } }; }
/* the changes of the others: on opening a project, back on the screen, every 45 s */
/* 0.10.1: once per 15 minutes while a shared project is open; to the background or closing the project: the waiting changes go up */
setInterval(() => { const p = S.view === 'project' && cur(); if (p && SYNC.shared(p) && document.visibilityState === 'visible' && Date.now() - ((p.cloud || {}).at || 0) >= SYNC.EVERY - 5000) SYNC.sync(p); }, 60000);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') { for (const [id, t] of Object.entries(SYNC.timers)) { const p = Store.projects[id]; if (p) { clearTimeout(t.h); delete SYNC.timers[id]; SYNC.push(p); } } return; }
  const p = S.view === 'project' && cur(); if (p && SYNC.shared(p) && Date.now() - ((p.cloud || {}).at || 0) >= SYNC.EVERY) SYNC.sync(p);
});
window.addEventListener('online', () => { for (const p of Object.values(Store.projects)) if (SYNC.shared(p) && !p.pkg && SYNC.timers[p.id]) SYNC.schedule(p, 1000); });

/* ---------- UI ---------- */
const SY_ROLE = () => ({ lead: __('project lead'), tech: __('technician'), crew: __('crew / subcontractor'), admin: __('administrator'), package: __('package') });
/** the card «Team in the cloud» on the project step */
function syncCardHTML(p) {
  if (typeof SYNC === 'undefined' || p.pkg || !SYNC.on()) return '';
  if (!SYNC.shared(p)) return `<section class="card"><div class="hd"><h2>${__h('Team in the cloud')}</h2></div>
    <p class="small muted" style="margin:0">${__h('Share the project in the cloud of your organisation: you become its lead and add colleagues as technician or crew. Changes are synchronised per point; photos and plan files stay on each device.')}</p>
    <button class="btn primary sm" data-act="syShare" style="justify-self:start">${__h('Share in the organisation')}</button></section>`;
  const t = SYNC.team[p.id]; if (!t) SYNC.loadTeam(p); const lead = SYNC.lead(p);
  const pk = (p.packages || []).filter(r => r.status === 'issued');
  const rows = (t ? t.team : []).map(m => `<div class="row" style="gap:8px"><span>${esc(m.display_name || m.email)}</span><span class="chip">${esc(SY_ROLE()[m.role] || m.role)}${m.package_id ? ' · ' + esc(((p.packages || []).find(r => r.id === m.package_id) || {}).name || m.package_id) : ''}</span>
    <span class="spacer"></span>${lead && m.user_id !== (Auth.user() || {}).id ? `<button class="btn sm ghost" data-act="syRemove" data-u="${esc(m.user_id)}">${__h('Remove')}</button>` : ''}</div>`).join('');
  const people = t ? t.people.filter(x => !x.in_team) : [];
  const add = lead && people.length ? `<div class="grid3" style="align-items:end">
      <label class="field" for="sy-u">${lbl(__h('Colleague'))}<select id="sy-u" data-sy="u">${people.map(x => `<option value="${esc(x.user_id)}" data-org="${esc(x.org_role)}">${esc(x.display_name || x.email)}${x.org_role === 'sub' ? ' · ' + __h('subcontractor') : ''}</option>`).join('')}</select></label>
      <label class="field" for="sy-r">${lbl(__h('Role in the project'))}<select id="sy-r" data-sy="r"><option value="tech">${__h('technician')}</option><option value="crew">${__h('crew / subcontractor')}</option><option value="lead">${__h('project lead')}</option></select></label>
      <label class="field" for="sy-k">${lbl(__h('Package (crew)'))}<select id="sy-k" data-sy="k"><option value="">—</option>${pk.map(r => `<option value="${esc(r.id)}">${esc(r.name)}</option>`).join('')}</select></label>
    </div><button class="btn sm" data-act="syAdd" style="justify-self:start">${__h('+ Add to the team')}</button>` : '';
  const res = lead ? (SYNC.res[p.id] || {}).list : null; if (lead && !SYNC.res[p.id]) SYNC.results(p);
  const resHtml = res && res.length ? `<div class="banner info"><b>${__h('Results handed in: {n}', { n: res.length })}</b>${res.map(x => `<div class="row" style="gap:8px"><span>${esc(((p.packages || []).find(r => r.id === x.package_id) || {}).name || x.package_id)} · ${esc((x.data && x.data.by) || '')} · ${esc(fmtDate(Date.parse(x.created_at)))}</span><span class="spacer"></span><button class="btn sm primary" data-act="syMergeRes" data-id="${esc(x.id)}">${__h('Merge')}</button></div>`).join('')}</div>` : '';
  return `<section class="card"><div class="hd"><h2>${__h('Team in the cloud')}</h2><span class="chip ok">${esc(SY_ROLE()[p.cloud.role] || p.cloud.role)}</span></div>
    <div class="row" style="gap:8px"><span class="small muted" data-sync-st>${esc(SYNC.stText(p))}</span><span class="spacer"></span><button class="btn sm ghost" data-act="syNow">${__h('Synchronise now')}</button><button class="btn sm" data-act="syFull">${__h('Full synchronisation')}</button></div>
    <p class="small muted" style="margin:0">${lead ? __h('Every 15 minutes: data, points and measurements. Full synchronisation: also the plans and the photos of the technicians; your photos go to the team only when marked «Share with the team».') : __h('Every 15 minutes: data, points and measurements. Full synchronisation: also the plans, your photos to the project lead and the photos the lead shares with the team.')}${p.cloud.fullAt ? ' ' + esc(__('Last full synchronisation: {d}', { d: fmtDate(p.cloud.fullAt) })) : ''}</p>
    ${lead ? `<div class="banner warn small">${__h('Archiving is mandatory when the project is finished and handed over: step «Handover» → «Make the archive». Then the project leaves the cloud.')}</div>` : ''}
    ${resHtml}
    <div class="stack-s">${rows || `<span class="small muted">${__h('Loading the team…')}</span>`}</div>
    ${add}
    ${lead ? `<p class="small muted" style="margin:0">${__h('Technician: measures all points. Crew: only the points of its package (make the package first under «Crews and packages») and hands in its result here. A subcontractor of the organisation is always crew.')}</p>` : ''}
  </section>`;
}
/** home: shared projects that are not on this device yet */
function syncHomeHTML() {
  if (typeof SYNC === 'undefined' || !SYNC.on()) return '';
  if (!SYNC.list) { SYNC.refreshList(); return ''; } SYNC.refreshList();
  const here = new Set(Object.values(Store.projects).map(p => (p.cloud && p.cloud.id) || (p.pkg && p.pkg.cloud && p.pkg.cloud.project + '|' + p.pkg.id)));
  const list = SYNC.list.filter(x => !x.deleted && !here.has(x.id) && !here.has(x.id + '|' + x.package_id));
  if (!list.length) return '';
  return `<section class="card"><div class="hd"><h2>${__h('Shared with you')}</h2></div>${list.map(x => `<div class="row" style="gap:8px"><span><b>${esc(x.name || x.id)}</b> <span class="small muted">${esc(SY_ROLE()[x.role] || x.role)} · ${esc(x.updated_by)} · ${esc(fmtDate(Date.parse(x.updated_at)))}</span></span><span class="spacer"></span>
    <button class="btn sm primary" data-act="syOpen" data-id="${esc(x.id)}">${__h('Open')}</button></div>`).join('')}</section>`;
}
/** 0.10.2: the handover step of a shared project: the archive is mandatory, then out of the cloud */
function syncHandoverHTML(p) {
  if (typeof SYNC === 'undefined') return '';
  if (p.cloudGone) return `<section class="card"><div class="hd"><h3>${__h('Archive and cloud')}</h3><span class="chip ok">${__h('out of the cloud')}</span></div>
    <p class="small" style="margin:0">${esc(__('Removed from the cloud on {d}. This copy stays on the device.', { d: fmtDate(p.cloudGone.at) }))}${p.cloudGone.archivedAt ? ' ' + esc(__('Archive made on {d}.', { d: fmtDate(p.cloudGone.archivedAt) })) : ''}</p></section>`;
  if (!SYNC.shared(p) || !SYNC.on()) return '';
  const lead = SYNC.lead(p), done = !!(p.handover || {}).completedAt, arch = p.cloud.archivedAt;
  return `<section class="card"><div class="hd"><h3>${__h('Archive and cloud')}</h3><span class="chip ${arch ? 'ok' : 'nok'}">${arch ? __h('archived') : __h('not archived')}</span></div>
    <div class="banner warn"><b>${__h('Archiving is mandatory when the project is finished and handed over.')}</b> ${__h('The archive (.zip) holds the data, all photos and plans; keep it in OneDrive, SharePoint or on the server of the company. Only then the project and its files leave the cloud: that keeps the storage of the organisation small.')}</div>
    ${lead ? `<div class="row" style="gap:8px;flex-wrap:wrap">
      <button class="btn ${arch ? '' : 'primary'}" data-act="syArchive">${arch ? __h('Make the archive again') : __h('Make the archive')}</button>
      ${S.confirm === 'syRemove' ? `<span class="small">${__h('Delete the project and all its files from the cloud? The copies on the devices stay.')}</span><button class="btn danger" data-act="syRemoveCloud">${__h('Delete from the cloud')}</button><button class="btn" data-act="cancelConfirm">${__h('Cancel')}</button>`
        : `<button class="btn danger" data-act="syRemoveCloud"${done && arch ? '' : ' disabled'}>${__h('Remove from the cloud')}</button>`}</div>
      ${!done ? `<p class="small muted" style="margin:0">${__h('Removing from the cloud is possible after the handover and the archive.')}</p>` : !arch ? `<p class="small muted" style="margin:0">${__h('Make the archive first.')}</p>` : arch ? `<p class="small muted" style="margin:0">${esc(__('Archive made on {d}.', { d: fmtDate(arch) }))}</p>` : ''}`
      : `<p class="small muted" style="margin:0">${__h('The project lead makes the archive and removes the project from the cloud.')}</p>`}
  </section>`;
}
/* 0.10.2: «Delen met het team» on a photo (the lead of a shared project) */
document.addEventListener('change', (e) => {
  const el = e.target; if (!el || el.dataset.phteam === undefined) return; const p = cur(); if (!p) return;
  const ph = allPhotos(p).find(x => x && x.id === el.dataset.phteam); if (!ph) return; ph.team = el.checked; Store.touch(p);
});
document.addEventListener('click', async (e) => {
  const el = e.target.closest && e.target.closest('[data-act]'); if (!el || !/^sy[A-Z]/.test(el.dataset.act)) return;
  const act = el.dataset.act; const p = cur();
  const run = async (f) => { el.disabled = true; try { await f(); } catch (err) { console.error(err); toast(typeof cloudMsg === 'function' ? cloudMsg(err) : String(err && err.message || err)); } el.disabled = false; };
  switch (act) {
    case 'syShare': return run(async () => { await SYNC.share(p); toast(__('Shared: you lead this project in the cloud')); await SYNC.loadTeam(p, true); render(); });
    case 'syNow': return run(async () => { const t = SYNC.timers[p.id]; if (t) { clearTimeout(t.h); delete SYNC.timers[p.id]; } await SYNC.sync(p); await SYNC.loadTeam(p, true); await SYNC.results(p, true); render(); });
    case 'syAdd': return run(async () => {
      const u = document.getElementById('sy-u').value, r = document.getElementById('sy-r').value, k = document.getElementById('sy-k').value;
      const sub = document.querySelector('#sy-u option:checked')?.dataset.org === 'sub';
      const role = sub ? 'crew' : r; if (role === 'crew' && !k) { toast(__('Choose the package of the crew')); return; }
      await Auth.rpc('project_member_set', { p: p.cloud.id, u, r: role, pkg: role === 'crew' ? k : '' }); await SYNC.loadTeam(p, true); toast(__('Added to the team'));
    });
    case 'syRemove': return run(async () => { await Auth.rpc('project_member_remove', { p: p.cloud.id, u: el.dataset.u }); await SYNC.loadTeam(p, true); });
    case 'syOpen': return run(async () => {
      const row = (SYNC.list || []).find(x => x.id === el.dataset.id); if (!row) return;
      const np = await SYNC.open(row); SYNC.list = null; openProject(np.id, 0);
    });
    case 'syFull': return run(async () => { const t = SYNC.timers[p.id]; if (t) { clearTimeout(t.h); delete SYNC.timers[p.id]; } toast(__('Full synchronisation…'));
      const r = await SYNC.full(p); if (r) toast(__('Full synchronisation: {up} photos sent, {down} received, {pl} plans received', { up: r.up, down: r.down, pl: r.plans || 0 }) + (r.wait ? ' · ' + __('{n} photos not in the cloud yet (the device that has them must synchronise fully)', { n: r.wait }) : ''));
      if (SYNC.shared(p)) { await SYNC.loadTeam(p, true); await SYNC.results(p, true); } render(); });
    case 'syArchive': return run(async () => { toast(__('Collecting everything for the archive…')); await SYNC.archive(p); render(); });
    case 'syRemoveCloud': if (S.confirm !== 'syRemove') { S.confirm = 'syRemove'; render(); return; } S.confirm = null;
      return run(async () => { const n = await SYNC.removeCloud(p); toast(__('Removed from the cloud: the project and {n} files. The archive and this copy remain.', { n })); render(); });
    case 'syHandIn': return run(async () => { await SYNC.handIn(p); toast(__('Handed in: the project lead merges your result')); render(); });
    case 'syMergeRes': return run(async () => {
      const x = ((SYNC.res[p.id] || {}).list || []).find(y => y.id === el.dataset.id); if (!x) return;
      const res = clone(x.data); res.pkg = Object.assign({}, res.pkg, { masterId: p.id });
      const d = PKG.diff(p, res); S.dlg = { type: 'merge', mid: p.id, res, d, choices: {}, file: __('cloud'), cloudRes: x.id }; pushNav(); renderSheet();
    });
  }
});
