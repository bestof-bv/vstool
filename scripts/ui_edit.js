/* ---------- stage: a zoomable picture on a canvas (image editor and plan viewer) ----------
   Works in device pixels. The base is the source rotated by the edit; z = device px per base px. A low-resolution copy of the
   whole base is drawn while moving; after a pause the visible part is rendered sharp (PDF plans stay readable when zoomed). */
class Stage {
  constructor(cv, o = {}) {
    this.cv = cv; this.g = cv.getContext('2d'); this.o = o; this.pts = new Map(); this.z = 1; this.cx = 0; this.cy = 0; this.low = null; this.sharp = null; this.dead = false;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    cv.onpointerdown = (e) => this.down(e); cv.onpointermove = (e) => this.move(e); cv.onpointerup = cv.onpointercancel = (e) => this.up(e);
    cv.onwheel = (e) => { e.preventDefault(); const [x, y] = this.dev(e); this.zoomAt(x, y, e.deltaY < 0 ? 1.12 : 1 / 1.12); };
    cv.oncontextmenu = (e) => e.preventDefault();
    this.resize();
    this.ro = new ResizeObserver(() => {
      const r = cv.getBoundingClientRect(); if (Math.round(r.width * this.dpr) === this.W && Math.round(r.height * this.dpr) === this.H) return;
      const keep = this.bw ? this.viewRect() : null; this.resize(); if (keep) this.fitRect(keep, 0); this.draw(); this.refine();
    }); this.ro.observe(cv);
  }
  destroy() { this.dead = true; try { this.ro.disconnect(); } catch (e) { } clearTimeout(this._rt); }
  resize() { const r = this.cv.getBoundingClientRect(); this.cv.width = Math.max(1, Math.round(r.width * this.dpr)); this.cv.height = Math.max(1, Math.round(r.height * this.dpr)); this.W = this.cv.width; this.H = this.cv.height; }
  dev(e) { const r = this.cv.getBoundingClientRect(); return [(e.clientX - r.left) * this.dpr, (e.clientY - r.top) * this.dpr]; }
  async setSource(src, rot) {
    this.src = src; this.rot = Object.assign({ rot: 0, fine: 0 }, rot || {}); this.G = geo(src.w, src.h, editAngle(this.rot)); this.bw = this.G.bw; this.bh = this.G.bh;
    this.sharp = null; this.low = null; const tok = this.tok = {};
    const low = await renderEdit(src, { rot: this.rot.rot, fine: this.rot.fine }, { outMax: 2048, noMarks: true, upscale: true });
    if (this.tok !== tok || this.dead) return; this.low = low; this.lowS = low.width / this.bw; this.draw(); this.refine();
  }
  fitRect(r, pad = 0.04) { const w = Math.max(1e-6, r[2] * this.bw), h = Math.max(1e-6, r[3] * this.bh); this.z = Math.min(this.W / w, this.H / h) * (1 - pad); this.cx = (r[0] + r[2] / 2) * this.bw; this.cy = (r[1] + r[3] / 2) * this.bh; this.limits(); }
  limits() { const zf = Math.min(this.W / this.bw, this.H / this.bh); this.z = Math.min(Math.max(this.z, zf * 0.3), zf * (this.src && this.src.vector ? 60 : 16)); }
  toScreen(bx, by) { return [(bx - this.cx) * this.z + this.W / 2, (by - this.cy) * this.z + this.H / 2]; }
  toBase(sx, sy) { return [(sx - this.W / 2) / this.z + this.cx, (sy - this.H / 2) / this.z + this.cy]; }
  /** visible part of the base, 0…1 */
  viewRect() { const [x0, y0] = this.toBase(0, 0), [x1, y1] = this.toBase(this.W, this.H); return [x0 / this.bw, y0 / this.bh, (x1 - x0) / this.bw, (y1 - y0) / this.bh]; }
  /** base 0…1 → device px, and the unit of the marks (from the crop) on screen */
  mapN() { return (x, y) => this.toScreen(x * this.bw, y * this.bh); }
  draw() {
    if (this.dead) return; const g = this.g; g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = this.o.bg || '#2B3238'; g.fillRect(0, 0, this.W, this.H);
    if (this.low) {
      g.save(); g.imageSmoothingQuality = 'high'; g.translate(this.W / 2 - this.cx * this.z, this.H / 2 - this.cy * this.z); g.scale(this.z / this.lowS, this.z / this.lowS); g.drawImage(this.low, 0, 0); g.restore();
      const sh = this.sharp; if (sh) { const [a, b] = this.toScreen(sh.x, sh.y); g.drawImage(sh.c, a, b, sh.w * this.z, sh.h * this.z); }
    }
    if (this.o.overlay) this.o.overlay(g, this);
  }
  refine() {
    clearTimeout(this._rt); if (!this.src || !this.low) return;
    this._rt = setTimeout(async () => {
      if (this.dead || this.pts.size) return;
      if (this.z <= this.lowS * 1.15) { this.sharp = null; return; }
      const v = this.viewRect(); const r = [clamp01(v[0]), clamp01(v[1])]; r.push(clamp01(v[0] + v[2]) - r[0], clamp01(v[1] + v[3]) - r[1]); if (r[2] <= 0 || r[3] <= 0) return;
      const key = [this.z, this.cx, this.cy].join('|'); const tok = this.tok;
      try {
        const c = await renderEdit(this.src, { rot: this.rot.rot, fine: this.rot.fine }, { view: r, scale: this.z, noMarks: true, limit: 4096, upscale: true });
        if (this.dead || tok !== this.tok || key !== [this.z, this.cx, this.cy].join('|')) return;
        this.sharp = { c, x: r[0] * this.bw, y: r[1] * this.bh, w: r[2] * this.bw, h: r[3] * this.bh }; this.draw();
      } catch (e) { console.warn(e); }
    }, 220);
  }
  zoomAt(x, y, f) { const [bx, by] = this.toBase(x, y); this.z *= f; this.limits(); this.cx = bx - (x - this.W / 2) / this.z; this.cy = by - (y - this.H / 2) / this.z; this.sharp = null; this.draw(); this.refine(); }
  down(e) {
    this.cv.setPointerCapture(e.pointerId); const p = this.dev(e); this.pts.set(e.pointerId, p);
    if (this.pts.size === 2) { if (this.act && this.o.cancel) this.o.cancel(); this.act = null; const [a, b] = [...this.pts.values()]; this.pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), z: this.z, m: this.toBase((a[0] + b[0]) / 2, (a[1] + b[1]) / 2) }; return; }
    if (this.pts.size > 2) return;
    this.t0 = { x: p[0], y: p[1], at: Date.now(), moved: false };
    const r = this.o.down ? this.o.down(this.toBase(p[0], p[1]), p, e) : 'pan';
    this.act = r === 'pan' || !r ? { pan: p } : { tool: true };
  }
  move(e) {
    if (!this.pts.has(e.pointerId)) return; const p = this.dev(e); this.pts.set(e.pointerId, p);
    if (this.pts.size >= 2 && this.pinch) {
      const [a, b] = [...this.pts.values()]; const d = Math.hypot(a[0] - b[0], a[1] - b[1]); const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
      this.z = this.pinch.z * d / Math.max(1, this.pinch.d); this.limits(); this.cx = this.pinch.m[0] - (mx - this.W / 2) / this.z; this.cy = this.pinch.m[1] - (my - this.H / 2) / this.z; this.sharp = null; this.draw(); return;
    }
    if (this.t0 && Math.hypot(p[0] - this.t0.x, p[1] - this.t0.y) > 6 * this.dpr) this.t0.moved = true;
    if (!this.act) return;
    if (this.act.pan) { const q = this.act.pan; this.cx -= (p[0] - q[0]) / this.z; this.cy -= (p[1] - q[1]) / this.z; this.act.pan = p; this.sharp = null; this.draw(); return; }
    if (this.o.move) this.o.move(this.toBase(p[0], p[1]), p, e);
  }
  up(e) {
    if (!this.pts.has(e.pointerId)) return; const p = this.pts.get(e.pointerId); this.pts.delete(e.pointerId);
    if (this.pts.size < 2) this.pinch = null;
    if (this.pts.size) { if (this.pts.size === 1) { this.act = { pan: [...this.pts.values()][0] }; } return; }
    const a = this.act; this.act = null;
    if (a && a.tool && this.o.up) this.o.up(this.toBase(p[0], p[1]), p, e);
    else if (a && a.pan && this.t0 && !this.t0.moved && this.o.tap) this.o.tap(this.toBase(p[0], p[1]), p, e);
    this.refine();
  }
}

