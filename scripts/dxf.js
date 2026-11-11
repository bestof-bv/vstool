/* ---------- DXF → SVG → PNG (0.9.29) ----------
   A building plan in DXF (text format of AutoCAD drawings) is turned into a picture in the browser, without any server:
   the entities LINE, LWPOLYLINE, POLYLINE / VERTEX, CIRCLE, ARC, ELLIPSE, SPLINE (control points), POINT, SOLID, TEXT,
   MTEXT and INSERT (blocks, up to 6 levels deep, with scale / rotation) are drawn black on white. Hatches, dimensions,
   layer colours and line types are left out. Only the picture is kept in the project (no DXF file).
   DWG (the binary format) cannot be read in the browser without a GPL library: the app asks for a PDF or DXF export. */
const DXF = {
  /** text of a DXF file → { ents, blocks } */
  parse(txt) {
    const L = String(txt).split(/\r?\n/); const pairs = [];
    for (let i = 0; i + 1 < L.length; i += 2) pairs.push([parseInt(L[i].trim(), 10), L[i + 1]]);
    let i = 0; const blocks = {}; const ents = [];
    const readEnt = () => { // pairs[i] is [0, TYPE]
      const e = { t: String(pairs[i][1]).trim(), v: [] }; i++;
      while (i < pairs.length && pairs[i][0] !== 0) { e.v.push(pairs[i]); i++; }
      return e;
    };
    while (i < pairs.length) {
      const [c, v] = pairs[i];
      if (c === 0 && String(v).trim() === 'SECTION') {
        const name = pairs[i + 1] && String(pairs[i + 1][1]).trim(); i += 2;
        if (name === 'ENTITIES') { while (i < pairs.length && !(pairs[i][0] === 0 && String(pairs[i][1]).trim() === 'ENDSEC')) { if (pairs[i][0] === 0) ents.push(readEnt()); else i++; } }
        else if (name === 'BLOCKS') {
          let cur = null;
          while (i < pairs.length && !(pairs[i][0] === 0 && String(pairs[i][1]).trim() === 'ENDSEC')) {
            if (pairs[i][0] !== 0) { i++; continue; }
            const e = readEnt();
            if (e.t === 'BLOCK') { cur = { name: this.g(e, 2), x: this.n(e, 10), y: this.n(e, 20), ents: [] }; blocks[cur.name] = cur; }
            else if (e.t === 'ENDBLK') cur = null;
            else if (cur) cur.ents.push(e);
          }
        }
      } else i++;
    }
    return { ents: this.vertices(ents), blocks: Object.fromEntries(Object.entries(blocks).map(([k, b]) => [k, Object.assign(b, { ents: this.vertices(b.ents) })])) };
  },
  /** POLYLINE + VERTEX … SEQEND → one entity with its points */
  vertices(list) {
    const out = []; let pl = null;
    for (const e of list) {
      if (e.t === 'POLYLINE') { pl = { t: 'POLYLINE', v: e.v, pts: [] }; out.push(pl); }
      else if (e.t === 'VERTEX' && pl) pl.pts.push([this.n(e, 10), this.n(e, 20)]);
      else if (e.t === 'SEQEND') pl = null;
      else out.push(e);
    }
    return out;
  },
  g(e, code) { const p = e.v.find(x => x[0] === code); return p ? String(p[1]).trim() : ''; },
  n(e, code, d = 0) { const p = e.v.find(x => x[0] === code); const v = p ? parseFloat(p[1]) : NaN; return Number.isFinite(v) ? v : d; },
  all(e, code) { return e.v.filter(x => x[0] === code).map(x => parseFloat(x[1])); },
  /** drawing → list of shapes in drawing units: {k:'l', p:[[x,y]…], closed} | {k:'c', x,y,r} | {k:'a', x,y,r,a0,a1} | {k:'t', x,y,h,rot,s} */
  shapes(doc) {
    const out = [];
    const tf = (m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
    const mul = (a, b) => [a[0] * b[0] + a[2] * b[1], a[1] * b[0] + a[3] * b[1], a[0] * b[2] + a[2] * b[3], a[1] * b[2] + a[3] * b[3], a[0] * b[4] + a[2] * b[5] + a[4], a[1] * b[4] + a[3] * b[5] + a[5]];
    const sc = (m) => Math.sqrt(Math.abs(m[0] * m[3] - m[1] * m[2])) || 1;
    const ang = (m) => Math.atan2(m[1], m[0]);
    const walk = (ents, m, depth) => {
      for (const e of ents) {
        const t = e.t;
        if (t === 'LINE') out.push({ k: 'l', p: [tf(m, this.n(e, 10), this.n(e, 20)), tf(m, this.n(e, 11), this.n(e, 21))] });
        else if (t === 'LWPOLYLINE') { const xs = this.all(e, 10), ys = this.all(e, 20); const p = xs.map((x, j) => tf(m, x, ys[j] || 0)); if (p.length > 1) out.push({ k: 'l', p, closed: (this.n(e, 70) & 1) === 1 }); }
        else if (t === 'POLYLINE') { const p = (e.pts || []).map(q => tf(m, q[0], q[1])); if (p.length > 1) out.push({ k: 'l', p, closed: (this.n(e, 70) & 1) === 1 }); }
        else if (t === 'SPLINE') { const xs = this.all(e, 10), ys = this.all(e, 20); const p = xs.map((x, j) => tf(m, x, ys[j] || 0)); if (p.length > 1) out.push({ k: 'l', p }); }
        else if (t === 'SOLID' || t === '3DFACE') { const p = [[10, 20], [11, 21], [13, 23], [12, 22]].map(([a, b]) => tf(m, this.n(e, a), this.n(e, b))); out.push({ k: 'l', p, closed: true }); }
        else if (t === 'CIRCLE') { const [x, y] = tf(m, this.n(e, 10), this.n(e, 20)); out.push({ k: 'c', x, y, r: this.n(e, 40) * sc(m) }); }
        else if (t === 'ARC') { const [x, y] = tf(m, this.n(e, 10), this.n(e, 20)); const r0 = ang(m) * 180 / Math.PI; out.push({ k: 'a', x, y, r: this.n(e, 40) * sc(m), a0: this.n(e, 50) + r0, a1: this.n(e, 51) + r0 }); }
        else if (t === 'ELLIPSE') { // as a polyline
          const cx = this.n(e, 10), cy = this.n(e, 20), mx = this.n(e, 11), my = this.n(e, 21), ratio = this.n(e, 40, 1), s0 = this.n(e, 41, 0), s1 = this.n(e, 42, Math.PI * 2);
          const p = []; const N = 48; let e1 = s1; if (e1 < s0) e1 += Math.PI * 2;
          for (let k = 0; k <= N; k++) { const u = s0 + (e1 - s0) * k / N; p.push(tf(m, cx + mx * Math.cos(u) - my * ratio * Math.sin(u), cy + my * Math.cos(u) + mx * ratio * Math.sin(u))); }
          out.push({ k: 'l', p });
        }
        else if (t === 'POINT') { const [x, y] = tf(m, this.n(e, 10), this.n(e, 20)); out.push({ k: 'c', x, y, r: 0 }); }
        else if (t === 'TEXT' || t === 'MTEXT' || t === 'ATTRIB') {
          let s = t === 'MTEXT' ? this.all2(e) : this.g(e, 1); s = this.clean(s); if (!s) continue;
          const [x, y] = tf(m, this.n(e, 10), this.n(e, 20)); const rot = (t === 'MTEXT' && e.v.some(q => q[0] === 11)) ? Math.atan2(this.n(e, 21), this.n(e, 11)) * 180 / Math.PI : this.n(e, 50);
          out.push({ k: 't', x, y, h: Math.max(this.n(e, 40, 2.5) * sc(m), 0.01), rot: rot + ang(m) * 180 / Math.PI, s });
        }
        else if (t === 'INSERT' && depth < 6) {
          const b = doc.blocks[this.g(e, 2)]; if (!b) continue;
          const sx = this.n(e, 41, 1), sy = this.n(e, 42, 1), r = this.n(e, 50) * Math.PI / 180, ix = this.n(e, 10), iy = this.n(e, 20);
          const c = Math.cos(r), s = Math.sin(r);
          const local = [c * sx, s * sx, -s * sy, c * sy, ix - (c * sx * b.x - s * sy * b.y), iy - (s * sx * b.x + c * sy * b.y)];
          walk(b.ents, mul(m, local), depth + 1);
        }
      }
    };
    walk(doc.ents, [1, 0, 0, 1, 0, 0], 0);
    return out;
  },
  all2(e) { return e.v.filter(x => x[0] === 3 || x[0] === 1).map(x => String(x[1])).join(''); },
  /** MTEXT formatting codes out: \P new line, {\f…;} fonts, %%c Ø, %%d °, %%p ± */
  clean(s) {
    return String(s || '').replace(/\\P/g, ' ').replace(/\\[A-Za-z][^;\\{}]*;/g, '').replace(/[{}]/g, '').replace(/\\~/g, ' ')
      .replace(/%%[cC]/g, 'Ø').replace(/%%[dD]/g, '°').replace(/%%[pP]/g, '±').replace(/\s+/g, ' ').trim();
  },
  /** shapes → SVG text, y up → y down, width ≤ the given number of px */
  svg(shapes, maxPx = 4000) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    const grow = (x, y) => { if (!Number.isFinite(x) || !Number.isFinite(y)) return; x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); };
    for (const s of shapes) { if (s.k === 'l') s.p.forEach(q => grow(q[0], q[1])); else if (s.k === 't') grow(s.x, s.y); else { grow(s.x - s.r, s.y - s.r); grow(s.x + s.r, s.y + s.r); } }
    if (!Number.isFinite(x0)) throw Object.assign(new Error('empty'), { code: 'dxf_empty' });
    const W = Math.max(x1 - x0, 1e-6), H = Math.max(y1 - y0, 1e-6); const k = maxPx / Math.max(W, H); const pad = 10;
    const X = (x) => ((x - x0) * k + pad).toFixed(1), Y = (y) => ((y1 - y) * k + pad).toFixed(1);
    const sw = Math.max(0.6, maxPx / 4000); const esc2 = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const parts = [];
    for (const s of shapes) {
      if (s.k === 'l') parts.push(`<polyline points="${s.p.map(q => X(q[0]) + ',' + Y(q[1])).join(' ')}"${s.closed ? ` style="fill:none"` : ''}/>`.replace('<polyline', s.closed ? '<polygon' : '<polyline'));
      else if (s.k === 'c') { if (s.r > 0) parts.push(`<circle cx="${X(s.x)}" cy="${Y(s.y)}" r="${(s.r * k).toFixed(1)}"/>`); }
      else if (s.k === 'a') {
        const a0 = s.a0 * Math.PI / 180, a1 = s.a1 * Math.PI / 180; let d = a1 - a0; while (d <= 0) d += Math.PI * 2;
        const p0 = [s.x + s.r * Math.cos(a0), s.y + s.r * Math.sin(a0)], p1 = [s.x + s.r * Math.cos(a0 + d), s.y + s.r * Math.sin(a0 + d)];
        parts.push(`<path d="M${X(p0[0])} ${Y(p0[1])}A${(s.r * k).toFixed(1)} ${(s.r * k).toFixed(1)} 0 ${d > Math.PI ? 1 : 0} 0 ${X(p1[0])} ${Y(p1[1])}"/>`);
      }
      else if (s.k === 't') { const h = s.h * k; if (h < 1.5) continue; parts.push(`<text x="${X(s.x)}" y="${Y(s.y)}" font-size="${h.toFixed(1)}"${s.rot ? ` transform="rotate(${(-s.rot).toFixed(1)} ${X(s.x)} ${Y(s.y)})"` : ''}>${esc2(s.s)}</text>`); }
    }
    const w = Math.ceil(W * k + 2 * pad), h = Math.ceil(H * k + 2 * pad);
    return { w, h, svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="100%" height="100%" fill="#fff"/><g fill="none" stroke="#000" stroke-width="${sw.toFixed(2)}" stroke-linecap="round" stroke-linejoin="round">${parts.filter(x => !x.startsWith('<text')).join('')}</g><g fill="#000" font-family="Arial, sans-serif">${parts.filter(x => x.startsWith('<text')).join('')}</g></svg>` };
  },
  /** DXF file → PNG file (≤ 4096 px: the limit of a canvas on phones) */
  async toPng(file, maxPx = 4096) {
    const txt = await file.text();
    if (!/\bSECTION\b/.test(txt.slice(0, 5000))) throw Object.assign(new Error('not dxf'), { code: 'dxf_bad' });
    const { svg, w, h } = this.svg(this.shapes(this.parse(txt)), maxPx - 20);
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    try {
      const im = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(Object.assign(new Error('svg'), { code: 'dxf_bad' })); i.src = url; });
      const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.drawImage(im, 0, 0, w, h);
      const blob = await canvasBlob(c, 'image/png');
      return new File([blob], String(file.name || 'plan').replace(/\.dxf$/i, '') + '.png', { type: 'image/png' });
    } finally { URL.revokeObjectURL(url); }
  },
};
