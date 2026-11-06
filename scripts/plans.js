/* ---------- plans and documents of a project, edited images ----------
   A plan (PDF or image) is stored once on the device: key = SHA-256 of the file, so the same file in two places or two
   projects takes the space once. The project keeps only references:
     p.docs = [{ id, name, titles: {page: text}, revs: [{ rev, kind: 'pdf' | 'img', file, imgs: {page: key}, pages: [1, 2 …],
                 sizes: {page: [w, h]}, bytes, at }] }]                       — the last revision is the current one
     pt.pin = { doc, page, x, y, zone? }                                           — position of a point on the plan (0…1)
   An image in the notes (photo or fragment of a plan) is never changed itself: the original stays, the edit is a recipe,
   the picture for the report and the thumbnails is rendered from it:
     ph.orig = { id, w, h, mime, assetId, url }                               — original photo (absent until the first edit)
     ph.src = { doc, file, page }                                             — fragment of a plan (the revision it was made on)
     ph.edit = { rot, fine, crop: [x, y, w, h], aspect, marks: [...], pins }   — rotation, crop in the rotated image (0…1), marks
     ph.layout = 'half' | 'full' | 'page' | 'land'                            — size in the report
     ph.also = ['pt:<id>', …]                                                 — the same image also belongs to these points */

/* ---------- hashing ---------- */
async function sha256hex(buf) {
  try { if (crypto && crypto.subtle) { const h = await crypto.subtle.digest('SHA-256', buf); return [...new Uint8Array(h)].map(b => b.toString(16).padStart(2, '0')).join(''); } } catch (e) { }
  // no WebCrypto (plain http): FNV-1a over the bytes, with the length — enough to find the same file again
  const u8 = new Uint8Array(buf); let h1 = 0x811c9dc5, h2 = 0x01000193;
  for (let i = 0; i < u8.length; i++) { h1 = Math.imul(h1 ^ u8[i], 16777619) >>> 0; h2 = Math.imul(h2 ^ u8[u8.length - 1 - i], 2246822519) >>> 0; }
  return 'f' + h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0') + u8.length.toString(16);
}

/* ---------- documents ---------- */
const docCur = (d) => (d && d.revs && d.revs[d.revs.length - 1]) || null;
const docById = (p, id) => (p.docs || []).find(d => d.id === id) || null;
/** the revision a fragment was made on (falls back to the current one) */
function revOf(d, file) { return (d && d.revs.find(r => r.file === file || (r.imgs && Object.values(r.imgs).includes(file)))) || docCur(d); }
const revLetter = (i) => String.fromCharCode(65 + Math.min(i, 25));
function pageTitle(d, page) { const t = d && d.titles && d.titles[page]; return t ? String(t) : ''; }
function docLabel(d, page, withRev = true) {
  if (!d) return ''; const r = docCur(d);
  return [d.name, withRev && r && r.rev ? 'rev. ' + r.rev : '', page ? (pageTitle(d, page) || ('p. ' + page)) : ''].filter(Boolean).join(' · ');
}
/** where a document is used: fragments (in the notes, of the points and units, on the cover) and pins */
function docUsage(p, docId) {
  const frags = allImages(p).filter(x => x.ph.src && x.ph.src.doc === docId);
  const pins = p.points.filter(x => x.pin && x.pin.doc === docId);
  return { frags, pins };
}
/** every image of a project with its owner: {ph, owner} — owner 'page:<k>' | 'sys:<id>' | 'pt:<id>' | 'cover:<i>' */
function allImages(p) {
  const out = [];
  (p.cover && p.cover.items || []).forEach((it, i) => { if (it && it.photo) out.push({ ph: it, owner: 'cover:' + i, cover: true }); });
  for (const [k, n] of Object.entries(p.notes || {})) for (const ph of n.photos || []) out.push({ ph, owner: 'page:' + k });
  for (const s of p.systems) for (const ph of s.photos || []) out.push({ ph, owner: 'sys:' + s.id });
  for (const pt of p.points) for (const ph of pt.photos || []) out.push({ ph, owner: 'pt:' + pt.id });
  return out;
}
/** photos stored elsewhere that also belong to this owner (one fragment for several points) */
function linkedPhotos(p, owner) { return allImages(p).filter(x => !x.cover && x.owner !== owner && (x.ph.also || []).includes(owner)); }
function ownerOfPhoto(p, ph) { const x = allImages(p).find(y => y.ph === ph || (y.ph.id && y.ph.id === ph.id)); return x ? x.owner : ''; }
function ownerLabel(p, owner) {
  const i = owner.indexOf(':'); const t = owner.slice(0, i), k = owner.slice(i + 1);
  if (t === 'pt') { const pt = byId(p, k); return pt ? pt.code || '?' : ''; }
  if (t === 'sys') { const s = sysOf(p, k); return s ? s.code : ''; }
  if (t === 'page') return (typeof stepNames === 'function' ? stepNames()[PAGE_KEYS.indexOf(k)] : k) || k;
  return '';
}

