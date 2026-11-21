/* ---------- 0.13.2: the toolbars of the points and the measurements; folding of the project cards; the drop-downs ----------
   [Filter] (badge = filters set), [Sort] (by unit / branch, by floor / room, order by hand, units by code), [Add] (points, series, units,
   import, documents, AI plan, package for a crew). A drop-down closes after one of its actions and stays open while its own filters change.
   The file fields sit outside the menus: a closed menu cannot open a file picker. */
const BARI = {
  plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  filter: '<svg viewBox="0 0 24 24"><path d="M4 5h16l-6 8v6l-4-2v-4z"/></svg>',
  sort: '<svg viewBox="0 0 24 24"><path d="M8 4v16M4 8l4-4 4 4M16 20V4M12 16l4 4 4-4"/></svg>',
};
/** the open drop-downs of a page, to put them back after a render of the same step */
const DDK = {
  st: null, ks: [],
  open() { this.st = S.step; this.ks = [...app.querySelectorAll('details.dd[open]')].map(d => d.dataset.dd); return this.ks.length ? this : null; },
  restore(same) { if (!this.ks.length || !same || this.st !== S.step) return; this.ks.forEach(k => { const d = app.querySelector(`details.dd[data-dd="${k}"]`); if (d) d.open = true; }); this.ks = []; },
};
document.addEventListener('click', (e) => {
  const t = e.target; if (!t || !t.closest) return;
  const own = t.closest('details.dd');
  const item = t.closest('details.dd .dd-item');
  if (item && !item.hasAttribute('data-keep')) { const d = item.closest('details.dd'); if (d) d.open = false; } // an action closes its menu before it runs
  document.querySelectorAll('details.dd[open]').forEach(d => { if (d !== own) d.open = false; });
}, true);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') document.querySelectorAll('details.dd[open]').forEach(d => { d.open = false; }); });

function ddBox(key, label, icon, body, o = {}) {
  return `<details class="dd" data-dd="${key}"><summary class="btn sm${o.primary ? ' primary' : ''}" aria-label="${esc(label)}"${o.title ? ` title="${esc(o.title)}"` : ''}><span class="ddi" aria-hidden="true">${icon}</span><span class="ddl">${esc(label)}</span>${o.badge ? `<span class="ddb">${o.badge}</span>` : ''}</summary><div class="dd-menu">${body}</div></details>`;
}
const ddItem = (act, label, o = {}) => `<button type="button" class="dd-item${o.on ? ' on' : ''}${o.strong ? ' strong' : ''}" data-act="${act}"${o.keep ? ' data-keep' : ''}${o.v !== undefined ? ` data-v="${esc(o.v)}"` : ''}${o.mode ? ` data-mode="${esc(o.mode)}"` : ''}>${o.mark ? `<span class="ddm">${o.on ? '✓' : ''}</span>` : ''}${label}</button>`;
const DOCS_ACCEPT = '.pdf,.xlsx,.xlsm,.xls,.csv,.txt,.dxf,.dwg,image/*,application/pdf,text/plain,text/csv';
const AI_ACCEPT = '.pdf,application/pdf,image/*,.xlsx,.xlsm,.csv,.dxf,.txt,text/plain';
/** the hidden file fields of the points: outside the menus */
function ptsFiles(p, pk) {
  if (pk) return '';
  return `<input type="file" id="importXlsxFile" class="vh" accept=".xlsx,.xlsm,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet">`
    + `<input id="batchFile-merge" class="vh" type="file" multiple data-batch="merge" accept="${DOCS_ACCEPT}">`
    + (typeof AIP === 'undefined' ? '' : `<input type="file" id="aiPlanFile-merge" data-aifile="merge" class="vh" multiple accept="${AI_ACCEPT}">`);
}
/** the toolbar: o.add (the Add menu), o.filter (default on), o.todo (filter «only without measurement»), o.points (points page: order by hand, units by code), o.pk */
function ptsBar(p, o = {}) {
  const pk = !!o.pk; const f = S.f || {};
  const nf = [f.sys && f.sys !== 'all', f.dir && f.dir !== 'all', f.zone && f.zone !== 'all', f.room && f.room !== 'all', o.todo && f.todo].filter(Boolean).length;
  const branch = f.order !== 'room';
  const filt = o.filter === false ? '' : ddBox('filter', __('Filter'), BARI.filter,
    `<div class="dd-fl">${filtersHTML(p, !!o.todo, { noOrder: true })}</div>`, { badge: nf || '', title: __('Filter the points') });
  const sortBody = [
    ddItem('fltOrder', __h('By unit / branch'), { on: branch, mark: true, keep: true, v: 'branch' }),
    ddItem('fltOrder', __h('By floor / room'), { on: !branch, mark: true, keep: true, v: 'room' }),
    (o.points && !pk && Access.can('structure.edit') && branch) ? ddItem('reorder', S.reorder ? __h('Done') : __h('Order points by hand'), { on: !!S.reorder, keep: true, mark: true }) : '',
    (o.points && !pk && p.systems.length > 1) ? ddItem('sysSort', __h('Order units by code')) : '',
  ].join('');
  const sort = ddBox('sort', __('Sort'), BARI.sort, sortBody, { title: __('Order of the points') });
  let add = '';
  if (o.add) {
    const items = [];
    if (p.systems.length) items.push(ddItem('addPt', __h('+ Point'), { strong: true }), ddItem('bulk', __h('+ Series')));
    if (!pk) {
      items.push(ddItem('addSys', __h('+ Unit')), '<div class="dd-sep"></div>',
        ddItem('importXlsx', `${ICON.grid} ${__h('Import from Excel')}`), ddItem('importTpl', __h('Excel template')),
        `<label class="dd-item" for="batchFile-merge">📎 ${__h('Add documents')}</label>`);
      if (typeof AIP !== 'undefined') items.push(`<button type="button" class="dd-item" data-act="aiPlan" data-mode="merge">✦ ${__h('Read a plan with AI')}</button>`);
      if ((p.docs || []).length && p.systems.length) items.push(ddItem('pvPlace', `${ICON_PLAN} ${__h('On the plan')}`));
      if (p.systems.length) items.push('<div class="dd-sep"></div>', ddItem('pkNew', __h('+ Package for a crew')));
    } else if ((p.docs || []).length) items.push(ddItem('pvPlace', `${ICON_PLAN} ${__h('On the plan')}`));
    add = ddBox('add', __('Add'), BARI.plus, items.join(''), { primary: true, title: __('Add points, units, documents') });
  }
  return `<div class="ptsbar">${o.title ? `<h2 class="ptsbar-t">${esc(o.title)}</h2>` : ''}<span class="spacer"></span>${filt}${sort}${add}</div>`;
}

