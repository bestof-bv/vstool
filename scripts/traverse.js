/* ---------- 0.9.39: duct traverse (netmeting) — where to measure in a duct section, planned before the holes are drilled ----------
   Positions are fractions of the inside diameter / side, measured from the inner wall at the hole, made by formula or by the published table:
   · «ea» equal areas (EN 12599 / EN 16211 Schwerlinien- / Trivialverfahren): round r_i/R = √((2i−1)/(2n)) (= EPA Method 1 table 1-2),
     rectangle x_i = (2i−1)/(2n)·L;
   · «ll» log-linear, round (ASHRAE 111; the table TSI AF-106 prints for round ducts): 6 / 8 / 10 points per diameter;
   · «lt» log-Tchebycheff, rectangle (ASHRAE 111, ISO 3966; TSI AF-106): 5 / 6 / 7 lines per side, 5 < 762 mm ≤ 6 ≤ 914 mm < 7.
   All points weigh the same; Pitot: velocity per point first (v = √(2·pd/ρ)), then the mean. No DOM: shared by the editor, the report and the tests. */
const TRV = {
  LL: { 6: [0.032, 0.135, 0.321], 8: [0.021, 0.117, 0.184, 0.345], 10: [0.019, 0.077, 0.153, 0.217, 0.361] },
  LT: { 5: [0.074, 0.288, 0.5], 6: [0.061, 0.235, 0.437], 7: [0.053, 0.203, 0.366, 0.5] },
  HOLES: 'ABCDEFGHIJ',
  /** a half table → the whole line (mirror 1 − x) */
  full(h) { const a = h.slice(); const b = h.filter(x => x < 0.5).map(x => +(1 - x).toFixed(4)).reverse(); return a.concat(b); },
  /** fractions from the wall along one diameter of a round duct: n rings per radius → 2n points */
  roundFr(rule, n) {
    if (rule === 'll') { const t = TRV.LL[2 * n] || TRV.LL[6]; return TRV.full(t); }
    const r = []; for (let i = 1; i <= n; i++) r.push(Math.sqrt((2 * i - 1) / (2 * n)));
    return r.slice().reverse().map(x => (1 - x) / 2).concat(r.map(x => (1 + x) / 2));
  },
  /** fractions along one side of a rectangle: n lines */
  lineFr(rule, n) {
    if (rule === 'lt') return TRV.full(TRV.LT[n] || TRV.LT[5]);
    const r = []; for (let i = 1; i <= n; i++) r.push((2 * i - 1) / (2 * n)); return r;
  },
  /** lines on a side of L mm (ASHRAE / TSI): 5 below 762 mm, 6 up to 914 mm, 7 above */
  autoLines: (L) => !(L > 0) ? 5 : L < 762 ? 5 : L <= 914 ? 6 : 7,
  rules: (shape) => shape === 'rect' ? ['ea', 'lt'] : ['ea', 'll'],
  ringsOf: (rule) => rule === 'll' ? [3, 4, 5] : [2, 3, 4, 5],
  linesOf: (rule) => rule === 'lt' ? [5, 6, 7] : [3, 4, 5, 6, 7],
  /** hydraulic diameter (mm) */
  dh(d) { if (d.shape === 'rect') return d.w > 0 && d.h > 0 ? 2 * d.w * d.h / (d.w + d.h) : null; return d.d > 0 ? d.d : null; },
  /** the settings of the grid with their defaults (never stored by this) */
  cfg(d0) {
    const d = d0 || {}; const rect = d.shape === 'rect';
    const rule = TRV.rules(d.shape).includes(d.rule) ? d.rule : 'ea';
    const c = { shape: rect ? 'rect' : 'round', rule, wall: +d.wall > 0 ? +d.wall : 0, probe: +d.probe > 0 ? +d.probe : 0 };
    if (rect) {
      const okL = (v, L) => TRV.linesOf(rule).includes(+v) ? +v : Math.max(TRV.linesOf(rule)[0], Math.min(7, TRV.autoLines(L)));
      c.nx = okL(d.nx, d.w); c.ny = okL(d.ny, d.h);
      c.side = d.side === 'w' || d.side === 'h' ? d.side : ((+d.h || 0) > (+d.w || 0) ? 'h' : 'w'); // holes in the long side by default
    } else {
      c.rings = TRV.ringsOf(rule).includes(+d.rings) ? +d.rings : 3;
      c.axes = +d.axes === 3 ? 3 : 2;
    }
    const L = rect ? Math.max(+d.w || 0, +d.h || 0) : +d.d || 0;
    c.yminAuto = Math.max(c.probe, L > 610 ? 25 : 13);
    c.ymin = +d.ymin > 0 ? +d.ymin : c.yminAuto;
    return c;
  },
  /** the grid: holes and points in measuring order (hole A point 1…, hole B …); null without the dimensions.
   *  Point: { i, hole, n, y: mm from the inner wall at the hole, depth: mm on the probe (+ wall and insulation), u, v: 0…1 in the section
   *  (u to the right, v down), moved: closer to a wall than the minimum distance → put at the minimum }. */
  grid(pt) {
    const d = (pt && pt.duct) || {}; const c = TRV.cfg(d); const pts = []; const holes = [];
    const mv = (y, L) => { const lo = Math.min(c.ymin, L / 2), m = y < lo - 0.05 || y > L - lo + 0.05; return { y: y < lo ? lo : y > L - lo ? L - lo : y, m }; };
    if (c.shape === 'round') {
      const D = +d.d; if (!(D > 0)) return null;
      const fr = TRV.roundFr(c.rule, c.rings);
      for (let a = 0; a < c.axes; a++) {
        const ang = (90 + a * 180 / c.axes) * Math.PI / 180; // A on top, then to the left: 90° apart (2 axes) or 60° (3 axes)
        const ux = Math.cos(ang), uy = -Math.sin(ang); const hole = TRV.HOLES[a];
        holes.push({ id: hole, u: 0.5 + 0.5 * ux, v: 0.5 + 0.5 * uy, ang });
        fr.forEach((f, j) => { const r = mv(f * D, D); const s = 0.5 - r.y / D; pts.push({ i: pts.length, hole, n: j + 1, f, y: r.y, depth: r.y + c.wall, moved: r.m, u: 0.5 + s * ux, v: 0.5 + s * uy }); });
      }
    } else {
      const W = +d.w, H = +d.h; if (!(W > 0 && H > 0)) return null;
      const fx = TRV.lineFr(c.rule, c.nx), fy = TRV.lineFr(c.rule, c.ny);
      const top = c.side === 'w'; // holes in the top side (width B), the probe goes down along H; else holes in the left side (height H)
      const along = top ? fx : fy, deep = top ? fy : fx, La = top ? W : H, Ld = top ? H : W;
      along.forEach((fa, h) => {
        const hole = TRV.HOLES[h] || String(h + 1); const ra = mv(fa * La, La);
        holes.push(top ? { id: hole, u: ra.y / W, v: 0 } : { id: hole, u: 0, v: ra.y / H });
        deep.forEach((fd, j) => { const r = mv(fd * Ld, Ld);
          pts.push({ i: pts.length, hole, n: j + 1, f: fd, y: r.y, depth: r.y + c.wall, moved: r.m || ra.m, x: ra.y, u: top ? ra.y / W : r.y / W, v: top ? r.y / H : ra.y / H }); });
      });
    }
    return { cfg: c, holes, pts, N: pts.length, dh: TRV.dh(d), aspect: c.shape === 'rect' ? d.w / d.h : 1 };
  },
  /** label of a point: «A3» */
  name: (q) => q.hole + q.n,
  /** velocity of each point of a phase (null where not measured) */
  velocities(p, pt, phase) {
    const rd = (pt.meas && pt.meas[phase] && pt.meas[phase].r) || []; const rho = p && isNum(p.rho) && p.rho > 0 ? p.rho : 1.2;
    return rd.map(x => !isNum(x) ? null : pt.method === 'pitot' ? Math.sqrt(2 * Math.max(x, 0) / rho) : x);
  },
  /** the profile of a phase: { v[], n, N, mean, sd, cv, out: indexes > ±25 % of the mean, next: first point without a reading } */
  stats(p, pt, phase, g) {
    g = g || TRV.grid(pt); const N = g ? g.N : 0; const v = TRV.velocities(p, pt, phase);
    const vals = v.slice(0, N || v.length).filter(isNum); const n = vals.length;
    const m = n ? vals.reduce((s, x) => s + x, 0) / n : null;
    const sd = n > 1 ? Math.sqrt(vals.reduce((s, x) => s + (x - m) * (x - m), 0) / (n - 1)) : null;
    const out = []; if (n >= 3 && m > 0) v.forEach((x, i) => { if (isNum(x) && i < N && Math.abs(x - m) / m > 0.25) out.push(i); });
    let next = -1; for (let i = 0; i < N; i++) if (!isNum(v[i])) { next = i; break; }
    return { v, n, N, mean: m, sd, cv: isNum(sd) && m > 0 ? sd / m : null, out, next };
  },
  /** checks before / during the measurement: [{ k, ... }] — the editor and the report word them */
  checks(p, pt, phase, g) {
    g = g || TRV.grid(pt); if (!g) return [];
    const d = pt.duct || {}; const out = []; const dh = g.dh / 1000;
    if (isNum(d.up) && dh && d.up < 6 * dh) out.push({ k: 'up', v: d.up, need: 6 * dh });
    if (isNum(d.dn) && dh && d.dn < 2 * dh) out.push({ k: 'dn', v: d.dn, need: 2 * dh });
    const mv = g.pts.filter(q => q.moved); if (mv.length) out.push({ k: 'moved', n: mv.length, ymin: g.cfg.ymin });
    if (phase) {
      const st = TRV.stats(p, pt, phase, g);
      if (pt.method === 'pitot' && st.n >= Math.min(3, st.N) && isNum(st.mean) && st.mean < 5) out.push({ k: 'slow', v: st.mean });
      if (st.out.length) out.push({ k: 'out', pts: st.out.map(i => TRV.name(g.pts[i])) });
      const rd = (pt.meas && pt.meas[phase] && pt.meas[phase].r) || [];
      if (rd.slice(g.N).some(isNum)) out.push({ k: 'extra', n: rd.slice(g.N).filter(isNum).length });
      if (TRV.changed(pt, phase, g)) out.push({ k: 'changed' });
    }
    return out;
  },
  /** colour of v / v avg.: the same classes as the legend, blended (blue slow → pale green ±10 % → red fast) */
  STOPS: [[0.6, [33, 82, 150]], [0.825, [140, 182, 222]], [1, [214, 232, 222]], [1.175, [242, 178, 120]], [1.4, [190, 60, 40]]],
  color(r) {
    const S = TRV.STOPS; if (!(r > S[0][0])) return S[0][1]; if (r >= S[S.length - 1][0]) return S[S.length - 1][1];
    for (let i = 1; i < S.length; i++) if (r < S[i][0]) { const [a, ca] = S[i - 1], [b, cb] = S[i]; const k = (r - a) / (b - a); return ca.map((x, j) => Math.round(x + (cb[j] - x) * k)); }
    return S[S.length - 1][1];
  },
  /** 0.9.39: the «cloud» of the velocity profile — every measured point spreads its v / v avg. as a soft spot (Gaussian), the spots
   *  blend where they meet and fade away from the points; clipped to the section. A PNG data URL of px × px·(H/W), or null. */
  cloud(g, st, px = 160) {
    if (typeof document === 'undefined' || !g || !st || !(st.mean > 0)) return null;
    const P = g.pts.filter(q => isNum(st.v[q.i])); if (P.length < 2) return null;
    const round = g.cfg.shape === 'round'; const asp = round ? 1 : g.aspect || 1; // width / height
    const W = Math.round(asp >= 1 ? px : px * asp), H = Math.round(asp >= 1 ? px / asp : px);
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const cx = cv.getContext('2d'); if (!cx) return null;
    const img = cx.createImageData(W, H); const sx = asp >= 1 ? 1 : asp, sy = asp >= 1 ? 1 / asp : 1; // physical scale of u, v
    const sig = 0.62 / Math.sqrt(g.N) * Math.max(sx, sy); const s2 = 2 * sig * sig;
    const pts = P.map(q => [q.u * sx, q.v * sy, st.v[q.i] / st.mean]);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const u = (x + 0.5) / W, v = (y + 0.5) / H;
      if (round && (u - 0.5) * (u - 0.5) + (v - 0.5) * (v - 0.5) > 0.25) continue;
      let sw = 0, sr = 0; const pu = u * sx, pv = v * sy;
      for (const [a, b, r] of pts) { const w = Math.exp(-((pu - a) * (pu - a) + (pv - b) * (pv - b)) / s2); sw += w; sr += w * r; }
      if (sw < 1e-4) continue;
      const c = TRV.color(sr / sw); const i = (y * W + x) * 4; img.data[i] = c[0]; img.data[i + 1] = c[1]; img.data[i + 2] = c[2];
      img.data[i + 3] = Math.round(235 * (1 - Math.exp(-2.2 * sw)));
    }
    cx.putImageData(img, 0, 0);
    try { return cv.toDataURL('image/png'); } catch (e) { return null; }
  },
  /** the identity of a grid: other points → other readings */
  sig(g) { const c = g.cfg; return [c.shape, c.rule, c.rings || '', c.axes || '', c.nx || '', c.ny || '', c.side || '', g.N, g.pts.map(q => Math.round(q.y)).join('.')].join('|'); },
  /** the readings of a phase were typed on another grid */
  changed(pt, phase, g) { const m = pt.meas && pt.meas[phase]; return !!(m && m.gsig && (m.r || []).some(isNum) && g && m.gsig !== TRV.sig(g)); },
  /** is the grid used for this point: chosen, or a new Pitot / traverse point without readings */
  on(pt) {
    if (!pt || !pt.duct || !['pitot', 'traverse'].includes(pt.method)) return false;
    if (pt.duct.plan != null) return !!pt.duct.plan;
    return !['eerste', 'controle'].some(ph => ((pt.meas && pt.meas[ph] && pt.meas[ph].r) || []).some(isNum));
  },
};