const Docs = {
  pdfs: new Map(), thumbs: new Map(), order: [],
  key: (file) => 'doc:' + file,
  /** a PDF or image file → revision data (the file is stored once, by its hash) */
  async store(file) {
    const buf = await file.arrayBuffer(); const hash = await sha256hex(buf); const isPdf = isPdfFile(file);
    const blob = new Blob([buf], { type: isPdf ? 'application/pdf' : (file.type || 'image/jpeg') });
    if (!(await Photos.getLocal(this.key(hash)))) { const ok = await Photos.put(this.key(hash), blob); if (!ok) throw Object.assign(new Error('storage'), { code: 'storage' }); }
    if (isPdf) {
      const pdf = await this.pdf(hash, blob); const pages = [], sizes = {};
      for (let n = 1; n <= pdf.numPages; n++) { const pg = await pdf.getPage(n); const v = pg.getViewport({ scale: 1 }); pages.push(n); sizes[n] = [Math.round(v.width * 100) / 100, Math.round(v.height * 100) / 100]; pg.cleanup(); }
      return { kind: 'pdf', file: hash, pages, sizes, bytes: buf.byteLength, at: Date.now() };
    }
    const im = await decodeImage(blob); const w = im.width || im.naturalWidth, h = im.height || im.naturalHeight; if (im.close) im.close();
    return { kind: 'img', file: hash, imgs: { 1: hash }, pages: [1], sizes: { 1: [w, h] }, bytes: buf.byteLength, at: Date.now() };
  },
  async blob(key) { return Photos.getLocal(this.key(key)); },
  /** pdf.js document of a stored file, kept open for the last two plans */
  async pdf(file, blob) {
    if (this.pdfs.has(file)) { this.order = [file, ...this.order.filter(x => x !== file)]; return this.pdfs.get(file); }
    const pr = (async () => { const b = blob || await this.blob(file); if (!b) throw Object.assign(new Error('missing'), { code: 'missing' }); return PDFX.open(b); })();
    this.pdfs.set(file, pr); this.order = [file, ...this.order.filter(x => x !== file)];
    pr.catch(() => this.pdfs.delete(file));
    while (this.order.length > 2) { const old = this.order.pop(); const d = this.pdfs.get(old); this.pdfs.delete(old); if (d) d.then(x => x.destroy && x.destroy()).catch(() => { }); }
    return pr;
  },
  _imgs: new Map(),
  async image(key) {
    if (this._imgs.has(key)) return this._imgs.get(key);
    const pr = (async () => { const b = await this.blob(key); if (!b) throw Object.assign(new Error('missing'), { code: 'missing' }); return decodeImage(b); })();
    this._imgs.set(key, pr); pr.catch(() => this._imgs.delete(key));
    if (this._imgs.size > 4) { const k = this._imgs.keys().next().value; this._imgs.delete(k); }
    return pr;
  },
  /** source for the renderer: one page of a revision */
  source(rev, page) {
    const sz = (rev.sizes || {})[page] || [1000, 1000];
    if (rev.kind === 'img') { const key = (rev.imgs || {})[page] || rev.file; return imageSource(() => this.image(key), sz[0], sz[1]); }
    const self = this;
    return {
      w: sz[0], h: sz[1], vector: true,
      async region(x, y, w, h, s) {
        const pdf = await self.pdf(rev.file); const pg = await pdf.getPage(page);
        let sc = s; const lim = 4096; if (w * sc > lim) sc = lim / w; if (h * sc > lim) sc = Math.min(sc, lim / h);
        const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w * sc)); c.height = Math.max(1, Math.ceil(h * sc));
        const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
        const vp = pg.getViewport({ scale: sc, offsetX: -x * sc, offsetY: -y * sc });
        await pg.render({ canvasContext: g, viewport: vp, background: 'white' }).promise; pg.cleanup();
        return c;
      },
    };
  },
  /** small picture of a page (JPEG data URL), kept for the session and on the device */
  async thumb(rev, page) {
    const k = 'th:' + ((rev.imgs || {})[page] || rev.file) + ':' + page;
    if (this.thumbs.has(k)) return this.thumbs.get(k);
    const pr = (async () => {
      const hit = await Photos.getLocal(k); if (hit) return blobToDataURL(hit);
      const src = this.source(rev, page); const c = await renderEdit(src, { rot: 0, fine: 0 }, { outMax: 360 });
      const b = await canvasBlob(c, 'image/jpeg', 0.8); if (b) Photos.put(k, b); return c.toDataURL('image/jpeg', 0.8);
    })();
    this.thumbs.set(k, pr); pr.catch(() => this.thumbs.delete(k)); return pr;
  },
  /** is the file still referenced by a project (also in the other space: demo / account) */
  used(file, except) {
    const hit = (p) => p !== except && (p.docs || []).some(d => d.revs.some(r => r.file === file || Object.values(r.imgs || {}).includes(file)));
    if (Object.values(Store.projects).some(hit)) return true;
    for (const k of SPACES) { if (k === lsKey(LS_KEY)) continue; const sp = Store.spaces[k]; // the other space: its projects, from the device copy
      if (sp) { if (JSON.stringify(sp).includes(file)) return true; continue; }
      try { const s = localStorage.getItem(k); if (s && s.includes(file)) return true; } catch (e) { } }
    return false;
  },
  /** remove the files of a revision from the device when nothing refers to them any more */
  async release(rev, except) {
    for (const f of new Set([rev.file, ...Object.values(rev.imgs || {})].filter(Boolean))) {
      if (this.used(f, except)) continue;
      await Photos.delLocal(this.key(f)); this.pdfs.delete(f); this._imgs.delete(f);
      for (const pg of rev.pages || [1]) { await Photos.delLocal('th:' + f + ':' + pg); this.thumbs.delete('th:' + f + ':' + pg); }
    }
  },
  async add(p, file, name) {
    const rev = await this.store(file); rev.rev = 'A';
    const same = (p.docs || []).find(d => d.revs.some(r => r.file === rev.file)); if (same) return { d: same, existed: true };
    const d = { id: 'd' + uid(), name: name || String(file.name || '').replace(/\.(pdf|png|jpe?g|webp)$/i, '') || __('Floor plan'), titles: {}, revs: [rev] };
    p.docs = p.docs || []; p.docs.push(d); return { d, existed: false };
  },
  async addRev(p, d, file) {
    const rev = await this.store(file); if (d.revs.some(r => r.file === rev.file)) return { rev: docCur(d), same: true };
    rev.rev = revLetter(d.revs.length); d.revs.push(rev); return { rev, same: false };
  },
};
/** source for the renderer from a picture (bitmap loaded on demand) */
function imageSource(get, w, h) {
  return {
    w, h,
    async region(x, y, rw, rh, s) {
      const im = await get(); const sc = Math.min(s, 1);
      const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(rw * sc)); c.height = Math.max(1, Math.ceil(rh * sc));
      const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.imageSmoothingQuality = 'high';
      g.drawImage(im, x, y, rw, rh, 0, 0, c.width, c.height); return c;
    },
  };
}
/** source of an image of the notes: the original photo, or the page of the plan for a fragment */
async function photoSource(p, ph) {
  if (ph.src) {
    const d = docById(p, ph.src.doc); if (!d) throw Object.assign(new Error('missing'), { code: 'missing' });
    const rev = revOf(d, ph.src.file); return Docs.source(rev, ph.src.page);
  }
  const o = ph.orig || ph; const b = await Photos.blob(o); if (!b) throw Object.assign(new Error('missing'), { code: 'missing' });
  const im = await decodeImage(b); return imageSource(async () => im, im.width || im.naturalWidth, im.height || im.naturalHeight);
}

