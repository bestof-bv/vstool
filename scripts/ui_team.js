/* ---------- UI: crews and packages (coordinator), package mode (crew), merge of results ---------- */
const pkStatus = (s) => ({ issued: __('Issued'), merged: __('Merged'), closed: __('Closed') }[s] || s);

async function shareFile(name, blob, title) {
  if (Platform.native()) { try { if (await Platform.shareFile(name, blob, title)) return true; } catch (e) { if (!/cancel/i.test(String(e && e.message))) console.error(e); else return false; } }
  if (STANDALONE && navigator.canShare) {
    try {
      const file = new File([blob], name, { type: blob.type || 'application/octet-stream' });
      if (navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: title || name }); toast(__('File shared')); return true; }
    } catch (e) { if (e && e.name === 'AbortError') return false; }
  }
  return offerFile(name, blob);
}

/** a text for WhatsApp / mail (invitation code): share sheet, else the clipboard, else a text file */
async function shareText(text, title) {
  if (Platform.native()) { try { if (await Platform.shareText(text, title)) return true; } catch (e) { if (/cancel/i.test(String(e && e.message))) return false; console.error(e); } }
  if (navigator.share && (STANDALONE || matchMedia('(pointer: coarse)').matches)) { try { await navigator.share({ title, text }); return true; } catch (e) { if (e && e.name === 'AbortError') return false; } }
  try { await navigator.clipboard.writeText(text); toast(__('Copied: paste it in WhatsApp or a mail')); return true; } catch (e) { }
  return offerFile((title || 'tekst') + '.txt', new Blob([text], { type: 'text/plain' }));
}

/* coordinator: card on the project step */
function teamCardHTML(p) {
  const list = p.packages || [];
  const rows = list.map(r => {
    const pr = PKG.progress(p, r);
    const st = r.status === 'merged' ? 'ok' : r.status === 'closed' ? '' : 'acc';
    return `<div class="pk">
      <div class="pk-hd"><b>${esc(r.name)}</b><span class="chip">${esc(L.phase[r.phase] || r.phase)}</span><span class="chip ${st}">${esc(pkStatus(r.status))}</span><span class="spacer"></span><span class="small muted">${r.kind === 'excel' ? __h('Excel sheet') : __h('App file')}</span></div>
      <div class="small muted">${esc([r.note, __('{n} points', { n: pr.total }), __('measured {a} of {b}', { a: pr.done, b: pr.n }), pr.st ? __('status set: {n}', { n: pr.st }) : '', pr.added ? __('new: {n}', { n: pr.added }) : '', __('issued {d}', { d: fmtDate(r.issuedAt) }), r.mergedAt ? __('merged {d}', { d: fmtDate(r.mergedAt) }) : ''].filter(Boolean).join(' · '))}</div>
      <div class="row">
        <button class="btn sm" data-act="pkSend" data-id="${r.id}">${__h('Send app file')}</button>
        <button class="btn sm" data-act="pkSheet" data-id="${r.id}">${ICON.grid} ${__h('Excel sheet')}</button>
        <span class="spacer"></span>
        ${r.status !== 'closed' ? `<button class="btn sm ghost" data-act="pkCloseRec" data-id="${r.id}">${__h('Close')}</button>` : ''}
        ${S.confirm === 'pkDel:' + r.id ? `<button class="btn sm danger" data-act="pkDel" data-id="${r.id}">${__h('Remove from list')}</button><button class="btn sm" data-act="cancelConfirm">${__h('Cancel')}</button>` : `<button class="btn sm ghost" data-act="pkAskDel" data-id="${r.id}">${__h('Remove')}</button>`}
      </div></div>`;
  }).join('');
  return `<section class="card" id="teamCard"><div class="hd"><h2>${__h('Crews and packages')}</h2><button class="btn sm primary" data-act="pkNew">${__h('+ Package')}</button></div>
    <p class="small muted" style="margin:0">${__h('Split the project between crews: by unit, direction, branch, floor / zone or below a node. A crew gets a file for the app or an Excel sheet to print; you merge their results here. Set the air handling unit to the agreed state before issuing — the crews must not change it.')}</p>
    ${rows ? `<div class="stack-s">${rows}</div>` : ''}
    <div class="row"><label class="btn sm" for="pkResFile">${__h('Import results (.json / .xlsx)')}<input id="pkResFile" class="vh" type="file" accept=".json,.xlsx,.xlsm,application/json,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"></label></div>
  </section>`;
}

