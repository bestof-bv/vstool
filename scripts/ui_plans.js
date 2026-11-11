/* ---------- plans and documents: library card, full-screen plan viewer with the points (pins), fragments ---------- */
const ICON_PLAN = '<svg viewBox="0 0 24 24"><path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z"/><path d="M9 4v14M15 6v14"/></svg>';
const ICON_LINK = '<svg viewBox="0 0 24 24"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>';
const MB = (b) => b >= 1048576 ? nl(b / 1048576, 1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' kB';

/** modal with its own history entry: the Android back button closes it, not the sheet under it */
function modalNav(m) { if (S.mod && S.mod.nav) m.nav = true; else { pushNav(); m.nav = true; } }
function modalExit() {
  const m = S.mod; if (!m) return;
  if (m.nav && STANDALONE && history.state && history.state.inregelaar) { m.leaving = true; history.back(); } else closeModal();
}

/* ---------- library card (step «Project») ---------- */
function plansCardHTML(p) {
  const docs = p.docs || []; const can = Access.can('project.info');
  const rows = docs.map(d => {
    const r = docCur(d); const u = docUsage(p, d.id); const old = u.frags.filter(x => x.ph.src.file && revOf(d, x.ph.src.file) !== r).length;
    const ask = S.confirm === 'docDel:' + d.id;
    return `<div class="doc-row">
      <button type="button" class="doc-th" data-act="pvOpen" data-v="${d.id}" aria-label="${__h('Open')}"><img data-docth="${d.id}" alt=""></button>
      <div class="doc-mid stack-s">
        <input type="text" data-docname="${d.id}" value="${esc(d.name)}" aria-label="${__h('Name of the plan')}"${can ? '' : ' disabled'}>
        <span class="small muted">${esc([r.rev ? 'rev. ' + r.rev : '', (r.pages || []).length + ' ' + (r.pages.length === 1 ? __('page') : __('pages')), r.bytes ? MB(r.bytes) : '', r.kind === 'img' ? __('image') : 'PDF'].filter(Boolean).join(' · '))}</span>
        <span class="small">${__h('Fragments: {f} · points on the plan: {n}', { f: u.frags.length, n: u.pins.length })}${d.revs.length > 1 ? ' · ' + __h('revisions: {r}', { r: d.revs.map(x => x.rev).join(', ') }) : ''}</span>
        ${(d.zones || []).length ? `<div class="row small doc-zones"><span class="muted">${__h('Snapshots')}:</span>${d.zones.map(z => `<button class="btn sm" data-act="pvOpenZone" data-v="${d.id}" data-zone="${z.id}">${esc(z.name || '?')}${(r.pages || []).length > 1 ? ' · p. ' + z.page : ''}</button>`).join('')}</div>` : ''}
        ${old ? `<div class="row small"><span>${__h('{n} fragments are on an older revision', { n: old })}</span><button class="btn sm" data-act="docMoveRev" data-v="${d.id}">${__h('Move to rev. {r}', { r: r.rev })}</button></div>` : ''}
        ${ask ? `<div class="banner" style="background:var(--bad-soft);border-color:transparent"><span class="small">${u.frags.length || u.pins.length ? __h('Used: {f} fragments, {n} points. The fragments stay as plain images, the points lose their place on the plan.', { f: u.frags.length, n: u.pins.length }) : __h('Delete this plan from the project?')}</span>
          <div class="row" style="margin-top:6px"><button class="btn sm danger" data-act="docDel" data-v="${d.id}">${__h('Delete')}</button><button class="btn sm" data-act="cancelConfirm">${__h('Cancel')}</button></div></div>` : ''}
      </div>
      <div class="doc-act">
        <button class="btn sm primary" data-act="pvOpen" data-v="${d.id}">${__h('Open')}</button>
        ${can ? `<label class="btn sm" for="docrev-${d.id}">${__h('New revision')}<input id="docrev-${d.id}" class="vh" type="file" accept="application/pdf,.pdf,image/*" data-docrev="${d.id}"></label>
        <button class="btn sm ghost" data-act="docAskDel" data-v="${d.id}">${__h('Delete')}</button>` : ''}
      </div></div>`;
  }).join('');
  const noPin = p.points.filter(x => !x.pin && !isCtx(p, x)).length;
  return `<section class="card"><div class="hd"><h2>${__h('Plans and documents')}</h2><span class="small muted">PDF · ${__h('images')}</span></div>
    <p class="small muted" style="margin:0">${__h('A plan is stored once and used everywhere: place the points on it, take fragments for the report from any point or page. Zooming renders the PDF sharp.')}</p>
    ${rows ? `<div class="stack-s">${rows}</div>` : ''}
    ${typeof BATCH !== 'undefined' ? BATCH.listHtml(p) : ''}
    <div class="row">${can && typeof docsBtn === 'function' ? docsBtn('docs') : ''}${can ? `<label class="btn sm${docs.length ? '' : ' primary'}" for="docAdd">${ICON_PLAN} ${__h('Add a plan')}<input id="docAdd" class="vh" type="file" accept="application/pdf,.pdf,image/*" multiple data-docadd></label>` : ''}
      ${can && docs.length && typeof AIP !== 'undefined' && Access.can('ai.plan') && !Demo.on() ? `<button class="btn sm" data-act="aiDocs">✦ ${__h('Read the plans with AI')}</button>` : ''}
      ${docs.length && p.points.length ? `<button class="btn sm" data-act="pvPlace">${__h('Place points on the plan')}${noPin ? ` <span class="chip">${noPin}</span>` : ''}</button>` : ''}</div>
  </section>`;
}
/** thumbnails of the plans and the pin previews after a render */
function hydratePlans(root) {
  const p = cur(); if (!p || !root) return;
  root.querySelectorAll('img[data-docth]').forEach(async (img) => {
    if (img.getAttribute('src')) return; const d = docById(p, img.dataset.docth); if (!d) return; const r = docCur(d);
    try { img.src = await Docs.thumb(r, (r.pages || [1])[0]); } catch (e) { img.closest('.doc-th')?.classList.add('missing'); }
  });
  root.querySelectorAll('img[data-pinprev]').forEach(async (img) => {
    if (img.getAttribute('src')) return; const pt = byId(p, img.dataset.pinprev); if (!pt || !pt.pin) return;
    try { img.src = await pinPreview(p, pt); } catch (e) { img.closest('.pin-prev')?.classList.add('missing'); }
  });
}
const pinPrevCache = new Map();
/** part of the plan around the pin of a point, with the pins of the neighbours */
async function pinPreview(p, pt) {
  const d = docById(p, pt.pin.doc); if (!d) throw new Error('missing'); const r = docCur(d);
  const pins = pagePins(p, d.id, pt.pin.page); const k = [r.file, pt.pin.page, JSON.stringify(viewOf(d, pt.pin.page, pt.pin.zone)), pt.pin.x, pt.pin.y, pins.map(q => q.id + q.state + q.x + q.y).join(',')].join('|');
  if (pinPrevCache.has(k)) return pinPrevCache.get(k);
  const src = Docs.source(r, pt.pin.page); const aspect = 16 / 9; const view = viewOf(d, pt.pin.page, pt.pin.zone); // 0.9.18: in the turned page; 0.9.19: in its snapshot
  const G = geo(src.w, src.h, view.rot * 90); const b = G.toBase(pt.pin.x * src.w, pt.pin.y * src.h); const px = b[0] / G.bw, py = b[1] / G.bh; const sz = Math.max(G.bw, G.bh) * 0.16;
  let w = sz / G.bw, h = sz / aspect / G.bh; const x = clamp01(Math.min(1 - w, Math.max(0, px - w / 2))), y = clamp01(Math.min(1 - h, Math.max(0, py - h / 2)));
  const c = await renderEdit(src, { rot: view.rot, fine: 0, crop: [x, y, Math.min(1, w), Math.min(1, h)] }, { outMax: 640, upscale: true, pins: pins.map(q => Object.assign({}, q)), pinOpts: { sel: pt.id } });
  const url = c.toDataURL('image/jpeg', 0.82); pinPrevCache.set(k, url); if (pinPrevCache.size > 60) pinPrevCache.delete(pinPrevCache.keys().next().value); return url;
}
/** «Location on the plan» in the point editor */
function pinCardHTML(p, pt) {
  const docs = p.docs || []; if (!docs.length && !pt.pin) return '';
  const can = Access.can('measure.edit') && !isCtx(p, pt);
  const d = pt.pin ? docById(p, pt.pin.doc) : null;
  return `<section class="card"><div class="hd"><h3>${__h('Location on the plan')}</h3>${d ? `<span class="small muted">${esc(docLabel(d, pt.pin.page))}</span>` : ''}</div>
    ${pt.pin && d ? `<button type="button" class="pin-prev" data-act="pvShowPin" data-v="${pt.id}" aria-label="${__h('Show on the plan')}"><img data-pinprev="${pt.id}" alt=""></button>
      <div class="row"><button class="btn sm" data-act="pvShowPin" data-v="${pt.id}">${ICON_PLAN} ${__h('Show on the plan')}</button>${can ? `<button class="btn sm" data-act="pvPlaceOne" data-v="${pt.id}">${__h('Move')}</button><button class="btn sm ghost" data-act="pinDel" data-v="${pt.id}">${__h('Remove')}</button>` : ''}</div>`
      : can ? `<div class="row"><button class="btn sm" data-act="pvPlaceOne" data-v="${pt.id}">${ICON_PLAN} ${__h('Place on the plan')}</button><span class="small muted">${__h('Tap the spot of the grille or damper on the plan.')}</span></div>` : `<span class="small muted">${__h('Not placed on a plan yet.')}</span>`}
  </section>`;
}

/* ---------- plan viewer ---------- */
function openPlan(o) {
  const p = cur(); if (!p || !(p.docs || []).length) { toast(__('Add a plan first (step «Project»)')); return; }
  const last = S.planLast && docById(p, S.planLast.doc) ? S.planLast : null;
  let doc = o.doc || (o.pt && byId(p, o.pt) && byId(p, o.pt).pin ? byId(p, o.pt).pin.doc : null) || (last && last.doc) || p.docs[0].id;
  if (!docById(p, doc)) doc = p.docs[0].id; const d = docById(p, doc); const r = docCur(d);
  let page = o.page || (o.pt && byId(p, o.pt) && byId(p, o.pt).pin && byId(p, o.pt).pin.doc === doc ? byId(p, o.pt).pin.page : null) || (last && last.doc === doc ? last.page : null) || r.pages[0];
  if (!r.pages.includes(Number(page))) page = r.pages[0];
  const fpt = o.pt ? byId(p, o.pt) : o.focus ? byId(p, o.focus) : null;
  let zone = o.zone !== undefined ? o.zone : fpt && fpt.pin && fpt.pin.doc === doc && Number(fpt.pin.page) === Number(page) ? fpt.pin.zone || '' : last && last.doc === doc && Number(last.page) === Number(page) ? last.zone || '' : '';
  if (zone && !pageZones(d, page).some(z => z.id === zone)) zone = '';
  const m = { type: 'plan', doc, page: Number(page), zone, mode: o.mode || 'view', queue: o.queue || [], qi: 0, placed: [], owner: o.owner || '', sel: o.sel || null, showPins: true, focus: o.focus || null, frag: o.frag || null };
  modalNav(m); S.mod = m; renderPlanViewer();
}
function pvRev(m) { const d = docById(cur(), m.doc); return d ? docCur(d) : null; }
function renderPlanViewer() {
  const m = S.mod; if (!m || m.type !== 'plan') return; const p = cur(); const d = docById(p, m.doc); if (!d) { modalExit(); return; } const r = docCur(d);
  if (m.zone && !pageZones(d, m.page).some(z => z.id === m.zone)) m.zone = '';
  S.planLast = { doc: m.doc, page: m.page, zone: m.zone };
  const docs = p.docs || [];
  modalEl.hidden = false;
  modalEl.innerHTML = `<div class="ied pvw" role="dialog" aria-modal="true" aria-label="${__h('Floor plan')}">
    <div class="ied-top">
      <button class="iconbtn" data-act="pvClose" aria-label="${__h('Close')}">${ICON.close}</button>
      <div class="ied-title">${docs.length > 1 ? `<select data-pvdoc aria-label="${__h('Floor plan')}">${docs.map(x => `<option value="${x.id}"${x.id === m.doc ? ' selected' : ''}>${esc(x.name)}</option>`).join('')}</select>` : `<b>${esc(d.name)}</b>`}
        <span>${esc([r.rev ? 'rev. ' + r.rev : '', pageTitle(d, m.page)].filter(Boolean).join(' · '))}</span></div>
      ${r.pages.length > 1 ? `<button class="iconbtn" data-act="pvPage" data-v="-1" aria-label="${__h('Previous page')}"${r.pages.indexOf(m.page) <= 0 ? ' disabled' : ''}>‹</button>
        <select data-pvpage aria-label="${__h('Page')}">${r.pages.map(n => `<option value="${n}"${n === m.page ? ' selected' : ''}>${n}${pageTitle(d, n) ? ' · ' + esc(pageTitle(d, n)) : ''}</option>`).join('')}</select>
        <button class="iconbtn" data-act="pvPage" data-v="1" aria-label="${__h('Next page')}"${r.pages.indexOf(m.page) >= r.pages.length - 1 ? ' disabled' : ''}>›</button>` : ''}
      ${pageZones(d, m.page).length ? `<select data-pvzone aria-label="${__h('Snapshot of the plan')}"><option value="">${__h('Whole page')}</option>${pageZones(d, m.page).map(z => `<option value="${z.id}"${z.id === m.zone ? ' selected' : ''}>${esc(z.name || '?')}</option>`).join('')}</select>` : ''}
    </div>
    <div class="ied-main">
      <div class="ied-stage"><canvas id="pvCanvas"></canvas><div class="pv-zoom"><button class="iconbtn" data-act="pvZoom" data-v="1" aria-label="${__h('Zoom in')}">+</button><button class="iconbtn" data-act="pvZoom" data-v="-1" aria-label="${__h('Zoom out')}">−</button><button class="iconbtn" data-act="pvFit" aria-label="${__h('Whole page')}">⤢</button></div></div>
      <div class="ied-panel" id="pvPanel"></div>
    </div>
  </div>`;
  if (m.stage) m.stage.destroy();
  const cv = document.getElementById('pvCanvas');
  m.stage = new Stage(cv, { bg: '#3A4248', overlay: (g, st) => pvOverlay(g, st, m), tap: (b, s) => pvTap(m, b, s), down: (b, s) => pvDown(m, b, s), move: (b, s) => pvMove(m, b, s), up: (b, s) => pvUp(m, b, s) });
  const src = Docs.source(r, m.page); m.src = src; const view = m.view = viewOf(d, m.page, m.zone); // 0.9.18: quarter turns and the visible part of the page; 0.9.19: or of a snapshot (LG1, LG2 …)
  m.stage.setSource(src, { rot: view.rot, fine: 0 }).then(() => {
    const st = m.stage; const pt = m.focus ? byId(p, m.focus) : null; const all = view.crop || [0, 0, 1, 1];
    if (m.frag && m.frag.view) st.fitRect(rectToRotation(src, m.frag.rot || 0, view.rot, m.frag.view), 0);
    else if (pt && pt.pin && pt.pin.doc === m.doc && Number(pt.pin.page) === m.page) { st.fitRect(all, 0.03); st.z *= 4; st.limits(); const b = pvToB(m, pt.pin.x, pt.pin.y); st.cx = b[0]; st.cy = b[1]; }
    else st.fitRect(all, 0.03);
    st.draw(); st.refine();
  }).catch(err => { console.error(err); toast(err && err.code === 'missing' ? __('The plan file is not on this device') : __('Could not open the plan')); });
  pvPanel();
}
/** page 0…1 (unturned, where the pins are) ↔ base px of the turned stage */
function pvToB(m, x, y) { return m.stage.G.toBase(x * m.src.w, y * m.src.h); }
function pvToO(m, bx, by) { const s = m.stage.G.toSrc(bx, by); return [s[0] / m.src.w, s[1] / m.src.h]; }
/** inside the visible part of the page (base px) */
function pvInView(m, bx, by) { const c = m.view && m.view.crop; if (!c) return true; const st = m.stage; const x = bx / st.bw, y = by / st.bh; return x >= c[0] - 1e-6 && y >= c[1] - 1e-6 && x <= c[0] + c[2] + 1e-6 && y <= c[1] + c[3] + 1e-6; }
function pvCurPt(m) { const p = cur(); return m.mode === 'place' ? byId(p, m.queue[m.qi]) : null; }
function pvPanel() {
  const m = S.mod; const el = document.getElementById('pvPanel'); if (!m || !el) return; const p = cur(); const d = docById(p, m.doc);
  const canPin = Access.can('measure.edit'); let html = '';
  if (m.mode === 'place') {
    const pt = pvCurPt(m);
    html = pt ? `<div class="pv-place"><span class="label">${__h('Place point {i} of {n}', { i: m.qi + 1, n: m.queue.length })}</span>
        <div class="pv-pt"><span class="tag ${pt.kind === 'device' ? 'D' : pt.dir}">${pt.kind === 'device' ? '—' : pt.dir}</span><b class="mono">${esc(pt.code || '?')}</b><span class="small muted">${esc([pt.room, sysOf(p, pt.systemId)?.code].filter(Boolean).join(' · '))}</span></div>
        <span class="small muted">${__h('Tap the spot of this point on the plan. Two fingers zoom and move the plan.')}</span>
        <div class="row">${m.queue.length > 1 ? `<button class="btn sm" data-act="pvSkip">${__h('Skip')}</button>` : ''}${m.placed.length ? `<button class="btn sm ghost" data-act="pvUndoPin">${__h('Undo last')}</button>` : ''}<span class="spacer"></span><button class="btn sm primary" data-act="pvStop">${__h('Done')}</button></div></div>`
      : `<p class="small" style="margin:0">${__h('All points of the list have a place on the plan.')}</p><div class="row"><button class="btn sm primary" data-act="pvStop">${__h('Done')}</button></div>`;
  } else if (m.mode === 'frag') {
    html = `<div class="stack-s"><span class="label">${__h('Fragment for the report')}</span><span class="small muted">${__h('Zoom and move the plan to the part you need, then take this view. In the next step you can adjust the frame and add marks.')}</span>
      ${m.owner ? `<span class="small">${__h('For: {x}', { x: ownerLabel(p, m.owner) || '—' })}</span>` : ''}
      <div class="row"><button class="btn sm primary" data-act="pvTake">${__h('Take this view')}</button><button class="btn sm" data-act="pvTakePage">${__h('Whole page')}</button><span class="spacer"></span><button class="btn sm ghost" data-act="pvModeView">${__h('Cancel')}</button></div></div>`;
  } else {
    const pt = m.sel ? byId(p, m.sel) : null;
    if (pt) {
      const st = pinState(p, pt); const q1 = ptQ(p, pt, 'eerste'), q2 = ptQ(p, pt, 'controle'), qd = designOf(p, pt);
      html = `<div class="stack-s"><div class="pv-pt"><span class="pin-dot" style="--c:${PIN_COL[st]}"></span><b class="mono">${esc(pt.code || '?')}</b><span class="small muted">${esc([pt.room, sysOf(p, pt.systemId)?.code, pt.kind === 'terminal' ? L.ttype[pt.ttype] : hasReg(pt) ? L.reg[pt.reg.type] : ''].filter(Boolean).join(' · '))}</span></div>
        ${measurable(pt) ? `<div class="kv2 small"><span>${__h('Design')}</span><b>${fmt(qd)} ${__h('m³/h')}</b><span>${__h('Measure 1')}</span><b>${fmt(q1)}</b><span>${__h('Measure 2')}</span><b>${fmt(q2)}${isNum(ptDev(pt, p)) ? ` · ${(ptDev(pt, p) > 0 ? '+' : '') + fmt(ptDev(pt, p) * 100, 1)} %` : ''}</b></div>` : ''}
        <div class="row"><button class="btn sm primary" data-act="pvOpenPt" data-v="${pt.id}">${__h('Open the point')}</button>${canPin && !isCtx(p, pt) ? `<button class="btn sm" data-act="pvMovePin" data-v="${pt.id}">${__h('Move')}</button>` : ''}<button class="btn sm ghost" data-act="pvFragHere">${__h('Fragment')}</button></div></div>`;
    } else {
      const n = pagePins(p, m.doc, m.page).length; const noPin = p.points.filter(x => !x.pin && !isCtx(p, x)).length;
      html = `<div class="stack-s">
        <div class="row small"><span>${__h('Points on this page: {n}', { n })}</span><span class="spacer"></span><label class="check" for="pvShow"><input id="pvShow" type="checkbox" data-pvshow${m.showPins ? ' checked' : ''}><span>${__h('Show the points')}</span></label></div>
        <div class="pv-legend small">${Object.entries({ ok: __('within tolerance'), nok: __('outside tolerance'), m1: __('measurement 1 only'), none: __('not measured') }).map(([k, t]) => `<span><i class="pin-dot" style="--c:${PIN_COL[k]}"></i>${esc(t)}</span>`).join('')}</div>
        <div class="row">${canPin && noPin ? `<button class="btn sm" data-act="pvPlace">${__h('Place points')} <span class="chip">${noPin}</span></button>` : ''}<button class="btn sm" data-act="pvFragHere">${__h('Fragment for the report')}</button></div>
        ${pvZonesHTML(m, d)}
        ${Access.can('project.info') && !m.zone ? `<div class="stack-s pv-view"><span class="label">${__h('Page view')}</span>
          <div class="row"><button class="btn sm" data-act="pvRot">↻ 90°</button><button class="btn sm" data-act="pvZone">${__h('Show only this part')}</button>${m.view && m.view.crop ? `<button class="btn sm ghost" data-act="pvZoneClear">${__h('Whole page')}</button>` : ''}</div>
          <span class="small muted">${__h('Turn the plan and keep only the zone of the works: zoom to it and tap «Show only this part». The points keep their place; the report and the crew packages show the same view.')}</span></div>` : ''}
        ${Access.can('project.info') && !m.zone ? `<label class="field" for="pvTitle">${lbl(__('Page caption'))}<input id="pvTitle" type="text" data-pvtitle value="${esc(pageTitle(d, m.page))}" placeholder="Verdieping 1"></label>` : ''}
        <span class="small muted">${__h('Tap a point to see its measurements.')}</span></div>`;
    }
  }
  el.innerHTML = html;
}
/** snapshots of the page (0.9.19): LG1, LG2 … — each its own turn and part of the page, its own plan in the report */
function pvZonesHTML(m, d) {
  const zs = pageZones(d, m.page); const can = Access.can('project.info'); if (!zs.length && !can) return '';
  const z = zoneById(d, m.zone);
  return `<div class="stack-s pv-zones"><span class="label">${__h('Snapshots of the plan')}</span>
    <div class="row pv-zchips"><button class="btn sm${m.zone ? '' : ' primary'}" data-act="pvZoneSel" data-v="">${__h('Whole page')}</button>${zs.map(x => `<button class="btn sm${x.id === m.zone ? ' primary' : ''}" data-act="pvZoneSel" data-v="${x.id}">${esc(x.name || '?')}</button>`).join('')}${can ? `<button class="btn sm ghost" data-act="pvZoneNew">+ ${__h('New snapshot')}</button>` : ''}</div>
    ${z && can ? `<div class="row"><label class="field" for="pvZName" style="flex:1 1 120px">${lbl(__('Name of the snapshot'))}<input id="pvZName" type="text" data-pvzname value="${esc(z.name || '')}" placeholder="LG1"></label></div>
      <div class="row"><button class="btn sm" data-act="pvRot">↻ 90°</button><button class="btn sm" data-act="pvZone">${__h('Frame = this view')}</button>${S.confirm === 'pvZoneDel:' + z.id ? `<button class="btn sm danger" data-act="pvZoneDel" data-v="${z.id}">${__h('Delete')}</button><button class="btn sm" data-act="pvZoneDelNo">${__h('Cancel')}</button>` : `<button class="btn sm ghost" data-act="pvZoneDelAsk" data-v="${z.id}">${__h('Delete the snapshot')}</button>`}</div>` : ''}
    <span class="small muted">${zs.length ? __h('Points placed in a snapshot belong to it. The report shows every snapshot as its own plan with its points.') : __h('Several zones on one plan (LG1, LG2 …): zoom to a zone and tap «New snapshot». Each snapshot has its own turn and frame, and its own plan in the report.')}</span></div>`;
}
function pvOverlay(g, st, m) {
  if (!m.showPins && m.mode === 'view') return; const p = cur();
  const pins = pagePins(p, m.doc, m.page); const map = (x, y) => { const b = pvToB(m, x, y); return st.toScreen(b[0], b[1]); };
  const cpt = pvCurPt(m); const dpr = st.dpr;
  drawPins(g, pins, map, 1, { r: 5.5 * dpr, fs: 12 * dpr, sel: m.sel || (cpt && cpt.id), declutter: true });
  pvMask(g, st, m);
  if (m.frag || m.mode === 'frag') { g.save(); g.strokeStyle = '#FF6A13'; g.lineWidth = 3 * dpr; g.setLineDash([10 * dpr, 6 * dpr]); g.strokeRect(6 * dpr, 6 * dpr, st.W - 12 * dpr, st.H - 12 * dpr); g.restore(); }
}
/** the part of the page outside the visible part: covered (0.9.18) */
function pvMask(g, st, m) {
  const c = m.view && m.view.crop; if (!c) return;
  const [a, b] = st.toScreen(c[0] * st.bw, c[1] * st.bh), [e, f] = st.toScreen((c[0] + c[2]) * st.bw, (c[1] + c[3]) * st.bh);
  g.save(); g.fillStyle = st.o.bg || '#3A4248';
  g.fillRect(0, 0, st.W, Math.max(0, b)); g.fillRect(0, f, st.W, Math.max(0, st.H - f)); g.fillRect(0, b, Math.max(0, a), f - b); g.fillRect(e, b, Math.max(0, st.W - e), f - b);
  g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 1.5 * st.dpr; g.strokeRect(a, b, e - a, f - b); g.restore();
}
function pvHit(m, s) {
  const st = m.stage; const p = cur(); let best = null, bd = 22 * st.dpr;
  for (const q of pagePins(p, m.doc, m.page)) { const bq = pvToB(m, q.x, q.y); if (!pvInView(m, bq[0], bq[1])) continue; const [x, y] = st.toScreen(bq[0], bq[1]); const dd = Math.hypot(x - s[0], y - s[1]); if (dd < bd) { bd = dd; best = q; } }
  return best;
}
function pvDown() { return 'pan'; }
function pvMove() { }
function pvUp() { }
function pvTap(m, b, s) {
  const p = cur(); const st = m.stage; const [x, y] = pvToO(m, b[0], b[1]);
  if (m.mode === 'place') {
    const pt = pvCurPt(m); if (!pt || x < 0 || y < 0 || x > 1 || y > 1 || !pvInView(m, b[0], b[1])) return;
    m.placed.push({ id: pt.id, old: pt.pin ? clone(pt.pin) : null });
    setPin(p, pt, Object.assign({ doc: m.doc, page: m.page, x: Math.round(x * 1e5) / 1e5, y: Math.round(y * 1e5) / 1e5 }, m.zone ? { zone: m.zone } : {}));
    m.qi++; if (m.qi >= m.queue.length) { if (m.queue.length === 1) { m.mode = 'view'; m.sel = pt.id; toast(__('Placed on the plan: {c}', { c: pt.code || '?' })); } }
    st.draw(); pvPanel(); return;
  }
  if (m.mode === 'frag') return;
  const hit = pvHit(m, s); m.sel = hit ? hit.id : null; st.draw(); pvPanel();
}
function setPin(p, pt, pin) { if (pin) pt.pin = pin; else delete pt.pin; if (typeof stampPt === 'function') stampPt(p, pt, 'pin'); touch(p); }
/** start a fragment from the visible part of the plan (or the whole page) */
function pvTake(m, whole) {
  const p = cur(); const d = docById(p, m.doc); const r = docCur(d); const st = m.stage;
  const lim = (m.view && m.view.crop) || [0, 0, 1, 1];
  let v = whole ? lim : st.viewRect(); const x0 = Math.max(lim[0], clamp01(v[0])), y0 = Math.max(lim[1], clamp01(v[1])), x1 = Math.min(lim[0] + lim[2], clamp01(v[0] + v[2])), y1 = Math.min(lim[1] + lim[3], clamp01(v[1] + v[3])); v = [x0, y0, Math.max(0.01, x1 - x0), Math.max(0.01, y1 - y0)];
  const owner = m.owner || 'page:' + PAGE_KEYS[S.step];
  const file = r.kind === 'img' ? (r.imgs || {})[m.page] || r.file : r.file;
  const ph = { id: '', caption: '', w: 0, h: 0, mime: 'image/jpeg', ts: Date.now(), assetId: '', url: '', src: { doc: d.id, file, page: m.page }, edit: Object.assign(EDIT0(), { rot: (m.view && m.view.rot) || 0, crop: v, pins: pagePins(p, d.id, m.page).length > 0 }), layout: 'full' };
  const inside = pagePins(p, d.id, m.page).filter(q => { const b = pvToB(m, q.x, q.y); const x = b[0] / st.bw, y = b[1] / st.bh; return x >= v[0] && x <= v[0] + v[2] && y >= v[1] && y <= v[1] + v[3]; }).map(q => 'pt:' + q.id).filter(ow => ow !== owner);
  if (inside.length && owner.startsWith('pt:')) ph.also = inside.slice(0, 40);
  openImageEditor({ p, mode: 'frag', ph, owner, isNew: true, tab: 'marks', sub: docLabel(d, m.page) });
}

/* ---------- events ---------- */
document.addEventListener('click', async (ev) => {
  const t = ev.target.closest('[data-act]'); if (!t) return; const a = t.dataset.act; const v = t.dataset.v; const p = cur();
  const pvActs = ['pvOpen', 'pvOpenZone', 'pvPlace', 'pvPlaceOne', 'pvShowPin', 'pvFrag', 'pinDel', 'docAskDel', 'docDel', 'docMoveRev', 'phEdit', 'phPlan'];
  const m = S.mod && S.mod.type === 'plan' ? S.mod : null;
  if (!pvActs.includes(a) && !(m && /^pv/.test(a))) return;
  if (!p || (ACT_PERM[a] && !Access.can(ACT_PERM[a]))) return; // ui.js tells why
  switch (a) {
    case 'pvOpen': openPlan({ doc: v }); break;
    case 'pvPlace': {
      const ids = sortPoints(p, filtered(p, p.points, false)).filter(x => !x.pin && !isCtx(p, x)).map(x => x.id);
      const all = ids.length ? ids : sortPoints(p, p.points).filter(x => !x.pin && !isCtx(p, x)).map(x => x.id);
      if (!all.length) { toast(__('All points have a place on the plan')); if (!m) openPlan({}); break; }
      if (m) { m.mode = 'place'; m.queue = all; m.qi = 0; m.placed = []; m.sel = null; m.stage.draw(); pvPanel(); } else openPlan({ mode: 'place', queue: all });
      break;
    }
    case 'pvPlaceOne': case 'pvMovePin': {
      const pt = byId(p, v); if (!pt) break;
      if (m) { m.mode = 'place'; m.queue = [pt.id]; m.qi = 0; m.placed = []; m.sel = null; m.stage.draw(); pvPanel(); } else openPlan({ mode: 'place', queue: [pt.id], focus: pt.id, pt: pt.id });
      break;
    }
    case 'pvShowPin': { const pt = byId(p, v); if (pt && pt.pin) openPlan({ doc: pt.pin.doc, page: pt.pin.page, zone: pt.pin.zone || '', sel: pt.id, focus: pt.id }); break; }
    case 'pvOpenZone': { const d = docById(p, v); const z = d && zoneById(d, t.dataset.zone); if (z) openPlan({ doc: d.id, page: z.page, zone: z.id }); break; }
    case 'pvFrag': openPlan({ mode: 'frag', owner: t.dataset.owner || '' }); break;
    case 'pinDel': { const pt = byId(p, v); if (pt) { setPin(p, pt, null); refreshOwner(); toast(__('Removed from the plan')); } break; }
    case 'docAskDel': S.confirm = 'docDel:' + v; render(); break;
    case 'docDel': {
      const d = docById(p, v); if (!d) break; const u = docUsage(p, d.id);
      for (const x of u.frags) { delete x.ph.src; if (x.ph.edit) x.ph.edit.pins = false; } // the rendered picture stays as a plain image
      for (const pt of u.pins) setPin(p, pt, null);
      p.docs = p.docs.filter(x => x !== d); S.confirm = null; touch(p);
      for (const r of d.revs) await Docs.release(r); render(); toast(__('Plan deleted')); break;
    }
    case 'docMoveRev': {
      const d = docById(p, v); if (!d) break; const r = docCur(d); const list = docUsage(p, d.id).frags.filter(x => x.ph.src.file && revOf(d, x.ph.src.file) !== r);
      t.disabled = true; let n = 0; const olds = new Set(list.map(x => revOf(d, x.ph.src.file)));
      for (const x of list) {
        const ph = x.ph; const file = r.kind === 'img' ? (r.imgs || {})[ph.src.page] || r.file : r.file; if (!r.pages.includes(Number(ph.src.page))) continue;
        ph.src.file = file;
        try { const c = x.cover ? await renderEdit(await photoSource(p, ph), ph.edit, { outMax: COVER_SLOTS[Number(x.owner.split(':')[1])].out[0], upscale: true }) : await renderPhoto(p, ph); const b = await canvasBlob(c, 'image/jpeg', 0.9); const nr = await Photos.addBlob(b, { w: c.width, h: c.height, mime: 'image/jpeg' });
          const tgt = x.cover ? ph.photo : ph; const old = { id: tgt.id, assetId: tgt.assetId, url: tgt.url }; Object.assign(tgt, { id: nr.id, w: nr.w, h: nr.h, mime: nr.mime, assetId: nr.assetId, url: nr.url }); Photos.remove(old); n++; } catch (e) { console.error(e); }
      }
      touch(p); for (const o of olds) if (!docUsage(p, d.id).frags.some(x => revOf(d, x.ph.src.file) === o)) { /* the old revision stays in the list: it is the history of the plan */ }
      render(); toast(__('Fragments moved to rev. {r}: {n}', { r: r.rev, n })); break;
    }
    case 'phEdit': case 'phPlan': {
      if (!S.pv) break; const list = photoList(p, S.pv.owner, false); const ph = list.find(x => x.id === S.pv.id); if (!ph) break; const owner = S.pv.owner;
      const go = () => {
        if (a === 'phPlan' && ph.src) { const d = docById(p, ph.src.doc); if (!d) { toast(__('The plan of this fragment is not in the project any more')); return; } openPlan({ doc: d.id, page: ph.src.page, frag: { view: ph.edit && ph.edit.crop, rot: (ph.edit && ph.edit.rot) || 0 } }); return; }
        if (!Access.can('measure.edit')) { toast(Access.why('measure.edit')); return; }
        openImageEditor({ p, mode: ph.src ? 'frag' : 'photo', ph, owner, tab: 'crop', sub: ph.src ? docLabel(docById(p, ph.src.doc), ph.src.page) : '' });
      };
      if (STANDALONE && history.state && history.state.inregelaar) { history.back(); setTimeout(go, 90); } else { S.pv = null; renderViewer(); go(); }
      break;
    }
    // inside the viewer
    case 'pvClose': modalExit(); break;
    case 'pvPage': { const r = pvRev(m); const i = r.pages.indexOf(m.page) + Number(v); if (r.pages[i]) { m.page = r.pages[i]; m.sel = null; renderPlanViewer(); } break; }
    case 'pvZoom': { const st = m.stage; st.zoomAt(st.W / 2, st.H / 2, Number(v) > 0 ? 1.6 : 1 / 1.6); break; }
    case 'pvFit': m.stage.fitRect((m.view && m.view.crop) || [0, 0, 1, 1], 0.03); m.stage.sharp = null; m.stage.draw(); m.stage.refine(); break;
    case 'pvSkip': m.qi = Math.min(m.queue.length, m.qi + 1); m.stage.draw(); pvPanel(); break;
    case 'pvUndoPin': { const u = m.placed.pop(); if (u) { const pt = byId(p, u.id); if (pt) setPin(p, pt, u.old); m.qi = Math.max(0, m.queue.indexOf(u.id)); m.stage.draw(); pvPanel(); } break; }
    case 'pvStop': { const placed = m.placed.length; m.mode = 'view'; m.queue = []; m.placed = []; m.stage.draw(); pvPanel(); if (placed) toast(__('Points placed: {n}', { n: placed })); if (m.backTo === 'close') modalExit(); break; }
    case 'pvOpenPt': { const id = v; modalExit(); setTimeout(() => { const x = byId(p, id); if (x && !isCtx(p, x)) openEditor(id, MEASURE_STEPS[S.step] && measurable(x) ? MEASURE_STEPS[S.step] : 'setup'); }, 90); break; }
    case 'pvFragHere': m.mode = 'frag'; m.sel = null; if (!m.owner && S.ed) m.owner = 'pt:' + S.ed.id; m.stage.draw(); pvPanel(); break;
    case 'pvModeView': m.mode = 'view'; m.stage.draw(); pvPanel(); break;
    case 'pvTake': pvTake(m, false); break;
    case 'pvRot': case 'pvZone': case 'pvZoneClear': case 'pvZoneNew': {
      if (!Access.can('project.info')) { toast(Access.why('project.info')); break; }
      const d = docById(p, m.doc); if (!d) break; const v = viewOf(d, m.page, m.zone);
      const set = (nv) => m.zone && a !== 'pvZoneNew' ? setZoneView(d, m.zone, nv) : setPageView(d, m.page, nv);
      const vr = () => { const r = m.stage.viewRect(); const x0 = clamp01(r[0]), y0 = clamp01(r[1]), x1 = clamp01(r[0] + r[2]), y1 = clamp01(r[1] + r[3]);
        if (x1 - x0 < 0.02 || y1 - y0 < 0.02) return false; return x0 <= 0.001 && y0 <= 0.001 && x1 >= 0.999 && y1 >= 0.999 ? null : [x0, y0, x1 - x0, y1 - y0]; };
      if (a === 'pvRot') { const nr = (v.rot + 1) % 4; set({ rot: nr, crop: v.crop ? rectToRotation(m.src, v.rot, nr, v.crop) : null }); }
      else if (a === 'pvZoneClear') set({ rot: v.rot, crop: null });
      else if (a === 'pvZoneNew') { // 0.9.19: a snapshot of what is on the screen now
        const c = vr(); if (c === false) { toast(__('Zoom to the zone of the works first')); break; }
        const zs = pageZones(d, m.page); const used = new Set((d.zones || []).map(z => z.name)); let n = zs.length + 1; while (used.has('LG' + n)) n++;
        const z = { id: uid(), page: m.page, name: 'LG' + n, rot: v.rot, crop: c || v.crop || null };
        d.zones = (d.zones || []).concat([z]); m.zone = z.id; toast(__('Snapshot {n} added — rename it if needed', { n: z.name }));
      }
      else { const c = vr(); if (c === false) { toast(__('Zoom to the zone of the works first')); break; } set({ rot: v.rot, crop: c }); }
      touch(p); pinPrevCache.clear(); m.sel = null; renderPlanViewer(); break;
    }
    case 'pvZoneSel': m.zone = v || ''; m.sel = null; S.confirm = null; renderPlanViewer(); break;
    case 'pvZoneDelAsk': S.confirm = 'pvZoneDel:' + v; pvPanel(); break;
    case 'pvZoneDelNo': S.confirm = null; pvPanel(); break;
    case 'pvZoneDel': {
      if (!Access.can('project.info')) { toast(Access.why('project.info')); break; }
      const d = docById(p, m.doc); if (!d || !Array.isArray(d.zones)) break; const z = zoneById(d, v); if (!z) break;
      d.zones = d.zones.filter(x => x.id !== v); if (!d.zones.length) delete d.zones; S.confirm = null; m.zone = '';
      touch(p); pinPrevCache.clear(); toast(__('Snapshot {n} deleted — its points stay on the plan', { n: z.name || '?' })); renderPlanViewer(); break;
    }
    case 'pvTakePage': pvTake(m, true); break;
  }
});
document.addEventListener('change', async (ev) => {
  const el = ev.target; const p = cur(); if (!p) return;
  if (el.dataset.docadd !== undefined) {
    const files = [...(el.files || [])]; el.value = ''; if (!files.length) return; let n = 0, same = 0;
    toast(__('Saving the plan…'));
    for (const f of files) { try { const r = await Docs.add(p, f); if (r.existed) same++; else n++; } catch (e) { console.error(e); toast(e && e.code === 'storage' ? __('Device storage is full') : e && e.code === 'heic' ? __('HEIC is not supported — use JPEG or PNG') : __('Could not read the file')); } }
    if (n || same) { touch(p); render(); toast(same && !n ? __('This plan is already in the project') : __('Plans added: {n}', { n })); }
    return;
  }
  if (el.dataset.docrev !== undefined) {
    const d = docById(p, el.dataset.docrev); const f = el.files && el.files[0]; el.value = ''; if (!d || !f) return;
    try { toast(__('Saving the plan…')); const r = await Docs.addRev(p, d, f); if (r.same) { toast(__('This file is already the current revision')); return; } touch(p); pinPrevCache.clear(); render(); toast(__('New revision {r} — points stay on their place; fragments can be moved to it', { r: r.rev.rev })); }
    catch (e) { console.error(e); toast(__('Could not read the file')); }
    return;
  }
  const m = S.mod && S.mod.type === 'plan' ? S.mod : null; if (!m) return;
  if (el.dataset.pvdoc !== undefined) { const d = docById(p, el.value); if (d) { m.doc = d.id; m.page = docCur(d).pages[0]; m.zone = ''; m.sel = null; m.frag = null; renderPlanViewer(); } }
  if (el.dataset.pvpage !== undefined) { m.page = Number(el.value); m.zone = ''; m.sel = null; m.frag = null; renderPlanViewer(); }
  if (el.dataset.pvzone !== undefined) { m.zone = el.value || ''; m.sel = null; m.frag = null; renderPlanViewer(); }
  if (el.dataset.pvshow !== undefined) { m.showPins = el.checked; m.stage.draw(); }
});
document.addEventListener('input', (ev) => {
  const el = ev.target; const p = cur(); if (!p) return;
  if (el.dataset.docname !== undefined) { const d = docById(p, el.dataset.docname); if (d) { d.name = el.value; touch(p); } return; }
  if (el.dataset.pvzname !== undefined && S.mod && S.mod.type === 'plan') { const d = docById(p, S.mod.doc); const z = d && zoneById(d, S.mod.zone); if (z) { z.name = el.value.trim() ? el.value : z.name; touch(p); const o = document.querySelector('[data-pvzone] option[value="' + z.id + '"]'); if (o) o.textContent = z.name; document.querySelectorAll('[data-act=pvZoneSel][data-v="' + z.id + '"]').forEach(b => { b.textContent = z.name; }); } }
  if (el.dataset.pvtitle !== undefined && S.mod && S.mod.type === 'plan') { const d = docById(p, S.mod.doc); if (d) { d.titles = d.titles || {}; if (el.value.trim()) d.titles[S.mod.page] = el.value; else delete d.titles[S.mod.page]; touch(p); } }
});

/* ---------- example plan: a drawn floor plan with the points of the example project on it ---------- */
async function addExamplePlan(p) {
  try {
    const W = 2800, H = 1900; const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
    g.fillStyle = '#fff'; g.fillRect(0, 0, W, H); g.strokeStyle = '#1C2430'; g.fillStyle = '#1C2430'; g.lineCap = 'square';
    g.font = '600 38px Inter, Arial, sans-serif'; g.fillText(p.info.name || 'Voorbeeldplan', 70, 80);
    g.font = '24px Inter, Arial, sans-serif'; g.fillStyle = '#5A6872'; g.fillText('Ventilatieplan VB-01 · verdieping 1 · schaal 1:100 (voorbeeld)', 70, 118);
    const rooms = []; const by = new Map();
    for (const pt of sortPoints(p, p.points)) { const k = String(pt.room || '').trim() || '—'; if (!by.has(k)) { by.set(k, []); rooms.push(k); } by.get(k).push(pt); }
    const cols = Math.min(4, Math.max(2, Math.ceil(Math.sqrt(rooms.length)))); const rows = Math.ceil(rooms.length / cols);
    const X0 = 70, Y0 = 170, CW = (W - 140) / cols, RH = (H - 300) / Math.max(1, rows), corr = 70;
    g.lineWidth = 9; g.strokeRect(X0, Y0, W - 140, rows * RH);
    const pos = new Map();
    rooms.forEach((name, i) => {
      const cx = i % cols, cy = Math.floor(i / cols); const x = X0 + cx * CW, y = Y0 + cy * RH;
      g.lineWidth = 6; g.strokeStyle = '#1C2430'; g.strokeRect(x, y, CW, RH - corr);
      g.fillStyle = '#1C2430'; g.font = '600 27px Inter, Arial, sans-serif'; g.fillText(name.slice(0, 34), x + 22, y + 44);
      const list = by.get(name); const n = list.length; const per = Math.min(4, n); const lines = Math.ceil(n / per);
      list.forEach((pt, j) => {
        const col = j % per, ln = Math.floor(j / per); const gx = x + CW * (col + 1) / (per + 1), gy = y + 90 + (RH - corr - 130) * (ln + 1) / (lines + 1);
        g.lineWidth = 3; g.strokeStyle = '#1C2430';
        if (pt.kind === 'terminal') { g.strokeRect(gx - 22, gy - 22, 44, 44); g.beginPath(); g.moveTo(gx - 22, gy - 22); g.lineTo(gx + 22, gy + 22); g.moveTo(gx + 22, gy - 22); g.lineTo(gx - 22, gy + 22); g.stroke(); }
        else { g.beginPath(); g.arc(gx, gy, 20, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.moveTo(gx - 20, gy); g.lineTo(gx + 20, gy); g.stroke(); }
        g.strokeStyle = pt.dir === 'A' ? '#C98A1E' : '#2F6DB5'; g.lineWidth = 2; g.beginPath(); g.moveTo(gx, gy + 22); g.lineTo(gx, y + RH - corr / 2 - (pt.dir === 'A' ? 12 : -12)); g.stroke();
        g.fillStyle = '#5A6872'; g.font = '17px Inter, Arial, sans-serif'; g.fillText([pt.size, isNum(pt.designQ) ? Math.round(pt.designQ) + ' m³/h' : ''].filter(Boolean).join(' · '), gx - 40, gy + 50);
        pos.set(pt.id, [gx / W, (gy - 34) / H]);
      });
      // supply and extract ducts in the corridor
      g.lineWidth = 10; g.strokeStyle = '#2F6DB5'; g.beginPath(); g.moveTo(x + 10, y + RH - corr / 2 + 12); g.lineTo(x + CW - 10, y + RH - corr / 2 + 12); g.stroke();
      g.strokeStyle = '#C98A1E'; g.beginPath(); g.moveTo(x + 10, y + RH - corr / 2 - 12); g.lineTo(x + CW - 10, y + RH - corr / 2 - 12); g.stroke();
    });
    g.fillStyle = '#5A6872'; g.font = '20px Inter, Arial, sans-serif'; g.fillText('blauw = pulsie · oranje = extractie', W - 520, H - 60);
    const blob = await canvasBlob(c, 'image/png'); const file = new File([blob], 'Voorbeeldplan.png', { type: 'image/png' });
    const { d } = await Docs.add(p, file, 'Voorbeeldplan VB-01'); d.titles = { 1: 'Verdieping 1' };
    for (const pt of p.points) { const q = pos.get(pt.id); if (q) pt.pin = { doc: d.id, page: 1, x: Math.round(q[0] * 1e4) / 1e4, y: Math.round(q[1] * 1e4) / 1e4 }; }
    touch(p); return d;
  } catch (e) { console.warn('example plan', e); return null; }
}