/* ---------- geometry of an edit: source → rotated base (0…1) → output ---------- */
const EDIT0 = () => ({ rot: 0, fine: 0, crop: null, aspect: 'free', marks: [], pins: false });
function baseDims(sw, sh, ang) { const r = ang * Math.PI / 180, c = Math.abs(Math.cos(r)), s = Math.abs(Math.sin(r)); return [sw * c + sh * s, sw * s + sh * c]; }
const editAngle = (e) => ((e.rot || 0) * 90 + (e.fine || 0));
/** source px → base px and back, for the rotation of the edit */
function geo(sw, sh, ang) {
  const [bw, bh] = baseDims(sw, sh, ang); const r = ang * Math.PI / 180, c = Math.cos(r), s = Math.sin(r);
  return {
    bw, bh,
    toBase: (x, y) => { const dx = x - sw / 2, dy = y - sh / 2; return [c * dx - s * dy + bw / 2, s * dx + c * dy + bh / 2]; },
    toSrc: (x, y) => { const dx = x - bw / 2, dy = y - bh / 2; return [c * dx + s * dy + sw / 2, -s * dx + c * dy + sh / 2]; },
  };
}
/** base coordinates (0…1) of a point when the rotation changes from edit a to b — marks and crop stay on the same spot */
function moveToRotation(sw, sh, a, b, pts) {
  const ga = geo(sw, sh, editAngle(a)), gb = geo(sw, sh, editAngle(b));
  return pts.map(([x, y]) => { const s = ga.toSrc(x * ga.bw, y * ga.bh); const q = gb.toBase(s[0], s[1]); return [q[0] / gb.bw, q[1] / gb.bh]; });
}
const clamp01 = (v) => Math.min(1, Math.max(0, v));
/** aspect ratios of the crop (width / height, in base pixels) */
const ASPECTS = { free: 0, '4:3': 4 / 3, '3:2': 3 / 2, '16:9': 16 / 9, '1:1': 1, a4p: 210 / 297, a4l: 297 / 210 };