/* coordinator: new package */
function pkgNewDialog(p, d) {
  const v = d.v;
  const branches = [...new Set(p.points.filter(x => (v.sys === 'all' || x.systemId === v.sys) && (v.dir === 'all' || x.dir === v.dir)).map(x => x.branch || ''))].sort(natCmp);
  const zones = [...new Set(p.points.map(x => x.zone || '').filter(Boolean))].sort(natCmp);
  const nodes = treeOrder(p, p.points.filter(x => isNode(x) && (v.sys === 'all' || x.systemId === v.sys) && (v.dir === 'all' || x.dir === v.dir)));
  const pts = PKG.scope(p, v); const ids = pts.map(x => x.id); const w = PKG.warnings(p, ids, v.phase);
  const tog = (key, val, label) => `<button type="button" class="tgl${v[key].includes(val) ? ' on' : ''}" data-act="pkTgl" data-k="${key}" data-v="${esc(val)}">${esc(label)}</button>`;
  const langs = I18N.list('rep');
  return sheetFrame(__h('New package'), `
    <section class="card"><div class="grid2">
      <label class="field" for="pk-name">${lbl(__h('Crew / package'))}<input id="pk-name" type="text" data-pk="name" value="${esc(v.name)}"></label>
      <label class="field" for="pk-note">${lbl(__h('Description'))}<input id="pk-note" type="text" data-pk="note" value="${esc(v.note)}" placeholder="${__h('floors 0–2, wing B')}"></label>
      <div class="field full"><span class="label">${__h('Phase')}</span>${seg('pkPhase', v.phase, { eerste: L.phase.eerste, controle: L.phase.controle })}</div>
      <div class="field full"><span class="label">${__h('Output')}</span>${seg('pkKind', v.kind, { app: __('File for the app'), excel: __('Excel sheet for print') })}</div>
      ${v.kind === 'excel' ? `<label class="field" for="pk-lang">${lbl(__h('Sheet language'))}<select id="pk-lang" data-pk="lang">${langs.map(l => `<option value="${l.code}"${v.lang === l.code ? ' selected' : ''}>${esc(l.name)}</option>`).join('')}</select></label>` : ''}
    </div></section>
    <section class="card"><div class="hd"><h3>${__h('Scope')}</h3><span class="chip ${pts.length ? 'acc' : ''}">${__h('{n} points', { n: pts.length })}</span></div>
      <div class="grid2">
        <label class="field" for="pk-sys">${lbl(__h('Air handling unit'))}<select id="pk-sys" data-pk="sys"><option value="all">${__h('All units')}</option>${p.systems.map(s => `<option value="${s.id}"${v.sys === s.id ? ' selected' : ''}>${esc(s.code)} ${esc(s.name)}</option>`).join('')}</select></label>
        <div class="field"><span class="label">${__h('Direction')}</span>${seg('pkDir', v.dir, { all: __('All'), T: L.dir.T, A: L.dir.A })}</div>
        <label class="field full" for="pk-node">${lbl(__h('Below a node (subtree)'))}<select id="pk-node" data-pk="node"><option value="">${__h('— no restriction')}</option>${nodes.map(({ pt: x, lvl }) => `<option value="${x.id}"${v.node === x.id ? ' selected' : ''}>${'· '.repeat(lvl - 1)}${esc(x.code)}${hasReg(x) ? ' — ' + esc(L.reg[x.reg.type]) : ''}</option>`).join('')}</select></label>
      </div>
      ${branches.length > 1 || (branches.length === 1 && branches[0]) ? `<div class="stack-s"><span class="label">${__h('Branches')}</span><div class="tgls">${branches.map(b => tog('branches', b, b || __('no branch'))).join('')}</div></div>` : ''}
      ${zones.length ? `<div class="stack-s"><span class="label">${__h('Floors / zones')}</span><div class="tgls">${zones.map(z => tog('zones', z, z)).join('')}</div></div>` : `<p class="small muted" style="margin:0">${__h('Tip: fill in «Floor / zone» for the points to split crews by floor.')}</p>`}
      <label class="check" for="pk-todo"><input id="pk-todo" type="checkbox" data-pk="todo"${v.todo ? ' checked' : ''}><span>${__h('Only points without this measurement')}</span></label>
      <div class="small muted">${pts.length ? esc(pts.slice(0, 14).map(x => x.code || '?').join(', ')) + (pts.length > 14 ? ' …' : '') : __h('No points in this scope.')}</div>
      ${w.split.length ? `<div class="banner">${__h('Balancing groups are split between packages: {list}. Slaves of one master are best measured and adjusted by one crew.', { list: w.split.join(', ') })}</div>` : ''}
      ${w.overlap.length ? `<div class="banner">${__h('Already in open packages of this phase: {list}.', { list: w.overlap.map(o => `${o.name} (${o.n})`).join(', ') })}</div>` : ''}
    </section>`,
    `<button class="btn" data-act="closeSheet">${__h('Cancel')}</button><button class="btn primary" data-act="pkCreate"${pts.length ? '' : ' disabled'}>${__h('Issue package')}</button>`);
}