/* ---------- image editor: crop, rotation, marks, report options ---------- */
const IE_TOOLS = [['select', '✋'], ['arrow', '↗'], ['rect', '▭'], ['ellipse', '◯'], ['line', '╱'], ['pen', '✎'], ['hl', '▬'], ['text', 'T'], ['num', '①'], ['blur', '▦']];
const IE_TOOL_NAME = { select: N_('Select and move'), arrow: N_('Arrow'), rect: N_('Rectangle'), ellipse: N_('Circle'), line: N_('Line'), pen: N_('Pen'), hl: N_('Highlighter'), text: N_('Text'), num: N_('Number'), blur: N_('Blur') };
const IE_LAYOUT = { half: N_('½ width'), full: N_('Full width'), page: N_('Own page'), land: N_('Own page, landscape') };
const IE_ASPECT = { free: N_('Free'), '4:3': '4:3', '3:2': '3:2', '16:9': '16:9', '1:1': '1:1', a4p: N_('A4 portrait'), a4l: N_('A4 landscape') };
/** open the editor. o: { p, mode: 'photo' | 'frag' | 'cover', ph (photo / fragment / cover item), owner, slot, isNew, tab, onDone } */
async function openImageEditor(o) {
  const p = o.p; const ph = o.ph; const e = Object.assign(EDIT0(), clone(ph.edit || {}));
  if (o.mode === 'cover') { const sl = COVER_SLOTS[o.slot]; e.aspect = 'cover'; e.ratio = sl.aspect; if (ph.crop && !ph.edit) e.crop = null; }
  const m = { type: 'edit', o, e, tab: o.tab || 'crop', tool: 'arrow', color: MARK_COLORS[0], w: 2, sel: null, undo: [], redo: [], busy: __('Opening…'),
    caption: ph.caption || '', layout: ph.layout || (o.mode === 'frag' ? 'full' : 'half'), also: (ph.also || []).slice(), q: '' };
  modalNav(m); if (S.mod && S.mod.stage) S.mod.stage.destroy(); S.mod = m;
  renderEditor();
  try {
    m.src = await photoSource(p, ph);
    if (o.mode === 'cover' && ph.crop && !ph.edit) e.crop = coverCropToRect(m.src, ph.crop, COVER_SLOTS[o.slot].aspect);
    if (!e.crop) e.crop = fitAspect([0, 0, 1, 1], m);
    m.busy = ''; renderEditor();
  } catch (err) { console.error(err); modalExit(); toast(err && err.code === 'missing' ? __('The original image is not available') : __('Could not open the image')); }
}
/** old cover crop (zoom + centre) → crop rectangle */
function coverCropToRect(src, c, aspect) {
  const iw = src.w, ih = src.h; const s = Math.max(aspect / iw, 1 / ih) * (c.z || 1); const w = aspect / (iw * s), h = 1 / (ih * s);
  return [clamp01((c.x ?? 0.5) - w / 2), clamp01((c.y ?? 0.5) - h / 2), Math.min(1, w), Math.min(1, h)];
}
/** ratio (base px) of the crop, 0 = free */
function ieRatio(m) { return m.e.aspect === 'cover' ? m.e.ratio : (ASPECTS[m.e.aspect] || 0); }
/** largest rectangle with the ratio inside r (0…1), centred */
function fitAspect(r, m) {
  const k = ieRatio(m); if (!k || !m.src) return r.slice();
  const G = geo(m.src.w, m.src.h, editAngle(m.e)); const W = r[2] * G.bw, H = r[3] * G.bh;
  let w = W, h = W / k; if (h > H) { h = H; w = H * k; }
  const cx = r[0] + r[2] / 2, cy = r[1] + r[3] / 2; return [cx - w / G.bw / 2, cy - h / G.bh / 2, w / G.bw, h / G.bh];
}
function ieSnap(m) { return JSON.stringify({ rot: m.e.rot, fine: m.e.fine, crop: m.e.crop, aspect: m.e.aspect, marks: m.e.marks, pins: m.e.pins }); }
function iePush(m) { m.undo.push(ieSnap(m)); if (m.undo.length > 80) m.undo.shift(); m.redo = []; }
function ieRestore(m, s) { const o = JSON.parse(s); const rotChanged = o.rot !== m.e.rot || o.fine !== m.e.fine; Object.assign(m.e, o); m.sel = null; if (rotChanged) m.stage.setSource(m.src, m.e); ieUpdate(); }