/* ---------- marks ---------- */
const MARK_COLORS = ['#E5322D', '#FF6A13', '#1E6FD9', '#F5C400', '#FFFFFF', '#111111'];
const MARK_W = { 1: 0.65, 2: 1, 3: 1.6 };
const PIN_SCALE = 0.5; // pins on fragments: half the size of the marks
const PIN_COL = { ok: '#1B9E4B', nok: '#E5322D', m1: '#1E6FD9', none: '#7D8C95' };
/** colour of a pin: control measurement within / outside the tolerance, only the first measurement, nothing yet */
function pinState(p, pt) {
  if (measurable(pt)) { const st = ptStatus(pt, p); if (st) return st; return isNum(ptQ(p, pt, 'eerste')) ? 'm1' : 'none'; }
  const c = pt.reg && pt.reg.cond; return c === 'ok' ? 'ok' : c === 'defect' ? 'nok' : (pt.reg && pt.reg.state) ? 'm1' : 'none';
}
function renumber(marks) { let n = 0; for (const m of marks) if (m.t === 'num') m.n = ++n; return marks; }
const hasEdit = (e) => !!e && (!!(e.rot || e.fine) || !!(e.crop && !(e.crop[0] === 0 && e.crop[1] === 0 && e.crop[2] === 1 && e.crop[3] === 1)) || !!(e.marks && e.marks.length) || !!e.pins);
const legendOf = (ph) => ((ph.edit && ph.edit.marks) || []).filter(m => m.t === 'num' && String(m.text || '').trim()).map(m => ({ n: m.n, text: String(m.text).trim(), c: m.c }));