/* coordinator: merge a result */
function mergeDialog(p, d) {
  const m = Store.projects[d.mid]; const x = d.d; const res = d.res;
  const G = { eerste: L.phase.eerste, controle: L.phase.controle, fld: __('point data / status'), struct: __('point (structure)'), pin: __('place on the plan') };
  const counts = [[__('Updated'), x.upd.filter(u => !u.quiet).length], [__('New points'), x.added.length], [__('Photos'), x.photos], [__('Conflicts'), x.conflicts.length]];
  return sheetFrame(__h('Results: {name}', { name: res.pkg.name || '?' }), `
    <section class="card"><div class="hd"><h3>${esc(m.info.name || '')}</h3><span class="small muted">${esc([res.by, res.at ? fmtDate(Date.parse(res.at)) : '', res.src === 'xlsx' ? __('Excel sheet') : __('app')].filter(Boolean).join(' · '))}</span></div>
      <div class="grid2">${counts.map(([l, n]) => `<div class="field">${lbl(esc(l))}<div class="mono" style="font-size:22px;font-weight:600">${n}</div></div>`).join('')}</div>
      ${x.notes ? `<div class="small">${__h('Page notes to add: {n}', { n: x.notes })}</div>` : ''}${x.instruments.length ? `<div class="small">${__h('New instruments: {list}', { list: x.instruments.map(i => i.name || i.type).join(', ') })}</div>` : ''}
      ${x.status ? `<div class="small">${__h('Status changes: {n}', { n: x.status })}</div>` : ''}
      ${!x.rec ? `<div class="banner">${__h('This package is not in the list of the project (issued from another device?). The results are merged anyway.')}</div>` : ''}
      ${x.gone.length ? `<div class="banner">${__h('Points removed from the project meanwhile, skipped: {list}', { list: x.gone.map(q => q.code || '?').join(', ') })}</div>` : ''}
      ${x.skipped && x.skipped.length ? `<div class="banner">${__h('Values older than the issue date were not merged: {n} (check the clock of the crew device)', { n: x.skipped.length })}</div>` : ''}
      ${x.noAir && x.noAir.length ? `<div class="banner">${__h('New points for an unknown air handling unit, not added: {list}', { list: x.noAir.map(q => q.code || '?').join(', ') })}</div>` : ''}
      ${(res.warnings || []).map(w => `<div class="banner">${esc(w)}</div>`).join('')}
      ${!x.upd.length && !x.added.length && !x.conflicts.length && !x.photos ? `<p class="small muted" style="margin:0">${__h('Nothing new in this file — it was merged before or is empty.')}</p>` : ''}
    </section>
    ${x.conflicts.length ? `<section class="card"><div class="hd"><h3>${__h('Conflicts')}</h3><span class="small muted">${__h('changed in the project and by the crew')}</span></div>
      ${x.conflicts.map(c => { const ch = d.choices[c.key] || c.choice; return `<div class="cf"><div><b class="mono">${esc(c.mp.code || '?')}</b> · <span class="small">${esc(G[c.g] || c.g)}</span></div>
        <div class="small">${__h('Project')}: ${esc(conflictText(m, c.mp, c.g))}</div><div class="small">${__h('Crew')}: ${esc(conflictText(m, c.rp, c.g))}</div>
        ${seg('pkChoice', ch, { mine: __('Keep project'), theirs: __('Take crew') }, ` data-key="${esc(c.key)}"`)}</div>`; }).join('')}
    </section>` : ''}
    ${x.added.length ? `<section class="card"><div class="hd"><h3>${__h('New points from the crew')}</h3></div><div class="small">${esc(x.added.map(q => [q.code || '?', q.room].filter(Boolean).join(' ')).join(' · '))}</div>
      <p class="small muted" style="margin:0">${__h('They are marked «new» in the project until you confirm them. Deleting is up to you.')}</p></section>` : ''}`,
    `<button class="btn" data-act="closeSheet">${__h('Cancel')}</button><button class="btn primary" data-act="pkMerge">${__h('Merge')}</button>`);
}

