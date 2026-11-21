/* ---------- 0.13.1: the page stays as the user left it ----------
   1. Open / closed state of the folding blocks (details[data-k]: unit, duct pressures, notes, …) is remembered per project when the
      user folds or opens one; a re-render no longer brings back the defaults.
   2. Closing the point panel keeps the place in the list: the worked row stays where it was (or comes into view), no jump to the top.
   3. The worked row is marked clearly, and a pin at the top or bottom edge brings it back when it is scrolled out of sight. */
const DET = {
  LS: 'inregelaar.det.v1', m: null,
  all() { if (!this.m) { try { this.m = JSON.parse(localStorage.getItem(this.LS) || '{}') || {}; } catch (e) { this.m = {}; } } return this.m; },
  of(pid) { const a = this.all(); return a[pid] || (a[pid] = {}); },
  set(pid, k, open) { if (!pid || !k) return; this.of(pid)[k] = open ? 1 : 0; try { localStorage.setItem(this.LS, JSON.stringify(this.m)); } catch (e) { } },
  apply(root) { const p = typeof cur === 'function' ? cur() : null; if (!p || !root) return; const m = this.of(p.id);
    root.querySelectorAll('details[data-k]').forEach(d => { const v = m[d.dataset.k]; if (v === 1 && !d.open) d.open = true; else if (v === 0 && d.open) d.open = false; }); },
};
// only the user's own folding counts (a click on the summary, also Enter / Space on it): defaults and programmatic changes are not stored
document.addEventListener('click', (e) => {
  const sm = e.target && e.target.closest && e.target.closest('summary'); if (!sm) return;
  const d = sm.parentElement; if (!d || d.tagName !== 'DETAILS' || !d.dataset.k) return;
  if (e.target.closest('a, button, input, select, label') && e.target.closest('a, button, input, select, label') !== sm) return;
  const p = cur(); if (p) DET.set(p.id, d.dataset.k, !d.open); // the click toggles after this handler
}, true);

/** the row of a point in the list / table */
const rowOf = (id) => id ? app.querySelector(`[data-row="${CSS.escape(id)}"]`) : null;
/** visible band of the page: under the sticky header, above a bottom-docked panel */
function viewBand() {
  const top = (app.querySelector('.top')?.getBoundingClientRect().bottom || 0) + 8;
  const sh = sheetEl.querySelector('.sheet'); let bottom = document.body.dataset.dock === 'b' && sh && !sheetEl.hidden ? sh.getBoundingClientRect().top - 8 : window.innerHeight - 8;
  const tb = app.querySelector('nav.tabbar'); if (tb && tb.offsetParent) bottom = Math.min(bottom, tb.getBoundingClientRect().top - 8); // the tab bar of a phone sits over the page
  return { top, bottom };
}
/** run a render and keep the given row (else the scroll position) where it was on screen */
function keepPlace(id, fn) {
  const r0 = rowOf(id); const y0 = window.scrollY; const t0 = r0 ? r0.getBoundingClientRect().top : null;
  fn();
  const r1 = rowOf(id);
  if (r1 && t0 != null) { window.scrollBy(0, r1.getBoundingClientRect().top - t0); }
  else window.scrollTo(0, y0);
  if (r1) { const b = viewBand(); const rc = r1.getBoundingClientRect(); if (rc.top < b.top || rc.bottom > b.bottom) window.scrollBy(0, rc.top - (b.top + b.bottom) / 2 + rc.height / 2); }
  KEEP.mark();
}

/* the pin of the worked point when its row is out of sight */
const KEEP = {
  last: null, el: null,
  id() { return S.view === 'project' ? selId() : null; },
  mark() {
    const id = this.id(); const p = cur();
    this.pin();
  },
  pin() {
    const id = this.id(); const r = rowOf(id);
    if (!this.el) { this.el = document.createElement('button'); this.el.type = 'button'; this.el.className = 'rowpin'; this.el.hidden = true; this.el.dataset.act = 'rowPin'; document.body.appendChild(this.el); }
    if (!id || !r) { this.el.hidden = true; return; }
    const b = viewBand(); const rc = r.getBoundingClientRect();
    const up = rc.bottom < b.top + 4, down = rc.top > b.bottom - 4;
    if (!up && !down) { this.el.hidden = true; return; }
    const pt = cur() && cur().points.find(x => x.id === id);
    this.el.textContent = `${up ? '▲' : '▼'} ${(pt && pt.code) || __('Point')}`; this.el.title = __('Back to the point in the list');
    this.el.style.top = up ? (b.top + 6) + 'px' : ''; this.el.style.bottom = down ? (window.innerHeight - b.bottom + 6) + 'px' : '';
    this.el.hidden = false;
  },
  go(id) { const r = rowOf(id || this.id() || this.last); if (!r) return; const b = viewBand(); const rc = r.getBoundingClientRect();
    window.scrollBy({ top: rc.top - (b.top + b.bottom) / 2 + rc.height / 2, behavior: 'smooth' }); r.classList.add('flash'); setTimeout(() => r.classList.remove('flash'), 900); },
};
{ let q = 0; const f = () => { if (q) return; q = requestAnimationFrame(() => { q = 0; KEEP.pin(); }); };
  window.addEventListener('scroll', f, { passive: true }); window.addEventListener('resize', f); }