function halo(c) { return /^#(fff|ffffff|f5c400)$/i.test(c) ? 'rgba(0,0,0,.45)' : 'rgba(255,255,255,.75)'; }
/** draw the marks on a canvas: map(x, y) gives output px for base 0…1, u = unit (px) of the line widths */
function drawMarks(g, marks, map, u, opts = {}) {
  for (const m of marks) {
    if (m.t === 'blur') continue;
    const P = (m.p || []).map(q => map(q[0], q[1])); if (!P.length) continue;
    const lw = u * (MARK_W[m.w] || 1) * 1.4, col = m.c || MARK_COLORS[0];
    g.save(); g.lineJoin = 'round'; g.lineCap = 'round';
    const stroke = (path, w, c, a = 1) => { g.globalAlpha = a; g.lineWidth = w; g.strokeStyle = c; path(); g.stroke(); g.globalAlpha = 1; };
    const both = (path) => { stroke(path, lw + u * 1.1, halo(col), 0.9); stroke(path, lw, col); };
    if (m.t === 'line' || m.t === 'arrow') {
      const [a, b] = [P[0], P[P.length - 1]];
      both(() => { g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); });
      if (m.t === 'arrow') {
        const ang = Math.atan2(b[1] - a[1], b[0] - a[0]), L = Math.max(lw * 3.6, u * 6), W = 0.5;
        const head = () => { g.beginPath(); g.moveTo(b[0], b[1]); g.lineTo(b[0] - L * Math.cos(ang - W), b[1] - L * Math.sin(ang - W)); g.lineTo(b[0] - L * Math.cos(ang + W), b[1] - L * Math.sin(ang + W)); g.closePath(); };
        g.fillStyle = halo(col); g.lineWidth = u * 1.1; g.strokeStyle = halo(col); head(); g.stroke(); g.fillStyle = col; head(); g.fill();
      }
    } else if (m.t === 'rect') {
      const [a, b] = [P[0], P[P.length - 1]]; both(() => { g.beginPath(); g.rect(Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1])); });
    } else if (m.t === 'ellipse') {
      const [a, b] = [P[0], P[P.length - 1]]; both(() => { g.beginPath(); g.ellipse((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, Math.max(1, Math.abs(b[0] - a[0]) / 2), Math.max(1, Math.abs(b[1] - a[1]) / 2), 0, 0, Math.PI * 2); });
    } else if (m.t === 'pen' || m.t === 'hl') {
      const path = () => { g.beginPath(); g.moveTo(P[0][0], P[0][1]); for (let i = 1; i < P.length - 1; i++) { const mx = (P[i][0] + P[i + 1][0]) / 2, my = (P[i][1] + P[i + 1][1]) / 2; g.quadraticCurveTo(P[i][0], P[i][1], mx, my); } if (P.length > 1) g.lineTo(P[P.length - 1][0], P[P.length - 1][1]); };
      if (m.t === 'hl') { g.lineCap = 'butt'; stroke(path, lw * 5.5, col, 0.38); } else both(path);
    } else if (m.t === 'text') {
      const fs = u * ({ 1: 6.5, 2: 9, 3: 13 }[m.w] || 9); const lines = String(m.text || '…').split('\n');
      g.font = `600 ${fs}px Inter, system-ui, sans-serif`; g.textBaseline = 'top';
      const tw = Math.max(...lines.map(l => g.measureText(l).width)), pad = fs * 0.32, lh = fs * 1.22;
      const [x, y] = P[0]; const dark = /^#(111111|1e6fd9|e5322d)$/i.test(col);
      g.fillStyle = dark ? 'rgba(255,255,255,.9)' : 'rgba(17,17,17,.82)'; g.fillRect(x, y, tw + pad * 2, lh * lines.length + pad * 1.4);
      g.lineWidth = Math.max(1, u * 0.5); g.strokeStyle = col; g.strokeRect(x, y, tw + pad * 2, lh * lines.length + pad * 1.4);
      g.fillStyle = col; lines.forEach((l, i) => g.fillText(l, x + pad, y + pad * 0.9 + i * lh));
    } else if (m.t === 'num') {
      const r = u * ({ 1: 4.2, 2: 5.6, 3: 7.4 }[m.w] || 5.6); const [x, y] = P[0];
      if (P.length > 1) { const b = P[1]; both(() => { g.beginPath(); g.moveTo(x, y); g.lineTo(b[0], b[1]); }); }
      g.beginPath(); g.arc(x, y, r + u * 0.9, 0, Math.PI * 2); g.fillStyle = '#fff'; g.fill();
      g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fillStyle = col; g.fill();
      g.fillStyle = /^#(ffffff|f5c400)$/i.test(col) ? '#111' : '#fff'; g.font = `700 ${r * 1.15}px Inter, system-ui, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(String(m.n || '?'), x, y + r * 0.04);
    }
    if (opts.sel === m) { g.setLineDash([u * 2, u * 1.6]); g.lineWidth = Math.max(1, u * 0.5); g.strokeStyle = '#1E6FD9'; const bb = markBox(m, map, u); g.strokeRect(bb[0], bb[1], bb[2] - bb[0], bb[3] - bb[1]); }
    g.restore();
  }
}
/** bounding box of a mark in output px (for selection and hit tests) */
function markBox(m, map, u) {
  const P = (m.p || []).map(q => map(q[0], q[1])); let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of P) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  if (m.t === 'text') { const fs = u * ({ 1: 6.5, 2: 9, 3: 13 }[m.w] || 9); const lines = String(m.text || '…').split('\n'); const w = Math.max(...lines.map(l => l.length)) * fs * 0.56 + fs * 0.7; x1 = x0 + w; y1 = y0 + lines.length * fs * 1.22 + fs * 0.5; }
  if (m.t === 'num') { const r = u * ({ 1: 4.2, 2: 5.6, 3: 7.4 }[m.w] || 5.6); x0 -= r; y0 -= r; x1 = Math.max(x1, P[0][0] + r); y1 = Math.max(y1, P[0][1] + r); }
  const pad = u * 2; return [x0 - pad, y0 - pad, x1 + pad, y1 + pad];
}
/** pixelate the blurred areas of the output (before the other marks) */
function applyBlur(g, marks, map, u) {
  for (const m of marks) {
    if (m.t !== 'blur' || !m.p || m.p.length < 2) continue;
    const a = map(m.p[0][0], m.p[0][1]), b = map(m.p[1][0], m.p[1][1]);
    const x = Math.round(Math.min(a[0], b[0])), y = Math.round(Math.min(a[1], b[1])), w = Math.round(Math.abs(b[0] - a[0])), h = Math.round(Math.abs(b[1] - a[1]));
    if (w < 2 || h < 2) continue; const cell = Math.max(4, Math.round(u * 4));
    const t = document.createElement('canvas'); t.width = Math.max(1, Math.round(w / cell)); t.height = Math.max(1, Math.round(h / cell));
    const tg = t.getContext('2d'); tg.imageSmoothingEnabled = true; tg.drawImage(g.canvas, x, y, w, h, 0, 0, t.width, t.height);
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.imageSmoothingEnabled = false; g.drawImage(t, 0, 0, t.width, t.height, x, y, w, h); g.restore();
  }
}
/** pins of the points on a plan: dot in the colour of the state, code beside it */
function drawPins(g, pins, map, u, opts = {}) {
  const r = opts.r || u * 3.4, fs = opts.fs || u * 7.2;
  g.save(); g.font = `700 ${fs}px Inter, system-ui, sans-serif`; g.textBaseline = 'middle';
  const P = pins.map(q => ({ q, xy: map(q.x, q.y), sel: !!(opts.sel && opts.sel === q.id) }));
  for (const { q, xy: [x, y], sel } of P) {
    const col = PIN_COL[q.state] || PIN_COL.none;
    g.beginPath(); g.arc(x, y, r + Math.max(1.2, r * 0.32), 0, Math.PI * 2); g.fillStyle = sel ? '#111' : '#fff'; g.fill();
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fillStyle = col; g.fill();
  }
  if (!opts.noLabel) {
    // declutter (screen): a label only where it does not cover another label or dot; the selected point first
    const boxes = opts.declutter ? P.map(({ xy: [x, y] }) => [x - r * 1.3, y - r * 1.3, x + r * 1.3, y + r * 1.3]) : [];
    const order = [...P].sort((a, b) => (b.sel - a.sel));
    for (const { q, xy: [x, y], sel } of order) {
      if (!q.label) continue; const tw = g.measureText(q.label).width; const bx = [x + r * 1.5, y - fs * 0.62, x + r * 1.7 + tw, y + fs * 0.62];
      if (opts.declutter && !sel && boxes.some(b => !(bx[2] < b[0] || bx[0] > b[2] || bx[3] < b[1] || bx[1] > b[3]) && !(b[0] === x - r * 1.3 && b[1] === y - r * 1.3))) continue;
      boxes.push(bx);
      g.lineWidth = Math.max(2, fs * 0.28); g.strokeStyle = 'rgba(255,255,255,.92)'; g.lineJoin = 'round'; g.strokeText(q.label, x + r * 1.7, y); g.fillStyle = sel ? '#111' : '#1C2430'; g.fillText(q.label, x + r * 1.7, y);
    }
  }
  g.restore();
}
/** view of a plan page (0.9.18): quarter turns (0…3) and the visible part — crop in the turned page (0…1); the pins stay on the unturned page.
 *  d.views = { [page]: { rot, crop } } — used by the viewer, the pin previews, the report and the crew packages */