/* crew: banner, read-only project data, hand-in step */
function pkgBanner(p) {
  const k = p.pkg;
  return `<div class="banner pkg"><b>${__h('Package «{name}»', { name: k.name })}</b> · ${esc(L.phase[k.phase] || k.phase)}${k.note ? ' · ' + esc(k.note) : ''}<br><span class="small">${__h('From {by}, {d}. Structure and deleting points — coordinator only; you can add points and set a status.', { by: k.by || __('coordinator'), d: fmtDate(k.issuedAt) })}</span></div>`;
}
function pkgProjectStep(p) {
  const I = p.info;
  const rows = [[__('Project'), [I.nr, I.name].filter(Boolean).join(' — ')], [__('Client'), I.client], [__('Address'), I.address], [__('Drawings'), I.schema], [__('Tolerance'), `±${fmt(p.tol.terminal)} % / ±${fmt(p.tol.system)} %`]].filter(r => r[1]);
  const fan = p.systems.map(s => `<div class="small"><b>${esc(s.code)}</b> ${esc(s.name || '')}: ${unitDirs(s).map(d => { const t = dirSetText(s, p.pkg.phase, d, false); return t ? `${esc(L.dir[d])} ${esc(t)}` : ''; }).filter(Boolean).join(' · ') || '—'}</div>`).join('');
  return `<section class="card"><div class="hd"><h2>${__h('Package')}</h2></div>
      <div class="kv">${rows.map(([k, v]) => `<div><span class="label">${esc(k)}</span><span>${esc(v)}</span></div>`).join('')}</div>
      <div class="stack-s"><span class="label">${__h('Air handling unit — set by the coordinator')}</span>${fan}<span class="small muted">${__h('Do not change the fan or the main dampers during the measurements.')}</span></div>
    </section>
    <section class="card"><div class="hd"><h2>${__h('Measured by')}</h2></div>
      <label class="field" for="set-technician-p">${lbl(__h('Your name'))}<input id="set-technician-p" type="text" data-set="technician" value="${esc(Settings.v.technician || '')}" placeholder="${__h('Name, firm')}"></label>
      <span class="small muted">${__h('Stored with every measurement and in the results file.')}</span>
    </section>
    ${insCardHTML(p, __h('Add the instruments you use — they go into the report.'))}`;
}
function pkgReturnStep(p) {
  const ctx = new Set(p.pkg.ctx || []); const pts = p.points.filter(x => !ctx.has(x.id)); const meas = pts.filter(measurable);
  const ph = p.pkg.phase; const done = meas.filter(x => isNum(ptQ(p, x, ph))).length; const st = pts.filter(x => x.status).length; const added = pts.filter(x => x.added).length;
  const nph = PKG.photoBytes(p); const todo = meas.filter(x => !isNum(ptQ(p, x, ph)) && !x.status);
  return `<section class="card"><div class="hd"><h2>${__h('Hand in the package')}</h2><span class="chip ${done === meas.length ? 'ok' : ''}">${done} / ${meas.length}</span></div>
      <div class="grid2">
        <div class="field">${lbl(__h('Status set'))}<div class="mono" style="font-size:20px;font-weight:600">${st}</div></div>
        <div class="field">${lbl(__h('New points'))}<div class="mono" style="font-size:20px;font-weight:600">${added}</div></div>
      </div>
      ${todo.length ? `<div class="banner">${__h('Not measured and without status: {list}', { list: todo.slice(0, 16).map(x => x.code || '?').join(', ') + (todo.length > 16 ? ' …' : '') })}</div>` : `<div class="banner info">${__h('All points of the package are measured or have a status.')}</div>`}
      <label class="check" for="pk-photos"><input id="pk-photos" type="checkbox" data-pkphotos${S.pkPhotos !== false ? ' checked' : ''}><span>${__h('Include photos ({n})', { n: nph })}</span></label>
      <div class="grid2"><button class="btn primary" data-act="pkReturn">${__h('Send results…')}</button><button class="btn" data-act="pkReturnSave">${__h('Save results file')}</button></div>
      <p class="small muted" style="margin:0">${__h('The coordinator imports the file into the project. You may keep measuring and send again — nothing is counted twice.')}${p.pkg.returnedAt ? ' ' + __h('Last sent: {d}.', { d: fmtDate(p.pkg.returnedAt) }) : ''}</p>
    </section>
    <section class="card"><div class="hd"><h2>${__h('This device')}</h2></div>
      <button class="btn danger sm" data-act="askDelProject" style="justify-self:start">${__h('Remove the package from this device')}</button>
      ${S.confirm === 'delProject' ? `<div class="confirm"><span>${__h('Remove? Send the results first.')}</span><span class="spacer"></span><button class="btn sm danger" data-act="delProject">${__h('Remove')}</button><button class="btn sm" data-act="cancelConfirm">${__h('Cancel')}</button></div>` : ''}
    </section>`;
}
/* status of a point: set by crew or coordinator */
function statusHTML(p, pt) {
  return `<section class="card"><div class="hd"><h3>${__h('Status of the point')}</h3>${pt.status ? `<span class="chip nok">${esc(L.status[pt.status])}</span>` : ''}</div>
    ${seg('setStatus', pt.status || '', { '': L.status[''], noaccess: L.status.noaccess, missing: L.status.missing, mismatch: L.status.mismatch })}
    <span class="small muted">${__h('Only when the point cannot be measured as planned — explain in the note below. The point stays in the report with this status.')}</span></section>`;
}
function addedBanner(p, pt) {
  if (!pt.added || pt.added.ok) return '';
  if (isPkg(p)) return `<div class="banner info">${__h('Added by you — it reaches the project with the results.')}</div>`;
  return `<div class="banner info">${__h('New point from {team}{by}, {d}.', { team: pt.added.team || __('crew'), by: pt.added.by ? ' (' + pt.added.by + ')' : '', d: fmtDate(pt.added.at) })} <button class="btn sm" data-act="pkAccept">${__h('Confirm')}</button></div>`;
}
/** chips in the lists: status, package, new, measured at another fan frequency */
function ptChips(p, pt, phase) {
  const out = [];
  if (pt.status) out.push(`<span class="chip nok">${esc(L.status[pt.status])}</span>`);
  if (pt.added && !pt.added.ok) out.push(`<span class="chip new">${__h('new')}${!isPkg(p) && pt.added.team ? ' · ' + esc(pt.added.team) : ''}</span>`);
  if (!isPkg(p)) { const r = PKG.of(p, pt); if (r) out.push(`<span class="chip pkg">${esc(r.name)}</span>`); }
  if (measurable(pt)) { const b = blockedBy(p, pt); if (b) out.push(`<span class="chip nok" title="${__h('Behind a closed or defective damper')}">${__h('behind {code}', { code: b.code || '?' })}</span>`); }
  if (phase && measurable(pt) && insBad(p, pt, phase)) out.push(`<span class="chip nok" title="${esc(insCheck(p, pt, phase).map(x => x.k === 'kind' ? __('the instrument does not fit the method') : `${fmt(x.v, x.unit === 'm/s' ? 2 : 0)} ${x.unit} / ${fmt(x.lim, x.unit === 'm/s' ? 1 : 0)} ${x.unit}`).join(' · '))}">${__h('instrument range')}</span>`);
  if (isDev(pt) && devBad(pt)) out.push(`<span class="chip nok">${esc([pt.reg.state === 'dicht' ? L.state.dicht : '', pt.reg.cond === 'defect' ? L.cond.defect : ''].filter(Boolean).join(', '))}</span>`);
  if (phase && measurable(pt)) {
    const st = stampOf(pt, phase); const s = sysOf(p, pt.systemId); const c = s && dirSetting(s, phase, pt.dir);
    if (st && isNum(st.hz) && c && (st.hk || 'hz') === c.k && Math.abs(st.hz - c.v) > 0.05) out.push(`<span class="chip stale" title="${__h('Measured at another fan setting')}">${__h('at {v}', { v: esc(ctlValUI({ k: st.hk || 'hz', v: st.hz })) })}</span>`);
  }
  return out.join('');
}