function renderEditor() {
  const m = S.mod; if (!m || m.type !== 'edit') return;
  const o = m.o; const isCover = o.mode === 'cover';
  const title = isCover ? __('Cover image') : o.mode === 'frag' ? __('Plan fragment') : __('Edit photo');
  modalEl.hidden = false;
  modalEl.innerHTML = `<div class="ied" role="dialog" aria-modal="true" aria-label="${esc(title)}">
    <div class="ied-top">
      <button class="iconbtn" data-act="ieCancel" aria-label="${__h('Cancel')}">${ICON.close}</button>
      <div class="ied-title"><b>${esc(title)}</b><span id="ieSub">${esc(o.sub || '')}</span></div>
      <button class="iconbtn" data-act="ieUndo" aria-label="${__h('Undo')}" title="${__h('Undo')}">↶</button>
      <button class="iconbtn" data-act="ieRedo" aria-label="${__h('Redo')}" title="${__h('Redo')}">↷</button>
      <button class="btn primary sm" data-act="ieDone"${m.busy ? ' disabled' : ''}>${__h('Done')}</button>
    </div>
    <div class="ied-main">
      <div class="ied-stage">${m.busy ? `<div class="ied-busy">${esc(m.busy)}</div>` : ''}<canvas id="ieCanvas"></canvas></div>
      <div class="ied-panel" id="iePanel"></div>
    </div>
  </div>`;
  const cv = document.getElementById('ieCanvas');
  if (m.stage) m.stage.destroy();
  m.stage = new Stage(cv, { bg: '#2B3238', overlay: (g, st) => ieOverlay(g, st, m), down: (b, s) => ieDown(m, b, s), move: (b, s) => ieMove(m, b, s), up: (b, s) => ieUp(m, b, s), cancel: () => ieCancelAct(m), tap: (b, s) => ieTap(m, b, s) });
  if (m.src && !m.busy) { m.stage.setSource(m.src, m.e).then(() => { m.stage.fitRect(m.tab === 'crop' ? [0, 0, 1, 1] : m.e.crop, m.tab === 'crop' ? 0.08 : 0.04); m.stage.draw(); }); }
  ieRenderPanel();
}
function ieRenderPanel() {
  const m = S.mod; const el = document.getElementById('iePanel'); if (!m || !el) return;
  const o = m.o, e = m.e; const isCover = o.mode === 'cover';
  const tabs = seg('ieTab', m.tab, isCover ? { crop: __('Crop'), marks: __('Marks'), info: __('Caption') } : { crop: __('Crop'), marks: __('Marks'), info: __('Report') });
  let body = '';
  if (m.tab === 'crop') {
    body = `${isCover ? `<p class="small muted" style="margin:0">${__h('The frame has the proportions of the cover slot.')}</p>` : `<div class="field"><span class="label">${__h('Proportions')}</span>${seg('ieAspect', e.aspect, Object.fromEntries(Object.entries(IE_ASPECT).map(([k, v]) => [k, __(v)])))}</div>`}
      <div class="row"><button class="btn sm" data-act="ieRot" data-v="-1">⟲ 90°</button><button class="btn sm" data-act="ieRot" data-v="1">⟳ 90°</button><span class="spacer"></span><button class="btn sm ghost" data-act="ieCropAll">${__h('Whole image')}</button></div>
      <label class="field" for="ieFine">${lbl(__('Straighten') + ` <b class="mono" id="ieFineV">${(e.fine > 0 ? '+' : '') + nl(e.fine, 1)}°</b>`)}<input id="ieFine" type="range" min="-10" max="10" step="0.5" value="${e.fine}" data-iefine></label>
      <p class="small muted" style="margin:0">${__h('Drag the corners or sides of the frame, move it with a finger inside. Two fingers zoom and move the image.')}</p>`;
  } else if (m.tab === 'marks') {
    const sel = m.sel; const st = sel || { c: m.color, w: m.w };
    body = `<div class="ie-tools" role="toolbar">${IE_TOOLS.map(([k, ic]) => `<button type="button" class="ie-tool${m.tool === k ? ' on' : ''}" data-act="ieTool" data-v="${k}" title="${__h(IE_TOOL_NAME[k])}" aria-label="${__h(IE_TOOL_NAME[k])}" aria-pressed="${m.tool === k}"><span>${ic}</span><em>${__h(IE_TOOL_NAME[k])}</em></button>`).join('')}</div>
      <div class="row ie-style"><div class="ie-colors">${MARK_COLORS.map(c => `<button type="button" class="ie-col${st.c === c ? ' on' : ''}" data-act="ieColor" data-v="${c}" style="--c:${c}" aria-label="${c}"></button>`).join('')}</div>
        ${seg('ieWidth', st.w || 2, { 1: 'S', 2: 'M', 3: 'L' })}</div>
      ${sel && (sel.t === 'text' || sel.t === 'num') ? `<label class="field" for="ieText">${lbl(sel.t === 'num' ? __('Text in the legend for {n}', { n: sel.n }) : __('Text'))}${sel.t === 'text' ? `<textarea id="ieText" data-ietext rows="2">${esc(sel.text || '')}</textarea>` : `<input id="ieText" type="text" data-ietext value="${esc(sel.text || '')}" placeholder="${__h('e.g. iris damper IR-T3.2, position 4.5')}">`}</label>` : ''}
      <div class="row">${sel ? `<button class="btn sm danger" data-act="ieDel">${__h('Delete mark')}</button>` : `<span class="small muted">${esc(ieHint(m.tool))}</span>`}<span class="spacer"></span>${e.marks.length ? `<span class="small muted">${e.marks.length} ${__h('marks')}</span>` : ''}</div>`;
  } else {
    const nums = e.marks.filter(x => x.t === 'num');
    const linkable = o.mode !== 'cover' && o.owner && !o.owner.startsWith('cover');
    body = `<label class="field" for="ieCap">${lbl(__('Caption'), 'bijschrift in het rapport')}<input id="ieCap" type="text" data-iecap value="${esc(m.caption)}" placeholder="${o.mode === 'frag' ? 'Gelijkvloers — zone C' : 'Typeplaatje toestel'}"></label>
      ${o.mode === 'cover' ? '' : `<div class="field"><span class="label">${__h('Size in the report')}</span>${seg('ieLayout', m.layout, Object.fromEntries(Object.entries(IE_LAYOUT).map(([k, v]) => [k, __(v)])))}</div>`}
      ${o.mode === 'frag' ? `<label class="check" for="iePins"><input id="iePins" type="checkbox" data-iepins${e.pins ? ' checked' : ''}><span>${__h('Show the points of the plan (pins) on the fragment')}</span></label>` : ''}
      ${nums.length ? `<div class="stack-s"><span class="label">${__h('Legend under the image')}</span>${nums.map(x => `<label class="ie-leg" for="ieLeg${x.n}"><b style="--c:${x.c}">${x.n}</b><input id="ieLeg${x.n}" type="text" data-ieleg="${e.marks.indexOf(x)}" value="${esc(x.text || '')}" placeholder="${__h('What the number shows')}"></label>`).join('')}</div>` : ''}
      ${linkable ? ieLinksHTML(m) : ''}
      ${hasEdit(e) || (o.ph.orig && !o.isNew) ? `<div class="row"><button class="btn sm ghost" data-act="ieReset">${__h('Back to the original')}</button></div>` : ''}`;
  }
  el.innerHTML = `<div class="stack-s">${tabs}${body}</div>`;
}
function ieHint(tool) {
  return { select: __('Tap a mark to select it; drag to move it or its ends.'), text: __('Tap where the text goes, then type it below.'), num: __('Tap to place the next number; describe it in the legend.'), blur: __('Drag over faces, number plates or names to hide them.'), pen: __('Draw with a finger or a stylus.'), hl: __('Draw over lines or text to highlight them.') }[tool] || __('Drag on the image to draw.');
}
function ieLinksHTML(m) {
  const p = m.o.p; const mine = m.o.owner;
  const chips = m.also.map(ow => `<span class="chip ie-link">${esc(ownerLabel(p, ow))}<button type="button" data-act="ieUnlink" data-v="${esc(ow)}" aria-label="${__h('Remove')}">×</button></span>`).join('');
  const q = String(m.q || '').trim().toLowerCase();
  const pts = q ? sortPoints(p, p.points).filter(x => ('pt:' + x.id) !== mine && !m.also.includes('pt:' + x.id) && ((x.code || '').toLowerCase().includes(q) || (x.room || '').toLowerCase().includes(q))).slice(0, 12) : [];
  const sug = m.o.mode === 'frag' ? ieInside(m).filter(id => ('pt:' + id) !== mine && !m.also.includes('pt:' + id)) : [];
  return `<div class="stack-s"><span class="label">${__h('Also for these points')}</span>
    <span class="small muted">${__h('The image is shown once in the report, with all these points.')} ${mine ? __('Main place: {x}.', { x: ownerLabel(p, mine) || '—' }) : ''}</span>
    ${chips ? `<div class="row" style="gap:6px">${chips}</div>` : ''}
    ${sug.length ? `<div class="row" style="gap:6px"><span class="small">${__h('On the fragment:')}</span>${sug.slice(0, 16).map(id => `<button type="button" class="btn sm" data-act="ieLink" data-v="pt:${id}">+ ${esc(byId(p, id).code || '?')}</button>`).join('')}${sug.length > 1 ? `<button type="button" class="btn sm ghost" data-act="ieLinkAll">${__h('All')}</button>` : ''}</div>` : ''}
    <input type="search" data-ieq value="${esc(m.q || '')}" placeholder="${__h('Find a point: code or room')}" aria-label="${__h('Find a point: code or room')}">
    ${pts.length ? `<div class="row" style="gap:6px">${pts.map(x => `<button type="button" class="btn sm" data-act="ieLink" data-v="pt:${x.id}">+ ${esc(x.code || '?')}${x.room ? ' · ' + esc(x.room) : ''}</button>`).join('')}</div>` : ''}</div>`;
}
/** points pinned inside the crop of a fragment */
function ieInside(m) {
  const ph = m.o.ph; if (!ph.src || !m.src) return [];
  const G = geo(m.src.w, m.src.h, editAngle(m.e)); const c = m.e.crop || [0, 0, 1, 1];
  return m.o.p.points.filter(x => x.pin && x.pin.doc === ph.src.doc && Number(x.pin.page) === Number(ph.src.page)).filter(x => {
    const b = G.toBase(x.pin.x * m.src.w, x.pin.y * m.src.h); const u = b[0] / G.bw, v = b[1] / G.bh; return u >= c[0] && u <= c[0] + c[2] && v >= c[1] && v <= c[1] + c[3];
  }).map(x => x.id);
}
/** after a change: canvas + panel */
function ieUpdate(panel = true) { const m = S.mod; if (!m || m.type !== 'edit') return; m.stage.draw(); if (panel) ieRenderPanel(); }