/* ---------- folding of a card: the title is the summary («+» / «−»), the content folds away; the state is kept per project (DET) ---------- */
function foldEl(sec) {
  const h = sec.querySelector(':scope > .hd'); if (!h) return;
  const h2 = h.querySelector('h2');
  const d = document.createElement('details'); d.className = 'card fold' + [...sec.classList].filter(c => c !== 'card').map(c => ' ' + c).join(''); if (sec.id) d.id = sec.id; d.dataset.k = 'card|' + (h2 ? h2.textContent.trim() : sec.textContent.trim().slice(0, 40)); d.open = true;
  const sm = document.createElement('summary'); sm.className = 'hd fold-hd'; while (h.firstChild) sm.appendChild(h.firstChild);
  const body = document.createElement('div'); body.className = 'fold-body';
  let n = h.nextSibling; while (n) { const nx = n.nextSibling; body.appendChild(n); n = nx; }
  h.remove(); d.append(sm, body); sec.replaceWith(d);
}
/** the cards of a step (or of a block with data-blk) become folding cards */
function foldStep(html) {
  const t = document.createElement('template'); t.innerHTML = html;
  for (const el of [...t.content.children]) {
    if (el.classList.contains('card')) foldEl(el);
    else if (el.dataset && el.dataset.blk) { const s = el.querySelector(':scope > section.card'); if (s) foldEl(s); }
  }
  return t.innerHTML;
}
/** one block of the project step re-drawn alone (plans, documents): no render of the page, no jump */
const BLOCKS = { plans: (p) => foldStep(plansCardHTML(p)) };
function blkRefresh(name) {
  const p = cur(); const el = app.querySelector(`[data-blk="${name}"]`);
  if (!p || !el || !BLOCKS[name] || el.dataset.docs !== String((p.docs || []).length)) return render(); // a new plan adds the icon in the header: full render, the scroll is kept
  el.innerHTML = BLOCKS[name](p);
  if (typeof DET !== 'undefined') DET.apply(el);
  Access.decorate(el); hydratePhotos(el); hydratePlans(el);
}