/* ---------- actions ---------- */
async function pkIssue(p, rec) {
  try {
    if (rec.kind === 'excel') { const b = await buildMeetblad(p, rec); const kind = await withRepLang(rec.lang, () => safeName(_r('Meetblad'))); await shareFile(PKG.fileBase(p, rec, kind) + '.xlsx', b, rec.name); }
    else { const b = await PKG.packageFile(p, rec); await shareFile(PKG.fileBase(p, rec, 'Pakket') + '.json', b, rec.name); }
  } catch (err) { console.error(err); toast(__('Could not create the file')); }
}
async function pkOpenResult(res, fileName) {
  const m = PKG.master(res);
  if (!m) { toast(__('The project of this package is not on this device')); return; }
  const d = PKG.diff(m, res);
  S.dlg = { type: 'merge', mid: m.id, res, d, choices: {}, file: fileName }; pushNav(); renderSheet();
}
async function readTeamFile(file) {
  if (/\.zip$/i.test(file.name) || /zip/.test(file.type)) { const z = await XLSXR.unzip(await file.arrayBuffer()); if (z.names.includes('project.json')) return { kind: 'zip', zip: z }; return { kind: 'error', msg: __('The file does not look like a project backup') }; }
  if (/\.xls[xm]$/i.test(file.name) || /spreadsheet/.test(file.type)) {
    const sheets = await XLSXR.read(await file.arrayBuffer());
    if (!sheets.some(s => s.name === '_meta')) return { kind: 'xlsx', sheets };
    const meta = {}; for (const row of sheets.find(s => s.name === '_meta').rows) if (row && row[0] != null) meta[String(row[0])] = row[1];
    const m = Store.projects[meta.master] && !Store.projects[meta.master].pkg ? Store.projects[meta.master] : Object.values(Store.projects).find(x => !x.pkg && (x.packages || []).some(r => r.id === meta.pkg));
    if (!m) return { kind: 'error', msg: __('The project of this sheet is not on this device') };
    const res = meetbladResult(m, sheets); if (!res) return { kind: 'error', msg: __('Measuring sheet not recognised') };
    return { kind: 'result', res };
  }
  const obj = JSON.parse(await file.text());
  if (obj && obj.app === PKG_APP && obj.type === 'package') return { kind: 'package', obj };
  if (obj && obj.app === PKG_APP && obj.type === 'result') return { kind: 'result', res: obj };
  return { kind: 'json', obj };
}