/* ---- drawing on the stage ---- */
function ieOverlay(g, st, m) {
  const e = m.e; const c = e.crop || [0, 0, 1, 1];
  const [x0, y0] = st.toScreen(c[0] * st.bw, c[1] * st.bh), [x1, y1] = st.toScreen((c[0] + c[2]) * st.bw, (c[1] + c[3]) * st.bh);
  const u = Math.max(c[2] * st.bw, c[3] * st.bh) / 250 * st.z; const map = st.mapN();
  // blur preview, pins of a fragment, marks
  if (m.tab !== 'crop' || e.marks.length) {
    applyBlur(g, e.marks, map, u);
    if (m.o.ph.src && e.pins) { const pins = fragPins(m.o.p, m.o.ph); const pm = (x, y) => { const b = st.G.toBase(x * st.src.w, y * st.src.h); return st.toScreen(b[0], b[1]); }; drawPins(g, pins, pm, u * PIN_SCALE); }
    drawMarks(g, e.marks, map, u, { sel: m.tab === 'marks' ? m.sel : null });
  }
  // outside the crop
  g.save(); g.fillStyle = m.tab === 'crop' ? 'rgba(10,14,18,.62)' : 'rgba(10,14,18,.78)';
  g.beginPath(); g.rect(0, 0, st.W, st.H); g.rect(x0, y0, x1 - x0, y1 - y0); g.fill('evenodd');
  if (m.tab === 'crop') {
    g.strokeStyle = '#fff'; g.lineWidth = 1.5 * st.dpr; g.strokeRect(x0, y0, x1 - x0, y1 - y0);
    g.strokeStyle = 'rgba(255,255,255,.4)'; g.lineWidth = 1 * st.dpr; g.beginPath();
    for (const f of [1 / 3, 2 / 3]) { g.moveTo(x0 + (x1 - x0) * f, y0); g.lineTo(x0 + (x1 - x0) * f, y1); g.moveTo(x0, y0 + (y1 - y0) * f); g.lineTo(x1, y0 + (y1 - y0) * f); } g.stroke();
    g.fillStyle = '#fff'; const hs = 9 * st.dpr;
    for (const [hx, hy] of ieHandles(x0, y0, x1, y1)) { g.fillRect(hx - hs / 2, hy - hs / 2, hs, hs); }
  }
  g.restore();
}
function ieHandles(x0, y0, x1, y1) { const mx = (x0 + x1) / 2, my = (y0 + y1) / 2; return [[x0, y0], [mx, y0], [x1, y0], [x1, my], [x1, y1], [mx, y1], [x0, y1], [x0, my]]; }
const HANDLE_SIDES = [['l', 't'], ['t'], ['r', 't'], ['r'], ['r', 'b'], ['b'], ['l', 'b'], ['l']];
function ieDown(m, b, s) {
  const st = m.stage; const e = m.e; const n = [b[0] / st.bw, b[1] / st.bh];
  if (m.tab === 'crop') {
    const c = e.crop; const [x0, y0] = st.toScreen(c[0] * st.bw, c[1] * st.bh), [x1, y1] = st.toScreen((c[0] + c[2]) * st.bw, (c[1] + c[3]) * st.bh);
    const R = 24 * st.dpr; const hs = ieHandles(x0, y0, x1, y1); let best = -1, bd = R;
    hs.forEach(([hx, hy], i) => { const d = Math.hypot(s[0] - hx, s[1] - hy); if (d < bd) { bd = d; best = i; } });
    if (best >= 0) { m.drag = { kind: 'h', sides: HANDLE_SIDES[best], c0: c.slice(), n0: n, snap: ieSnap(m) }; return 'tool'; }
    if (s[0] > x0 && s[0] < x1 && s[1] > y0 && s[1] < y1) { m.drag = { kind: 'move', c0: c.slice(), n0: n, snap: ieSnap(m) }; return 'tool'; }
    return 'pan';
  }
  if (m.tab !== 'marks') return 'pan';
  const u = Math.max(e.crop[2] * st.bw, e.crop[3] * st.bh) / 250 * st.z; const map = st.mapN();
  if (m.tool === 'select' || m.sel) {
    // ends of the selected mark, then any mark under the finger
    if (m.sel && ['arrow', 'line', 'rect', 'ellipse', 'blur'].includes(m.sel.t)) {
      const i = m.sel.p.findIndex(q => { const v = map(q[0], q[1]); return Math.hypot(v[0] - s[0], v[1] - s[1]) < 22 * st.dpr; });
      if (i >= 0) { m.drag = { kind: 'end', i, snap: ieSnap(m) }; return 'tool'; }
    }
    const hit = [...e.marks].reverse().find(mk => { const bb = markBox(mk, map, u); return s[0] >= bb[0] && s[0] <= bb[2] && s[1] >= bb[1] && s[1] <= bb[3]; });
    if (hit && (m.tool === 'select' || hit === m.sel)) { const chg = m.sel !== hit; m.sel = hit; m.drag = { kind: 'mv', n0: n, p0: clone(hit.p), snap: ieSnap(m) }; if (chg) ieRenderPanel(); ieUpdate(false); return 'tool'; }
    if (m.tool === 'select') { if (m.sel) { ieDropEmpty(m); m.sel = null; ieUpdate(); } return 'pan'; }
    ieDropEmpty(m); m.sel = null;
  }
  const mk = { t: m.tool, c: m.color, w: m.w, p: [n] };
  if (m.tool === 'hl' && m.color === MARK_COLORS[0]) mk.c = MARK_COLORS[3];
  if (['arrow', 'line', 'rect', 'ellipse', 'blur'].includes(m.tool)) mk.p = [n, n.slice()];
  if (m.tool === 'num') { mk.n = e.marks.filter(x => x.t === 'num').length + 1; mk.text = ''; }
  if (m.tool === 'text') mk.text = '';
  m.drag = { kind: 'new', mk, snap: ieSnap(m) }; e.marks.push(mk); ieUpdate(false); return 'tool';
}
function ieMove(m, b, s) {
  const d = m.drag; if (!d) return; const st = m.stage; const e = m.e; const n = [b[0] / st.bw, b[1] / st.bh];
  if (d.kind === 'move') { const c = d.c0; let x = c[0] + n[0] - d.n0[0], y = c[1] + n[1] - d.n0[1]; x = Math.min(Math.max(0, x), 1 - c[2]); y = Math.min(Math.max(0, y), 1 - c[3]); e.crop = [x, y, c[2], c[3]]; return st.draw(); }
  if (d.kind === 'h') {
    let [x0, y0, x1, y1] = [d.c0[0], d.c0[1], d.c0[0] + d.c0[2], d.c0[1] + d.c0[3]]; const dx = n[0] - d.n0[0], dy = n[1] - d.n0[1]; const min = 0.02;
    if (d.sides.includes('l')) x0 = Math.min(clamp01(x0 + dx), x1 - min); if (d.sides.includes('r')) x1 = Math.max(clamp01(x1 + dx), x0 + min);
    if (d.sides.includes('t')) y0 = Math.min(clamp01(y0 + dy), y1 - min); if (d.sides.includes('b')) y1 = Math.max(clamp01(y1 + dy), y0 + min);
    const k = ieRatio(m);
    if (k) { // keep the ratio: the side moved last decides, anchored at the opposite side
      let w = (x1 - x0) * st.bw, h = (y1 - y0) * st.bh; const horiz = d.sides.includes('l') || d.sides.includes('r'), vert = d.sides.includes('t') || d.sides.includes('b');
      if (horiz && !vert) h = w / k; else if (vert && !horiz) w = h * k; else { if (w / h > k) w = h * k; else h = w / k; }
      w = Math.min(w, st.bw); h = Math.min(h, st.bh);
      if (d.sides.includes('l')) x0 = x1 - w / st.bw; else x1 = x0 + w / st.bw; if (d.sides.includes('t')) y0 = y1 - h / st.bh; else y1 = y0 + h / st.bh;
      if (!horiz) { const cx = (d.c0[0] + d.c0[2] / 2); x0 = cx - w / st.bw / 2; x1 = cx + w / st.bw / 2; } if (!vert) { const cy = (d.c0[1] + d.c0[3] / 2); y0 = cy - h / st.bh / 2; y1 = cy + h / st.bh / 2; }
      const fx = x0 < 0 ? -x0 : x1 > 1 ? 1 - x1 : 0, fy = y0 < 0 ? -y0 : y1 > 1 ? 1 - y1 : 0; x0 += fx; x1 += fx; y0 += fy; y1 += fy;
      if (x0 < 0 || x1 > 1 || y0 < 0 || y1 > 1) return;
    }
    e.crop = [x0, y0, x1 - x0, y1 - y0]; return st.draw();
  }
  if (d.kind === 'end') { m.sel.p[d.i] = n; return st.draw(); }
  if (d.kind === 'mv') { const dx = n[0] - d.n0[0], dy = n[1] - d.n0[1]; m.sel.p = d.p0.map(q => [q[0] + dx, q[1] + dy]); return st.draw(); }
  if (d.kind === 'new') {
    const mk = d.mk;
    if (mk.t === 'pen' || mk.t === 'hl') { const last = mk.p[mk.p.length - 1]; const a = st.toScreen(last[0] * st.bw, last[1] * st.bh); if (Math.hypot(a[0] - s[0], a[1] - s[1]) > 2.5 * st.dpr) mk.p.push(n); }
    else if (mk.p.length === 2) mk.p[1] = n;
    else if (mk.t === 'text' || mk.t === 'num') mk.p[0] = n;
    st.draw();
  }
}
function ieUp(m) {
  const d = m.drag; m.drag = null; if (!d) return; const st = m.stage;
  if (d.kind === 'new') {
    const mk = d.mk; const a = st.toScreen(mk.p[0][0] * st.bw, mk.p[0][1] * st.bh), z = st.toScreen(mk.p[mk.p.length - 1][0] * st.bw, mk.p[mk.p.length - 1][1] * st.bh);
    const tiny = mk.p.length >= 2 && Math.hypot(a[0] - z[0], a[1] - z[1]) < 8 * st.dpr && mk.t !== 'pen' && mk.t !== 'hl';
    if (tiny || ((mk.t === 'pen' || mk.t === 'hl') && mk.p.length < 2)) { m.e.marks.pop(); st.draw(); return; }
    if (mk.t === 'pen' || mk.t === 'hl') mk.p = simplifyPath(mk.p, 0.0015);
    m.undo.push(d.snap); m.redo = [];
    if (mk.t === 'text' || mk.t === 'num') { m.sel = mk; ieUpdate(); setTimeout(() => { const f = document.getElementById('ieText'); if (f) f.focus(); }, 30); return; }
    ieUpdate(); return;
  }
  if (ieSnap(m) !== d.snap) { m.undo.push(d.snap); m.redo = []; }
  ieUpdate(d.kind === 'mv' || d.kind === 'end' ? false : true);
}
function ieCancelAct(m) { const d = m.drag; m.drag = null; if (!d) return; if (d.kind === 'new') m.e.marks.pop(); else ieRestore(m, d.snap); m.stage.draw(); }
function ieTap() { }
function ieDropEmpty(m) { const s = m.sel; if (s && s.t === 'text' && !String(s.text || '').trim()) { m.e.marks = m.e.marks.filter(x => x !== s); } }
/** Ramer–Douglas–Peucker on 0…1 points */
function simplifyPath(P, eps) {
  if (P.length < 3) return P; const keep = new Uint8Array(P.length); keep[0] = keep[P.length - 1] = 1;
  const st = [[0, P.length - 1]];
  while (st.length) {
    const [a, b] = st.pop(); let dm = 0, im = -1; const [x1, y1] = P[a], [x2, y2] = P[b]; const L = Math.hypot(x2 - x1, y2 - y1) || 1e-9;
    for (let i = a + 1; i < b; i++) { const d = Math.abs((y2 - y1) * P[i][0] - (x2 - x1) * P[i][1] + x2 * y1 - y2 * x1) / L; if (d > dm) { dm = d; im = i; } }
    if (dm > eps && im > 0) { keep[im] = 1; st.push([a, im], [im, b]); }
  }
  return P.filter((_, i) => keep[i]);
}
/** rotate by 90° steps or straighten: marks and crop stay on the same place of the image */
function ieRotate(m, rot, fine) {
  const a = { rot: m.e.rot, fine: m.e.fine }, b = { rot: ((rot % 4) + 4) % 4, fine };
  iePush(m);
  for (const mk of m.e.marks) mk.p = moveToRotation(m.src.w, m.src.h, a, b, mk.p);
  const c = m.e.crop || [0, 0, 1, 1]; const pts = moveToRotation(m.src.w, m.src.h, a, b, [[c[0], c[1]], [c[0] + c[2], c[1]], [c[0], c[1] + c[3]], [c[0] + c[2], c[1] + c[3]]]);
  let x0 = clamp01(Math.min(...pts.map(q => q[0]))), y0 = clamp01(Math.min(...pts.map(q => q[1]))), x1 = clamp01(Math.max(...pts.map(q => q[0]))), y1 = clamp01(Math.max(...pts.map(q => q[1])));
  m.e.rot = b.rot; m.e.fine = fine;
  m.e.crop = ieRatio(m) ? fitAspect([x0, y0, x1 - x0, y1 - y0], m) : [x0, y0, x1 - x0, y1 - y0];
  return m.stage.setSource(m.src, m.e).then(() => { m.stage.fitRect(m.tab === 'crop' ? [0, 0, 1, 1] : m.e.crop, m.tab === 'crop' ? 0.08 : 0.04); ieUpdate(); });
}