function pageView(d, page) {
  const v = d && d.views && d.views[page];
  const rot = v && isNum(v.rot) ? ((Math.round(v.rot) % 4) + 4) % 4 : 0;
  const crop = v && Array.isArray(v.crop) && v.crop.length === 4 && v.crop.every(isNum) && v.crop[2] > 0.01 && v.crop[3] > 0.01 ? v.crop : null;
  return { rot, crop };
}
function setPageView(d, page, v) {
  d.views = d.views || {};
  if (!v.rot && !v.crop) delete d.views[page]; else d.views[page] = { rot: v.rot || 0, crop: v.crop || null };
  if (!Object.keys(d.views).length) delete d.views;
}
/** snapshots of a plan page (0.9.19): named views of one page (LG1, LG2 …), each with its own turn and visible part.
 *  d.zones = [{ id, page, name, rot, crop }]; a point placed in a snapshot keeps pin.zone; the report shows every snapshot as its own plan */
function pageZones(d, page) { return (d && Array.isArray(d.zones) ? d.zones : []).filter(z => z && Number(z.page) === Number(page)); }
function zoneById(d, id) { return id && d && Array.isArray(d.zones) ? d.zones.find(z => z && z.id === id) || null : null; }
/** the view of a page, or of a snapshot of it */
function viewOf(d, page, zid) { const z = zoneById(d, zid); return z && Number(z.page) === Number(page) ? pageView({ views: { [page]: z } }, page) : pageView(d, page); }
function setZoneView(d, zid, v) { const z = zoneById(d, zid); if (z) { z.rot = v.rot || 0; z.crop = v.crop || null; } }
/** a point (page 0…1, unturned) inside the visible part of a view */
function pinInView(src, v, x, y) {
  if (!v.crop) return true; const G = geo(src.w, src.h, v.rot * 90); const b = G.toBase(x * src.w, y * src.h); const u = b[0] / G.bw, w = b[1] / G.bh, c = v.crop;
  return u >= c[0] - 1e-6 && w >= c[1] - 1e-6 && u <= c[0] + c[2] + 1e-6 && w <= c[1] + c[3] + 1e-6;
}
/** the snapshot of a point: the one it was placed in (while it still shows it), else the first snapshot that shows it, else null */
function pinZone(d, src, page, q) {
  const zs = pageZones(d, page); if (!zs.length) return null; const inside = (z) => pinInView(src, viewOf(d, page, z.id), q.x, q.y);
  const own = zs.find(z => z.id === q.zone); if (own && inside(own)) return own; return zs.find(inside) || null;
}
/** the same rectangle (base 0…1) after a change of the quarter turns from a to b */
function rectToRotation(src, a, b, r) {
  const q = moveToRotation(src.w, src.h, { rot: a }, { rot: b }, [[r[0], r[1]], [r[0] + r[2], r[1] + r[3]]]);
  const x0 = clamp01(Math.min(q[0][0], q[1][0])), y0 = clamp01(Math.min(q[0][1], q[1][1])), x1 = clamp01(Math.max(q[0][0], q[1][0])), y1 = clamp01(Math.max(q[0][1], q[1][1]));
  return [x0, y0, x1 - x0, y1 - y0];
}
/** pins of a document page for the renderer: points of the project, coordinates on the unrotated page (0…1) */
function pagePins(p, docId, page, ids) {
  return p.points.filter(x => x.pin && x.pin.doc === docId && Number(x.pin.page) === Number(page) && (!ids || ids.has(x.id)))
    .map(x => ({ id: x.id, x: x.pin.x, y: x.pin.y, zone: x.pin.zone || '', label: x.code || '?', state: pinState(p, x) }));
}