document.addEventListener('click', async (e) => {
  const el = e.target.closest('[data-act]'); if (!el) return;
  const act = el.dataset.act; if (!/^pk/.test(act) && act !== 'setStatus') return;
  if (ACT_PERM[act] && !Access.can(ACT_PERM[act])) return; // ui.js explains it
  const p = cur();
  switch (act) {
    case 'pkNew': {
      S.dlg = { type: 'pkgNew', v: { name: PKG.defName(p), note: '', phase: 'eerste', kind: 'app', lang: p.report.lang || 'nl', sys: 'all', dir: 'all', branches: [], zones: [], node: '', todo: false } };
      pushNav(); renderSheet(); break;
    }
    case 'pkPhase': S.dlg.v.phase = el.dataset.v; renderSheet(); break;
    case 'pkKind': S.dlg.v.kind = el.dataset.v; renderSheet(); break;
    case 'pkDir': S.dlg.v.dir = el.dataset.v; S.dlg.v.node = ''; S.dlg.v.branches = []; renderSheet(); break;
    case 'pkTgl': { const a = S.dlg.v[el.dataset.k]; const v = el.dataset.v; const i = a.indexOf(v); if (i >= 0) a.splice(i, 1); else a.push(v); renderSheet(); break; }
    case 'pkCreate': {
      const v = S.dlg.v; const pts = PKG.scope(p, v); if (!pts.length) break;
      const scopeText = [v.sys === 'all' ? '' : sysOf(p, v.sys)?.code, v.dir === 'all' ? '' : L.dir[v.dir], v.node ? byId(p, v.node)?.code : '', v.branches.join(', '), v.zones.join(', ')].filter(Boolean).join(' · ');
      const rec = PKG.create(p, { name: v.name.trim() || PKG.defName(p), note: v.note.trim(), phase: v.phase, kind: v.kind, lang: v.lang, ids: pts.map(x => x.id), scopeText });
      touch(p); S.dlg = null; closeSheetNow(); toast(__('Package issued: {n} points', { n: pts.length }));
      await pkIssue(p, rec); break;
    }
    case 'pkSend': case 'pkSheet': {
      const rec = (p.packages || []).find(r => r.id === el.dataset.id); if (!rec) break;
      const kind = act === 'pkSheet' ? 'excel' : 'app';
      await pkIssue(p, Object.assign({}, rec, { kind })); break;
    }
    case 'pkCloseRec': { const rec = (p.packages || []).find(r => r.id === el.dataset.id); if (rec) { rec.status = 'closed'; touch(p); render(); } break; }
    case 'pkAskDel': S.confirm = 'pkDel:' + el.dataset.id; render(); break;
    case 'pkDel': p.packages = (p.packages || []).filter(r => r.id !== el.dataset.id); S.confirm = null; touch(p); render(); break;
    case 'pkChoice': if (S.dlg && S.dlg.type === 'merge') { S.dlg.choices[el.dataset.key] = el.dataset.v; renderSheet(); } break;
    case 'pkMerge': {
      const d = S.dlg; if (!d || d.type !== 'merge') break; const m = Store.projects[d.mid];
      el.disabled = true;
      try {
        const r = await PKG.apply(m, d.res, d.d, d.choices); touch(m);
        S.dlg = null; closeSheetNow();
        if (S.pid !== m.id) openProject(m.id, 0); else render();
        toast(__('Merged: {u} updated, {a} new, {c} conflicts', { u: r.upd + r.theirs, a: r.added, c: r.conflicts }));
      } catch (err) { console.error(err); toast(__('Could not merge the results')); el.disabled = false; }
      break;
    }
    case 'pkAccept': { const pt = S.ed && byId(p, S.ed.id); if (pt && pt.added) { pt.added.ok = true; touch(p); renderSheet(); } break; }
    case 'pkReturn': case 'pkReturnSave': {
      el.disabled = true;
      try {
        const b = await PKG.resultFile(p, S.pkPhotos !== false);
        const name = ['Resultaat', safeName(p.pkg.masterNr || p.pkg.masterName), safeName(p.pkg.name), new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '')].filter(Boolean).join('_') + '.json';
        const ok = act === 'pkReturn' ? await shareFile(name, b, p.pkg.name) : await offerFile(name, b);
        if (ok) { p.pkg.returnedAt = Date.now(); touch(p); render(); }
      } catch (err) { console.error(err); toast(__('Could not create the file')); }
      el.disabled = false; break;
    }
    case 'setStatus': {
      const pt = S.ed && byId(p, S.ed.id); if (!pt) break;
      pt.status = el.dataset.v; stampPt(p, pt, 'fld'); touch(p); renderSheet(); break;
    }
  }
});
document.addEventListener('change', async (e) => {
  const el = e.target;
  if (el.dataset.pkphotos !== undefined) { S.pkPhotos = el.checked; return; }
  if (el.id === 'pkResFile') {
    const f = el.files && el.files[0]; el.value = ''; if (!f) return;
    try { const r = await readTeamFile(f); if (r.kind === 'result') pkOpenResult(r.res, f.name); else toast(r.msg || __('This is not a results file of a package')); }
    catch (err) { console.error(err); toast(__('Could not read the file')); }
  }
});
function onPkField(el) {
  if (el.dataset.pk === undefined || !S.dlg || S.dlg.type !== 'pkgNew') return false;
  const v = S.dlg.v; const k = el.dataset.pk;
  v[k] = el.type === 'checkbox' ? el.checked : el.value;
  if (k === 'sys') { v.node = ''; v.branches = []; }
  if (['sys', 'node', 'todo', 'lang'].includes(k)) renderSheet();
  return true;
}