/* ---- save ---- */
async function ieSave() {
  const m = S.mod; if (!m || m.type !== 'edit' || m.saving) return; m.saving = true;
  const o = m.o, p = o.p, ph = o.ph; ieDropEmpty(m); renumber(m.e.marks);
  const btn = modalEl.querySelector('[data-act=ieDone]'); if (btn) { btn.disabled = true; btn.textContent = __('Saving…'); }
  try {
    const e = clone(m.e); delete e.ratio; if (o.mode === 'cover') e.aspect = 'cover';
    if (o.mode === 'cover') {
      const [ow] = COVER_SLOTS[o.slot].out; const c = await renderEdit(m.src, e, { outMax: ow, upscale: true });
      const b = await canvasBlob(c, 'image/jpeg', 0.88); const photo = await Photos.addBlob(b, { w: c.width, h: c.height, mime: 'image/jpeg' });
      const old = p.cover.items[o.slot]; // the render of the slot is replaced; its original only when it is another image
      if (old) { if (old.photo) Photos.remove(old.photo); if (old.orig && (!ph.orig || old.orig.id !== ph.orig.id)) Photos.remove(old.orig); }
      const item = { photo, caption: m.caption, edit: e };
      if (ph.orig) item.orig = ph.orig; if (ph.src) item.src = ph.src;
      p.cover.items[o.slot] = item;
    } else {
      const lay = m.layout; const outMax = lay === 'page' || lay === 'land' ? 3000 : lay === 'full' ? 2400 : 1800;
      const c = await renderEdit(m.src, e, { outMax, pins: ph.src && e.pins ? fragPins(p, ph) : null, pinScale: PIN_SCALE, upscale: !!ph.src });
      const blob = await canvasBlob(c, 'image/jpeg', ph.src ? 0.9 : 0.88);
      const r = await Photos.addBlob(blob, { w: c.width, h: c.height, mime: 'image/jpeg', caption: m.caption });
      if (!ph.src && !ph.orig && !o.isNew) ph.orig = { id: ph.id, w: ph.w, h: ph.h, mime: ph.mime, assetId: ph.assetId || '', url: ph.url || '' }; // the first edit: the photo becomes the original
      else if (!o.isNew && ph.id && (ph.src || ph.orig)) Photos.remove({ id: ph.id, assetId: ph.assetId, url: ph.url }); // the previous render
      Object.assign(ph, { id: r.id, w: r.w, h: r.h, mime: r.mime, assetId: r.assetId, url: r.url, ts: Date.now(), caption: m.caption, edit: e, layout: lay });
      if (m.also.length) ph.also = m.also.slice(); else delete ph.also;
      if (o.isNew) photoList(p, o.owner).push(ph);
    }
    touch(p);
    const done = o.onDone; modalExit(); refreshOwner(); toast(o.mode === 'cover' ? __('Cover updated') : o.isNew ? __('Image added') : __('Image saved'));
    if (done) done(ph);
  } catch (err) { console.error(err); m.saving = false; if (btn) { btn.disabled = false; btn.textContent = __('Done'); } toast(__('Could not save the image')); }
}