/** render an edit: crop of the rotated source, blur, marks and pins → canvas.
    opts: outMax (long side) or scale (px per base px), view (base 0…1 rect instead of the crop), pins [{x, y (source 0…1), label, state}] */
async function renderEdit(src, e, opts = {}) {
  e = Object.assign(EDIT0(), e || {});
  const G = geo(src.w, src.h, editAngle(e)); const bw = G.bw, bh = G.bh;
  const crop = opts.view || e.crop || [0, 0, 1, 1];
  const X = crop[0] * bw, Y = crop[1] * bh, CW = Math.max(1e-6, crop[2] * bw), CH = Math.max(1e-6, crop[3] * bh);
  let s = opts.scale || (opts.outMax || 1600) / Math.max(CW, CH);
  if (!src.vector && !opts.scale) s = Math.min(s, Math.max(1, (opts.upscale ? opts.outMax || 1600 : 1200) / Math.max(CW, CH))); // a photo: not above its own resolution (small crops: at least 1200 px, for sharp marks)
  const lim = opts.limit || 4096; if (CW * s > lim) s = lim / CW; if (CH * s > lim) s = Math.min(s, lim / CH);
  const ow = Math.max(1, Math.round(CW * s)), oh = Math.max(1, Math.round(CH * s));
  const c = opts.canvas || document.createElement('canvas'); c.width = ow; c.height = oh;
  const g = c.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = '#fff'; g.fillRect(0, 0, ow, oh);
  // the part of the source under the output
  const corners = [[X, Y], [X + CW, Y], [X, Y + CH], [X + CW, Y + CH]].map(([x, y]) => G.toSrc(x, y));
  let sx0 = Math.max(0, Math.min(...corners.map(q => q[0]))), sy0 = Math.max(0, Math.min(...corners.map(q => q[1])));
  let sx1 = Math.min(src.w, Math.max(...corners.map(q => q[0]))), sy1 = Math.min(src.h, Math.max(...corners.map(q => q[1])));
  if (sx1 - sx0 > 0.5 && sy1 - sy0 > 0.5) {
    const reg = await src.region(sx0, sy0, sx1 - sx0, sy1 - sy0, s);
    g.save(); g.imageSmoothingQuality = 'high';
    g.translate(-X * s, -Y * s); g.scale(s, s); g.translate(bw / 2, bh / 2); g.rotate(editAngle(e) * Math.PI / 180); g.translate(-src.w / 2, -src.h / 2);
    g.drawImage(reg, 0, 0, reg.width, reg.height, sx0, sy0, sx1 - sx0, sy1 - sy0); g.restore();
  }
  const uc = e.crop || [0, 0, 1, 1]; const u = Math.max(uc[2] * bw, uc[3] * bh) / 250 * s;
  const map = (x, y) => [(x * bw - X) * s, (y * bh - Y) * s];
  if (!opts.noMarks) {
    applyBlur(g, e.marks || [], map, u);
    if (opts.pins && opts.pins.length) { const pm = (x, y) => { const b = G.toBase(x * src.w, y * src.h); return [(b[0] - X) * s, (b[1] - Y) * s]; }; drawPins(g, opts.pins, pm, u * (opts.pinScale || 1), opts.pinOpts || {}); }
    drawMarks(g, e.marks || [], map, u, { sel: opts.sel });
  }
  c._map = { X, Y, s, bw, bh, u, G };
  return c;
}
/** the picture of an image of the notes for the report and the thumbnails, from its recipe */
async function renderPhoto(p, ph, outMax) {
  const src = await photoSource(p, ph); const e = ph.edit || EDIT0();
  const pins = ph.src && e.pins ? fragPins(p, ph) : null;
  return renderEdit(src, e, { outMax: outMax || (ph.layout === 'page' || ph.layout === 'land' ? 3000 : ph.layout === 'full' ? 2400 : 1800), pins, pinScale: PIN_SCALE, upscale: true });
}
/** pins of the points on the page of a fragment (all points of the page, the linked ones first) */
function fragPins(p, ph) { return ph.src ? pagePins(p, ph.src.doc, ph.src.page) : []; }
/** report size of an image */
const PH_LAYOUTS = ['half', 'full', 'page', 'land'];