/* ---- events inside the editor ---- */
modalEl.addEventListener('click', async (ev) => {
  const t = ev.target.closest('[data-act]'); const m = S.mod; if (!t || !m || m.type !== 'edit') return;
  const a = t.dataset.act, v = t.dataset.v;
  switch (a) {
    case 'ieCancel': { const changed = m.undo.length; if (changed && !m.askClose) { m.askClose = true; t.title = __('Tap again to discard the changes'); toast(__('Tap again to discard the changes')); setTimeout(() => { if (S.mod === m) m.askClose = false; }, 2500); break; } modalExit(); break; }
    case 'ieDone': ieSave(); break;
    case 'ieTab': { m.tab = v; if (v !== 'marks') { ieDropEmpty(m); m.sel = null; } m.stage.fitRect(v === 'crop' ? [0, 0, 1, 1] : m.e.crop, v === 'crop' ? 0.08 : 0.04); m.stage.sharp = null; ieUpdate(); m.stage.refine(); break; }
    case 'ieUndo': if (m.undo.length) { m.redo.push(ieSnap(m)); ieRestore(m, m.undo.pop()); } break;
    case 'ieRedo': if (m.redo.length) { m.undo.push(ieSnap(m)); ieRestore(m, m.redo.pop()); } break;
    case 'ieAspect': { iePush(m); m.e.aspect = v; m.e.crop = fitAspect(m.e.crop || [0, 0, 1, 1], m); ieUpdate(); break; }
    case 'ieCropAll': { iePush(m); m.e.crop = fitAspect([0, 0, 1, 1], m); ieUpdate(); break; }
    case 'ieRot': ieRotate(m, m.e.rot + Number(v), m.e.fine); break;
    case 'ieTool': ieDropEmpty(m); m.tool = v; m.sel = null; ieUpdate(); break;
    case 'ieColor': if (m.sel) { iePush(m); m.sel.c = v; } else m.color = v; ieUpdate(); break;
    case 'ieWidth': if (m.sel) { iePush(m); m.sel.w = Number(v); } else m.w = Number(v); ieUpdate(); break;
    case 'ieDel': if (m.sel) { iePush(m); m.e.marks = m.e.marks.filter(x => x !== m.sel); renumber(m.e.marks); m.sel = null; ieUpdate(); } break;
    case 'ieLayout': m.layout = v; ieRenderPanel(); break;
    case 'ieLink': if (!m.also.includes(v)) m.also.push(v); m.q = ''; ieRenderPanel(); break;
    case 'ieLinkAll': for (const id of ieInside(m)) { const ow = 'pt:' + id; if (ow !== m.o.owner && !m.also.includes(ow)) m.also.push(ow); } ieRenderPanel(); break;
    case 'ieUnlink': m.also = m.also.filter(x => x !== v); ieRenderPanel(); break;
    case 'ieReset': { iePush(m); const keepAsp = m.o.mode === 'cover' ? 'cover' : 'free'; m.e.marks = []; m.e.aspect = keepAsp; m.sel = null; const r = ieRotate(m, 0, 0); await r; m.e.crop = fitAspect([0, 0, 1, 1], m); m.undo.pop(); ieUpdate(); break; }
  }
});
modalEl.addEventListener('input', (ev) => {
  const el = ev.target; const m = S.mod; if (!m || m.type !== 'edit') return;
  if (el.dataset.ietext !== undefined && m.sel) { if (!m.textSnap) { m.textSnap = true; iePush(m); } m.sel.text = el.value; m.stage.draw(); return; }
  if (el.dataset.ieleg !== undefined) { const mk = m.e.marks[Number(el.dataset.ieleg)]; if (mk) mk.text = el.value; return; }
  if (el.dataset.iecap !== undefined) { m.caption = el.value; return; }
  if (el.dataset.ieq !== undefined) { m.q = el.value; const pos = el.selectionStart; ieRenderPanel(); const f = document.querySelector('[data-ieq]'); if (f) { f.focus(); try { f.setSelectionRange(pos, pos); } catch (e) { } } return; }
  if (el.dataset.iefine !== undefined) { const f = Number(el.value); const lab = document.getElementById('ieFineV'); if (lab) lab.textContent = (f > 0 ? '+' : '') + nl(f, 1) + '°'; clearTimeout(m._ft); m._ft = setTimeout(() => ieRotate(m, m.e.rot, f).then(() => { const r = document.getElementById('ieFine'); if (r) r.value = f; }), 140); return; }
});
modalEl.addEventListener('change', (ev) => {
  const el = ev.target; const m = S.mod; if (!m || m.type !== 'edit') return;
  if (el.dataset.iepins !== undefined) { iePush(m); m.e.pins = el.checked; m.stage.draw(); }
  if (el.dataset.ietext !== undefined) m.textSnap = false;
});
