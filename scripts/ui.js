/* ---------- UI ---------- */
/* the app mark (W2: building with supply and extract air) — colours as in the Fresh Air style */
const BRAND_MARK = '<svg viewBox="0 0 64 64"><path d="M8 29L32 9L56 29" stroke="#0F3D3E" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M13 25V55H51V25" stroke="#0F3D3E" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M18 33H38C42 33 44.5 30.5 44.5 27.5C44.5 24.5 42 22.5 39.5 22.5C37 22.5 35.5 24.5 35.5 26.5" stroke="#1E7A55" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M46 41H26C22 41 19.5 43.5 19.5 46.5C19.5 49.5 22 51.5 24.5 51.5C27 51.5 28.5 49.5 28.5 47.5" stroke="#1D6E99" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const ICON = {
  back: '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>',
  close: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  gear: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
  file: '<svg viewBox="0 0 24 24"><path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/></svg>',
  play: '<svg viewBox="0 0 24 24"><path d="M7 5l12 7-12 7z"/></svg>',
  camera: '<svg viewBox="0 0 24 24"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>',
  image: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/></svg>',
  grid: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="1.5"/><path d="M3 9h18M3 14h18M9 4v16"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="M5 12l5 5 9-10"/></svg>',
  fan: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="1.6"/><path d="M12 10.4C11 7 11.6 4 14 3.6c2.6-.4 3 2.6.6 4.6l-1.8 1.4M13.6 12c3.4-1 6.4-.4 6.8 2 .4 2.6-2.6 3-4.6.6l-1.4-1.8M12 13.6c1 3.4.4 6.4-2 6.8-2.6.4-3-2.6-.6-4.6l1.8-1.4M10.4 12C7 13 4 12.4 3.6 10c-.4-2.6 2.6-3 4.6-.6l1.4 1.8"/></svg>',
};
const app = document.getElementById('app');
const sheetEl = document.getElementById('sheet');
const viewerEl = document.getElementById('viewer');
const STANDALONE = !(window.claude && typeof window.claude.use === 'function');
/** light / dark / automatic (system) look — a choice of this device, apart from the account and the demo (0.9.14) */
const Theme = {
  KEY: 'inregelaar.theme',
  get() { try { const v = localStorage.getItem(this.KEY); return v === 'light' || v === 'dark' ? v : 'auto'; } catch (e) { return 'auto'; } },
  set(v) { try { if (v === 'light' || v === 'dark') localStorage.setItem(this.KEY, v); else localStorage.removeItem(this.KEY); } catch (e) { } this.apply(); },
  apply() { const v = this.get(), r = document.documentElement; if (v === 'auto') delete r.dataset.theme; else r.dataset.theme = v; },
};
Theme.apply();
let S = { view: 'home', pid: null, step: 0, f: { sys: 'all', dir: 'all', todo: false }, ed: null, dlg: null, confirm: null, adj: {}, fan: {}, list: [], scrollTop: 0, pv: null };
const cur = () => (S.pid ? Store.projects[S.pid] : null);
function touch(p) { Store.touch(p); }

/** label with an optional hint: the term as it appears in the report (when the report language differs from the interface) */
/** report term shown next to an interface label (Settings → hints), '' when not needed */
function repHint(repTerm, label) {
  const h = Settings.v.hints || 'auto'; if (!repTerm || h === 'off' || (h === 'auto' && I18N.cur.ui === I18N.cur.rep)) return '';
  const t = _r(repTerm); const plain = String(label || '').replace(/<[^>]*>/g, '').replace(/&[a-z]+;/g, ' ').trim().toLowerCase();
  return t && t.trim().toLowerCase() !== plain ? t : '';
}
function lbl(text, repTerm) {
  const t = repHint(repTerm, text);
  return `<span class="label">${text}${t ? ` <span style="text-transform:none;letter-spacing:0;font-weight:500;opacity:.75">· ${esc(t)}</span>` : ''}</span>`;
}
function langSeg(act, cur, packs) { return packs.length <= 4 ? seg(act, cur, Object.fromEntries(packs.map(x => [x.code, x.code.toUpperCase()]))) : `<select data-lang="${act}" aria-label="${__h('Language')}">${packs.map(x => `<option value="${x.code}"${x.code === cur ? ' selected' : ''}>${esc(x.name)}</option>`).join('')}</select>`; }
function fid(...parts) { return 'f-' + parts.join('-').replace(/[^a-zA-Z0-9_-]/g, '_'); }
/** ± before a number field that can be negative (static pressure in extract ducts, outdoor temperature): many Android number pads have no minus key */
const sgn = (field, ro) => `<div class="sgn"><button type="button" class="pm" data-pm tabindex="-1" aria-label="${__h('Change sign')}" title="${__h('Change sign')}"${ro ? ' disabled' : ''}>±</button>${field}</div>`;
function inp(bind, value, o = {}) {
  const id = o.id || fid(bind.pt || bind.sys || bind.ins || bind.grp || 'p', bind.f);
  const attrs = `${bind.pt ? ` data-pt="${bind.pt}"` : ''}${bind.sys ? ` data-sys="${bind.sys}"` : ''}${bind.ins ? ` data-ins="${bind.ins}"` : ''}${bind.grp ? ` data-grp="${bind.grp}"` : ''} data-f="${bind.f}"${o.rrw ? ' data-rrw' : ''}${o.small ? ' data-small' : ''}${o.scale && o.scale !== 1 ? ` data-scale="${o.scale}"` : ''}${o.ro ? ' disabled' : ''}`;
  const field = o.num
    ? `<input id="${id}" class="num" inputmode="decimal" autocomplete="off" enterkeyhint="next" data-num${attrs} value="${esc(fmtIn(value))}" placeholder="${esc(o.ph || '')}">`
    : o.type === 'date' ? `<input id="${id}" type="date"${attrs} value="${esc(value || '')}">`
      : o.area ? `<textarea id="${id}"${attrs} placeholder="${esc(o.ph || '')}">${esc(value || '')}</textarea>`
        : `<input id="${id}" type="text" autocomplete="off"${o.list ? ` list="${o.list}"` : ''}${attrs} value="${esc(value || '')}" placeholder="${esc(o.ph || '')}">`;
  const withUnit = o.unit ? `<div class="unit">${field}<em>${o.unit}</em></div>` : field;
  const wrapped = o.neg && o.num ? sgn(withUnit, o.ro) : withUnit;
  return o.label === false ? wrapped : `<label class="field${o.full ? ' full' : ''}" for="${id}">${lbl(o.label || '', o.nl)}${wrapped}</label>`;
}
function sel(bind, value, options, o = {}) {
  const id = o.id || fid(bind.pt || bind.sys || bind.ins || bind.grp || 'p', bind.f);
  const attrs = `${bind.pt ? ` data-pt="${bind.pt}"` : ''}${bind.sys ? ` data-sys="${bind.sys}"` : ''}${bind.ins ? ` data-ins="${bind.ins}"` : ''}${bind.grp ? ` data-grp="${bind.grp}"` : ''} data-f="${bind.f}"${o.rr ? ' data-rr' : ''}${o.rrw ? ' data-rrw' : ''}${o.ro ? ' disabled' : ''}`;
  const opts = Object.entries(options).map(([k, v]) => `<option value="${esc(k)}"${String(k) === String(value) ? ' selected' : ''}>${esc(v)}</option>`).join('');
  return `<label class="field${o.full ? ' full' : ''}" for="${id}">${lbl(o.label || '', o.nl)}<select id="${id}"${attrs}>${opts}</select></label>`;
}
function chk(bind, value, text, o = {}) {
  const id = fid(bind.pt || bind.sys || bind.grp || 'p', bind.f);
  return `<label class="check" for="${id}"><input id="${id}" type="checkbox"${bind.pt ? ` data-pt="${bind.pt}"` : ''}${bind.sys ? ` data-sys="${bind.sys}"` : ''}${bind.grp ? ` data-grp="${bind.grp}"` : ''} data-f="${bind.f}"${o.rr ? ' data-rr' : ''}${o.rrw ? ' data-rrw' : ''}${value ? ' checked' : ''}${o.ro ? ' disabled' : ''}><span>${text}</span></label>`;
}
function seg(act, value, options, extra = '') {
  return `<div class="seg" role="group">${Object.entries(options).map(([k, v]) => `<button type="button" class="${String(k) === String(value) ? 'on' : ''}" data-act="${act}" data-v="${esc(k)}"${extra}>${esc(v)}</button>`).join('')}</div>`;
}
function syncBadge() {
  const st = Store.state;
  const t = { local: STANDALONE ? __('on the device') : __('on this device only'), cloud: __('saved'), saving: __('saving…'), error: __('save error'), connecting: __('connecting…') }[st] || '';
  return `<span class="sync" data-s="${st}" id="syncBadge" title="${esc(Store.lastErr || '')}">${Demo.on() ? '<b class="demo-tag">DEMO</b>' : ''}<i></i>${t}</span>`;
}
Store.onState = () => { const el = document.getElementById('syncBadge'); if (el) el.outerHTML = syncBadge(); };

let toastT = null;
function toast(msg) {
  let el = document.getElementById('toast');
  el.textContent = msg; el.classList.add('show'); clearTimeout(toastT);
  toastT = setTimeout(() => el.classList.remove('show'), 2600);
}

/* ---------- render root ---------- */
function render() {
  if (gateOn()) { S.view = 'home'; S.pid = null; S.ed = null; S.dlg = null; S.pv = null; renderGate(); renderSheet(); return; }
  if (S.view === 'home') renderHome(); else renderProject();
  Access.decorate(app);
  renderSheet();
  updateLive();
  hydratePhotos(app); hydratePlans(app);
}
function hydratePhotos(root) {
  const p = cur(); if (!p || !root) return;
  const by = new Map(allPhotos(p).map(x => [x.id, x]));
  root.querySelectorAll('img[data-ph]').forEach(async (img) => {
    if (img.getAttribute('src')) return; const ph = by.get(img.dataset.ph); if (!ph) return;
    const u = await Photos.src(ph); if (u) img.src = u; else img.closest('.thumb')?.classList.add('missing');
  });
}
function photosHTML(p, owner) {
  const list = photoList(p, owner, false);
  const oid = owner.replace(/[^a-zA-Z0-9]/g, '_');
  const th = (ph, ow, i, link) => `<button type="button" class="thumb${link ? ' linked' : ''}" data-act="viewPhoto" data-owner="${ow}" data-id="${ph.id}" aria-label="${__h('Photo')} ${i + 1}${ph.caption ? ': ' + esc(ph.caption) : ''}"><img data-ph="${ph.id}" alt="">${ph.caption ? `<em>${esc(ph.caption)}</em>` : ''}
    <span class="th-bd">${ph.src ? `<i title="${__h('Plan fragment')}">${ICON_PLAN}</i>` : ''}${ph.edit && hasEdit(ph.edit) ? `<i title="${__h('Edited')}">✎</i>` : ''}${link ? `<i title="${__h('Also for this point: stored at {x}', { x: ownerLabel(p, ow) })}">${ICON_LINK}</i>` : (ph.also || []).length ? `<i title="${__h('Also for {n} other points', { n: ph.also.length })}">${ICON_LINK}<b>${ph.also.length}</b></i>` : ''}</span></button>`;
  const linked = linkedPhotos(p, owner);
  return `<div class="photos" data-owner="${owner}">
    ${list.map((ph, i) => th(ph, owner, i, false)).join('')}${linked.map((x, i) => th(x.ph, x.owner, list.length + i, true)).join('')}
    ${(p.docs || []).length ? `<button type="button" class="thumb add" data-act="pvFrag" data-owner="${owner}">${ICON_PLAN}<span>${__h('From plan')}</span></button>` : ''}
    <label class="thumb add" for="cam-${oid}">${ICON.camera}<span>${__h('Camera')}</span><input class="vh" id="cam-${oid}" type="file" accept="image/*" capture="environment" data-addphoto="${owner}"></label>
    <label class="thumb add" for="gal-${oid}">${ICON.image}<span>${__h('File / PDF')}</span><input class="vh" id="gal-${oid}" type="file" accept="image/*,application/pdf,.pdf" multiple data-addphoto="${owner}"></label>
  </div>`;
}
function pageNotes(p, key) {
  const n = (p.notes && p.notes[key]) || { text: '', photos: [] };
  const cnt = (n.photos || []).length;
  return `<details class="more"${String(n.text || '').trim() || cnt ? ' open' : ''}><summary>${__h('Notes and photos for this page')}${cnt ? ` <span class="chip">${cnt} ${__h('photos')}</span>` : ''}</summary><div class="inner">
    ${inp({ f: `notes.${key}.text` }, n.text, { label: __('Note'), nl: RL.page[key], area: true, ph: __('Goes into the report, chapter «Opmerkingen en foto\'s»') })}
    ${photosHTML(p, 'page:' + key)}
  </div></details>`;
}

/** a newer Android app on the website (0.9.20) */
function updateBannerHTML() {
  const u = typeof Updater !== 'undefined' && Updater.info; if (!u) return '';
  return `<div class="banner upd-banner"><div class="stack-s" style="gap:2px"><b>${__h('Version {v} is available', { v: u.version })}</b>
    ${Updater.notes() ? `<span class="small">${esc(Updater.notes())}</span>` : ''}
    <span class="small muted">${__h('The browser downloads the update; open the file and tap «Update». Your projects stay on the device.')}</span></div>
    <button class="btn sm primary" data-act="appUpdate">${__h('Update')}${u.bytes ? ' · ' + Math.round(u.bytes / 1048576) + ' MB' : ''}</button></div>`;
}
function renderHome() {
  delete document.body.dataset.layout;
  const list = Object.values(Store.projects).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  const flow = [
    ['01', __('Project'), __('data, instruments, tolerances')], ['02', __('Points'), __('units, grilles, ducts')], ['03', __('Measure 1'), __('initial flows and damper positions')],
    ['04', __('Balancing'), __('proportional balancing')], ['05', __('Measure 2'), __('check after balancing')], ['06', __('Report'), __('inregelrapport in Excel and PDF')],
  ];
  app.innerHTML = `
  <header class="top"><div class="wrap bar">
    <div class="title"><h1>Ventilation Setup Tool <span class="ver" title="${__h('Version {v}', { v: APP_VERSION })} · ${esc(fmtDate(APP_BUILD, false))}">v${esc(APP_VERSION)}</span></h1><div class="sub">${__h('Ventilation commissioning · reports in Dutch and French')}</div></div>
    ${syncBadge()}
    <button class="iconbtn" data-act="settings" aria-label="${__h('Settings')}">${ICON.gear}</button>
  </div></header>
  <div class="wrap langbar">${langSeg('uiLang', I18N.cur.ui, I18N.list('ui'))}</div>
  <main class="wrap stack">
    ${updateBannerHTML()}
    ${DEMO_ED ? `<div class="banner demo-banner"><span>${__x('<b>Demo</b>: {p} project and up to {n} points, reports are marked DEMO. Your data stays in this browser.', { p: DEMO_LIMITS.projects, n: DEMO_LIMITS.points })}${/Android/i.test(navigator.userAgent) ? ' ' + __h('The Android app comes with the full version.') : ''}</span>
      <span class="row" style="gap:8px"><button class="btn sm primary" data-act="fullSignIn">${__h('Sign in / register')}</button></span></div>`
    : Demo.on() ? `<div class="banner demo-banner"><span>${__x('<b>Demo</b>: {p} project and up to {n} points, reports are marked DEMO. Your data stays in this browser.', { p: DEMO_LIMITS.projects, n: DEMO_LIMITS.points })}</span>
      <span class="row" style="gap:8px"><button class="btn sm primary" data-act="demoOut" data-v="signup">${__h('Create an account')}</button><button class="btn sm ghost" data-act="demoOut" data-v="signin">${__h('Leave the demo')}</button></span></div>` : ''}
    <section class="hero">
      <h1>${__h('Air flow balancing, step by step')}</h1>
      <p>${__h('Initial measurement, damper adjustment, control measurement and a finished inregelrapport. The flow is calculated on site: flow hood, anemometer, k-factor or Pitot tube traverse.')}</p>
    </section>
    <div class="flow">${flow.map(([n, t, d]) => `<div><b>${n}</b><span>${t}</span><em>${d}</em></div>`).join('')}</div>
    <div class="row" style="margin-top:8px"><h2 style="font-size:20px">${__h('Projects')}</h2><span class="spacer"></span>
      <span class="row" style="gap:8px;flex-wrap:nowrap;margin-left:auto"><button class="btn sm" data-act="import">${__h('Import .zip / .json / .xlsx')}</button>
      ${list.length ? `<button class="btn sm primary" data-act="newProject">${__h('+ New')}</button>` : ''}</span></div>
    ${list.length ? `<div class="stack-s proj-list">${list.map(projCard).join('')}</div>` : `
      <div class="empty"><b style="color:var(--fg)">${__h('No projects yet')}</b>
        <span class="small">${__h('Create a project or open the example with measurements filled in to see the whole way to the report.')}</span>
        <div class="row" style="justify-content:center"><button class="btn primary" data-act="newProject">${__h('+ New project')}</button><button class="btn" data-act="example">${__h('Open the example')}</button></div></div>`}
    ${list.length && !list.some(p => p.example) ? `<button class="btn ghost sm" data-act="example" style="justify-self:start">${__h('Open the example project')}</button>` : ''}
    <button class="btn ghost sm" data-act="importTpl" style="justify-self:start">${ICON.grid} ${__h('Excel template for a project import')}</button>
    ${docsBtn('new', 'ghost')}
    ${aiBtn('new', 'ghost')}
    <input type="file" id="importFile" class="vh" accept=".zip,.json,.xlsx,.xlsm,application/zip,application/json,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet">
  </main>`;
}
function projCard(p) {
  const pr = progress(p);
  return `<button class="proj" data-act="open" data-id="${p.id}">
    <span class="nm">${esc(p.info.name || __('Untitled'))}</span>
    <span class="nr">${esc(p.info.nr || '—')}</span>
    <span class="small muted" style="grid-column:1/-1">${p.pkg ? `<span class="chip pkg">${__h('Package')} · ${esc(p.pkg.name)}</span> ` : ''}${esc([p.info.client, dateNL(p.info.date), __('{n} points', { n: p.points.filter(measurable).length })].filter(Boolean).join(' · '))}${p.example ? ` · <b style="color:var(--ext)">${__h('example')}</b>` : ''}${(p.packages || []).some(r => r.status === 'issued') ? ` · <span class="chip acc">${__h('{n} open packages', { n: p.packages.filter(r => r.status === 'issued').length })}</span>` : ''}</span>
    <span class="prog">${pr.map(v => `<i class="${v >= 1 ? 'done' : ''}"><b style="width:${Math.round(v * 100)}%"></b></i>`).join('')}</span>
  </button>`;
}

/* ---------- layout (tablet first): side rail of steps when wide, tab bar below otherwise; table of measurements from 600 px; the point panel docks beside / below the table ---------- */
const MQ = { rail: window.matchMedia('(min-width: 1000px)'), tab: window.matchMedia('(min-width: 600px)') };
const isRail = () => MQ.rail.matches;
const useTable = () => MQ.tab.matches;
/** 'r' = point panel on the right, 'b' = point panel at the bottom (measurement in portrait), '' = full screen */
function dockMode() {
  if (!S.ed || S.dlg || S.view !== 'project') return '';
  if (isRail()) return 'r';
  if (useTable() && MEASURE_STEPS[S.step] && (S.ed.mode === 'eerste' || S.ed.mode === 'controle')) return 'b';
  return '';
}
function applyDock() {
  const d = dockMode();
  if (d) document.body.dataset.dock = d; else delete document.body.dataset.dock;
  const sh = sheetEl.querySelector('.sheet'); if (sh) { if (d) sh.removeAttribute('aria-modal'); else sh.setAttribute('aria-modal', 'true'); }
  syncSel();
}
/** highlight the point of the open panel in the table / list and keep it in view */
function syncSel(scroll) {
  const id = S.ed && dockMode() ? S.ed.id : null;
  let row = null;
  app.querySelectorAll('[data-row]').forEach(r => { const on = r.dataset.row === id; r.classList.toggle('sel', on); if (on && !row) row = r; });
  if (!row || !scroll) return;
  const rc = row.getBoundingClientRect(); const top = (app.querySelector('.top')?.getBoundingClientRect().bottom || 0) + 40;
  const sh = sheetEl.querySelector('.sheet'); const bottom = document.body.dataset.dock === 'b' && sh ? sh.getBoundingClientRect().top - 8 : window.innerHeight - 8;
  if (rc.top < top) window.scrollBy(0, rc.top - top); else if (rc.bottom > bottom) window.scrollBy(0, rc.bottom - bottom);
}
/** re-render everything, keeping the scroll position and the field with the focus */
function renderKeepAll() {
  const y = window.scrollY; const a = document.activeElement; const id = a && a !== document.body && a.id ? a.id : null;
  render(); window.scrollTo(0, y);
  if (id) { const n = document.getElementById(id); if (n && n.focus) { n.focus({ preventScroll: true }); try { const l = n.value.length; n.setSelectionRange(l, l); } catch { } } }
}
function relayout() {
  if (S.view !== 'project') return;
  const a = document.activeElement; // the on-screen keyboard is open: wait until the field is left
  if (a && a.matches && a.matches('input, textarea') && (app.contains(a) || sheetEl.contains(a))) { a.addEventListener('blur', () => setTimeout(relayout, 0), { once: true }); return; }
  renderKeepAll();
}
for (const m of Object.values(MQ)) { try { m.addEventListener('change', relayout); } catch (e) { m.addListener(relayout); } }
/** short counter beside a step: points, measured / all, dampers set / all */
function stepCount(p, i) {
  const meas = p.points.filter(x => measurable(x) && !isCtx(p, x));
  if (i === 1) return meas.length ? String(meas.length) : '';
  if (i === 2 || i === 4) { const ph = MEASURE_STEPS[i]; return meas.length ? `${meas.filter(x => isNum(ptQ(p, x, ph)) || x.status).length}/${meas.length}` : ''; }
  if (i === 3) { const regs = p.points.filter(x => hasReg(x) && !isCtx(p, x)); return regs.length ? `${regs.filter(x => DEVICE_ONLY.includes(x.reg.type) ? !!x.reg.state : !!String(x.reg.posAfter || '').trim()).length}/${regs.length}` : ''; }
  return '';
}

function renderProject() {
  const p = cur(); if (!p) { S.view = 'home'; return renderHome(); }
  const pr = progress(p);
  if (!stepAllowed(p, S.step)) S.step = nearStep(p, S.step, 1);
  const body = (isPkg(p) && S.step === 0 ? pkgProjectStep : isPkg(p) && S.step === 5 ? pkgReturnStep : [stepProject, stepPoints, (p) => stepMeasure(p, 'eerste'), stepDevices, (p) => stepMeasure(p, 'controle'), stepReport, stepHandover][S.step])(p);
  const names = stepNames(); if (isPkg(p)) names[5] = __('Hand in');
  const nx = nearStep(p, S.step + 1, 1), pv = nearStep(p, S.step - 1, -1);
  const rail = isRail(); document.body.dataset.layout = rail ? 'rail' : 'tabs';
  const stepBtn = (i, cls) => {
    const ok = stepAllowed(p, i), on = i === S.step, done = pr[i] >= 1, c = cls === 'rs' ? stepCount(p, i) : '';
    const lab = `<span class="rl">${esc(cls === 'tb' && i === 3 && !isPkg(p) ? stepShort(3) : names[i])}</span>`;
    const cnt = c ? `<span class="rc">${c}</span>` : '';
    const bar = cls === 'rs' ? `<span class="rlw"><span class="rlt">${lab}${cnt}</span><i class="rp"><b style="width:${Math.round(Math.max(0, Math.min(1, pr[i] || 0)) * 100)}%"></b></i></span>` : lab + cnt;
    return `<button class="${cls}${on ? ' on' : ''}${done ? ' done' : ''}${ok ? '' : ' off'}" data-act="step" data-v="${i}" title="${esc(names[i])}"${ok ? '' : ' disabled'}${on ? ' aria-current="step"' : ''}><span class="rn">${done && !on ? ICON.check : i + 1}</span>${bar}</button>`;
  };
  const title = esc(p.info.name || __('Untitled'));
  const chrome = rail
    ? `<nav class="rail" aria-label="${__h('Steps')}">
      <div class="rail-hd"><button class="iconbtn" data-act="home" aria-label="${__h('To projects')}" title="${__h('To projects')}">${ICON.back}</button>
        <div class="rt"><b>${title}</b><span>${esc(p.info.nr || '')}</span></div></div>
      <ol class="rail-steps">${names.map((n, i) => `<li>${stepBtn(i, 'rs')}</li>`).join('')}</ol>
      <div class="rail-ft">${syncBadge()}${(p.docs || []).length ? `<button class="btn sm" data-act="pvOpen" title="${__h('Floor plan')}">${ICON_PLAN}<span class="rl">${__h('Floor plan')}</span></button>` : ''}<button class="btn sm" data-act="settings" title="${__h('Settings')}">${ICON.gear}<span class="rl">${__h('Settings')}</span></button><span class="small muted rl" title="${__h('Version {v}', { v: APP_VERSION })}">v${esc(APP_VERSION)}</span></div>
    </nav>`
    : `<header class="top"><div class="wrap"><div class="bar">
      <button class="iconbtn" data-act="home" aria-label="${__h('To projects')}">${ICON.back}</button>
      <div class="title"><h1>${title}</h1><div class="sub">${esc([__('Step {a} of {b}', { a: S.step + 1, b: names.length }), names[S.step], p.info.nr].filter(Boolean).join(' · '))}</div></div>
      ${syncBadge()}
      ${(p.docs || []).length ? `<button class="iconbtn" data-act="pvOpen" aria-label="${__h('Floor plan')}" title="${__h('Floor plan')}">${ICON_PLAN}</button>` : ''}
      <button class="iconbtn" data-act="settings" aria-label="${__h('Settings')}">${ICON.gear}</button>
    </div></div></header>`;
  app.innerHTML = `${rail ? chrome : ''}<div class="content">${rail ? '' : chrome}
  <main class="wrap stack${MEASURE_STEPS[S.step] && useTable() ? ' wide' : ''}">
    ${rail ? `<div class="pagehd"><span class="label">${__h('Step {n}', { n: String(S.step + 1).padStart(2, '0') })}</span><h1>${esc(names[S.step])}</h1></div>` : ''}
    ${p.example ? `<div class="banner">${__h('Example with fictitious data. Change anything — it is the easiest way to learn the workflow.')}</div>` : ''}
    ${isPkg(p) ? pkgBanner(p) : ''}
    ${body}
    ${PAGE_KEYS[S.step] ? pageNotes(p, PAGE_KEYS[S.step]) : ''}
    <div class="stepnav">
      <button class="btn" data-act="prev"${pv === S.step ? ' disabled' : ''}>${__h('← Back')}</button>
      ${nx !== S.step ? `<button class="btn primary" data-act="next">${esc(names[nx])} →</button>` : `<button class="btn primary" data-act="home">${__h('To projects')}</button>`}
    </div>
  </main></div>
  ${rail ? '' : `<nav class="tabbar" aria-label="${__h('Steps')}">${names.map((n, i) => stepBtn(i, 'tb')).join('')}</nav>`}`;
  if (S.step === 5) { initSig(); if (STANDALONE && Folders.ok() && Folders.names[p.id] === undefined) Folders.get(p.id).then(() => { if (cur() === p && S.step === 5) renderKeepAll(); }); }
}

/* ---------- step 1: project ---------- */
function stepProject(p) {
  const I = p.info;
  return `
  <section class="card"><div class="hd"><h2>${__h('Project data')}</h2></div>
    <div class="grid2">
      ${inp({ f: 'info.nr' }, I.nr, { label: __('Project number'), nl: 'Projectnummer', ph: 'PMI2026-001' })}
      ${inp({ f: 'info.rev' }, I.rev, { label: __('Report version'), nl: 'Versie', ph: '1' })}
      ${inp({ f: 'info.name' }, I.name, { label: __('Site'), nl: 'Project', full: true, ph: 'Kantoorgebouw …' })}
      ${inp({ f: 'info.client' }, I.client, { label: __('Client'), nl: 'Opdrachtgever', full: true })}
      ${inp({ f: 'info.address' }, I.address, { label: __('Site address'), nl: 'Adres', full: true })}
      ${inp({ f: 'info.designer' }, I.designer, { label: __('Designer'), nl: 'Ontwerper', full: true })}
      ${inp({ f: 'info.schema' }, I.schema, { label: __('Scheme / drawings'), nl: 'Technisch schema', full: true, ph: 'VENT GLV (uitvoering, 28/11/25)' })}
      ${inp({ f: 'info.company' }, I.company, { label: __('Company'), nl: 'Uitgevoerd door' })}
      ${inp({ f: 'info.technician' }, I.technician, { label: __('Technician'), nl: 'Technieker' })}
      ${inp({ f: 'info.date' }, I.date, { label: __('Measurement date'), nl: 'Datum meting', type: 'date' })}
      ${inp({ f: 'info.tempC' }, I.tempC, { label: __('Air temp.'), nl: 'Luchttemperatuur', num: true, small: true, neg: true, unit: '°C' })}
      ${inp({ f: 'info.pressure' }, I.pressure, { label: __('Atm. pressure'), nl: 'Barometrische druk', num: true, small: true, unit: __('kPa') })}
    </div>
  </section>
  ${normsCardHTML(p)}
  <section class="card"><div class="hd"><h2>${__h('Tolerances and parameters')}</h2></div>
    <div class="grid3">
      ${inp({ f: 'tol.terminal' }, p.tol.terminal, { label: __('Grilles ±'), nl: 'eindtoestellen', num: true, unit: '%' })}
      ${inp({ f: 'tol.system' }, p.tol.system, { label: __('Unit ±'), nl: 'luchtgroep', num: true, unit: '%' })}
      ${inp({ f: 'tol.room' }, p.tol.room, { label: __('Room ± (sum of grilles)'), nl: 'ruimte', num: true, unit: '%' })}
      ${inp({ f: 'rho' }, p.rho, { label: __('Density ρ'), nl: 'luchtdichtheid', num: true, small: true, unit: __('kg/m³') })}
      ${inp({ f: 'tol.iunb' }, p.tol.iunb, { label: __('Current unbalance 3~ max.'), nl: 'onbalans stroom', num: true, small: true, unit: '%', ph: __('motor maker') })}
    </div>
    <p class="small muted" style="margin:0">${__h('The tolerance applies to the control measurement: deviation from the design flow within ±%. The density converts dynamic pressure into velocity. The limit of the current unbalance (max |I − Iavg| / Iavg) comes from the documentation of the motor maker.')}</p>
  </section>
  ${plansCardHTML(p)}
  ${teamCardHTML(p)}
  ${coverCard(p)}
  ${insCardHTML(p)}`;
}
/* ---------- measuring instruments: kind and range from the manufacturer's data sheet ---------- */
const insLabel = (ins) => [ins.name, ins.type].filter(Boolean).join(' · ') || __('Instrument');
function insUse(p, ins) { let n = 0; for (const x of p.points) for (const ph of ['eerste', 'controle']) if (x.meas && x.meas[ph] && x.meas[ph].ins === ins.id) n++; return n; }
function insCardHTML(p, emptyText) {
  const kinds = Object.assign({ '': '—' }, Object.fromEntries(INS_KINDS.map(k => [k, (L.inskind || {})[k] || k])));
  const nf = (ins, f, label, unit, ph) => inp({ ins: ins.id, f }, ins[f], { label, num: true, unit, ph });
  const row = (ins) => {
    const k = ins.kind; const n = insUse(p, ins);
    const rng = k === 'hood' ? nf(ins, 'qmin', __('Q from'), __('m³/h'), '42') + nf(ins, 'qmax', __('Q to'), __('m³/h'), '4250') + nf(ins, 'qacc', __('Accuracy specified from'), __('m³/h'), '85')
      : k === 'funnel' ? nf(ins, 'qmin', __('Q from'), __('m³/h')) + nf(ins, 'qmax', __('Q to'), __('m³/h')) + nf(ins, 'vmin', __('v from (vane)'), __('m/s'), '0,3')
        : k === 'vane' || k === 'hotwire' ? nf(ins, 'vmin', __('v from'), __('m/s'), k === 'vane' ? '0,3' : '0,1') + nf(ins, 'vmax', __('v to'), __('m/s'), '20') + '<div></div>'
          : k === 'dp' ? nf(ins, 'pmax', __('p max'), __('Pa'), '200') + nf(ins, 'vmin', __('v from (Pitot)'), __('m/s'), '2') + nf(ins, 'vmax', __('v to (Pitot)'), __('m/s'), '17,5') 
            : k === 'clamp' ? nf(ins, 'imax', __('I max'), __('A'), '400') + '<div></div><div></div>'
              : k === 'tacho' ? nf(ins, 'rmin', __('n from'), 'min⁻¹', '30') + nf(ins, 'rmax', __('n to'), 'min⁻¹', '99999') + '<div></div>' : '';
    return `<div class="ins">
      <div class="grid2">
        ${inp({ ins: ins.id, f: 'name' }, ins.name, { label: __('Instrument'), nl: 'Toestel', ph: (RL.inskind || {})[k] || 'Debietkap' })}
        ${inp({ ins: ins.id, f: 'type' }, ins.type, { label: __('Make / type'), nl: 'Type', ph: 'TSI PH731' })}
        ${sel({ ins: ins.id, f: 'kind' }, k || '', kinds, { label: __('Kind'), rr: true })}
        <label class="field" for="insp-${ins.id}">${lbl(__('From the data sheet'))}<select id="insp-${ins.id}" data-inspreset="${ins.id}"><option value="">—</option>${INS_PRESETS.map(x => `<option value="${x.key}">${esc(x.type)}</option>`).join('')}</select></label>
        ${inp({ ins: ins.id, f: 'serial' }, ins.serial, { label: __('Serial no.'), nl: 'Serienummer' })}
        ${inp({ ins: ins.id, f: 'cal' }, ins.cal, { label: __('Calibration'), nl: 'Kalibratie', type: 'date' })}
      </div>
      ${rng ? `<div class="grid3">${rng}</div>` : ''}
      ${k ? `<div class="grid2">${inp({ ins: ins.id, f: 'acc' }, ins.acc, { label: __('Accuracy (data sheet)'), ph: '±3 % ±12 m³/h' })}${inp({ ins: ins.id, f: 'src' }, ins.src, { label: __('Source (data sheet, link)'), ph: 'https://…' })}</div>` : ''}
      ${insCalOld(ins) ? `<div class="small warn-t">${__h('The calibration is older than a year — have the instrument calibrated before you use it for a report.')}</div>` : ''}
      <div class="small muted">${__h('Measurements: {n}', { n })}${ins.park && insParkById(ins.park) ? ' · ' + __h('from the company list') : ''}</div>
      <div class="row" style="flex-wrap:wrap;gap:6px">${insRowToolsHTML(ins)}<span class="spacer"></span><button class="btn sm danger" data-act="delIns" data-id="${ins.id}">${__h('Delete instrument')}</button></div>
    </div>`;
  };
  return `<section class="card"><div class="hd"><h2>${__h('Measuring instruments')}</h2><div class="row" style="gap:6px">${insFromSelHTML(p)}<button class="btn sm" data-act="addIns">${__h('+ Instrument')}</button></div></div>
    ${p.instruments.length ? `<p class="small muted" style="margin:0">${__h('Kind and range from the manufacturer\'s data sheet: in each measurement the instrument is chosen from this list, readings outside its range are flagged in the measurement and in the report.')}</p>${p.instruments.map(row).join('')}` : `<p class="small muted" style="margin:0">${emptyText || __h('Enter the instruments with their calibration date — they go into the report.')}${insPark().length ? '' : ' ' + __h('Tip: enter the instruments of the company once in Settings → Measuring instruments of the company, then add them here with «From the company list».')}</p>`}
  </section>`;
}
/** instrument choice in a measurement: fitting instruments first */
function insSelect(p, pt, phase) {
  const cur = (pt.meas && pt.meas[phase] && pt.meas[phase].ins) || '';
  const fit = p.instruments.filter(x => insFits(x, pt.method)), other = p.instruments.filter(x => !insFits(x, pt.method));
  const o = (x) => `<option value="${x.id}"${x.id === cur ? ' selected' : ''}>${esc(insLabel(x))}${x.serial ? ' · ' + esc(x.serial) : ''}</option>`;
  const id = fid(pt.id, 'ins', phase);
  if (!p.instruments.length) return `<div class="field full">${lbl(__('Instrument'), 'Meettoestel')}<div class="small muted">${__h('Add the instruments in step «Project».')} <button class="btn sm ghost" data-act="step" data-v="0">${__h('To the project')}</button></div></div>`;
  return `<label class="field full" for="${id}">${lbl(__('Instrument'), 'Meettoestel')}<select id="${id}" data-pt="${pt.id}" data-f="meas.${phase}.ins" data-rr>
    <option value=""${cur ? '' : ' selected'}>${__h('— not given —')}</option>${fit.map(o).join('')}${other.length ? `<optgroup label="${__h('Other instruments')}">${other.map(o).join('')}</optgroup>` : ''}</select>
    <span class="small" data-live="insw|${pt.id}|${phase}"></span></label>`;
}
/** text of the range check of one measurement */
function insWarnText(p, pt, phase) {
  const ins = insOf(p, pt, phase);
  if (!ins) return readings(pt, phase).length && p.instruments.length ? `<span class="warn-t">${__h('instrument not given')}</span>` : '';
  const out = insCheck(p, pt, phase).map(x => x.k === 'kind' ? __h('the instrument does not fit the method')
    : x.k === 'acc' ? __h('accuracy of the instrument not specified below {lim} {u}', { lim: fmt(x.lim, x.unit === 'm/s' ? 1 : 0), u: x.unit })
      : __h('outside the instrument range: {v} {u} (limit {lim} {u})', { v: fmt(x.v, x.unit === 'm/s' ? 2 : 0), lim: fmt(x.lim, x.unit === 'm/s' ? 1 : 0), u: x.unit }));
  return out.length ? `<span class="warn-t">${out.join(' · ')}</span>` : `<span class="muted">${esc([ins.acc, ins.cal ? __('calibration {d}', { d: fmtDate(ins.cal, false) }) : ''].filter(Boolean).join(' · '))}</span>`;
}

/* ---------- step 2: points ---------- */
function stepPoints(p) {
  const pk = isPkg(p);
  const sysCards = sysListHTML(p, pk);
  const pts = filtered(p, p.points, false);
  S.list = pts.map(x => x.id);
  return `
  <section class="group">
    <div class="group-hd"><h3>${__h('Units · Luchtgroepen')}</h3>${pk ? '' : `<span class="row" style="gap:6px">${p.systems.length > 1 ? `<button class="btn sm ghost" data-act="sysSort">${__h('Order by code')}</button>` : ''}<button class="btn sm" data-act="addSys">${__h('+ Unit')}</button></span>`}</div>
    ${sysCards || `<div style="padding:14px" class="small muted">${__h('First add an air handling unit with the design supply and extract flows — or load the points from Excel with the button below.')}</div>`}
  </section>
  ${!p.systems.length ? `<div class="row"><button class="btn sm" data-act="importXlsx">${ICON.grid} ${__h('Import from Excel')}</button><button class="btn sm ghost" data-act="importTpl">${__h('Excel template')}</button><input type="file" id="importXlsxFile" class="vh" accept=".xlsx,.xlsm">${docsBtn('merge')}${aiBtn('merge')}</div>` : ''}
  ${p.systems.length ? `
  <div class="row"><h2 style="font-size:18px">${__h('Points')}</h2><span class="spacer"></span>
    ${!pk && Access.can('structure.edit') && S.f.order !== 'room' ? `<button class="btn sm${S.reorder ? ' primary' : ''}" data-act="reorder" aria-pressed="${S.reorder ? 'true' : 'false'}" title="${__h('Order of the points on a branch')}">↕ ${S.reorder ? __h('Done') : __h('Order')}</button>` : ''}
    ${(p.docs || []).length ? `<button class="btn sm" data-act="pvPlace" title="${__h('Place points on the plan')}">${ICON_PLAN} ${__h('On the plan')}</button>` : ''}<button class="btn sm" data-act="bulk">${__h('+ Series')}</button><button class="btn sm primary" data-act="addPt">${__h('+ Point')}</button></div>
  ${pk ? '' : `<div class="row"><button class="btn sm" data-act="importXlsx">${ICON.grid} ${__h('Import from Excel')}</button><button class="btn sm ghost" data-act="importTpl">${__h('Excel template')}</button>${docsBtn('merge')}${aiBtn('merge')}<span class="spacer"></span><button class="btn sm" data-act="pkNew">${__h('+ Package for a crew')}</button>
    <input type="file" id="importXlsxFile" class="vh" accept=".xlsx,.xlsm,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"></div>`}
  ${filtersHTML(p, false)}
  ${pts.length ? groupsHTML(p, pts, 'setup') : `<div class="empty"><span class="small">${__h('Add grilles, ducts and dampers. «Series» creates several points at once: T1.01, T1.02 …')}</span></div>`}` : ''}`;
}
/** 0.9.5: the rooms (lokaal) of the project, or of one floor / zone, in natural order */
function roomOpts(p, zone) {
  return [...new Set(p.points.filter(x => x.room && (!zone || zone === 'all' || (x.zone || '') === zone)).map(x => x.room))].sort(natCmp);
}
function filtersHTML(p, withTodo) {
  const zs = [...new Set(p.points.map(x => x.zone || '').filter(Boolean))].sort(natCmp);
  const rs = roomOpts(p, S.f.zone);
  return `<div class="filters">
    <select id="flt-sys" data-flt="sys"><option value="all">${__h('All units')}</option>${sysFilterOpts(p)}</select>
    ${seg('fltDir', S.f.dir, { all: __('All'), T: __('Supply'), A: __('Extract') })}
    ${zs.length ? `<select id="flt-zone" data-flt="zone" aria-label="${__h('Floor / zone')}"><option value="all">${__h('All floors / zones')}</option>${zs.map(z => `<option value="${esc(z)}"${S.f.zone === z ? ' selected' : ''}>${esc(z)}</option>`).join('')}</select>` : ''}
    ${rs.length ? `<select id="flt-room" data-flt="room" aria-label="${__h('Room')}"><option value="all">${__h('All rooms')}</option>${rs.map(r => `<option value="${esc(r)}"${S.f.room === r ? ' selected' : ''}>${esc(r)}</option>`).join('')}</select>` : ''}
    ${seg('fltOrder', S.f.order || 'branch', { branch: __('By unit / branch'), room: __('By floor / room') })}
    ${withTodo ? `<label class="check" for="flt-todo" style="min-height:auto"><input id="flt-todo" type="checkbox" data-flt="todo"${S.f.todo ? ' checked' : ''}><span class="small">${__h('only without measurement')}</span></label>` : ''}
  </div>`;
}
/** the room filter (lokaal) */
const roomOk = (pt) => !S.f || !S.f.room || S.f.room === 'all' || (pt.room || '') === S.f.room;
function filtered(p, pts, measureOnly, phase) {
  return sortPoints(p, pts.filter(pt => (!measureOnly || measurable(pt))
    && inKey(p, S.f.sys, pt.systemId)
    && (S.f.dir === 'all' || pt.dir === S.f.dir)
    && (!S.f.zone || S.f.zone === 'all' || (pt.zone || '') === S.f.zone)
    && roomOk(pt)
    && (!S.f.todo || !phase || (!isNum(ptQ(p, pt, phase)) && !pt.status))), S.f.order);
}
/** 0.9.5: the name of a floor / zone and room: «Floor 1 · Lokaal 1.01» */
const roomLabel = (pt) => [pt.zone, pt.room].filter(Boolean).join(' · ') || __('no floor / room');
/** 0.9.5: the design flow of a room with supply and extract apart: «T 150 · A 140 m³/h» */
function roomSumText(p, arr) {
  const parts = ['T', 'A'].map(d => { const xs = arr.filter(x => x.dir === d && isEndFlow(p, x)); return xs.length ? `${d} ${fmt(xs.reduce((a, x) => a + (isNum(x.designQ) ? x.designQ : 0), 0))}` : ''; }).filter(Boolean);
  return parts.length ? `${parts.join(' · ')} ${__('m³/h')}` : ''; // a room with only dampers has no design flow
}
function groupsHTML(p, pts, mode) {
  const phase = mode === 'setup' ? null : mode;
  const byRoom = !!S.f && S.f.order === 'room'; // 0.9.5: order per floor / zone and room: supply and extract of one room together
  const groups = new Map();
  if (byRoom) roomGroups(p, pts).forEach((g, i) => groups.set(i, g.pts));
  else for (const pt of pts) { const k = pt.systemId + '|' + pt.dir; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(pt); }
  return [...groups.values()].map(arr => {
    let sumD = 0, sumQ = 0, nQ = 0;
    for (const pt of arr) if (isEndFlow(p, pt)) { if (isNum(pt.designQ)) sumD += pt.designQ; const q = phase ? ptQ(p, pt, phase) : null; if (isNum(q)) { sumQ += q; nQ++; } }
    const sum = `<span class="sum">${phase && nQ ? `${fmt(sumQ)} / ` : ''}${fmt(sumD)} ${__h('m³/h')}</span>`;
    if (byRoom) return `<section class="group">
      <div class="group-hd"><h3>${esc(roomLabel(arr[0]))}</h3><span class="sum">${esc(roomSumText(p, arr))}</span></div>
      ${arr.map(pt => ptRow(p, pt, phase, 1)).join('')}
    </section>`;
    const s = sysOf(p, arr[0].systemId); const tree = treeOrder(p, arr);
    let br = null; let rows = '';
    for (const { pt, lvl } of tree) {
      if (lvl === 1 && (pt.branch || '') !== br) { br = pt.branch || ''; rows += `<div class="br-hd">${esc(br || __('no branch'))}</div>`; }
      rows += ptRow(p, pt, phase, lvl);
    }
    return `<section class="group">
      <div class="group-hd"><span class="tag ${arr[0].dir}">${arr[0].dir}</span><h3>${esc(s?.code || '?')} · ${L.dir[arr[0].dir]}</h3>${sum}</div>
      ${rows}
    </section>`;
  }).join('');
}
function ptMeta(p, pt) {
  if (pt.zone) return [pt.zone, ptMeta0(p, pt)].filter(Boolean).join(' · ');
  return ptMeta0(p, pt);
}
function ptMeta0(p, pt) {
  if (isDev(pt)) { const n = behind(p, pt).length; return [pt.room, L.reg[pt.reg.type] + (pt.fd?.ei && pt.reg.type === 'brand' ? ' ' + pt.fd.ei : ''), pt.reg.type === 'brand' ? [pt.fd?.from, pt.fd?.to].filter(Boolean).join(' → ') : '', n ? __('{n} points behind', { n }) : __('no points behind'), pt.photos?.length ? __('photos: {n}', { n: pt.photos.length }) : ''].filter(Boolean).join(' · '); }
  const kind = pt.kind === 'terminal' ? L.ttype[pt.ttype] : pt.kind === 'duct' ? (hasReg(pt) ? L.reg[pt.reg.type] + (pt.reg.model ? ' ' + pt.reg.model : '') : __('duct') + (pt.duct?.main ? __(', main') : '')) : L.reg[pt.reg.type];
  const kids = isNode(pt) ? childrenOf(p, pt.id).length : 0;
  return [pt.room, kind, pt.kind === 'terminal' && hasReg(pt) ? L.reg[pt.reg.type] : '', kids ? __('slaves: {n}', { n: kids }) : '', pt.photos?.length ? __('photos: {n}', { n: pt.photos.length }) : ''].filter(Boolean).join(' · ');
}
function ptRow(p, pt, phase, lvl = 1) {
  const kindTag = pt.kind === 'device' ? '<span class="tag D">—</span>' : isNode(pt) ? `<span class="tag ${pt.dir} node">${pt.dir}</span>` : `<span class="tag ${pt.dir}">${pt.dir}</span>`;
  const meta = ptMeta(p, pt);
  const ind = lvl > 1 ? ` style="--lvl:${lvl - 1}"` : '';
  const ctx = isCtx(p, pt);
  const cls = `pt${lvl > 1 ? ' child' : ''}${isNode(pt) ? ' is-node' : ''}${ctx ? ' ctx' : ''}`;
  const chips = ptChips(p, pt, phase);
  const act = ctx ? `disabled title="${__h('Context: measured by the coordinator')}"` : `data-act="editPt" data-id="${pt.id}" data-mode="${phase || 'setup'}"`;
  if (!phase && S.reorder && !ctx && S.f.order !== 'room') { // 0.9.18: order within the branch by hand
    const sib = siblingsOf(p, pt); const i = sib.indexOf(pt);
    return `<div class="${cls} reord"${ind} data-row="${pt.id}">${kindTag}
      <span style="min-width:0"><span class="code">${esc(pt.code || __('no code'))}</span><span class="meta">${esc(meta || '—')}</span></span>
      <span class="ord"><button type="button" class="btn sm" data-act="ptUp" data-id="${pt.id}" aria-label="${__h('Up')}"${i <= 0 ? ' disabled' : ''}>↑</button><button type="button" class="btn sm" data-act="ptDown" data-id="${pt.id}" aria-label="${__h('Down')}"${i < 0 || i >= sib.length - 1 ? ' disabled' : ''}>↓</button></span></div>`;
  }
  if (!phase) {
    const dsg = designOf(p, pt); const own = isNum(pt.designQ);
    return `<button class="${cls}"${ind} ${act} data-row="${pt.id}">${kindTag}
      <span style="min-width:0"><span class="code">${esc(pt.code || __('no code'))}</span>${chips ? `<span class="chips">${chips}</span>` : ''}<span class="meta">${esc(meta || '—')}</span></span>
      <span class="val">${pt.kind === 'device' ? `<small${devBad(pt) ? ' style="color:var(--bad)"' : ''}>${esc([pt.reg.state ? L.state[pt.reg.state] : '—', pt.reg.cond ? L.cond[pt.reg.cond] : ''].filter(Boolean).join(' · '))}</small>` : `${own ? '' : '<small>Σ </small>'}${fmt(dsg)} <small>${__h('m³/h')}</small><br><small>${esc(L.method[pt.method] || '')}</small>`}</span></button>`;
  }
  const nq = nodeQ(p, pt, phase); const done = isNum(nq.q); const dsg = designOf(p, pt);
  const r = phase === 'eerste' ? ratioOf(nq.q, dsg) : devOf(nq.q, dsg);
  const st = phase === 'controle' ? ptStatus(pt, p) : null;
  const ps = psOf(pt, phase);
  const chip = !done ? (pt.status ? '' : `<span class="chip">${nq.derived && nq.n ? `Σ ${nq.n}/${nq.m}` : __('not measured')}</span>`) : phase === 'eerste' ? `<span class="chip acc">${fmtPct(r)}</span>` : `<span class="chip ${st}">${fmtDev(r)} ${st === 'ok' ? 'OK' : 'NOK'}</span>`;
  return `<button class="${cls}${done ? '' : ' todo'}"${ind} ${act} data-row="${pt.id}">${kindTag}
    <span style="min-width:0"><span class="code">${esc(pt.code || __('no code'))}</span>${chips ? `<span class="chips">${chips}</span>` : ''}<span class="meta">${esc(meta || '—')}${ps != null ? ` · <b class="mono">${fmt(ps)} ${__h('Pa')}</b>` : ''}${dpLow(pt, phase) ? ` · <b style="color:var(--bad)">Δp < ${__h('min.')}</b>` : ''}</span></span>
    <span class="val">${done ? (nq.derived ? '<small>Σ </small>' : '') + fmt(nq.q) : '—'} <small>/ ${fmt(dsg)}</small><br>${chip}</span>
    <span class="barwrap">${meterHTML(phase === 'eerste' ? (r == null ? null : r - 1) : r, p.tol.terminal, phase === 'controle' ? st : null)}</span>
  </button>`;
}
function meterHTML(dev, tolPct, st, live) {
  const t = Math.min(tolPct || 10, 49) / 100;
  const pos = isNum(dev) ? Math.max(0, Math.min(100, (dev + 0.5) * 100)) : 50;
  return `<div class="meterbar"${live ? ` data-live="${live}"` : ''} data-empty="${isNum(dev) ? 0 : 1}"><span class="band" style="left:${(0.5 - t) * 100}%;right:${(0.5 - t) * 100}%"></span><span class="mid"></span><span class="mk ${st || ''}" style="left:${pos}%"></span></div>`;
}

/* ---------- steps 3 & 5: measurement ---------- */
function stepMeasure(p, phase) {
  const isFirst = phase === 'eerste';
  if (!p.systems.length || !p.points.some(measurable)) return `<div class="empty"><span>${__h('First create units and points in step 2.')}</span><button class="btn primary" data-act="step" data-v="1">${__h('To the points')}</button></div>`;
  const pts = filtered(p, p.points, true, phase);
  S.list = pts.filter(x => !isCtx(p, x)).map(x => x.id);
  const all = p.points.filter(x => measurable(x) && !isCtx(p, x)); const done = all.filter(pt => isNum(ptQ(p, pt, phase))).length;
  const nok = !isFirst ? all.filter(pt => ptStatus(pt, p) === 'nok').length : 0;
  return `
  <section class="card">
    <div class="hd"><h2>${isFirst ? __('Initial measurement') : __('Control measurement')}</h2><span class="chip ${done === all.length ? 'ok' : ''}">${done} / ${all.length}</span>${nok ? `<span class="chip nok">${nok} ${__h('out of tolerance')}</span>` : ''}</div>
    <p class="small muted" style="margin:0">${isFirst
      ? __('Dampers in their initial position. Measure the unit, then go through the points in order and record the position of each damper before adjusting.')
      : __h('Measure again after adjusting. Tolerance: grilles ±{a} %, unit ±{b} %. Record the final damper positions.', { a: fmt(p.tol.terminal), b: fmt(p.tol.system) })}</p>
    <button class="btn primary" data-act="startMeasure" data-phase="${phase}">${ICON.play} ${done ? __('Continue with the first unmeasured') : __('Start with the first point')}</button>
    ${insDefaults(p, phase, all)}
  </section>
  ${p.systems.filter(s => inKey(p, S.f.sys, s.id)).map(s => ahuCard(p, s, phase)).join('')}
  ${p.systems.filter(s => inKey(p, S.f.sys, s.id)).flatMap(s => unitDirs(s).filter(d => S.f.dir === 'all' || S.f.dir === d).map(d => pressureCard(p, s, d, phase))).join('')}
  ${filtersHTML(p, true)}
  ${pts.length ? (useTable() ? measTables(p, pts, phase) : groupsHTML(p, pts, phase)) : `<div class="empty small">${__h('No points for this filter.')}</div>`}`;
}
/** instrument per method for this measurement: filled in automatically when a reading is typed (table or panel) */
function insDefaults(p, phase, all) {
  const methods = [...new Set(all.map(x => x.method))].filter(m => m !== 'readout');
  if (!methods.length) return '';
  if (!p.instruments.length) return `<div class="banner">${__h('No measuring instruments in the project yet: add them in step «Project» to record which instrument each measurement was made with.')}</div>`;
  const miss = all.filter(x => x.method !== 'readout' && readings(x, phase).length && !(x.meas[phase] && x.meas[phase].ins)).length;
  const bad = all.filter(x => insBad(p, x, phase)).map(x => x.code || '?');
  return `<div class="insdef">
    <span class="label">${__h('Instrument per method')}</span>
    <div class="insdef-row">${methods.map(m => { const cur = insDefaultFor(p, m); const fit = p.instruments.filter(x => insFits(x, m));
      return `<label class="field" for="insdef-${m}">${lbl(esc(L.method[m] || m))}<select id="insdef-${m}" data-insdef="${m}"><option value="">${__h('— not given —')}</option>${(fit.length ? fit : p.instruments).map(x => `<option value="${x.id}"${x.id === cur ? ' selected' : ''}>${esc(insLabel(x))}</option>`).join('')}</select></label>`; }).join('')}</div>
    ${miss ? `<button class="btn sm" data-act="insFill" data-phase="${phase}">${__h('Assign to measurements without instrument ({n})', { n: miss })}</button>` : ''}
    ${bad.length ? `<div class="small warn-t">${__h('Outside the instrument range: {list}', { list: bad.slice(0, 12).join(', ') + (bad.length > 12 ? ' …' : '') })}</div>` : ''}
  </div>`;
}
function ahuCard(p, s, phase) {
  const m = s.meas[phase] || {}; const ds = unitDirs(s);
  if (isPkg(p)) {
    const v = (k, u, d = 0) => ds.map(dir => isNum(m[k + dir]) ? `${esc(L.dir[dir])} ${fmt(m[k + dir], d)} ${u}` : '').filter(Boolean).join(' · ');
    const set = ds.map(dir => { const t = dirSetText(s, phase, dir, false); return t ? `${esc(L.dir[dir])} ${esc(t)}` : ''; }).filter(Boolean).join(' · ');
    const rows = [[__('Fan setting'), set], [__('Flow rate'), v('q', 'm³/h')], [__('External pressure'), v('pa', 'Pa')]].filter(r => r[1]);
    return `<section class="card"><div class="hd"><h3>${esc(s.code)} · ${esc(s.name || '')}</h3><span class="small muted">${__h('set by the coordinator')}</span></div>
      ${rows.length ? `<div class="kv">${rows.map(([k, x]) => `<div><span class="label">${esc(k)}</span><span>${x}</span></div>`).join('')}</div>` : `<p class="small muted" style="margin:0">${__h('No unit values in the package.')}</p>`}</section>`;
  }
  const hasData = Object.values(m).some(x => isNum(x)) || Object.values(m.fan || {}).some(o => Object.values(o || {}).some(isNum));
  const pair = (key, label, nlT, unit) => `<div class="stack-s"><span style="font-weight:600;font-size:14px">${label}${repHint(nlT, label) ? ` <span class="small muted" style="font-weight:400">· ${esc(repHint(nlT, label))}</span>` : ''}</span><div class="grid2">
      ${ds.map(dir => inp({ sys: s.id, f: `meas.${phase}.${key}${dir}` }, m[key + dir], { label: dir === 'T' ? __('Supply') : __('Extract'), num: true, unit, rrw: key === 'pa', neg: key === 'pa' || key === 'psz' || key === 'psp' })).join('')}</div></div>`;
  const g = grpOf(p, s.id);
  return `<details class="more"${hasData || phase === 'eerste' ? ' open' : ''}>
    <summary>${esc(s.code)} · ${__h('unit')} ${esc(s.name)}${g ? ` <span class="small muted">· ${esc(entryCode(entryOf(p, s.id)))} ${esc(UL().role[roleOf(p, s.id)])}</span>` : ''}</summary>
    <div class="inner">
      ${unitClReminder(p, s, phase)}
      <div class="grid2">${ds.map(d => `<div class="field">${lbl(d === 'T' ? __('Design supply') : __('Design extract'))}<div class="mono">${fmt(s.design[d])} ${__h('m³/h')}</div></div>`).join('')}</div>
      ${s.np && s.np.flowM === 'cone' ? `<div class="small muted" data-live="cone|${s.id}|${phase}"></div>` : pair('q', __('Flow rate'), 'Debiet', __('m³/h'))}
      <div class="grid2">${ds.map(d => `<div class="small muted" data-live="ssum|${s.id}|${d}|${phase}"></div>`).join('')}</div>
      ${phase === 'controle' ? `<div class="row">${ds.map(d => `<span data-live="sdev|${s.id}|${d}"></span>`).join('')}</div>` : ''}
      ${fanMeasHTML(p, s, phase)}
      ${pair('pa', __('External pressure'), 'Externe druk', __('Pa'))}
      ${pair('psz', __('Static pressure suction side'), 'Statische druk zuigzijde', __('Pa'))}
      ${pair('psp', __('Static pressure discharge side'), 'Statische druk perszijde', __('Pa'))}
      ${pair('f', __('Filter pressure drop'), 'Drukval filter', __('Pa'))}
      ${g ? `<div class="small" data-live="sysbal|${esc(entryOf(p, s.id).key)}|${phase}"></div>` : ''}
    </div></details>`;
}

/* ---------- step 4: devices & balancing ---------- */
function stepDevices(p) {
  const meas = p.points.filter(pt => measurable(pt) && !isCtx(p, pt) && inKey(p, S.f.sys, pt.systemId) && (S.f.dir === 'all' || pt.dir === S.f.dir));
  const groups = new Map();
  for (const pt of sortPoints(p, meas)) { const k = groupKey(pt); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(pt); }
  const devices = lineDampers(p).filter(pt => inKey(p, S.f.sys, pt.systemId));
  // branch balance per system+dir
  const sd = new Map();
  for (const [k, arr] of groups) { const [sid, dir] = k.split('|'); const key = sid + '|' + dir; if (!sd.has(key)) sd.set(key, []); sd.get(key).push([k, arr]); }
  const branchCards = [...sd.entries()].map(([key, list]) => {
    const [sid, dir] = key.split('|'); const s = sysOf(p, sid);
    const rows = list.map(([k, arr]) => {
      const t = arr.filter(x => isEndFlow(p, x)); let d = 0, q = 0, n = 0, dq = 0;
      for (const pt of t) { const dd = designOf(p, pt); if (isNum(dd)) d += dd; const qq = calcQ(pt, 'eerste', p).q; if (isNum(qq)) { q += qq; n++; if (isNum(dd)) dq += dd; } }
      return { k, br: arr[0].branch || '—', d, q: n ? q : null, r: n && dq ? q / dq : null, n: t.length }; // ratio over the points that have both values
    }).filter(r => r.n).sort((a, b) => isNum(a.r) && isNum(b.r) ? b.r - a.r : isNum(a.r) ? -1 : isNum(b.r) ? 1 : 0); // proportional method: from the most overloaded branch to the index branch
    if (rows.length < 2) return '';
    const minR = Math.min(...rows.filter(r => isNum(r.r)).map(r => r.r));
    return `<section class="card"><div class="hd"><span class="tag ${dir}">${dir}</span><h3>${esc(s?.code || '')} · ${__h('branch balance')} · ${L.dir[dir]}</h3></div>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th class="n">${__h('Order')}</th><th>${__h('Branch')}</th><th class="n">${__h('Project')}</th><th class="n">${__h('Measure 1')}</th><th class="n">${__h('Ratio')}</th><th></th></tr></thead><tbody>
      ${rows.map((r, i) => `<tr><td class="n mono">${isNum(r.r) ? i + 1 : '—'}</td><td>${esc(r.br)}</td><td class="n">${fmt(r.d)}</td><td class="n">${fmt(r.q)}</td><td class="n">${fmtPct(r.r)}</td><td>${isNum(r.r) && r.r === minR ? `<span class="chip idx">${__h('flow index — last')}</span>` : ''}</td></tr>`).join('')}
      </tbody></table></div>
      <p class="small muted" style="margin:0">${__h('Adjust the branches in this order: from the highest ratio down. The flow-index branch stays open and comes last; close the dampers of the other branches down to its ratio.')}</p></section>`;
  }).join('');
  const fanCards = isPkg(p) ? '' : fanCardsHTML(p);
  const bgs = balanceGroups(p, meas).filter(g => g.show);
  const branchDetail = bgs.map((g, i) => groupCard(p, g, i + 1)).join('');
  const syss = p.systems.filter(s => inKey(p, S.f.sys, s.id));
  const idxLines = syss.flatMap(s => unitDirs(s).map(d => indexLine(p, s, d, 'eerste'))).join('');
  const lowDp = meas.filter(x => dpLow(x, 'eerste'));
  // 1 · before balancing: unit flow after measurement 1 at least 90 % of the design (methodology §3.2), fire / shut-off dampers open and recorded
  const sides = syss.flatMap(s => unitDirs(s).map(dir => { const qd = s.design[dir]; let q1 = isNum(qd) ? (systemQ(p, s, dir, 'eerste') ?? mainDuctQ(p, s.id, dir, 'eerste')) : null; let est = false;
    if (isNum(qd) && !isNum(q1)) { q1 = sumTerminals(p, s.id, dir, 'eerste'); est = isNum(q1); } // unit flow not measured: Σ end flows of measurement 1
    return { s, dir, qd, q1, est, r: isNum(qd) && qd > 0 && isNum(q1) ? q1 / qd : null }; })).filter(x => isNum(x.qd));
  const lowSides = sides.filter(x => isNum(x.r) && x.r < 0.9), sidesKnown = sides.filter(x => isNum(x.r));
  const devOk = devices.every(d => !!d.reg.state && !devBad(d));
  const preSt = !sidesKnown.length && !devices.length ? 'open' : lowSides.length || lowDp.length || !devOk ? 'warn' : sidesKnown.length === sides.length ? 'ok' : 'open';
  const sideTbl = sides.length ? `<div class="tbl-wrap"><table class="tbl blk" style="--c:3"><thead><tr><th>${__h('AHU')}</th><th class="n">${__h('Project')}</th><th class="n">${__h('Measure 1')}</th><th class="n">${__h('Ratio')}</th></tr></thead><tbody>
      ${sides.map(x => `<tr><td><span class="tag ${x.dir}">${x.dir}</span> ${esc(x.s.code)}</td><td class="n" data-label="${__h('Project')}">${fmt(x.qd)}</td><td class="n" data-label="${__h('Measure 1')}">${isNum(x.q1) ? fmt(x.q1) + (x.est ? ' Σ' : '') : '—'}</td><td class="n" data-label="${__h('Ratio')}">${isNum(x.r) ? `<span class="chip ${x.r < 0.9 ? 'nok' : 'ok'}">${fmtPct(x.r)}</span>` : '—'}</td></tr>`).join('')}</tbody></table></div>` : '';
  const preCard = `<section class="card"><div class="hd"><h3>${__h('Unit flow after measurement 1')}</h3></div>
    ${sideTbl || `<p class="small muted" style="margin:0">${__h('No units with design flows.')}</p>`}
    ${lowSides.length ? `<div class="banner" style="background:var(--bad-soft);border-color:transparent">${__h('Below 90 % of the design: {list}. Find the cause first: a closed damper, a dirty filter, a leak or the fan speed.', { list: lowSides.map(x => `${x.s.code} ${x.dir} (${fmtPct(x.r)})`).join(', ') })}</div>`
      : sidesKnown.length ? `<p class="small muted" style="margin:0">${__h('All measured units reach at least 90 % of the design.')}${sides.some(x => x.est) ? ' ' + __h('Σ = sum of the end flows: the unit flow itself was not measured.') : ''}</p>` : sides.length ? `<p class="small muted" style="margin:0">${__h('No unit flows measured yet (measurement 1).')}</p>` : ''}
  </section>`;
  // 6 · fixing: positions after adjusting recorded and locked
  const regs = meas.filter(x => hasReg(x) && !isDev(x) && !DEVICE_ONLY.includes(x.reg.type));
  const posN = regs.filter(x => String(x.reg.posAfter || '').trim()).length, lockN = regs.filter(x => x.reg.locked).length;
  const noPos = regs.filter(x => !String(x.reg.posAfter || '').trim());
  const fixSt = !regs.length ? 'na' : posN === regs.length ? 'ok' : 'open';
  const fixCard = `<section class="card"><div class="hd"><h3>${__h('Damper positions after adjusting')}</h3>${regs.length ? `<span class="chip ${fixSt === 'ok' ? 'ok' : ''}">${posN}/${regs.length}</span>` : ''}</div>
    ${!regs.length ? `<p class="small muted" style="margin:0">${__h('No dampers to adjust.')}</p>`
      : `<p class="small" style="margin:0">${__h('Positions recorded: {a} of {b} · locked: {c}', { a: posN, b: regs.length, c: lockN })}</p>
        ${noPos.length ? `<p class="small muted" style="margin:0">${__h('Without position after adjusting: {list}', { list: noPos.map(x => x.code || '?').slice(0, 15).join(', ') + (noPos.length > 15 ? ' …' : '') })}</p>` : `<p class="small muted" style="margin:0">${__h('All positions recorded. Mark them on the damper (paint or seal), take a photo and place the point on the plan.')}</p>`}`}
  </section>`;
  const grpSt = !regs.length ? 'na' : fixSt;
  const STAGES = [
    { id: 'bal-pre', t: __('Check before balancing'), st: preSt },
    { id: 'bal-idx', t: __('Index'), st: idxLines ? 'ok' : 'open' },
    { id: 'bal-grp', t: __('Proportions within the groups'), st: grpSt },
    { id: 'bal-br', t: __('Proportions between the branches'), st: branchCards ? '' : 'na' },
    { id: 'bal-fan', t: __('Fan'), st: fanCards ? '' : 'na' },
    { id: 'bal-fix', t: __('Fixing the positions'), st: fixSt },
  ];
  const stLab = { ok: __('Ready'), open: __('Open'), warn: __('Action needed'), na: '—', '': '' };
  const hd = (i) => { const s = STAGES[i]; return `<div class="stagehd" id="${s.id}"><span class="stn">${i + 1}</span><h2>${esc(s.t)}</h2>${s.st && s.st !== 'na' ? `<span class="chip ${s.st === 'ok' ? 'ok' : s.st === 'warn' ? 'nok' : ''}">${esc(stLab[s.st])}</span>` : ''}</div>`; };
  return `
  <section class="card"><div class="hd"><h2>${__h('Balancing order')}</h2></div>
    <ol class="stagebar">${STAGES.map((s, i) => `<li><button type="button" class="stg ${s.st || 'none'}" data-act="balGo" data-v="${s.id}"><span class="stn">${i + 1}</span><span class="stt">${esc(s.t)}</span>${s.st && s.st !== 'na' ? `<span class="sts">${esc(stLab[s.st])}</span>` : ''}</button></li>`).join('')}</ol>
    <details class="more"><summary>${__h('How to balance')}</summary><div class="inner"><ol class="steps">
      <li>${__h('Start from the pressure index — the point with the lowest static pressure (measurement 1). The dampers on its path stay open.')}</li>
      <li>${__h('The cards below go bottom-up through the hierarchy: first the grilles under each iris / damper, then the irises under a CAV, then the top-level nodes. In each group the flow index is the point with the lowest ratio; close the others down to the same ratio (calculator).')}</li>
      <li>${__h('Within one level the cards go from the most overloaded group (highest ratio) to the index group (lowest ratio), which is adjusted last: throttling the overloaded groups first raises the pressure for the weaker ones.')}</li>
      <li>${__h('Balance the branches against each other, then set the fan frequency so that the flow index reaches 100 %.')}</li>
      <li>${__h('Record the position of each damper after adjusting and whether it is locked.')}</li>
    </ol></div></details>
  </section>
  ${hd(0)}
  ${preCard}
  ${lowDp.length ? `<div class="banner" style="background:var(--bad-soft);border-color:transparent">${__h('Too little pressure before the controller: {list}. The controller will not reach its flow — first raise the duct pressure or open the dampers upstream.', { list: lowDp.map(x => `${x.code} (${fmt(Math.abs(psOf(x, 'eerste')))} < ${fmt(x.reg.dpmin)} Pa)`).join(', ') })}</div>` : ''}
  ${damperCard(p, devices)}
  ${hd(1)}
  ${idxLines || `<p class="small muted" style="margin:0">${__h('No pressure index yet: measure the static pressures before the nodes in measurement 1.')}</p>`}
  ${filtersHTML(p, false)}
  ${hd(2)}
  ${branchDetail || `<div class="empty small">${__h('No points to adjust.')}</div>`}
  ${hd(3)}
  ${branchCards || `<p class="small muted" style="margin:0">${__h('One branch per unit — nothing to balance between branches.')}</p>`}
  ${isPkg(p) ? '' : hd(4)}
  ${fanCards}
  ${hd(5)}
  ${fixCard}`;
}
function indexLine(p, s, dir, phase) {
  const ix = pressureIndex(p, s.id, dir, phase); if (!ix) return '';
  const L0 = lossOf(p, ix, phase); const fan = fanP(p, ix, phase);
  const path = pathOf(p, ix).map(x => { const v = psOf(x, phase); return `${esc(x.code)}${v != null ? ' ' + fmt(v) : ''}`; });
  if (fan != null) path.unshift(`${__('fan')} ${fmt(fan)}`);
  return `<div class="banner info"><b>${__h('Pressure index {s} · {dir}: {code}', { s: s.code, dir: L.dir[dir].toLowerCase(), code: ix.code })}</b> — ${L0.dFan != null ? __h('{p} Pa, loss from the fan {l} Pa.', { p: fmt(L0.ps), l: fmt(L0.dFan) }) : __h('{p} Pa.', { p: fmt(L0.ps) })}<br><span class="small">${__h('Path: {path} Pa', { path: path.join(' → ') })}</span></div>`;
}
function pressureCard(p, s, dir, phase) {
  const pts = p.points.filter(x => x.systemId === s.id && x.dir === dir && measurable(x)); if (!pts.length) return '';
  const tree = treeOrder(p, pts).filter(({ pt }) => isNode(pt) || psOf(pt, 'eerste') != null || psOf(pt, 'controle') != null);
  const fan = s.meas?.[phase]?.['pa' + dir]; const ix = pressureIndex(p, s.id, dir, phase); const ctl = phase === 'controle';
  const open = tree.length || isNum(fan);
  const row = ({ pt, lvl }) => {
    const L1 = lossOf(p, pt, 'eerste'), L2 = lossOf(p, pt, 'controle'); const Lc = ctl ? L2 : L1;
    const input = `<input id="${fid(pt.id, 'ps', phase)}" class="num" inputmode="decimal" enterkeyhint="next" autocomplete="off" data-pt="${pt.id}" data-f="meas.${phase}.ps" data-num data-rrw value="${esc(fmtIn(psOf(pt, phase)))}" placeholder="${dir === 'A' ? '−' : ''}${__h('Pa')}" aria-label="${__h('p stat.')} ${esc(pt.code || '')}">`; const field = sgn(input);
    const same = L1?.up && L2?.up && ((L1.up.fan && L2.up.fan) || (L1.up.pt && L1.up.pt === L2.up.pt));
    const chg = ctl && same && L1.dUp != null && L2.dUp != null ? L2.dUp - L1.dUp : null;
    const loss = Lc ? [Lc.up ? `${__h('Δp from')} ${esc(refG(Lc.up))}: <b class="mono">${fmt(Lc.dUp)}</b> ${__h('Pa')}${chg != null ? ` <span class="${chg > 0 ? 'warn-t' : 'muted'}">(${chg > 0 ? '+' : ''}${fmt(chg)})</span>` : ''}` : '', Lc.dFan != null && !(Lc.up && Lc.up.fan) ? `${__h('from fan')} <b class="mono">${fmt(Lc.dFan)}</b>` : ''].filter(Boolean).map(x => `<span style="white-space:nowrap">${x}</span>`).join(' · ') : '';
    const sub = isNode(pt) && hasReg(pt) ? L.reg[pt.reg.type] + (isNum(pt.reg.dpmin) ? ` · ${__h('min.')} ${fmt(pt.reg.dpmin)} ${__h('Pa')}` : '') : pt.room || '';
    return `<div class="prow${isNode(pt) ? ' node' : ''}" style="--lvl:${lvl - 1}">
      <div class="pl"><div><span class="mono" style="font-weight:600">${isNode(pt) ? '◆ ' : ''}${esc(pt.code || '—')}</span>${pt === ix ? ` <span class="chip idx">${__h('pressure index')}</span>` : ''}${dpLow(pt, phase) ? ` <span class="chip nok">${__h('Δp < min.')}</span>` : ''}</div>
        ${sub ? `<div class="small muted">${esc(sub)}</div>` : ''}${loss ? `<div class="small">${loss}</div>` : ''}</div>
      <div class="pr">${ctl ? `<span class="small muted">${__h('before')} ${psOf(pt, 'eerste') != null ? fmt(psOf(pt, 'eerste')) : '—'}</span>` : ''}${field}</div></div>`;
  };
  return `<details class="more"${open ? ' open' : ''}><summary>${esc(s.code)} · ${__h('duct pressures')} · ${L.dir[dir].toLowerCase()}</summary><div class="inner">
    <p class="small muted" style="margin:0">${ctl ? __('Measure the static pressure again after adjusting: the increase of the loss between the master and the node shows what the throttled damper takes.') : __('All dampers open. Measure the static pressure in the duct before each node (CAV, iris, branch damper) and at the farthest grilles. The point with the lowest pressure is the pressure index: its path from the fan is the most loaded.')}</p>
    <div class="small">${__h('Fan (external pressure):')} <b class="mono">${isNum(fan) ? fmt(fan) + (' ' + __('Pa')) : '—'}</b>${isNum(fan) ? '' : (' — ' + __('enter it in the unit card'))}</div>
    ${indexLine(p, s, dir, phase)}
    ${tree.length ? `<div class="plist"><div class="prow ph"><span>${__h('Point · loss')}</span><span>${ctl ? __('p after') : __('p stat.')}${__h(', Pa')}</span></div>${tree.map(row).join('')}</div>`
      : `<p class="small muted" style="margin:0">${__h('No nodes. The pressure at a grille can be entered in the point card.')}</p>`}
  </div></details>`;
}
function groupCard(p, g, n) {
  const s = sysOf(p, g.sysId); const items = g.items;
  let idx = null, minR = Infinity;
  for (const x of items) { const r = ptRatio(x, p); if (isNum(r) && r < minR) { minR = r; idx = x; } }
  const others = items.filter(x => x !== idx);
  const st = S.adj[g.key] || (S.adj[g.key] = { pid: (others[0] || items[0] || {}).id || '', qi: null, qt: null });
  st.idx = idx ? idx.id : ''; if (!others.some(o => o.id === st.pid)) st.pid = (others[0] || {}).id || '';
  const m = g.master;
  const title = m ? `${__h('Below {code}', { code: m.code })} <span class="small muted" style="font-weight:400">· ${esc(hasReg(m) ? L.reg[m.reg.type] : __('node'))} · ${__h('level {n}', { n: g.depth })}</span>` : `${esc(g.branch || __('no branch'))} <span class="small muted" style="font-weight:400">· ${__h('top level')}</span>`;
  const rows = items.map(x => {
    const r = ptRatio(x, p); const kids = isNode(x) ? childrenOf(p, x.id).length : 0;
    const role = x === idx ? `<span class="chip idx">${__h('flow index')}</span>` : isNum(r) && minR !== Infinity ? `<span class="chip">${r > minR * 1.05 ? __('close') : __('ok')}</span>` : '';
    return `<tr><td class="dmp-pt"><span class="mono" style="font-weight:600">${isNode(x) ? '◆ ' : ''}${esc(x.code || '—')}</span><br><span class="small muted">${esc([hasReg(x) ? (x.reg.model || L.reg[x.reg.type]) : __('no damper'), kids ? `${__h('slaves')} ${kids}` : ''].filter(Boolean).join(' · '))}</span></td>
      <td class="n" data-label="${__h('Ratio 1')}">${fmtPct(r)}<br>${role}</td>
      <td data-label="${__h('Position after')}">${hasReg(x) ? `<input id="${fid(x.id, 'posAfter')}" type="text" data-pt="${x.id}" data-f="reg.posAfter" value="${esc(x.reg.posAfter || '')}" placeholder="${__h('after')}"><span class="small muted">${__h('was:')} ${esc(x.reg.posBefore || '—')}${(() => { const e = ptCat(p, x); const r = e && (e.kPos || []).length ? catPreset(p, x, e) : null; return r && isNum(r.pos) ? ' · ' + __h('preset ≈ {a}', { a: fmt(r.pos, 1) }) : ''; })()}</span>` : ''}</td>
      <td class="dmp-lock" data-label="${__h('Lock')}">${hasReg(x) ? `<input id="${fid(x.id, 'locked')}" type="checkbox" data-pt="${x.id}" data-f="reg.locked"${x.reg.locked ? ' checked' : ''} aria-label="${__h('Locked')}" style="width:22px;height:22px;accent-color:var(--accent)">` : ''}</td></tr>`;
  }).join('');
  const k = g.key;
  const calc = idx && others.length ? `<div class="stack-s" style="padding-top:10px;border-top:1px solid var(--line)">
      <span class="label">${__h('Balancing calculator · flow index')} ${esc(idx.code)}</span>
      <div class="grid2">
        <label class="field full" for="${fid('adj', k, 'pid')}">${lbl(__('Point to adjust'))}<select id="${fid('adj', k, 'pid')}" data-adj="${esc(k)}|pid">${others.map(o => `<option value="${o.id}"${st.pid === o.id ? ' selected' : ''}>${esc(o.code)}</option>`).join('')}</select></label>
        <label class="field" for="${fid('adj', k, 'qi')}">${lbl(__('Flow index now'))}<div class="unit"><input id="${fid('adj', k, 'qi')}" class="num" inputmode="decimal" data-adj="${esc(k)}|qi" value="${esc(fmtIn(st.qi))}"><em>${__h('m³/h')}</em></div></label>
        <label class="field" for="${fid('adj', k, 'qt')}">${lbl(__('This one now'))}<div class="unit"><input id="${fid('adj', k, 'qt')}" class="num" inputmode="decimal" data-adj="${esc(k)}|qt" value="${esc(fmtIn(st.qt))}"><em>${__h('m³/h')}</em></div></label>
      </div>
      <div data-live="adj|${esc(k)}" class="small"></div>
    </div>` : items.length === 1 ? `<p class="small muted" style="margin:0">${__h('Only one slave point — nothing to compare with; check its flow against the design.')}</p>` : '';
  const order = g.lvlN > 1 ? `<span class="chip${g.lvlIdx ? ' idx' : ''}" title="${__h('Order within level {d}: from the highest group ratio to the lowest', { d: g.depth })}">${g.lvlIdx ? __h('index group — last ({r} of {n})', { r: g.lvlRank, n: g.lvlN }) : __h('{r} of {n} on this level', { r: g.lvlRank, n: g.lvlN })}${isNum(g.lam) ? ' · Σ ' + fmtPct(g.lam) : ''}</span>` : '';
  return `<section class="card dmp-card"><div class="hd dmp-hd"><span class="tag ${g.dir}">${g.dir}</span><h3><span class="mono small muted">${n}.</span> ${esc(s?.code || '')} · ${title}</h3>${order}${idx ? `<span class="small muted">${__h('flow index')} ${esc(idx.code)} · ${fmtPct(minR)}</span>` : ''}</div>
    <div class="tbl-wrap"><table class="tbl dmp"><thead><tr><th>${__h('Point')}</th><th class="n">${__h('Ratio 1')}</th><th>${__h('Position after')}</th><th>${__h('Lock')}</th></tr></thead><tbody>${rows}</tbody></table></div>
    ${calc}</section>`;
}

/* ---------- rooms: sum of the grilles per room (EN 12599 table 3: ±15 % for each individual room) ---------- */
function roomCardHTML(p) {
  const rs = roomSums(p); if (!rs.length) return '';
  const done = rs.filter(r => r.dev != null), bad = done.filter(r => !r.ok), part = rs.filter(r => r.dev == null);
  const show = rs.filter(r => r.pts.length > 1 || r.ok === false); // single-grille rooms that are in tolerance add nothing to the point list
  const row = (r) => `<tr><td><span class="tag ${r.dir}">${r.dir}</span> ${esc(r.room)}<br><span class="small muted">${esc(r.pts.map(x => x.code).join(', '))}</span></td><td class="n" data-label="${__h('Project')}">${fmt(r.d)}</td><td class="n" data-label="${__h('Measure 2')}">${r.nQ ? fmt(r.q) : '—'}</td><td class="n" data-label="${__h('Dev.')}">${r.dev == null ? `<span class="chip">${__h('incomplete')}</span>` : `<span class="chip ${r.ok ? 'ok' : 'nok'}">${fmtDev(r.dev)}</span>`}</td></tr>`;
  return `<section class="card"><div class="hd"><h2>${__h('Rooms')}</h2><span class="small muted">${__h('sum of the grilles per room · ±{t} % (EN 12599, table 3)', { t: fmt(p.tol.room) })}</span></div>
    <p class="small" style="margin:0">${__h('{a} of {b} rooms within the tolerance', { a: done.length - bad.length, b: done.length })}${bad.length ? ' · <span class="warn-t">' + __h('outside: {list}', { list: esc(bad.map(r => r.room).join(', ')) }) + '</span>' : ''}${part.length ? ' · ' + __h('incomplete: {n}', { n: part.length }) : ''}</p>
    ${show.length ? `<div class="tbl-wrap"><table class="tbl blk" style="--c:3"><thead><tr><th>${__h('Room')}</th><th class="n">${__h('Project')}</th><th class="n">${__h('Measure 2')}</th><th class="n">${__h('Dev.')}</th></tr></thead><tbody>${show.map(row).join('')}</tbody></table></div>` : ''}
    <p class="small muted" style="margin:0">${__h('Grilles with the same room name are added up per side. EN 12599 gives ±15 % per room and ±10 % per system as the permissible measuring uncertainty; a stricter project tolerance applies when the contract gives one.')}</p></section>`;
}
/* ---------- step 6: report ---------- */
/* step 7: handover — technical readiness (measured, within tolerance, dampers recorded) and the handover checklist */
function stepHandover(p) {
  const ho = p.handover || {};
  const meas = p.points.filter(x => measurable(x) && !isCtx(p, x));
  const measN = meas.filter(x => isNum(ptQ(p, x, 'controle')) || x.status).length;
  const measured = meas.length > 0 && measN === meas.length;
  const balanced = measured && meas.every(x => ptStatus(x, p) === 'ok' || !!x.status);
  const regs = p.points.filter(x => hasReg(x) && !isCtx(p, x));
  const regOk = regs.filter(x => DEVICE_ONLY.includes(x.reg.type) ? !!x.reg.state : !!String(x.reg.posAfter || '').trim()).length;
  const dampers = regOk === regs.length;
  const technical = measured && balanced && dampers;
  const admin = !!ho.reportShared && !!ho.labelsChecked && !!ho.clientBriefed && String(ho.contact || '').trim().length > 0;
  const done = !!ho.completedAt;
  const checkN = [ho.reportShared, ho.labelsChecked, ho.clientBriefed].filter(Boolean).length;
  const readiness = [
    { label: __('Measurement 2 complete'), detail: __('{a} of {b} points', { a: measN, b: meas.length }), ok: measured },
    { label: __('Flows within tolerance'), detail: __('Max ±{t} % deviation', { t: fmt(p.tol.terminal) }), ok: balanced },
    { label: __('Dampers recorded'), detail: __('{k} of {n} dampers', { k: regOk, n: regs.length }), ok: dampers },
  ];
  const msg = !technical ? __('Complete the technical checks first.') : !admin ? __('Enter the client contact and tick the three checklist items.') : __('Everything is checked. The project can be handed over.');
  return `<div class="stack">
    <section class="card"><div class="hd"><h2>${done ? __h('Project handed over') : __h('Ready for the handover')}</h2><span class="chip ${technical && admin ? 'ok' : 'nok'}">${readiness.filter(x => x.ok).length + checkN}/6</span></div>
      ${done ? `<p class="small">${__h('Handed over to {name} on {date}', { name: ho.contact || '—', date: new Date(ho.completedAt).toLocaleDateString('nl-BE') })}</p>` : ''}
    </section>
    <section class="card"><div class="hd"><h3>${__h('Technical readiness')}</h3><span class="chip ${technical ? 'ok' : 'nok'}">${technical ? __h('Ready') : __h('Action needed')}</span></div>
      ${readiness.map(r => `<div class="small" style="display:flex;justify-content:space-between;gap:10px;padding:8px 0;border-bottom:1px solid var(--line)"><span><b>${esc(r.label)}</b><br><span class="muted">${esc(r.detail)}</span></span><span class="chip ${r.ok ? 'ok' : 'nok'}">${r.ok ? __h('In order') : __h('Open')}</span></div>`).join('')}
    </section>
    <section class="card"><div class="hd"><h3>${__h('Handover checklist')}</h3></div>
      ${chk({ f: 'handover.reportShared' }, ho.reportShared, __('Report shared with the client'), { rrw: true })}
      ${chk({ f: 'handover.labelsChecked' }, ho.labelsChecked, __('Labels and installation checked'), { rrw: true })}
      ${chk({ f: 'handover.clientBriefed' }, ho.clientBriefed, __('Client informed about operation and results'), { rrw: true })}
      ${inp({ f: 'handover.contact' }, ho.contact, { label: __('Contact person of the client'), full: true, rrw: true })}
      ${inp({ f: 'handover.notes' }, ho.notes, { label: __('Notes and points of attention'), area: true, full: true, rrw: true })}
    </section>
    <section class="card"><p class="small muted" style="margin:0 0 12px">${esc(msg)}</p>
      ${done ? `<button class="btn" data-act="handoverDone" data-v="reopen">${__h('Reopen handover')}</button>`
        : `<button class="btn primary" data-act="handoverDone" data-v="done"${technical && admin ? '' : ' disabled'}>${__h('Mark as handed over')}</button>`}
    </section>
  </div>`;
}
function stepReport(p) {
  const all = p.points.filter(measurable);
  const no1 = all.filter(pt => !pt.status && !isNum(ptQ(p, pt, 'eerste'))), no2 = all.filter(pt => !pt.status && !isNum(ptQ(p, pt, 'controle')));
  const nok = all.filter(pt => ptStatus(pt, p) === 'nok');
  const regsNoPos = p.points.filter(pt => hasReg(pt) && !isDev(pt) && !DEVICE_ONLY.includes(pt.reg.type) && !String(pt.reg.posAfter || '').trim());
  const issues = [
    !p.info.nr || !p.info.name ? ['warn', __('Project number or name missing')] : null,
    !p.instruments.length ? ['warn', __('No measuring instruments given')] : null,
    ...['eerste', 'controle'].flatMap(ph => {
      const noIns = p.instruments.length ? all.filter(x => x.method !== 'readout' && readings(x, ph).length && !(x.meas[ph] && x.meas[ph].ins)) : [];
      const bad = all.filter(x => insBad(p, x, ph));
      const lst = (a) => a.map(x => x.code || '?').slice(0, 12).join(', ') + (a.length > 12 ? ' …' : '');
      return [noIns.length ? ['warn', __('{phase}: measurements without instrument: {list}', { phase: L.phase[ph], list: lst(noIns) })] : null,
        bad.length ? ['nok', __('{phase}: outside the instrument range: {list}', { phase: L.phase[ph], list: lst(bad) })] : null];
    }),
    no1.length ? ['warn', __('Without initial measurement: {list}', { list: no1.map(x => x.code || '?').slice(0, 12).join(', ') + (no1.length > 12 ? ' …' : '') })] : null,
    no2.length ? ['warn', __('Without control measurement: {list}', { list: no2.map(x => x.code || '?').slice(0, 12).join(', ') + (no2.length > 12 ? ' …' : '') })] : null,
    regsNoPos.length ? ['warn', __('Damper position after adjustment not recorded: {n}', { n: regsNoPos.length })] : null,
    (() => { const pd = all.filter(pt => !isNum(pt.designQ) && kidsDesignInfo(p, pt).partial != null); return pd.length ? ['warn', __('Design flow unknown — not all slaves have one: {list}', { list: pd.map(x => x.code || '?').slice(0, 12).join(', ') + (pd.length > 12 ? ' …' : '') })] : null; })(),
    lineDampers(p).some(devBad) ? ['nok', __('Fire / shut-off dampers closed or defective: {list}', { list: lineDampers(p).filter(devBad).map(d => `${d.code || '?'} (${__('{n} points behind', { n: behind(p, d).length })})`).join(', ') })] : null,
    lineDampers(p).some(d => !d.reg.state && !devBad(d)) ? ['warn', __('Fire / shut-off dampers without position: {list}', { list: lineDampers(p).filter(d => !d.reg.state && !devBad(d)).map(d => d.code || '?').join(', ') })] : null,
    nok.length ? ['nok', __('Out of tolerance ±{t} %: {list}', { t: fmt(p.tol.terminal), list: nok.map(x => x.code).join(', ') })] : null,
    p.points.some(x => x.status) ? ['warn', __('With status: {list}', { list: p.points.filter(x => x.status).map(x => `${x.code || '?'} (${L.status[x.status]})`).join(', ') })] : null,
    p.points.some(x => x.added && !x.added.ok) ? ['warn', __('New points from crews not confirmed yet: {list}', { list: p.points.filter(x => x.added && !x.added.ok).map(x => x.code || '?').join(', ') })] : null,
    (p.packages || []).some(r => r.status === 'issued') ? ['warn', __('Open packages: {list}', { list: p.packages.filter(r => r.status === 'issued').map(r => r.name).join(', ') })] : null,
  ].filter(Boolean);
  const sumRows = p.systems.flatMap(s => ['T', 'A'].map(dir => {
    const qd = s.design[dir]; if (!isNum(qd)) return '';
    const q2 = systemQ(p, s, dir, 'controle') ?? mainDuctQ(p, s.id, dir, 'controle');
    const d = devOf(q2, qd); const ok = inTol(d, p.tol.system);
    const t = p.points.filter(x => x.systemId === s.id && x.dir === dir && measurable(x));
    const okN = t.filter(x => ptStatus(x, p) === 'ok').length;
    return `<tr><td><span class="tag ${dir}">${dir}</span> ${esc(s.code)}</td><td class="n" data-label="${__h('Project')}">${fmt(qd)}</td><td class="n" data-label="${__h('Measure 2')}">${fmt(q2)}</td><td class="n" data-label="${__h('Dev.')}">${d == null ? '—' : `<span class="chip ${ok ? 'ok' : 'nok'}">${fmtDev(d)}</span>`}</td><td class="n" data-label="OK">${okN}/${t.length}</td></tr>`;
  })).join('');
  // report header (0.9.13, design only): figures the report already shows below — points within tolerance and the flow per side after measurement 2
  const okN = all.filter(pt => ptStatus(pt, p) === 'ok').length;
  const sideQ = (dir) => { const v = p.systems.map(s => isNum(s.design[dir]) ? (systemQ(p, s, dir, 'controle') ?? mainDuctQ(p, s.id, dir, 'controle')) : null).filter(isNum); return v.length ? v.reduce((a, b) => a + b, 0) : null; };
  const qT = sideQ('T'), qA = sideQ('A');
  const hst = no2.length ? ['', __('Not finished yet')] : nok.length ? ['nok', __('{n} out of tolerance', { n: nok.length })] : ['ok', __('In order')];
  const hero = `<section class="rephero">
    <span class="label">${__h('Balancing report')}${p.info.nr ? ' · ' + esc(p.info.nr) : ''}</span>
    <h2>${esc(p.info.name || __('Untitled'))}</h2>
    ${p.info.client || p.info.address ? `<div class="sub">${esc([p.info.client, p.info.address].filter(Boolean).join(' · '))}</div>` : ''}
    <div class="stats">
      <div class="stat"><b>${okN}<small> / ${all.length}</small></b><span>${__h('points within ±{t} %', { t: fmt(p.tol.terminal) })}</span></div>
      ${isNum(qT) ? `<div class="stat"><b>${fmt(qT)}</b><span>${__h('m³/h supply · measure 2')}</span></div>` : ''}
      ${isNum(qA) ? `<div class="stat"><b>${fmt(qA)}</b><span>${__h('m³/h extract · measure 2')}</span></div>` : ''}
      <span class="st ${hst[0]}">${esc(hst[1])}</span>
    </div>
  </section>`;
  return `${hero}
  <section class="card"><div class="hd"><h2>${__h('Summary')}</h2></div>
    ${sumRows ? `<div class="tbl-wrap"><table class="tbl blk" style="--c:4"><thead><tr><th>${__h('AHU')}</th><th class="n">${__h('Project')}</th><th class="n">${__h('Measure 2')}</th><th class="n">${__h('Dev.')}</th><th class="n">OK</th></tr></thead><tbody>${sumRows}</tbody></table></div>` : `<p class="small muted" style="margin:0">${__h('No units with design flows.')}</p>`}
  </section>
  ${roomCardHTML(p)}
  ${clCardHTML(p)}
  <section class="card"><div class="hd"><h2>${__h('Check before the report')}</h2>${issues.length ? '' : `<span class="chip ok">${__h('complete')}</span>`}</div>
    ${issues.length ? `<div class="stack-s">${issues.map(([t, m]) => `<div class="banner${t === 'nok' ? '' : ' info'}" style="${t === 'nok' ? 'background:var(--bad-soft);border-color:transparent' : ''}">${esc(m)}</div>`).join('')}</div>` : `<p class="small muted" style="margin:0">${__h('Measurements, dampers and project data are complete.')}</p>`}
  </section>
  ${scopeCardHTML(p)}
  ${typeof AIR !== 'undefined' && !Demo.on() ? AIR.html(p) : ''}
  <section class="card"><div class="hd"><h2>${__h('Conclusions')}</h2><button class="btn sm" data-act="genConclusion">${__h('Write the conclusion')}</button></div>
    ${S.confirm === 'genConcl' ? `<div class="confirm"><span>${__h('The conclusion was edited by hand. Replace it with a new text from the data?')}</span><span class="spacer"></span><button class="btn sm danger" data-act="genConclusionYes">${__h('Replace')}</button><button class="btn sm" data-act="cancelConfirm">${__h('Cancel')}</button></div>` : ''}
    <p class="small muted" style="margin:0">${__h('Three paragraphs: methods and instruments · start-up and order of the works · result.')}</p>
    ${repScope(p) === 'all' ? inp({ f: 'report.conclusion' }, p.report.conclusion, { label: __('Conclusion'), nl: 'Conclusie', area: true, ph: 'Alle eindtoestellen zijn ingeregeld binnen …' })
      : inp({ f: `report.scopes.${repScope(p)}.conclusion` }, ((p.report.scopes || {})[repScope(p)] || {}).conclusion, { label: __('Conclusion for {s}', { s: scopeCode(p, repScope(p)) }), nl: 'Conclusie', area: true, ph: __('Empty: written from the data of this part when the report is built') })}
    ${inp({ f: 'report.remarks' }, p.report.remarks, { label: __('Remarks'), nl: 'Opmerkingen', area: true })}
    <p class="small muted" style="margin:0">${__h('Write the conclusion and remarks in the report language.')}</p>
  </section>
  <section class="card"><div class="hd"><h2>${__h('Signature')}</h2><button class="btn sm" data-act="clearSig">${__h('Clear')}</button></div>
    ${inp({ f: 'report.signName' }, p.report.signName, { label: __('Name'), nl: 'Naam' })}
    ${sigSmall() ? `<button type="button" class="sig sig-prev" data-act="sigOpen" aria-label="${__h('Signature field')}">${p.report.signature ? `<img src="${esc(p.report.signature)}" alt="">` : `<span>${__h('Tap to sign')}</span>`}</button>`
      : `<div class="sig-box"><canvas class="sig" id="sigPad" aria-label="${__h('Signature field')}"></canvas><span class="sig-line" aria-hidden="true"></span></div>`}
  </section>
  <section class="card"><div class="hd"><h2>${__h('Report')}</h2>${p.report.generatedAt ? `<span class="small muted">${__h('last:')} ${esc(fmtDate(p.report.generatedAt))}</span>` : ''}</div>
    <div class="field"><span class="label">${__h('Report language')}</span>${langSeg('repLang', p.report.lang || 'nl', I18N.list('rep'))}</div>
    <div class="grid2">
      <button class="btn primary" data-act="xlsx">${ICON.file} Excel (.xlsx)</button>
      <button class="btn primary" data-act="pdf">${ICON.file} PDF</button>
    </div>
    ${folderRowHTML(p)}
    <button class="btn" data-act="backup">${__h('Project backup (.zip)')}</button>
    <button class="btn danger sm" data-act="askDelProject" style="justify-self:start">${__h('Delete project')}</button>
    ${S.confirm === 'delProject' ? `<div class="confirm"><span>${__h('Delete the project for good?')}</span><span class="spacer"></span><button class="btn sm danger" data-act="delProject">${__h('Delete')}</button><button class="btn sm" data-act="cancelConfirm">${__h('Cancel')}</button></div>` : ''}
  </section>`;
}

/* ---------- folder of the project (0.9.18) ---------- */
function folderRowHTML(p) {
  if (!STANDALONE) return '';
  if (Platform.native()) return `<div class="small muted">${__h('Files are saved in {d}; a new export replaces the file of the same name.', { d: 'Documents/Ventilation Setup Tool/' + projDir(p) })}</div>`;
  if (!Folders.ok()) return `<div class="small muted">${__h('This browser cannot remember a folder: the files go to the downloads. On a computer, Chrome or Edge can write into a project folder.')}</div>`;
  const n = Folders.names[p.id];
  return `<div class="folder-row"><span class="label">${__h('Project folder')}</span><span class="small" id="projFolder">${n ? '📁 ' + esc(n) : n === '' ? __h('not chosen — the files go to the downloads') : '…'}</span>
    <span class="row"><button type="button" class="btn sm" data-act="folderPick">${n ? __h('Other folder') : __h('Choose a folder')}</button>${n ? `<button type="button" class="btn sm ghost" data-act="folderForget">${__h('Forget')}</button>` : ''}</span>
    <span class="small muted">${__h('Report, Excel and backup are written into this folder and replace the file of the same name — the folder stays up to date.')}</span></div>`;
}
/* ---------- signature (0.9.15) ----------
   The stored picture is 600 × 180 (10 : 3, the frame of the reports). Large screens: a fixed field of that shape on the page.
   Phones: a preview that opens a full-screen window (landscape: the screen is turned when the device allows it, otherwise the window turns). */
const SIG_W = 600, SIG_H = 180, SIG_INK = '#12202A';
const sigSmall = () => matchMedia('(max-width: 600px), (max-height: 500px)').matches;
/** a drawing pad on a canvas: strokes kept 0…1 of the field, so a new size (turned phone) redraws them; base = the saved signature */
function sigPad(c, { base = '', map = null, onEnd = null } = {}) {
  const strokes = []; let stroke = null, baseIm = null, w = 0, h = 0;
  const ink = () => getComputedStyle(document.documentElement).getPropertyValue('--fg').trim() || SIG_INK;
  const lw = (hh) => Math.max(1.6, hh * 0.0145);
  const paint = (ctx, W, H, color) => {
    ctx.clearRect(0, 0, W, H); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = lw(H); ctx.strokeStyle = color;
    if (baseIm) ctx.drawImage(baseIm, 0, 0, W, H);
    for (const s of strokes) { if (s.length === 1) { ctx.beginPath(); ctx.arc(s[0][0] * W, s[0][1] * H, ctx.lineWidth / 2, 0, 7); ctx.fillStyle = color; ctx.fill(); continue; }
      ctx.beginPath(); ctx.moveTo(s[0][0] * W, s[0][1] * H); for (let i = 1; i < s.length; i++) ctx.lineTo(s[i][0] * W, s[i][1] * H); ctx.stroke(); }
  };
  const render = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2); w = c.clientWidth; h = c.clientHeight; if (!w || !h) return;
    c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); const ctx = c.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); paint(ctx, w, h, ink());
  };
  // the saved picture is dark ink: on a dark theme it is shown with the ink colour of the theme
  if (base) { const im = new Image(); im.onload = () => { const t = document.createElement('canvas'); t.width = im.width; t.height = im.height; const o = t.getContext('2d'); o.drawImage(im, 0, 0); o.globalCompositeOperation = 'source-in'; o.fillStyle = ink(); o.fillRect(0, 0, t.width, t.height); baseIm = t; render(); }; im.src = base; }
  const at = (e) => { const p = map ? map(e, c) : (() => { const r = c.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; })(); return [Math.min(1, Math.max(0, p[0] / w)), Math.min(1, Math.max(0, p[1] / h))]; };
  c.onpointerdown = (e) => { e.preventDefault(); stroke = [at(e)]; strokes.push(stroke); try { c.setPointerCapture(e.pointerId); } catch (er) { } render(); };
  c.onpointermove = (e) => { if (!stroke) return; e.preventDefault(); const q = at(e), l = stroke[stroke.length - 1]; if (Math.abs(q[0] - l[0]) * w + Math.abs(q[1] - l[1]) * h < 0.8) return; stroke.push(q);
    const ctx = c.getContext('2d'); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = lw(h); ctx.strokeStyle = ink(); ctx.beginPath(); ctx.moveTo(l[0] * w, l[1] * h); ctx.lineTo(q[0] * w, q[1] * h); ctx.stroke(); };
  c.onpointerup = c.onpointercancel = () => { if (!stroke) return; stroke = null; if (onEnd) onEnd(); };
  render();
  return {
    render, empty: () => !strokes.length && !baseIm,
    clear() { strokes.length = 0; baseIm = null; render(); },
    png() { if (!strokes.length && !baseIm) return ''; const o = document.createElement('canvas'); o.width = SIG_W; o.height = SIG_H; paint(o.getContext('2d'), SIG_W, SIG_H, SIG_INK); return o.toDataURL('image/png'); },
  };
}
/** large screens: the fixed field on the page, saved after every stroke */
function initSig() {
  const c = document.getElementById('sigPad'); if (!c) return; const p = cur();
  const pad = sigPad(c, { base: p.report.signature, onEnd: () => { p.report.signature = pad.png(); touch(p); } });
}
/** phones: the full-screen window with OK / Cancel */
async function openSigFS() {
  const p = cur(); if (!p || document.querySelector('.sigfs')) return;
  const el = document.createElement('div'); el.className = 'sigfs'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', __('Signature'));
  el.innerHTML = `<div class="sigfs-in"><div class="sigfs-hd"><b>${__h('Signature')}</b><span class="small muted">${esc(p.report.signName || p.info.technician || '')}</span></div>
    <div class="sigfs-area"><div class="sigfs-pad"><canvas class="sig"></canvas><span class="sig-line" aria-hidden="true"></span><span class="sig-hint">${__h('Sign here')}</span></div></div>
    <div class="sigfs-bar"><button type="button" class="btn" data-sig="cancel">${__h('Cancel')}</button><button type="button" class="btn ghost" data-sig="clear">${__h('Clear')}</button><span class="spacer"></span><button type="button" class="btn primary" data-sig="ok">${__h('OK')}</button></div></div>`;
  document.body.appendChild(el); document.body.classList.add('sigfs-open');
  const inner = el.querySelector('.sigfs-in'), area = el.querySelector('.sigfs-area'), box = el.querySelector('.sigfs-pad'), c = el.querySelector('canvas'), hint = el.querySelector('.sig-hint');
  // landscape: lock the screen when the device allows it (full screen first), else turn the window by 90°
  let locked = false;
  try { if (el.requestFullscreen) await el.requestFullscreen({ navigationUI: 'hide' }); if (screen.orientation && screen.orientation.lock) { await screen.orientation.lock('landscape'); locked = true; } } catch (e) { }
  const turned = () => inner.classList.contains('rot');
  // with the window turned, a screen point is mapped back onto the canvas (canvas x runs down the screen, canvas y runs to the left)
  const map = (e, cv) => { const r = cv.getBoundingClientRect(); return turned() ? [e.clientY - r.top, r.right - e.clientX] : [e.clientX - r.left, e.clientY - r.top]; };
  const pad = sigPad(c, { base: p.report.signature, map, onEnd: () => { hint.hidden = true; } });
  hint.hidden = !!p.report.signature;
  const layout = () => {
    inner.classList.toggle('rot', window.innerHeight > window.innerWidth);
    const aw = area.clientWidth - 8, ah = area.clientHeight - 8; let bw = aw, bh = aw * SIG_H / SIG_W; if (bh > ah) { bh = ah; bw = ah * SIG_W / SIG_H; }
    box.style.width = Math.max(120, Math.floor(bw)) + 'px'; box.style.height = Math.max(36, Math.floor(bh)) + 'px'; pad.render();
  };
  const onResize = () => requestAnimationFrame(layout);
  window.addEventListener('resize', onResize); layout(); setTimeout(layout, 300);
  const close = async (save) => {
    if (save) { p.report.signature = pad.png(); touch(p); }
    window.removeEventListener('resize', onResize); document.removeEventListener('keydown', onKey);
    try { if (locked && screen.orientation.unlock) screen.orientation.unlock(); } catch (e) { }
    try { if (document.fullscreenElement) await document.exitFullscreen(); } catch (e) { }
    el.remove(); document.body.classList.remove('sigfs-open'); renderKeepAll();
  };
  const onKey = (e) => { if (e.key === 'Escape') { e.preventDefault(); close(false); } };
  document.addEventListener('keydown', onKey);
  el.addEventListener('click', (e) => { const b = e.target.closest('[data-sig]'); if (!b) return; const a = b.dataset.sig;
    if (a === 'ok') close(true); else if (a === 'cancel') close(false); else if (a === 'clear') { pad.clear(); hint.hidden = false; } });
}

/* ---------- sheet: editor & dialogs ---------- */
/** the memory of this device in Settings (0.9.4): what the projects use, and whether the browser keeps them */
function fillDeviceMemory() {
  Store.memory().then((m) => {
    const el = document.querySelector('[data-devmem]'); if (!el) return;
    if (!m || m.used == null) { el.textContent = __('The browser does not tell the memory of this device.'); return; }
    el.textContent = __('Memory on this device: {used} MB of {quota} MB', { used: fmt(m.used / 1048576, 1), quota: fmt(m.quota / 1048576) }) + ' · ' + (m.persisted ? __('The browser keeps these projects.') : __('The browser may remove the projects when the device is short of space.'));
  });
}
function renderSheet() {
  const p = cur();
  if (S.dlg && S.ed) S.ed = null; // a dialog opened beside the docked point panel replaces it
  renderViewer();
  if (!S.ed && !S.dlg) { sheetEl.hidden = true; sheetEl.innerHTML = ''; renderSheet.last = null; delete document.body.dataset.dockmin; applyDock(); return; }
  sheetEl.hidden = false;
  const key = S.ed ? 'ed:' + S.ed.id : 'dlg:' + S.dlg.type; const old = document.getElementById('shBody');
  const keep = old && sheetEl.dataset.key === key ? old.scrollTop : 0;
  if (S.ed) {
    const pt = p.points.find(x => x.id === S.ed.id); if (!pt) { S.ed = null; return renderSheet(); }
    sheetEl.innerHTML = editorHTML(p, pt, S.ed.mode);
  } else sheetEl.innerHTML = dialogHTML(p, S.dlg);
  sheetEl.dataset.key = key; sheetEl.dataset.type = S.ed ? 'editor' : (S.dlg && S.dlg.type) || '';
  if (S.dlg && S.dlg.type === 'settings' && !S.ed) fillDeviceMemory();
  Access.decorate(sheetEl);
  const nb = document.getElementById('shBody'); if (nb && keep) nb.scrollTop = keep;
  hydratePhotos(sheetEl); hydratePlans(sheetEl);
  { const ab = sheetEl.querySelector('[data-autobk]'); if (ab) AutoBackup.list().then((l) => { ab.innerHTML = l.length ? l.map((b) => `<div class="row" style="justify-content:space-between;gap:8px;padding:4px 0;border-top:1px solid var(--line)"><span>${esc(fmtDate(b.at))} · ${esc(b.version || '')} · ${esc(b.reason === 'update' ? __('after an update') : b.reason === 'manual' ? __('by hand') : __('daily'))} · ${esc(__('{n} projects', { n: b.n }))}</span><button class="btn sm" data-act="abkRestore" data-k="${esc(b.key)}">${__h('Put back')}</button></div>`).join('') : esc(__('No copy yet: the first one is made shortly after the start.')); }).catch(() => { }); }
  { const si = sheetEl.querySelector('[data-storeinfo]'); if (si && navigator.storage && navigator.storage.estimate) navigator.storage.estimate().then(e => { const n = Object.values(Store.projects).reduce((k, x) => k + (x.docs || []).length, 0); si.textContent = __('Used on this device: {u} of {q} · plans in the projects: {n}', { u: MB(e.usage || 0), q: MB(e.quota || 0), n }); }).catch(() => { }); }
  applyDock(); if (S.ed && key !== renderSheet.last) syncSel(true); renderSheet.last = key;
  updateLive();
}
function renderViewer() {
  const p = cur();
  if (!S.pv || !p) { viewerEl.hidden = true; viewerEl.innerHTML = ''; return; }
  const list = photoList(p, S.pv.owner, false); const ph = list.find(x => x.id === S.pv.id);
  if (!ph) { S.pv = null; viewerEl.hidden = true; viewerEl.innerHTML = ''; return; }
  const i = list.indexOf(ph);
  viewerEl.hidden = false;
  viewerEl.innerHTML = `<div class="viewer" role="dialog" aria-modal="true" aria-label="${__h('Photo')}">
    <div class="vw-top"><span class="small">${__h('Photo')} ${i + 1} ${__h('of')} ${list.length}${(ph.also || []).length ? ' · ' + esc(__('also for {x}', { x: ph.also.map(o => ownerLabel(p, o)).filter(Boolean).join(', ') })) : ''}</span><span class="spacer"></span>
      ${ph.src ? `<button class="btn sm vw-btn" data-act="phPlan">${ICON_PLAN} ${__h('On the plan')}</button>` : ''}<button class="btn sm vw-btn" data-act="phEdit">✎ ${__h('Edit')}</button>
      <button class="iconbtn" data-act="closeViewer" aria-label="${__h('Close')}">${ICON.close}</button></div>
    <div class="vw-img"><img data-ph="${ph.id}" alt="${esc(ph.caption || __('Photo'))}"></div>
    <div class="vw-foot"><div class="wrap stack-s">
      <label class="field" for="ph-cap">${lbl(__('Caption'), 'bijschrift in het rapport')}<input id="ph-cap" type="text" data-phcap="${ph.id}" value="${esc(ph.caption || '')}" placeholder="Typeplaatje toestel"></label>
      <div class="row">${i > 0 ? `<button class="btn sm" data-act="phPrev">${__h('← Prev.')}</button>` : ''}${i < list.length - 1 ? `<button class="btn sm" data-act="phNext">${__h('Next →')}</button>` : ''}<span class="spacer"></span>
        ${S.confirm === 'delPhoto' ? `<span class="small">${__h('Delete this photo?')}</span><button class="btn sm danger" data-act="delPhoto">${__h('Delete')}</button><button class="btn sm" data-act="cancelPhDel">${__h('Cancel')}</button>` : `<button class="btn sm danger" data-act="askDelPhoto">${__h('Delete')}</button>`}</div>
    </div></div></div>`;
  Access.decorate(viewerEl);
  hydratePhotos(viewerEl);
}
/** 0.9.29: several documents at once (plans, schemas, tables, photos, texts, DXF) */
function docsBtn(mode, cls = '') {
  return `<label class="btn sm ${cls}" for="batchFile-${mode}"${cls ? ' style="justify-self:start"' : ''}>📎 ${__h('Add documents')}<input id="batchFile-${mode}" class="vh" type="file" multiple data-batch="${mode}" accept=".pdf,.xlsx,.xlsm,.xls,.csv,.txt,.dxf,.dwg,image/*,application/pdf,text/plain,text/csv"></label>`;
}
/** 0.9.26: button + file input of the AI plan assistant (not in the demo edition) */
function aiBtn(mode, cls = '') {
  if (typeof AIP === 'undefined') return '';
  return `<button class="btn sm ${cls}" data-act="aiPlan" data-mode="${mode}"${cls ? ' style="justify-self:start"' : ''}>✦ ${__h('Read a plan with AI')}</button><input type="file" id="aiPlanFile-${mode}" data-aifile="${mode}" class="vh" multiple accept=".pdf,application/pdf,image/*,.xlsx,.xlsm,.csv,.dxf,.txt,text/plain">`;
}
function sheetFrame(title, body, foot) {
  return `<div class="sheet" role="dialog" aria-modal="true">
    <div class="sh-top"><div class="wrap"><h2>${title}</h2><button class="iconbtn" data-act="closeSheet" aria-label="${__h('Close')}">${ICON.close}</button></div></div>
    <div class="sh-body" id="shBody"><div class="wrap stack">${body}</div></div>
    ${foot ? `<div class="sh-foot"><div class="wrap">${foot}</div></div>` : ''}
  </div>`;
}
const RD_LABEL = { hood: ['Q', 'm³/h'], readout: ['Q', 'm³/h'], anemo: ['v', 'm/s'], kfactor: ['Δp', 'Pa'], pitot: ['pd', 'Pa'], traverse: ['v', 'm/s'] };
const RD_DEFAULT = { hood: 1, readout: 1, kfactor: 1, anemo: 3, pitot: 6, traverse: 6 };
function readingsHTML(p, pt, phase) {
  const rd = pt.meas?.[phase]?.r || [];
  const extra = S.ed?.extra?.[phase] || 0;
  const n = Math.max(RD_DEFAULT[pt.method] || 1, rd.length) + extra;
  const [sym, unit] = RD_LABEL[pt.method] || ['x', ''];
  let h = '';
  for (let i = 0; i < n; i++) h += `<div class="rd"><span>${sym}${n > 1 ? i + 1 : ''}, ${__h(unit)}</span><input id="${fid(pt.id, phase, 'r', i)}" class="num" inputmode="decimal" autocomplete="off" enterkeyhint="${i < n - 1 ? 'next' : 'done'}" data-rd data-num${['anemo', 'traverse'].includes(pt.method) ? ' data-small' : ''} data-pt="${pt.id}" data-f="meas.${phase}.r.${i}" value="${esc(fmtIn(rd[i]))}"></div>`;
  return `<div class="readings">${h}</div><button class="btn sm ghost" data-act="moreRd" data-phase="${phase}" style="justify-self:start">${__h('+ reading')}</button>`;
}
function methodParams(p, pt) {
  if (pt.method === 'anemo') return `<div class="grid2">${inp({ pt: pt.id, f: 'aeff' }, pt.aeff, { label: __('Aeff (Ak) of the grille'), nl: 'Ak', num: true, small: true, unit: __('m²'), ph: '0,0215' })}<div class="small muted" style="align-self:end">${__h('Effective area from the manufacturer\'s catalogue.')}</div></div>`;
  if (pt.method === 'kfactor') { const u = kUnitOf(pt), f = K_F[u]; const ce = ptCat(p, pt);
    if (ce && (ce.kPos || []).length) return catKParamsHTML(p, pt, ce);
    const un = u === 'ls' ? __('l/s') : __('m³/h');
    return `<div class="grid2">${inp({ pt: pt.id, f: 'k' }, isNum(pt.k) ? +(pt.k / f).toPrecision(10) : pt.k, { label: __('k-factor'), nl: 'k', num: true, small: true, unit: un, ph: u === 'ls' ? '30,8' : '58,2', scale: f })}
      ${sel({ pt: pt.id, f: 'kU' }, u, { m3h: __('Q in m³/h = k · √Δp'), ls: __('Q in l/s = k · √Δp') }, { label: __('Unit of k'), rr: true })}
      ${hasReg(pt) ? inp({ pt: pt.id, f: 'k2' }, isNum(pt.k2) ? +(pt.k2 / f).toPrecision(10) : pt.k2, { label: __('k after adjusting (new position)'), nl: 'k na', num: true, small: true, unit: un, ph: __('as before'), scale: f }) : ''}</div>
      <div class="small muted">${__h('Q = k · √Δp, k from the damper / grille catalogue (Iris: usually in l/s).')}${hasReg(pt) ? ' ' + __h('An iris or damper measured on its own taps has another k after adjusting: enter it for the control measurement, or link the technical sheet with k per position.') : ''}</div>`; }
  if (pt.method === 'pitot' || pt.method === 'traverse') return ductFields(pt);
  return '';
}
function ductFields(pt) {
  const d = pt.duct || {};
  return `<div class="stack-s"><div class="row">${seg('setShape', d.shape || 'round', L.shape)}</div>
    <div class="grid2">${d.shape === 'rect'
      ? inp({ pt: pt.id, f: 'duct.w' }, d.w, { label: __('Width B'), num: true, unit: __('mm') }) + inp({ pt: pt.id, f: 'duct.h' }, d.h, { label: __('Height H'), num: true, unit: __('mm') })
      : inp({ pt: pt.id, f: 'duct.d' }, d.d, { label: __('Diameter D'), num: true, unit: __('mm') }) + '<div></div>'}</div>
    <div class="small muted" data-live="area|${pt.id}"></div></div>`;
}
function editorHTML(p, pt, mode) {
  const phase = mode === 'eerste' || mode === 'controle' ? mode : null;
  const title = `<span class="tag ${pt.kind === 'device' ? 'D' : pt.dir}">${pt.kind === 'device' ? '—' : pt.dir}</span><span class="mono">${esc(pt.code || __('New point'))}</span>`;
  const listIdx = S.list.indexOf(pt.id);
  let body = addedBanner(p, pt);
  { const b = measurable(pt) ? blockedBy(p, pt) : null; if (b) body += `<div class="banner" style="background:var(--bad-soft);border-color:transparent">${__h('Behind {code} ({state}): the measurement here is not representative until the damper is open and in order.', { code: b.code || '?', state: [b.reg.state ? L.state[b.reg.state] : '', b.reg.cond ? L.cond[b.reg.cond] : ''].filter(Boolean).join(', ').toLowerCase() })}</div>`; }
  if (phase && measurable(pt)) {
    body += `<section class="card">
      <div class="hd"><h3>${phase === 'eerste' ? __('Initial measurement') : __('Control measurement')}</h3>${listIdx >= 0 ? `<span class="small muted">${listIdx + 1} ${__h('of')} ${S.list.length}</span>` : ''}</div>
      <div class="small muted">${esc([pt.room, pt.branch, pt.kind === 'terminal' ? L.ttype[pt.ttype] + (pt.size ? ' ' + pt.size : '') : (hasReg(pt) ? L.reg[pt.reg.type] : __('duct')), parentOf(p, pt) ? __('slave of {code}', { code: parentOf(p, pt).code }) : ''].filter(Boolean).join(' · '))}</div>
      <div class="grid2">
        ${sel({ pt: pt.id, f: 'method' }, pt.method, L.method, { label: __('Method'), rr: true, full: true })}
        ${inp({ pt: pt.id, f: 'designQ' }, pt.designQ, { label: __('Project'), nl: 'ontwerp', num: true, unit: __('m³/h'), ro: roStruct(p, pt) })}
        ${pt.method === 'readout' ? '' : insSelect(p, pt, phase)}
      </div>
      ${methodParams(p, pt)}
      ${readingsHTML(p, pt, phase)}
      <div class="gauge">
        <span class="label">${__h('Flow rate')} ${phase === 'eerste' ? ('· ' + __('measurement 1')) : ('· ' + __('control'))}</span>
        <div class="big" data-live="pq|${pt.id}|${phase}">—</div>
        <div class="line"><span data-live="pchip|${pt.id}|${phase}"></span><span data-live="pv|${pt.id}|${phase}"></span></div>
        ${meterHTML(null, p.tol.terminal, null, `pbar|${pt.id}|${phase}`)}
        <div class="scale"><span>−50 %</span><span>${__h('design')}</span><span>+50 %</span></div>
      </div>
      ${isNode(pt) ? `<div class="small" data-live="kids|${pt.id}|${phase}"></div>` : ''}
      <div class="grid2" style="padding-top:10px;border-top:1px solid var(--line)">
        ${inp({ pt: pt.id, f: `meas.${phase}.ps` }, psOf(pt, phase), { label: isNode(pt) ? __('Pressure before the node') : __('Pressure before the grille'), nl: 'p stat', num: true, neg: true, unit: __('Pa'), ph: pt.dir === 'A' ? '−85' : '120', id: fid(pt.id, 'ps-ed', phase) })}
        <div class="small" style="align-self:end" data-live="ploss|${pt.id}|${phase}"></div>
      </div>
    </section>`;
    if (hasReg(pt)) body += `<section class="card"><div class="hd"><h3>${__h('Dampers')}</h3><span class="small muted">${esc(L.reg[pt.reg.type])}${pt.reg.model ? ' · ' + esc(pt.reg.model) : ''}</span></div>
      <div class="grid2">${phase === 'eerste'
        ? inp({ pt: pt.id, f: 'reg.posBefore' }, pt.reg.posBefore, { label: __('Position before'), nl: 'Stand vóór', ph: __('open / 4 / 100%') })
        : inp({ pt: pt.id, f: 'reg.posAfter' }, pt.reg.posAfter, { label: __('Position after'), nl: 'Stand na', ph: '3 / 70%' }) + chk({ pt: pt.id, f: 'reg.locked' }, pt.reg.locked, __('Locked'))}</div></section>`;
    body += statusHTML(p, pt);
    body += `<details class="more"><summary>${__h('Point data')}</summary><div class="inner">${setupFields(p, pt)}</div></details>`;
  } else body += setupFields(p, pt) + statusHTML(p, pt);
  body += pinCardHTML(p, pt);
  body += `<section class="card"><div class="hd"><h3>${__h('Note and photos')}</h3><span class="small muted">${__h('in the report: Opmerkingen en foto\'s')}</span></div>
    ${inp({ pt: pt.id, f: 'note' }, pt.note, { label: __('Note'), nl: 'Opmerking', area: true, ph: __('Shown in the report') })}
    ${photosHTML(p, 'pt:' + pt.id)}</section>`;
  let foot;
  if (phase) foot = `<button class="btn" data-act="edPrev"${listIdx <= 0 ? ' disabled' : ''}>${__h('← Prev.')}</button><button class="btn primary" data-act="edNext">${listIdx >= 0 && listIdx < S.list.length - 1 ? __('Next →') : __('Done')}</button>`;
  else foot = S.confirm === 'delPt'
    ? `<button class="btn danger" data-act="delPt">${__h('Delete point')}</button><button class="btn" data-act="cancelConfirm">${__h('Cancel')}</button>`
    : `${canDelete(p, pt) ? `<button class="btn danger" data-act="askDelPt">${__h('Delete')}</button>` : ''}<button class="btn" data-act="dupPt">${__h('Copy')}</button><button class="btn primary" data-act="closeSheet">${__h('Done')}</button>`;
  if (!phase && S.confirm === 'delPt' && rawChildren(p, pt.id).length) body += `<div class="banner">${__h('Slave points ({n}) move one level up — to {to}.', { n: rawChildren(p, pt.id).length, to: rawParent(p, pt)?.code || __('the top level of the branch') })}</div>`;
  return sheetFrame(title, body, foot);
}
function masterField(p, pt) {
  const dev = isDev(pt);
  const cands = treeOrder(p, p.points.filter(c => canBeMaster(p, pt, c)));
  const opts = { '': ('— ' + (dev ? __('none, directly after the fan / main duct') : __('none, top level of the branch'))) };
  for (const { pt: c, lvl } of cands) opts[c.id] = `${'· '.repeat(lvl - 1)}${c.code || __('no code')}${hasReg(c) ? ' — ' + L.reg[c.reg.type] : ''}`;
  const kids = childrenOf(p, pt.id);
  return `<div class="grid2">${sel({ pt: pt.id, f: 'parentId' }, pt.parentId || '', opts, { label: dev ? __('Located after (node upstream)') : __('Slave of node (master)'), nl: 'Master', rr: true, full: true, ro: roStruct(p, pt) })}
    ${isNode(pt) ? `<div class="full small row" style="gap:6px;align-items:center">${__h('Slaves:')}${kids.length ? ' ' + sortPoints(p, kids).map(k => `<button class="btn ghost sm" data-act="editPt" data-id="${k.id}" data-mode="setup" style="padding:0 6px;min-height:28px"><span class="mono">${esc(k.code || '—')}</span></button>`).join(' ') : ` <span class="muted">${__h('none')}</span>`}<button class="btn sm" data-act="addChild" style="min-height:32px">${__h('+ Slave point')}</button></div>` : ''}
    ${!cands.length && !dev ? `<span class="full small muted">${__h('No nodes in this unit and direction yet. Create a point of type «Node» (CAV, iris…), then choose it here.')}</span>` : ''}</div>
    ${dev ? behindField(p, pt) : ''}`;
}
/** line damper: which points of the same level sit behind it (they become its slaves) */
function behindField(p, pt) {
  const ro = roStruct(p, pt);
  const cand = sortPoints(p, p.points.filter(x => x.id !== pt.id && x.systemId === pt.systemId && x.dir === pt.dir && (x.parentId === pt.id || ((x.parentId || '') === (pt.parentId || '') && (!pt.branch || (pt.parentId ? true : (x.branch || '') === pt.branch)))) && !descendantIds(p, x.id).has(pt.id)));
  const n = behind(p, pt).length;
  return `<div class="stack-s" style="padding-top:10px"><span class="label">${__h('Behind this damper')} <span style="text-transform:none;letter-spacing:0;font-weight:500;opacity:.75">· ${__h('{n} measuring points', { n })}</span></span>
    ${cand.length ? `<div class="tgls">${cand.map(x => `<button class="tgl${x.parentId === pt.id ? ' on' : ''}" data-act="devKid" data-id="${x.id}"${ro ? ' disabled' : ''}><span class="mono">${esc(x.code || '—')}</span>${x.kind === 'duct' && hasReg(x) ? ' · ' + esc(L.reg[x.reg.type]) : ''}</button>`).join('')}</div>` : `<span class="small muted">${__h('No points at this level yet.')}</span>`}
    <span class="small muted">${__h('Choose the branch, node or grilles that the damper feeds. Their flows and balancing are not affected; a closed or defective damper marks them as not representative.')}</span>
    ${ro ? '' : `<div class="row"><button class="btn sm" data-act="addChild">${__h('+ Point behind the damper')}</button></div>`}</div>`;
}
/** step «Dampers»: fire, shut-off and non-return dampers on the duct, per floor / zone */
function damperCard(p, devices) {
  const bad = devices.filter(devBad);
  const zones = new Map(); for (const d of devices) { const k = d.zone || ''; if (!zones.has(k)) zones.set(k, []); zones.get(k).push(d); }
  const rows = [...zones.entries()].map(([z, arr]) => `<div class="br-hd">${esc(z || __('no floor / zone'))}</div>` + arr.map(pt => {
    const ctx = isCtx(p, pt); const fd = pt.fd || {}; const n = behind(p, pt).length; const fire = pt.reg.type === 'brand';
    const nok = ['hatch', 'plate', 'test', 'sig'].filter(k => fd[k] === 'nok').map(k => ({ hatch: __('hatch'), plate: __('plate'), test: __('test'), sig: __('signal') })[k]);
    const rs = (f, val, opts, al) => `<select id="${fid(pt.id, f.replace('.', '-'))}" data-pt="${pt.id}" data-f="${f}" data-rrw aria-label="${esc(al)}"${ctx ? ' disabled' : ''}>${Object.entries(opts).map(([k, v]) => `<option value="${esc(k)}"${(val || '') === k ? ' selected' : ''}>${esc(v)}</option>`).join('')}</select>`;
    return `<div class="dmp${devBad(pt) ? ' bad' : ''}">
      <div class="dmp-hd"><button class="btn ghost sm" data-act="editPt" data-id="${pt.id}" data-mode="setup"><span class="mono">${esc(pt.code || '—')}</span></button>
        <span class="small"><b>${esc(L.reg[pt.reg.type])}</b>${fire && fd.ei ? ' · ' + esc(fd.ei) : ''}${pt.reg.model ? ' · ' + esc(pt.reg.model) : ''}</span>${nok.length ? `<span class="chip nok">${esc(nok.join(', '))}</span>` : ''}</div>
      <div class="small muted">${esc([pt.room, fire ? [fd.from, fd.to].filter(Boolean).join(' → ') : '', n ? __('{n} points behind', { n }) : __('no points behind')].filter(Boolean).join(' · '))}</div>
      <div class="grid2"><label class="field"><span class="label">${__h('Position')}</span>${rs('reg.state', pt.reg.state, posLabels(), __('Position'))}</label><label class="field"><span class="label">${__h('Condition')}</span>${rs('reg.cond', pt.reg.cond, L.cond, __('Condition'))}</label></div>
    </div>`;
  }).join('')).join('');
  return `<section class="card"><div class="hd"><h3>${__h('Fire and shut-off dampers')}</h3><button class="btn sm" data-act="addDevice">${__h('+ Damper')}</button></div>
    <p class="small muted" style="margin:0 0 8px">${__h('On the duct, per floor / zone: fire dampers separate floors and rooms, shut-off and non-return dampers close a branch. They are not adjusted — during the measurements they must be open and in order. Branches are adjusted with register, iris, CAV or VAV above.')}</p>
    ${bad.length ? `<div class="banner" style="background:var(--bad-soft);border-color:transparent">${__h('Closed or defective: {list}. The points behind them are not representative.', { list: bad.map(d => `${d.code || '?'} (${behind(p, d).length})`).join(', ') })}</div>` : ''}
    ${devices.length ? `<div class="dmps">${rows}</div>`
      : `<p class="small muted" style="margin:0">${__h('No dampers yet. Add each fire damper where it is on the duct and choose the points behind it.')}</p>`}
  </section>`;
}
function setupFields(p, pt) {
  const ro = roStruct(p, pt);
  const branches = [...new Set(p.points.map(x => x.branch).filter(Boolean))];
  const zones = [...new Set(p.points.map(x => x.zone).filter(Boolean))];
  const r = pt.reg;
  const regTypes = Object.fromEntries(regTypesFor(pt.kind, r.type).map(k => [k, L.reg[k]]));
  return `
    ${ro ? `<div class="banner info">${__h('Issued by the coordinator: code, unit, branch and design flow cannot be changed here. If the point does not match, set the status and write a note.')}</div>` : ''}
    <div class="stack-s"><span class="label">${__h('Point type')}</span>${seg('setKind', pt.kind, { terminal: __('Grille'), duct: __('Node / duct'), device: __('Fire / shut-off damper') }, ro ? ' disabled' : '')}
      <span class="small muted">${pt.kind === 'duct' ? __('Node — CAV, VAV, iris or branch damper, measured in the duct. Can be the master of other nodes and grilles.') : pt.kind === 'terminal' ? __('Grille / diffuser — an end point, counted in the unit total.') : __('On the duct, without measurement: fire, shut-off or non-return damper. Fire dampers separate floors and rooms; during balancing they must be open.')}</span></div>
    ${masterField(p, pt)}
    <div class="grid2">
      ${unitSelHTML(p, pt, { ro })}
      <div class="field"><span class="label">${__h('Direction')}</span>${seg('setDir', pt.dir, Object.fromEntries(unitDirs(sysOf(p, pt.systemId)).map(d => [d, d === 'T' ? __('Supply') : __('Extract')])), ro ? ' disabled' : '')}</div>
      ${inp({ pt: pt.id, f: 'code' }, pt.code, { label: __('Code'), nl: 'Code', ph: 'T1.01', ro })}
      ${inp({ pt: pt.id, f: 'branch' }, pt.branch, { label: __('Branch'), nl: 'Tak', ph: 'Tak 1', list: 'dl-branches', ro })}
      ${inp({ pt: pt.id, f: 'zone' }, pt.zone, { label: __('Floor / zone'), nl: 'Verdieping / zone', ph: __('Floor 1'), list: 'dl-zones', ro })}
      ${inp({ pt: pt.id, f: 'room' }, pt.room, { label: __('Room'), nl: 'Lokaal', ro })}
      ${pt.kind === 'terminal' ? sel({ pt: pt.id, f: 'ttype' }, pt.ttype, L.ttype, { label: __('Grille type'), nl: 'Type' }) + inp({ pt: pt.id, f: 'size' }, pt.size, { label: __('Size'), nl: 'Afmeting', ph: '600x600' }) : ''}
      ${measurable(pt) ? inp({ pt: pt.id, f: 'designQ' }, pt.designQ, { label: __('Design flow'), nl: 'Ontwerpdebiet', num: true, unit: __('m³/h'), id: fid(pt.id, 'designQ-setup'), ro }) + sel({ pt: pt.id, f: 'method' }, pt.method, L.method, { label: __('Measuring method'), rr: true, id: fid(pt.id, 'method-setup') }) : ''}
    </div>
    <datalist id="dl-branches">${branches.map(b => `<option value="${esc(b)}">`).join('')}</datalist><datalist id="dl-zones">${zones.map(b => `<option value="${esc(b)}">`).join('')}</datalist>
    ${pt.kind === 'duct' && !(pt.method === 'pitot' || pt.method === 'traverse') ? ductFields(pt) : ''}
    ${pt.kind === 'duct' ? chk({ pt: pt.id, f: 'duct.main' }, pt.duct?.main, __('Main duct of the unit (hoofdkanaal)')) : ''}
    ${measurable(pt) && !S.ed?.mode?.match(/eerste|controle/) ? methodParams(p, pt) : ''}
    ${isDev(pt) ? devFields(p, pt, regTypes) : `<div class="stack-s" style="padding-top:12px;border-top:1px solid var(--line)"><span class="label">${__h('Damper · Regelorgaan')}</span>
      <div class="grid2">
        ${sel({ pt: pt.id, f: 'reg.type' }, r.type, regTypes, { label: __('Type'), rr: true })}
        ${CAT_KINDS.includes(r.type) ? catSelHTML(p, pt) : ''}
        ${(ptCat(p, pt)?.kPos || []).length ? inp({ pt: pt.id, f: 'reg.dpPre' }, r.dpPre, { label: __('Δp for the preset'), num: true, unit: __('Pa'), ph: '50', rrw: true }) : ''}
        ${r.type !== 'none' ? inp({ pt: pt.id, f: 'reg.model' }, r.model, { label: __('Model / DN'), ph: r.type === 'plenum' ? 'PB-400' : 'Iris-160' }) : ''}
        ${r.type === 'cav' || r.type === 'vav' ? inp({ pt: pt.id, f: 'reg.vmin' }, r.vmin, { label: 'Vmin', num: true, unit: __('m³/h') }) + inp({ pt: pt.id, f: 'reg.vmax' }, r.vmax, { label: 'Vmax', num: true, unit: __('m³/h') }) + inp({ pt: pt.id, f: 'reg.dpmin' }, r.dpmin, { label: __('Min. Δp (manufacturer)'), nl: 'Δp min', num: true, unit: __('Pa'), ph: '50' }) + inp({ pt: pt.id, f: 'reg.vnom' }, r.vnom, { label: 'Vnom', num: true, unit: __('m³/h') }) + sel({ pt: pt.id, f: 'reg.opmode' }, r.opmode || '', UL().opmode, { label: __('Mode at commissioning') }) : ''}
        ${r.type !== 'none' && !DEVICE_ONLY.includes(r.type) ? inp({ pt: pt.id, f: 'reg.posBefore' }, r.posBefore, { label: __('Position before'), nl: 'Stand vóór', id: fid(pt.id, 'pb-setup') }) + inp({ pt: pt.id, f: 'reg.posAfter' }, r.posAfter, { label: __('Position after'), nl: 'Stand na', id: fid(pt.id, 'pa-setup') }) : ''}
        ${DEVICE_ONLY.includes(r.type) ? sel({ pt: pt.id, f: 'reg.state' }, r.state || '', posLabels(), { label: __('Position'), nl: 'Stand' }) : ''}
      </div>
      ${r.type !== 'none' && !DEVICE_ONLY.includes(r.type) ? chk({ pt: pt.id, f: 'reg.locked' }, r.locked, __('Locked after adjusting')) : ''}
      ${r.type !== 'none' && !DEVICE_ONLY.includes(r.type) ? `<details class="more"${ctlOn(r.ctl) || String(r.act || '').trim() ? ' open' : ''}><summary>${__h('Actuator · control and communication')}</summary><div class="inner">${inp({ pt: pt.id, f: 'reg.act' }, r.act || '', { label: __('Motor / actuator type'), nl: 'Motor', ph: 'Belimo LMV-D3-MOD' })}${ctlHTML(p, { pt: pt.id }, 'reg.ctl', r.ctl, {})}${r.type === 'vav' ? '' : `<span class="small muted">${__h('With a motor or a control filled in, this damper is listed in «Regelorganen» of the report.')}</span>`}</div></details>` : ''}
      ${pt.kind === 'terminal' ? `<span class="small muted">${__h('Plenum damper: in the plenum box of the grille (swirl or slot diffuser). Iris or control damper: in the connection of this grille only.')}</span>` : pt.kind === 'duct' ? `<span class="small muted">${__h('Node: register, iris, CAV or VAV controls a branch. Plenum dampers belong to the grilles.')}</span>` : ''}
    </div>`}`;
}
const posLabels = () => ({ '': '—', open: L.state.open, dicht: L.state.dicht });
/** line damper on the duct: position and condition during the measurements, fire damper data and checks */
function devFields(p, pt, regTypes) {
  const r = pt.reg, fd = pt.fd || {}; const fire = r.type === 'brand'; const id = pt.id;
  const zones = [...new Set(p.points.map(x => x.zone).filter(Boolean))];
  const chkSel = (k, label, nlT) => sel({ pt: id, f: 'fd.' + k }, fd[k] || '', L.chk, { label, nl: nlT, rrw: true });
  return `<div class="stack-s" style="padding-top:12px;border-top:1px solid var(--line)"><span class="label">${__h('Damper on the duct')}</span>
      <div class="grid2">
        ${sel({ pt: id, f: 'reg.type' }, r.type, regTypes, { label: __('Type'), nl: 'Type', rr: true })}
        ${inp({ pt: id, f: 'reg.model' }, r.model, { label: __('Make / model / size'), nl: 'Model / DN', ph: fire ? 'CU-LT Ø315' : 'Ø250' })}
        ${sel({ pt: id, f: 'reg.state' }, r.state || '', posLabels(), { label: __('Position during the measurements'), nl: 'Stand', rr: true, rrw: true })}
        ${sel({ pt: id, f: 'reg.cond' }, r.cond || '', L.cond, { label: __('Condition'), nl: 'Toestand', rr: true, rrw: true })}
        ${r.type !== 'terugslag' ? sel({ pt: id, f: 'fd.act' }, fd.act || '', L.act, { label: __('Actuator'), nl: 'Bediening', rr: true }) : ''}
        ${fd.act && fd.act !== 'smelt' && r.type !== 'terugslag' ? `<div class="field" style="align-self:end">${chk({ pt: id, f: 'fd.sw' }, fd.sw, __('End switches'))}</div>` : ''}
      </div>
      ${devBad(pt) ? `<div class="banner" style="background:var(--bad-soft);border-color:transparent">${__h('Closed or defective: the {n} measuring points behind it are marked as not representative.', { n: behind(p, pt).length })}</div>` : ''}
    </div>
    ${fire ? `<div class="stack-s" style="padding-top:12px;border-top:1px solid var(--line)"><span class="label">${__h('Fire damper')}</span>
      <div class="grid2">
        ${inp({ pt: id, f: 'fd.from' }, fd.from, { label: __('Separates: from'), nl: 'Grens van', ph: 'V1', list: 'dl-fdz' })}
        ${inp({ pt: id, f: 'fd.to' }, fd.to, { label: __('to'), nl: 'naar', ph: __('Stairwell'), list: 'dl-fdz' })}
        ${sel({ pt: id, f: 'fd.pass' }, fd.pass || '', L.pass, { label: __('Passage'), nl: 'Doorgang' })}
        ${inp({ pt: id, f: 'fd.ei' }, fd.ei, { label: __('Fire resistance'), nl: 'EI-klasse', ph: 'EI 60 S', list: 'dl-ei' })}
        ${chkSel('hatch', __('Access hatch reachable'), 'Inspectieluik')}
        ${chkSel('plate', __('Identification plate'), 'Identificatieplaatje')}
        ${chkSel('test', __('Functional test (close / open)'), 'Functionele test')}
        ${fd.act && fd.act !== 'smelt' ? chkSel('sig', __('Signal to BMS / fire panel'), 'Signaal GBS / brandcentrale') : ''}
        ${inp({ pt: id, f: 'fd.tby' }, fd.tby, { label: __('Test done by'), nl: 'Test door', ph: __('own crew / fire safety company'), full: true })}
      </div>
      <datalist id="dl-fdz">${zones.map(z => `<option value="${esc(z)}">`).join('')}</datalist>
      <datalist id="dl-ei">${['EI 30 S', 'EI 60 S', 'EI 90 S', 'EI 120 S', 'EI 60', 'EI 120'].map(z => `<option value="${z}">`).join('')}</datalist>
      <span class="small muted">${__h('Leave a check empty when it is not part of your work (for example the functional test by the fire safety company).')}</span>
    </div>` : ''}`;
}
/** Settings → «Account and access»: session, role, plan, and a preview of every role and plan */
const PERM_ROWS = [['project.create', N_('Create projects')], ['project.delete', N_('Delete projects')], ['structure.edit', N_('Units, codes, masters and design flows')], ['point.add', N_('Add points, grilles and dampers')],
  ['point.delete', N_('Delete any point')], ['measure.edit', N_('Measure, damper positions, statuses, photos')], ['import.excel', N_('Import from Excel')], ['package.manage', N_('Crews: packages, measuring sheets, merge')],
  ['report.edit', N_('Conclusion, cover and signature')], ['report.export', N_('Export reports (Excel, PDF)')], ['org.profile', N_('Company, logo and footer')], ['org.texts', N_('Own report texts and style')],
  ['org.languages', N_('Own language packs')], ['org.users', N_('Users and roles')], ['org.billing', N_('Subscription')]];
/* ---------- account: the form of the first screen, the organisation step, the card in Settings ---------- */
const acctState = () => S.acct || (S.acct = { mode: 'signin', email: '', pass: '', name: '', org: '', ie: '', ir: 'tech', code: '', codes: {}, np: '' });
const acctMsg = (A) => A.err ? `<div class="banner" role="alert" style="background:var(--bad-soft);border-color:transparent">${esc(A.err)}</div>` : A.info ? `<div class="banner info" role="status">${esc(A.info)}</div>` : '';
/** sign in / create an account / confirm the address with the code / reset the password with the code */
function acctFormHTML(A) {
  const busy = A.busy ? ' disabled' : '', m = A.mode;
  const email = (auto) => `<label class="field" for="ac-email">${lbl(m === 'signin' ? __('E-mail or user') : __('E-mail'))}<input id="ac-email" type="${m === 'signin' ? 'text' : 'email'}" inputmode="email" autocapitalize="none" autocorrect="off" spellcheck="false" autocomplete="${auto}" enterkeyhint="next" data-acct="email" value="${esc(A.email)}" placeholder="naam@firma.be"></label>`;
  const code = `<label class="field" for="ac-code">${lbl(__('Code from the e-mail'))}<input id="ac-code" class="mono" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="10" enterkeyhint="go" data-acct="code" value="${esc(A.code)}" placeholder="123456"></label>`;
  const pass = (auto, ph) => `<label class="field" for="ac-pass">${lbl(m === 'reset' ? __('New password') : __('Password'))}<input id="ac-pass" type="password" autocomplete="${auto}" enterkeyhint="go" data-acct="pass" value="${esc(A.pass)}" placeholder="${ph ? esc(ph) : ''}"></label>`;
  const rule = __('at least {n} characters, letters and digits', { n: PASS_MIN });
  if (m === 'confirm') return `<h3 style="margin:0">${__h('Confirm the e-mail address')}</h3>
    <span class="small">${__h('Enter the code from the e-mail we sent to this address. No e-mail? Look in the junk mail, or send the code again.')}</span>
    ${email('email')}${code}${acctMsg(A)}
    <span class="small muted">${__h('An e-mail with a link instead of a code? Open the link: the app opens and signs you in.')}</span>
    <div class="row"><button class="btn primary" data-act="acctVerify" data-go${busy}>${__h('Confirm')}</button><button class="btn" data-act="acctResend"${busy}>${__h('Send the code again')}</button><button class="btn ghost" data-act="acctMode" data-v="signin">${__h('Back')}</button></div>
    <span class="small muted">${__h('Already have an account with this address? Then no code is sent: sign in, or reset the password.')}</span>`;
  if (m === 'reset') return `<h3 style="margin:0">${__h('Reset the password')}</h3>
    <span class="small">${__h('Enter the code from the e-mail and choose a new password.')}</span>
    ${email('email')}${code}${pass('new-password', rule)}${acctMsg(A)}
    <span class="small muted">${__h('An e-mail with a link instead of a code? Open the link and choose the new password in the settings.')}</span>
    <div class="row"><button class="btn primary" data-act="acctReset" data-go${busy}>${__h('Save the new password')}</button><button class="btn" data-act="acctRecover"${busy}>${__h('Send the code again')}</button><button class="btn ghost" data-act="acctMode" data-v="signin">${__h('Back')}</button></div>`;
  if (m === 'recover') return `<h3 style="margin:0">${__h('Reset the password')}</h3>
    ${email('email')}${acctMsg(A)}
    <div class="row"><button class="btn primary" data-act="acctRecover" data-go${busy}>${__h('Send a code')}</button><button class="btn" data-act="acctMode" data-v="reset">${__h('I have a code')}</button><button class="btn ghost" data-act="acctMode" data-v="signin">${__h('Back')}</button></div>`;
  const up = m === 'signup';
  return `${seg('acctMode', up ? 'signup' : 'signin', { signin: __('Sign in'), signup: __('Create an account') })}
    ${up ? `<label class="field" for="ac-name">${lbl(__('Your name'))}<input id="ac-name" type="text" autocomplete="name" enterkeyhint="next" data-acct="name" value="${esc(A.name)}"></label>` : ''}
    ${email(up ? 'email' : 'username')}${pass(up ? 'new-password' : 'current-password', up ? rule : '')}
    ${acctMsg(A)}
    <div class="row">${up ? `<button class="btn primary" data-act="acctSignUp" data-go${busy}>${__h('Create the account')}</button><button class="btn ghost" data-act="acctMode" data-v="confirm">${__h('I have a code')}</button>`
      : `<button class="btn primary" data-act="acctSignIn" data-go${busy}>${__h('Sign in')}</button><button class="btn ghost" data-act="acctMode" data-v="recover">${__h('Forgot the password?')}</button>`}</div>`;
}
/** invitations for me: organisation, role, who invited; accepting needs the code from the administrator */
function invitesHTML(A) {
  const busy = A.busy ? ' disabled' : '';
  return (Cloud.invites || []).map(x => `<div class="stack-s inv-row"><div class="small"><b>${esc(x.org_name)}</b> · ${esc(L.role[x.role] || x.role)}${x.invited_by ? ' · ' + esc(__('invited by {n}', { n: x.invited_by })) : ''}</div>
    <div class="row"><input class="mono inv-code" type="text" autocapitalize="characters" autocomplete="off" spellcheck="false" maxlength="9" aria-label="${__h('Invitation code')}" placeholder="${__h('Invitation code')}" data-invcode="${esc(x.id)}" value="${esc((A.codes || {})[x.id] || '')}">
      <button class="btn sm primary" data-act="invAccept" data-v="${esc(x.id)}"${busy}>${__h('Accept')}</button></div></div>`).join('');
}
/** signed in, not yet in an organisation: invitations for me, or a new organisation (free trial) */
function orgStepHTML(A) {
  const busy = A.busy ? ' disabled' : '';
  const inv = invitesHTML(A);
  return `${inv ? `<div class="stack-s"><span class="label">${__h('Invitations for you')}</span>${inv}<span class="small muted">${__h('The administrator gives you the invitation code (for example by WhatsApp or mail).')}</span></div>` : ''}
    <div class="stack-s"><span class="label">${__h('New organisation')}</span><span class="small muted">${__h('You become its owner, with a free trial of 14 days for 3 users.')}</span>
      <label class="field" for="ac-orgname">${lbl(__('Name of the firm'))}<input id="ac-orgname" type="text" enterkeyhint="go" data-acct="org" value="${esc(A.org)}" placeholder="Firma nv"></label>
      <div class="row"><button class="btn${inv ? '' : ' primary'}" data-act="orgCreate" data-go${busy}>${__h('Create the organisation')}</button></div></div>`;
}
/* ---------- first screen: sign in or create an account (to get to know the app: demo / demo) ---------- */
const gateOn = () => !Demo.on() && !(Auth.user() && Access.s && Access.s.status === 'cloud');
function renderGate() {
  delete document.body.dataset.layout;
  const A = acctState(); const u = Auth.user(); const busy = A.busy ? ' disabled' : '';
  let body;
  if (!u) body = `<section class="card stack-s gate-card">${acctFormHTML(A)}</section>
    <div class="gate-demo"><b>${__h('To get to know the app')}</b><span>${__x('Sign in with user {u} and password {p}: an example project with measurements, all functions. Reports of the demo are marked DEMO.', { u: '<b class="mono">demo</b>', p: '<b class="mono">demo</b>' })}</span></div>
    ${cloudOn() ? `<p class="small muted gate-note">${__h('Your projects stay on this device; the account sets your organisation, role and plan. Synchronisation between devices comes in a later version.')}</p>`
      : `<p class="small muted gate-note">${__h('In this preview only the demo works: accounts work in the app (APK) and in the web app (PWA).')}</p>`}`;
  else {
    const waiting = !Cloud.loaded;
    body = `<section class="card stack-s gate-card">
      <div class="kv2 small"><span>${__h('Account')}</span><b>${esc(u.email)}</b></div>
      ${waiting ? `<p class="small muted" style="margin:0">${__h('Looking for your organisation…')}</p>${acctMsg(A)}` : `<p class="small" style="margin:0">${__h('One more step: join the organisation that invited you, or create your own.')}</p>${orgStepHTML(A)}${acctMsg(A)}`}
      <div class="row"><button class="btn sm" data-act="acctRefresh"${busy}>${__h('Refresh')}</button><span class="spacer"></span><button class="btn sm ghost" data-act="acctOut"${busy}>${__h('Sign out')}</button></div>
    </section>`;
  }
  app.innerHTML = `<main class="gate"><div class="gate-in stack">
    <div class="gate-brand"><span class="gate-mark" aria-hidden="true">${BRAND_MARK}</span><div><h1>Ventilation Setup Tool <span class="ver">v${esc(APP_VERSION)}</span></h1><div class="sub">${__h('Ventilation commissioning · reports in Dutch and French')}</div></div></div>
    <div class="gate-lang">${langSeg('uiLang', I18N.cur.ui, I18N.list('ui'))}</div>
    ${body}
  </div></main>`;
}
/** the account form is on the first screen or in Settings */
function acctPaint() { if (gateOn()) render(); else renderSheet(); }
function accountCard() {
  const o = Access.cur(); const sim = Settings.v.sim || {}; const pl = PLANS[o.plan] || {};
  const stateTxt = o.state === 'expired' ? __('ended') : o.state === 'offline' ? __('not checked for {d} days', { d: OFFLINE_DAYS }) : '';
  const rows = PERM_ROWS.map(([k, t]) => { const c = Access.checkAs(o, k); const mark = c.ok ? '<b style="color:var(--ok)">✓</b>' : c.kind === 'plan' ? `<span class="chip">${esc((L.plan || {})[c.need] || c.need)}</span>` : c.kind === 'readonly' ? '<span class="muted">' + __h('read only') + '</span>' : '<span class="muted">—</span>';
    return `<tr><td class="small">${__h(t)}</td><td class="n">${mark}</td></tr>`; }).join('');
  const A = acctState(); const msg = acctMsg(A);
  const busy = A.busy ? ' disabled' : '';
  const u = Auth.user();
  let acc = '';
  if (Demo.on()) acc = `<div class="kv2 small"><span>${__h('Account')}</span><b>demo · ${__h('to get to know the app')}</b></div>
      <span class="small muted">${__h('The demo projects stay apart from the projects of your account; reports are marked DEMO.')}</span>
      <div class="row"><button class="btn sm primary" data-act="demoOut" data-v="signup">${__h('Create an account')}</button><span class="spacer"></span><button class="btn sm ghost" data-act="demoOut" data-v="signin">${__h('Leave the demo')}</button></div>`;
  else if (!u) {
    acc = acctFormHTML(A);
  } else {
    const orgs = Cloud.orgs || []; const cloud = Access.s && Access.s.status === 'cloud';
    const inv = invitesHTML(A);
    const isAdm = (r) => r === 'owner' || r === 'admin'; const admin = cloud && isAdm(Access.cur(true).role) && isAdm(o.role); // a preview only takes away
    const roles = ['admin', 'lead', 'tech', 'sub', 'viewer'];
    acc = `<div class="kv2 small"><span>${__h('Account')}</span><b>${esc(u.email)}</b>
        ${cloud ? `<span>${__h('Organisation')}</span><b>${esc(o.org.name || '—')}</b><span>${__h('Role')}</span><b>${esc(L.role[o.role] || o.role)}</b>
        <span>${__h('Plan')}</span><b>${esc((L.plan || {})[o.plan] || o.plan)}${o.until ? ' · ' + esc(__('until {d}', { d: fmtDate(o.until, false) })) : ''}${stateTxt ? ' · ' + esc(stateTxt) : ''}</b>
        <span>${__h('Users')}</span><b>${isNum(Access.s.used) ? Access.s.used : '—'} / ${isNum(Access.s.seats) ? Access.s.seats : '—'}</b>` : ''}</div>
      ${orgs.length > 1 ? `<label class="field" for="ac-org">${lbl(__('Organisation'))}<select id="ac-org" data-acctorg>${orgs.map(x => `<option value="${x.id}"${x.id === Settings.v.orgId ? ' selected' : ''}>${esc(x.name)} · ${esc(L.role[x.role] || x.role)}</option>`).join('')}</select></label>` : ''}
      ${!orgs.length ? orgStepHTML(A) : inv ? `<div class="stack-s"><span class="label">${__h('Invitations for you')}</span>${inv}</div>` : ''}
      ${admin ? `<div class="stack-s"><span class="label">${__h('Users')}</span>
        ${(Cloud.members || []).map(m => `<div class="row small"><span>${esc(m.email)} · ${esc(L.role[m.role] || m.role)}${m.active ? '' : ' · ' + __h('inactive')}</span><span class="spacer"></span>${m.user_id !== u.id && m.role !== 'owner' ? `<button class="btn sm danger" data-act="memRemove" data-v="${m.user_id}"${busy}>${__h('Remove')}</button>` : ''}</div>`).join('')}
        ${(Cloud.sent || []).map(x => `<div class="row small"><span class="muted">${esc(x.email)} · ${esc(L.role[x.role] || x.role)} · ${__h('invited')}</span>${x.code ? `<b class="mono" title="${__h('Invitation code')}">${esc(invCodeFmt(x.code))}</b>` : ''}<span class="spacer"></span>
          ${x.code ? `<button class="btn sm" data-act="invShare" data-v="${esc(x.id)}"${busy}>${__h('Send the code')}</button>` : ''}<button class="btn sm ghost" data-act="invCancel" data-v="${esc(x.id)}"${busy}>${__h('Cancel')}</button></div>`).join('')}
        <div class="grid2"><label class="field" for="ac-ie">${lbl(__('Invite a colleague: e-mail'))}<input id="ac-ie" type="email" inputmode="email" data-acct="ie" value="${esc(A.ie)}" placeholder="collega@firma.be"></label>
          <label class="field" for="ac-ir">${lbl(__('Role'))}<select id="ac-ir" data-acct="ir">${roles.map(r => `<option value="${r}"${A.ir === r ? ' selected' : ''}>${esc(L.role[r])}</option>`).join('')}</select></label></div>
        <div class="row"><button class="btn" data-act="invSend"${busy}>${__h('Invite')}</button></div>
        <span class="small muted">${__h('The colleague creates an account with this e-mail address in the app; the invitation then appears under «Invitations for you». Send the colleague the invitation code: it is needed to accept.')}</span></div>` : ''}
      <details class="stack-s" data-acctdet${A.pwOpen ? ' open' : ''}><summary class="small">${__h('Password and devices')}</summary>
        <label class="field" for="ac-np">${lbl(__('New password'))}<input id="ac-np" type="password" autocomplete="new-password" data-acct="np" value="${esc(A.np)}" placeholder="${esc(__('at least {n} characters, letters and digits', { n: PASS_MIN }))}"></label>
        <div class="row"><button class="btn sm" data-act="acctPass"${busy}>${__h('Change the password')}</button><span class="spacer"></span><button class="btn sm danger" data-act="acctOutAll"${busy}>${__h('Sign out on all devices')}</button></div>
        <span class="small muted">${__h('For a lost or stolen tablet or phone: every device has to sign in again (an open session ends within the hour).')}</span></details>
      ${msg}
      <div class="row"><button class="btn sm" data-act="acctRefresh"${busy}>${__h('Refresh')}</button><span class="spacer"></span><button class="btn sm ghost" data-act="acctOut"${busy}>${__h('Sign out')}</button></div>`;
  }
  return `<section class="card"><h3>${__h('Account and access')}</h3>
    ${acc}
    <div class="kv2 small" style="border-top:1px solid var(--line);padding-top:10px"><span>${__h('Role')}</span><b>${esc(L.role[o.role] || o.role)}</b><span>${__h('Plan')}</span><b>${esc((L.plan || {})[o.plan] || o.plan)}${pl.seats ? ' · ' + esc(__('{n} users', { n: pl.seats })) : ''}${o.preview ? ' · ' + __h('preview') : ''}</b></div>
    ${chkAct('simOn', !!sim.on, __('Preview another role and plan'))}
    ${sim.on ? `<div class="field"><span class="label">${__h('Role')}</span>${seg('simRole', sim.role || 'owner', Object.fromEntries(ROLES.map(r => [r, L.role[r]])))}</div>
      <div class="field"><span class="label">${__h('Plan')}</span>${seg('simPlan', sim.plan || 'business', Object.fromEntries(['trial', 'solo', 'team', 'business', 'expired'].map(k => [k, L.plan[k]])))}</div>
      <span class="small muted">${__h('The whole app follows the preview: buttons the role may not use are hidden, functions outside the plan are locked.')}</span>` : ''}
    <div class="tbl-wrap"><table class="tbl"><tbody>${rows}</tbody></table></div>
  </section>`;
}
/** one server action from the first screen or the account card: busy state, message, refresh of the whole app */
async function acctRun(fn, okMsg) {
  const A = acctState(); const was = gateOn(); A.busy = true; A.err = ''; A.info = ''; acctPaint();
  try { const r = await fn(); A.info = typeof r === 'string' ? r : okMsg || ''; } catch (e) { console.error(e); A.err = cloudMsg(e); }
  A.busy = false; A.pass = A.err ? A.pass : '';
  if (was && !gateOn()) { S.view = 'home'; S.pid = null; render(); window.scrollTo(0, 0); if (A.info) toast(A.info); A.info = ''; return; } // into the app
  render();
}
/** values typed or filled in by the password manager (some fill without an input event) */
function acctSync() { const A = acctState(); document.querySelectorAll('input[data-acct]').forEach(el => { A[el.dataset.acct] = el.value; }); A.codes = A.codes || {}; document.querySelectorAll('input[data-invcode]').forEach(el => { A.codes[el.dataset.invcode] = el.value; }); return A; }
/** demo / demo: example project, all functions, no server */
function demoIn() {
  const A = acctState(); Store.flushLocal(); Demo.set(true); Settings.load(); useStyle(); if (I18N.cur.ui !== Settings.v.uiLang && Settings.v.uiLang) Settings.v.uiLang = I18N.cur.ui; Store.space();
  if (!Object.keys(Store.projects).length) { const ex = exampleProject(); Store.projects[ex.id] = ex; touch(ex); addExamplePlan(ex).then(() => { if (S.view === 'home') render(); }); }
  Object.assign(A, { email: '', pass: '', err: '', info: '', mode: 'signin' });
  S.view = 'home'; S.pid = null; render(); window.scrollTo(0, 0); toast(__('Demo opened: the example project is ready'));
}
function demoOut(mode) {
  Store.flushLocal(); Demo.set(false); Settings.load(); useStyle(); Store.space(); Settings.v.sim = null; Settings.save();
  Object.assign(acctState(), { mode: mode === 'signup' ? 'signup' : 'signin', err: '', info: '', pass: '' });
  S.view = 'home'; S.pid = null; S.ed = null; S.dlg = null; S.pv = null; render(); window.scrollTo(0, 0);
}
const chkAct = (act, on, text) => `<label class="check" for="ac-${act}"><input id="ac-${act}" type="checkbox" data-actchk="${act}"${on ? ' checked' : ''}><span>${esc(text)}</span></label>`;
function dialogHTML(p, d) {
  if (d.type === 'pkgNew') return pkgNewDialog(p, d);
  if (d.type === 'merge') return mergeDialog(p, d);
  if (d.type === 'cl') return clDialogHTML(p, d);
  if (d.type === 'catEd') return catDialogHTML(d);
  if (d.type === 'insEd') return insDialogHTML(d);
  if (d.type === 'fan') return fanDialogHTML(p, d);
  if (d.type === 'sys') {
    const s = p.systems.find(x => x.id === d.id); if (!s) return '';
    return sheetFrame(`${__h('Unit')} <span class="mono">${esc(s.code)}</span>`, `
      <section class="card">${unitMainHTML(p, s)}
      <div class="small muted" data-live="sysdes|${s.id}"></div></section>
      ${unitSysHTML(p, s)}
      ${unitClHTML(p, s)}
      ${fansCardHTML(p, s)}
      ${unitNpHTML(p, s)}
      <details class="more"${ctlOn(s.ctl) ? ' open' : ''}><summary>${__h('Controller of the unit · control and communication')}</summary><div class="inner">${ctlHTML(p, { sys: s.id }, 'ctl', s.ctl, {})}</div></details>
      <section class="card"><div class="hd"><h3>${__h('Note and photos')}</h3><span class="small muted">${__h('nameplate, controller display')}</span></div>
        ${inp({ sys: s.id, f: 'note' }, s.note, { label: __('Note'), nl: 'Opmerking', area: true })}
        ${photosHTML(p, 'sys:' + s.id)}</section>
      ${S.confirm === 'delSys' ? `<div class="confirm"><span>${__h('Delete the unit and all its points?')}</span><span class="spacer"></span><button class="btn sm danger" data-act="delSys">${__h('Delete')}</button><button class="btn sm" data-act="cancelConfirm">${__h('Cancel')}</button></div>` : ''}`,
      `<button class="btn danger" data-act="askDelSys">${__h('Delete')}</button><button class="btn primary" data-act="closeSheet">${__h('Done')}</button>`);
  }
  if (d.type === 'bulk') {
    const b = d.v;
    const sysOpts = sysEntries(p).map(e => e.g ? `<optgroup label="${esc(entryLabel(e))}">${e.units.map(s => `<option value="${s.id}"${b.systemId === s.id ? ' selected' : ''}>${esc(s.code)} ${esc(s.name)}</option>`).join('')}</optgroup>`
      : `<option value="${e.units[0].id}"${b.systemId === e.units[0].id ? ' selected' : ''}>${esc(e.units[0].code)} ${esc(e.units[0].name)}</option>`).join('');
    const codes = bulkCodes(b);
    return sheetFrame(__('Series of points'), `
      <section class="card">
        <div class="grid2">
          <label class="field" for="bk-sys">${lbl(__('Unit'))}<select id="bk-sys" data-bk="systemId">${sysOpts}</select></label>
          <div class="field"><span class="label">${__h('Direction')}</span>${seg('bkDir', b.dir, Object.fromEntries(unitDirs(sysOf(p, b.systemId)).map(d => [d, d === 'T' ? __('Supply') : __('Extract')])))}</div>
          <label class="field" for="bk-branch">${lbl(__('Branch'), 'Tak')}<input id="bk-branch" type="text" data-bk="branch" value="${esc(b.branch)}" placeholder="Tak 1"></label>
          <label class="field" for="bk-zone">${lbl(__h('Floor / zone'), 'Verdieping')}<input id="bk-zone" type="text" data-bk="zone" value="${esc(b.zone || '')}" placeholder="${__h('Floor 1')}"></label>
          <label class="field" for="bk-prefix">${lbl(__('Code prefix'))}<input id="bk-prefix" type="text" data-bk="prefix" value="${esc(b.prefix)}" placeholder="T1."></label>
          <label class="field" for="bk-start">${lbl(__('From number'))}<input id="bk-start" class="num" inputmode="numeric" data-bk="start" value="${esc(b.start)}"></label>
          <label class="field" for="bk-count">${lbl(__('Number'))}<input id="bk-count" class="num" inputmode="numeric" data-bk="count" value="${esc(b.count)}"></label>
          <label class="field" for="bk-ttype">${lbl(__('Grille type'))}<select id="bk-ttype" data-bk="ttype">${Object.entries(L.ttype).map(([k, v]) => `<option value="${k}"${b.ttype === k ? ' selected' : ''}>${v}</option>`).join('')}</select></label>
          <label class="field" for="bk-size">${lbl(__('Size'))}<input id="bk-size" type="text" data-bk="size" value="${esc(b.size)}" placeholder="600x600"></label>
          <label class="field" for="bk-q">${lbl(__('Design, each'))}<div class="unit"><input id="bk-q" class="num" inputmode="decimal" data-bk="designQ" value="${esc(fmtIn(b.designQ))}"><em>${__h('m³/h')}</em></div></label>
          <label class="field" for="bk-method">${lbl(__('Method'))}<select id="bk-method" data-bk="method">${Object.entries(L.method).map(([k, v]) => `<option value="${k}"${b.method === k ? ' selected' : ''}>${v}</option>`).join('')}</select></label>
          <label class="field full" for="bk-par">${lbl(__('Slaves of node (master)'), 'Master')}<select id="bk-par" data-bk="parentId"><option value="">— ${__h('none, top level')}</option>${treeOrder(p, p.points.filter(x => (isNode(x) || isDev(x)) && x.systemId === b.systemId && x.dir === b.dir)).map(({ pt: x, lvl }) => `<option value="${x.id}"${b.parentId === x.id ? ' selected' : ''}>${'· '.repeat(lvl - 1)}${esc(x.code)}${hasReg(x) ? ' — ' + esc(L.reg[x.reg.type]) : ''}</option>`).join('')}</select></label>
          <label class="field full" for="bk-reg">${lbl(__('Dampers'))}<select id="bk-reg" data-bk="reg">${Object.entries(L.reg).filter(([k]) => !DEVICE_ONLY.includes(k)).map(([k, v]) => `<option value="${k}"${b.reg === k ? ' selected' : ''}>${v}</option>`).join('')}</select></label>
        </div>
        <div class="small muted" id="bkPreview">${bulkPreview(codes)}</div>
      </section>`,
      `<button class="btn" data-act="closeSheet">${__h('Cancel')}</button><button class="btn primary" data-act="bulkCreate">${__h('Create')}</button>`);
  }
  if (d.type === 'settings') {
    const v = Settings.v;
    const sf = (k, label, nlT, ph, area) => `<label class="field" for="set-${k}">${lbl(label, nlT)}${area ? `<textarea id="set-${k}" data-set="${k}" placeholder="${esc(ph || '')}" style="min-height:64px">${esc(v[k] || '')}</textarea>` : `<input id="set-${k}" type="text" data-set="${k}" value="${esc(v[k] || '')}" placeholder="${esc(ph || '')}">`}</label>`;
    return sheetFrame(__('Settings'), `
      ${accountCard()}
      <section class="card"><h3>${__h('On this device')}</h3><p class="small muted" style="margin:0" data-devmem>${__h('Checking the memory…')}</p></section>
      <section class="card"><h3>${__h('Company in the reports')}</h3><p class="small muted" style="margin:0">${__h('Header, cover and footer of PDF and Excel. Used for new projects.')}</p>
        ${styleBlockHTML()}
        ${sf('company', __('Company'), 'Uitgevoerd door')}${loginFilled('company') ? `<span class="small muted">${__h('from the company style / organisation at the sign-in — you can change it')}</span>` : ''}
        ${sf('technician', __('Technician'), 'Technieker')}${loginFilled('technician') ? `<span class="small muted">${__h('from the sign-in (your account) — you can change it')}</span>` : ''}
        ${sf('tagline', __('Slogan or activity'), 'naast het logo', activeStyle().tagline || '')}
        ${sf('address', __('Address on the cover'), 'adresregel')}
        ${sf('footer', __('Page footer'), 'voettekst', 'Firma · adres · BTW · telefoon · e-mail · website', true)}
        <div class="stack-s"><span class="label">${__h('Logo')}</span>
          ${(() => { const li = logoInfo(); return `<div class="row">${li ? `<img src="${li.url}" alt="${__h('Logo')}" class="logo-prev">` : `<span class="small muted">${__h('no logo — the company name is shown in the header')}</span>`}</div>
          <div class="row"><span class="small muted">${v.logoSrc === 'custom' ? __('own file') : v.logoSrc === 'none' ? __('off') : __('logo of the style')}</span><span class="spacer"></span>
            <label class="btn sm" for="logoFile">${v.logoSrc === 'custom' ? __('Replace') : __('Upload your own')}<input id="logoFile" class="vh" type="file" accept="image/*"></label>
            ${v.logoSrc !== 'default' ? `<button class="btn sm ghost" data-act="logoDefault">${__h('Standard')}</button>` : ''}${v.logoSrc !== 'none' ? `<button class="btn sm ghost" data-act="logoNone">${__h('No logo')}</button>` : ''}</div>
          <span class="small muted">${__h('PNG, JPEG, WebP or SVG. A transparent background is kept.')}</span>`; })()}</div>
      </section>
      ${Platform.native() ? `<section class="card"><h3>${__h('App version')}</h3>
        <div class="row small"><span>${__h('Installed: {v}', { v: (Updater.mine && Updater.mine.version) || APP_VERSION })}${Updater.mine && Updater.mine.code ? ' · ' + __h('build {n}', { n: Updater.mine.code }) : ''}</span><span class="spacer"></span>
          ${Updater.info ? `<button class="btn sm primary" data-act="appUpdate">${__h('Update to {v}', { v: Updater.info.version })}</button>` : ''}<button class="btn sm" data-act="appCheck">${__h('Check for updates')}</button></div>
        <span class="small muted">${__h('The app checks the website for a new version at start. Android asks once to allow installing from the browser.')}</span></section>` : ''}
      <section class="card"><h3>${__h('Appearance')}</h3>
        <div class="field"><span class="label">${__h('Theme')}</span>${seg('theme', Theme.get(), { auto: __('Automatic (system)'), light: __('Light'), dark: __('Dark') })}</div>
      </section>
      <section class="card"><h3>${__h('Languages')}</h3>
        <div class="field"><span class="label">${__h('Interface')}</span>${langSeg('uiLang', I18N.cur.ui, I18N.list('ui'))}</div>
        <div class="field"><span class="label">${__h('Reports — default for new projects')}</span>${langSeg('repLangDef', v.repLang || 'nl', I18N.list('rep'))}</div>
        <div class="field"><span class="label">${__h('Report terms next to the labels')}</span>${seg('hints', v.hints || 'auto', { auto: __('when the languages differ'), on: __('always'), off: __('never') })}</div>
        <div class="stack-s"><span class="label">${__h('Language packs')}</span>
          ${['ui', 'rep'].map(d => I18N.list(d).map(pk => `<div class="row small" style="flex-wrap:nowrap;align-items:center"><b>${esc(pk.name)}</b><span class="muted" style="min-width:0">${esc(pk.code)} · ${d === 'ui' ? __h('interface') : __h('reports')} · ${pk.code === I18N.src[d] ? __h('source') : Math.round(LANGX.coverage(d, pk.code) * 100) + ' %'}${pk.custom ? ' · ' + __h('imported') : ''}</span><span class="spacer"></span>${pk.custom ? `<button class="btn sm ghost" data-act="langDel" data-d="${d}" data-code="${pk.code}">${__h('Remove')}</button>` : ''}</div>`).join('')).join('')}
          <div class="row"><button class="btn sm" data-act="langTpl" data-d="ui">${ICON.grid} ${__h('Template: interface')}</button><button class="btn sm" data-act="langTpl" data-d="rep">${ICON.grid} ${__h('Template: reports')}</button>
            <label class="btn sm" for="langFile">${__h('Import a language pack')}<input id="langFile" class="vh" type="file" accept=".xlsx,.json,application/json,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"></label></div>
          <span class="small muted">${__h('A new language: export the template, fill in the cream column (keep the {placeholders}), set the code and name at the top and import it here. It is stored on this device.')}</span></div>
      </section>
      ${insParkCardHTML()}
      ${catCardHTML()}
      <section class="card"><div class="hd"><h3>${__h('About the app')}</h3></div>
        <div class="kv"><div><span class="label">${__h('Version')}</span><span class="mono">${esc(APP_VERSION)}</span></div><div><span class="label">${__h('Build')}</span><span class="mono">${esc(fmtDate(APP_BUILD, false))}</span></div></div></section>
      <section class="card"><div class="hd"><h3>${__h('Automatic backups')}</h3><button class="btn sm" data-act="abkNow">${__h('Make a copy now')}</button></div>
        <p class="small muted" style="margin:0 0 6px">${__h('A copy of all projects on this device is made at the first start after every update and once a day; the last 10 are kept. «Put back» restores the projects of that copy that are no longer here — existing projects are never replaced.')}</p>
        <div data-autobk class="small muted">…</div></section>
      <section class="card"><h3>${__h('Data storage')}</h3><p class="small" style="margin:0" data-storeinfo></p><p class="small muted" style="margin:0">${STANDALONE
        ? __('Projects, photos and plans are stored on this device. Make a backup (.zip) in the «Report» step — it includes the photos and plans and opens on another device via «Import».')
        : Store.mode === 'cloud' ? __('Projects are saved in your Claude cloud storage with a copy on the device. Photos go to the file storage of this page. Only you can see them.') : __('Cloud storage is not available in this window — projects and photos are saved on the device.')}</p></section>`,
      `<button class="btn primary" data-act="closeSheet">${__h('Done')}</button>`);
  }
  if (d.type === 'aiplan') return AIP.html(d);
  if (d.type === 'batch') return BATCH.html(d);
  if (d.type === 'aidocs') return BATCH.aiPickHtml(d);
  if (d.type === 'trace') return MMD.dlgHtml(d);
  if (d.type === 'import') {
    const x = d.d; const sysCodes = [...new Set([...x.systems.map(s => s.code), ...x.points.map(q => q.sysCode).filter(Boolean)])];
    const prev = x.points.slice(0, 8);
    return sheetFrame(__('Import from Excel'), `
      <section class="card"><div class="hd"><h3>${esc(d.file || '')}</h3><span class="small muted">${__h('sheet «{name}»', { name: x.table || '—' })}</span></div>
        <div class="grid3">
          <div class="field">${lbl(__('Number of points'))}<div class="mono" style="font-size:22px;font-weight:600">${x.points.length}</div></div>
          <div class="field">${lbl(__('Number of units'))}<div class="mono" style="font-size:22px;font-weight:600">${Math.max(sysCodes.length, x.points.length ? 1 : 0)}</div></div>
          <div class="field">${lbl(__('Number of instruments'))}<div class="mono" style="font-size:22px;font-weight:600">${x.instruments.length}</div></div>
        </div>
        ${Object.keys(x.info).length ? `<div class="small"><span class="label">${__h('Project data')}</span><br>${esc(Object.entries(x.info).filter(([, v]) => v !== '' && v != null).map(([k, v]) => ({ nr: __('number'), name: __('site'), client: __('client'), address: __('address'), designer: __('designer'), schema: __('scheme'), company: __('company'), technician: __('technician'), date: __('date'), rev: __('version'), tempC: __('temp.'), pressure: __('pressure') }[k] || k) + ': ' + (k === 'date' ? dateNL(v) : v)).join(' · '))}</div>` : ''}
        ${x.warnings.map(w => `<div class="banner">${esc(w)}</div>`).join('')}
        ${x.points.some(q => q.master) || x.points.some(q => q.ps1 != null || q.ps2 != null) ? `<div class="small">${__x('Hierarchy: <b>{m}</b> points with a master · static pressures: <b>{a}</b> before / <b>{b}</b> after', { m: x.points.filter(q => q.master).length, a: x.points.filter(q => q.ps1 != null).length, b: x.points.filter(q => q.ps2 != null).length })}</div>` : ''}
        ${prev.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>${__h('Code')}</th><th>${__h('Room')}</th><th></th><th class="n">${__h('Project')}</th><th>${__h('Method')}</th></tr></thead><tbody>
          ${prev.map(q => `<tr><td class="mono">${esc(q.code || '—')}</td><td class="small">${esc(q.room || '')}${q.branch ? ` <span class="muted">· ${esc(q.branch)}</span>` : ''}</td><td><span class="tag ${q.kind === 'device' ? 'D' : q.dir || 'T'}">${q.dir || 'T'}</span></td><td class="n">${fmt(q.designQ)}</td><td class="small">${esc(L.method[q.method] || '—')}</td></tr>`).join('')}
          </tbody></table></div>${x.points.length > prev.length ? `<p class="small muted" style="margin:0">${__h('… and {n} more', { n: x.points.length - prev.length })}</p>` : ''}` : ''}
        ${d.mode === 'merge' ? `<label class="check" for="imp-info"><input id="imp-info" type="checkbox" data-impinfo${d.withInfo ? ' checked' : ''}><span>${__h('Also update the project data and instruments')}</span></label>` : ''}
      </section>`,
      `<button class="btn" data-act="closeSheet">${__h('Cancel')}</button><button class="btn primary" data-act="impApply"${x.points.length || x.systems.length ? '' : ' disabled'}>${d.mode === 'merge' ? `${__h('Add')} ${x.points.length} ${__h('points')}` : __('Create project')}</button>`);
  }
  return '';
}
function bulkCodes(b) {
  const n = Math.min(Math.max(parseInt(b.count, 10) || 0, 0), 200); const st = parseInt(b.start, 10) || 1;
  const pad = Math.max(2, String(st + n - 1).length);
  return Array.from({ length: n }, (_, i) => (b.prefix || '') + String(st + i).padStart(pad, '0'));
}
function nextCode(code) {
  const m = /^(.*?)(\d+)$/.exec(code || ''); if (!m) return code ? code + '-2' : '';
  return m[1] + String(Number(m[2]) + 1).padStart(m[2].length, '0');
}

/* ---------- live values ---------- */
/* the points of the open project by id, for one pass of updateLive: a lookup per cell instead of a search through all points (0.9.4) */
let LIVE_IDX = null;
function ptAt(p, id) { return LIVE_IDX && LIVE_IDX.p === p ? LIVE_IDX.m.get(id) : p.points.find(x => x.id === id); }
function updateLive() {
  const p = cur(); if (!p) return;
  LIVE_IDX = { p, m: new Map(p.points.map(x => [x.id, x])) };
  try { updateLiveCells(p); } finally { LIVE_IDX = null; }
}
function updateLiveCells(p) {
  document.querySelectorAll('[data-live]').forEach(el => {
    const [k, a, b, c] = el.dataset.live.split('|');
    if (k[0] === 'v' && k !== 'v') { vtLive(el, p, el.dataset.live.split('|')); return; }
    if (k === 'pq' || k === 'pv' || k === 'pchip' || k === 'pbar') {
      const pt = ptAt(p, a); if (!pt) return;
      const r = calcQ(pt, b, p); const nq = nodeQ(p, pt, b); const q = isNum(r.q) ? r.q : nq.q; const dsg = designOf(p, pt);
      if (k === 'pq') el.innerHTML = isNum(r.q) ? `${fmt(r.q)}<small>${__h('m³/h')}</small>` : isNum(nq.q) ? `${fmt(nq.q)}<small>${__h('m³/h · Σ of slaves')}</small>` : (r.need ? `<span style="font-size:18px">${__h('needed: {x}', { x: r.need })}</span>` : nq.derived && nq.n ? `<span style="font-size:18px">${__h('Σ {q} ({n} of {m})', { q: fmt(nq.partial), n: nq.n, m: nq.m })}</span>` : '—');
      else if (k === 'pv') el.textContent = isNum(r.v) ? __('v avg. {v} m/s · {n} readings', { v: fmt(r.v, 2), n: r.n }) : (r.n > 1 ? __('{n} readings, average', { n: r.n }) : '');
      else if (k === 'pchip') {
        if (!isNum(q) || !isNum(dsg)) { el.className = 'chip'; el.textContent = isNum(dsg) ? __('not measured') : __('no design'); return; }
        if (b === 'eerste') { el.className = 'chip acc'; el.textContent = (__('ratio') + ' ') + fmtPct(q / dsg); }
        else { const d = devOf(q, dsg); const ok = inTol(d, p.tol.terminal); el.className = 'chip ' + (ok ? 'ok' : 'nok'); el.textContent = `${fmtDev(d)} ${ok ? 'OK' : 'NOK'}`; }
      } else {
        const d = devOf(q, dsg); const mk = el.querySelector('.mk');
        el.dataset.empty = isNum(d) ? '0' : '1';
        if (isNum(d)) { mk.style.left = Math.max(0, Math.min(100, (d + 0.5) * 100)) + '%'; mk.className = 'mk ' + (b === 'controle' ? (inTol(d, p.tol.terminal) ? 'ok' : 'nok') : ''); }
      }
    } else if (k === 'insw') {
      const pt = ptAt(p, a); if (pt) el.innerHTML = insWarnText(p, pt, b);
    } else if (k === 'ploss') {
      const pt = ptAt(p, a); if (!pt) return;
      const L0 = lossOf(p, pt, b);
      if (!L0) { const up = upstreamP(p, pt, b); el.innerHTML = `<span class="muted">${up ? __h('upstream: {ref} {v} Pa', { ref: up.ref, v: fmt(up.v) }) : __h('Fan pressure — in the unit card (external pressure).')}</span>`; return; }
      el.innerHTML = [L0.up ? __x('loss from {ref}: <b class="mono">{v} Pa</b>', { ref: esc(refG(L0.up)), v: fmt(L0.dUp) }) : '', L0.dFan != null && !(L0.up && L0.up.fan) ? __x('from the fan: <b class="mono">{v} Pa</b>', { v: fmt(L0.dFan) }) : '',
        isNum(pt.reg?.dpmin) ? (dpLow(pt, b) ? `<span class="warn-t">${__h('available {a} Pa < min. {m} Pa (manufacturer)', { a: fmt(Math.abs(L0.ps)), m: fmt(pt.reg.dpmin) })}</span>` : `<span class="muted">${__h('min. {m} Pa — OK', { m: fmt(pt.reg.dpmin) })}</span>`) : '',
        (() => { const h = catDpHigh(p, pt, b); return h ? `<span class="warn-t">${__h('available {a} Pa > max. {m} Pa (technical sheet)', { a: fmt(h.v), m: fmt(h.max) })}</span>` : ''; })()].filter(Boolean).join('<br>');
    } else if (k === 'kids') {
      const pt = ptAt(p, a); if (!pt) return;
      const kids = childrenOf(p, pt.id).filter(measurable); if (!kids.length) { el.textContent = ''; return; }
      const kdi = kidsDesignInfo(p, pt), kd = kdi.v; let sq = 0, n = 0; for (const kx of kids) { const v = ptQ(p, kx, b); if (isNum(v)) { sq += v; n++; } }
      const mism = isNum(pt.designQ) && isNum(kd) && Math.abs(kd - pt.designQ) / pt.designQ > 0.02;
      el.innerHTML = __x('Slaves {n}: {list}', { n: kids.length, list: esc(kids.map(x => x.code).join(', ')) }) + '<br>' + __x('Σ design <b class="mono">{d}</b>{own} · Σ measured <b class="mono">{q}</b> ({k} of {n})', { d: isNum(kd) ? fmt(kd) : kdi.partial != null ? '? (' + __h('{k} of {n} without design flow', { k: kdi.m - kdi.n, n: kdi.m }) + ')' : '—', own: isNum(pt.designQ) ? ' ' + __h('(node {v})', { v: fmt(pt.designQ) }) : '', q: n ? fmt(sq) : '—', k: n, n: kids.length }) + (mism ? `<br><span class="warn-t">${__h('Σ of the slave design flows differs from the node design flow')}</span>` : '');
    } else if (k === 'area') {
      const pt = ptAt(p, a); const A = pt ? ductArea(pt) : null;
      el.textContent = A ? `${__h('Cross-section')} ${fmt(A, 4)} ${__h('m²')}` : __('Enter the duct dimensions');
    } else if (k === 'norms') {
      el.innerHTML = normsLive(p);
    } else if (k === 'cone') {
      el.innerHTML = coneLive(p, a, b);
    } else if (k === 'ssum') {
      const s = sysOf(p, a); if (!s) return;
      const st = sumTerminals(p, a, b, c), md = mainDuctQ(p, a, b, c);
      el.textContent = [st != null ? __('Σ end flows {v}', { v: fmt(st) }) : '', md != null ? __('main duct {v}', { v: fmt(md) }) : ''].filter(Boolean).join(' · ');
    } else if (k === 'sysbal') {
      el.innerHTML = sysBalLive(p, a, b);
    } else if (k === 'sdev') {
      const s = sysOf(p, a); const q = systemQ(p, s, b, 'controle') ?? mainDuctQ(p, a, b, 'controle'); const d = devOf(q, s.design[b]);
      if (!isNum(d)) { el.className = 'chip'; el.textContent = __('{d}: no data', { d: b }); return; }
      const ok = inTol(d, p.tol.system); el.className = 'chip ' + (ok ? 'ok' : 'nok'); el.textContent = `${b} ${fmtDev(d)} ${ok ? 'OK' : 'NOK'}`;
    } else if (k === 'sysdes') {
      const T = sumDesign(p, a, 'T'), A = sumDesign(p, a, 'A');
      el.textContent = (T != null || A != null) ? __('Sum of the design flows of the points: supply {t}, extract {a} m³/h', { t: fmt(T), a: fmt(A) }) : '';
    } else if (k === 'catk') {
      const pt = ptAt(p, a); const e = pt && ptCat(p, pt); if (e) el.innerHTML = catKInner(p, pt, e);
    } else if (k === 'fan') {
      el.innerHTML = fanNetLive(p, el.dataset.live.slice(4));
    } else if (k === 'fanm') {
      const s = sysOf(p, a); const f = s && (s.fans || []).find(x => x.id === b); if (f) el.innerHTML = fanMLive(p, s, f, c);
    } else if (k === 'adj') {
      const key = el.dataset.live.slice(4); const st = S.adj[key];
      const idx = st && byId(p, st.idx), tp = st && byId(p, st.pid);
      const di = idx && designOf(p, idx), dt = tp && designOf(p, tp);
      if (!idx || !tp || !isNum(st.qi) || !isNum(di) || !isNum(dt) || di <= 0) { el.innerHTML = `<span class="muted">${__h('Measure the flow index and the point to adjust at the same time (or right after each other).')}</span>`; return; }
      // target of the point now: the same ratio as the flow index measured now — Qtarget = Qdesign,point × Qindex,now / Qdesign,index
      const ri = st.qi / di, qT = dt * ri;
      const unitHint = tp.method === 'kfactor' && isNum(tp.k) && tp.k > 0 ? ' · ' + __h('Δp at the taps ≈ {dp} Pa with k = {k} {u} (k of the position you set)', { dp: fmt((qT / tp.k) ** 2, 1), k: fmt(+(tp.k / K_F[kUnitOf(tp)]).toPrecision(4), 1), u: kUnitOf(tp) === 'ls' ? __h('l/s') : __h('m³/h') })
        : tp.method === 'anemo' && isNum(tp.aeff) && tp.aeff > 0 ? ' · ' + __h('velocity ≈ {v} m/s with Ak {a} m²', { v: fmt(qT / (tp.aeff * 3600), 2), a: fmt(tp.aeff, 4) }) : '';
      const tgt = `<div style="margin-top:4px">${__x('Target for {code} now: <b class="mono">{q} m³/h</b> — {r} of design, like the flow index', { code: esc(tp.code || '?'), q: esc(fmt(qT)), r: esc(fmtPct(ri)) })}<span class="muted">${unitHint}</span></div>`;
      // three tiles (0.9.13, design only): measured now, target, difference — the same numbers as the text below
      const tile = (l, v, strong) => `<div class="tile${strong ? ' strong' : ''}"><span class="label">${esc(l)}</span><b>${v}<em>${__h('m³/h')}</em></b></div>`;
      const tiles = `<div class="tiles">${tile(__('Measured'), isNum(st.qt) ? esc(fmt(st.qt)) : '—')}${tile(__('Target'), esc(fmt(qT)), true)}${tile(__('Difference'), isNum(st.qt) ? esc((st.qt - qT > 0 ? '+' : '') + fmt(st.qt - qT)) : '—')}</div>`;
      if (!isNum(st.qt)) { el.innerHTML = tiles + tgt; return; }
      const rt = st.qt / dt, kk = rt / ri;
      const txt = Math.abs(kk - 1) <= 0.05 ? `<span class="chip ok">${__h('balanced')}</span> ${__h('ratios {a} and {b}', { a: fmtPct(rt), b: fmtPct(ri) })}`
        : kk > 1 ? `<span class="chip nok">${__h('close')}</span> ${__h('{code}: {a} against {b} at the flow index (+{d} %)', { code: tp.code, a: fmtPct(rt), b: fmtPct(ri), d: fmt((kk - 1) * 100) })}`
          : `<span class="chip acc">${__h('open')}</span> ${__h('{code}: {a} against {b} at the flow index (−{d} %)', { code: tp.code, a: fmtPct(rt), b: fmtPct(ri), d: fmt((1 - kk) * 100) })}`;
      el.innerHTML = tiles + txt + tgt;
    }
  });
}

/* ---------- actions ---------- */
function openProject(id, step) {
  const pp = Store.projects[id]; if (pp) I18N.set('rep', pp.report.lang || Settings.v.repLang || 'nl');
  S.pid = id; S.view = 'project'; S.step = step ?? S.step ?? 0; S.f = { sys: 'all', dir: 'all', zone: 'all', room: 'all', order: S.f?.order || 'branch', todo: false }; S.confirm = null; S.adj = {}; S.fan = {};
  pushNav(); render(); window.scrollTo(0, 0); wakeFor();
}
const LAST_STEP = stepNames().length - 1;
function nearStep(p, i, dir) { i = Math.max(0, Math.min(LAST_STEP, i)); let j = i; while (j >= 0 && j <= LAST_STEP && !stepAllowed(p, j)) j += dir; if (j < 0 || j > LAST_STEP) { j = i; while (j >= 0 && j <= LAST_STEP && !stepAllowed(p, j)) j -= dir; } return Math.max(0, Math.min(LAST_STEP, j)); }
function goStep(i) { const p = cur(); const dir = i >= S.step ? 1 : -1; S.step = p ? nearStep(p, i, dir) : Math.max(0, Math.min(LAST_STEP, i)); S.confirm = null; render(); window.scrollTo(0, 0); wakeFor(); }
function openEditor(id, mode) {
  const opening = !S.ed; S.ed = { id, mode, extra: {} }; S.confirm = null; if (opening) pushNav(); renderSheet(); updateLive();
  const sb = document.getElementById('shBody'); if (sb) sb.scrollTop = 0;
  if (mode === 'eerste' || mode === 'controle') setTimeout(() => { const f = sheetEl.querySelector('input[data-rd]'); if (f && !f.value && window.matchMedia('(pointer:fine)').matches) f.focus(); }, 30);
}
function closeSheetNow() {
  const p = cur();
  if (S.ed && p) { // drop untouched empty points
    const pt = p.points.find(x => x.id === S.ed.id);
    if (pt && !pt.code && !isNum(pt.designQ) && !readings(pt, 'eerste').length && !readings(pt, 'controle').length && !pt.room) { p.points = p.points.filter(x => x !== pt); touch(p); }
  }
  S.ed = null; S.dlg = null; S.confirm = null; render();
}
function closeSheet() { if (STANDALONE && history.state && history.state.inregelaar) history.back(); else closeSheetNow(); }
function pushNav() { if (STANDALONE) try { history.pushState({ inregelaar: Date.now() }, ''); } catch (e) { } }
window.addEventListener('popstate', () => {
  if (S.mod && S.mod.nav) { closeModal(); refreshOwner(); return; } // image editor, plan viewer
  if (S.pv) { S.pv = null; S.confirm = null; renderViewer(); refreshOwner(); return; }
  if (S.ed || S.dlg) closeSheetNow();
  else if (S.view === 'project') { S.view = 'home'; S.pid = null; render(); wakeFor(); }
});
let wake = null;
async function wakeFor() {
  const on = S.view === 'project' && (S.step === 2 || S.step === 4) && document.visibilityState === 'visible';
  if (Platform.native() && await Platform.keepAwake(on)) return;
  try {
    if (on && !wake && navigator.wakeLock) { wake = await navigator.wakeLock.request('screen'); wake.addEventListener('release', () => { wake = null; }); }
    else if (!on && wake) { await wake.release(); wake = null; }
  } catch (e) { wake = null; }
}
document.addEventListener('visibilitychange', wakeFor);

/** the folder name of a project for the Android app: Documents/Ventilation Setup Tool/<this> */
const projDir = (p) => p ? safeName([p.info.nr, p.info.name].filter(Boolean).join(' ')) || 'Project' : '';
async function offerFile(filename, blob, p) {
  if (p && STANDALONE && Folders.ok()) { // 0.9.18: the remembered folder of the project, the file of the same name is replaced
    try { const r = await Folders.write(p.id, filename, blob); if (r) { toast(__('Saved in the folder {f}', { f: r.where })); return true; } } catch (e) { console.error(e); toast(__('The project folder could not be written — the file goes to the downloads')); }
  }
  if (!STANDALONE) {
    try {
      const dl = await window.claude.use('downloads');
      if (!dl) { toast(__('Downloads are not available in this window')); return false; }
      await dl.save({ filename, data: blob }); toast(__('File saved')); return true;
    } catch (e) {
      const c = e && e.code;
      toast(c === 'declined' ? __('Saving cancelled') : c === 'rate_limited' ? __('Wait and try again') : __('Could not save the file'));
      return false;
    }
  }
  if (Platform.native()) { // the Android app: a download link does nothing in the WebView — save in Documents, else the share sheet (0.9.14)
    try { const r = await Platform.saveFile(filename, blob, projDir(p)); if (r) { toast(__('Saved in {where}', { where: r.where })); return true; } } catch (e) { console.error(e); }
    try { if (await Platform.shareFile(filename, blob, filename)) return true; } catch (e) { if (/cancel/i.test(String(e && e.message))) return false; console.error(e); }
    toast(__('Could not save the file')); return false;
  }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000); toast(__('File saved')); return true;
}
function safeName(s) { return String(s || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w.-]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '').slice(0, 60); }
function reportBase(p, kind) { return [safeName(kind || _r('Inregelrapport')), safeName(p.info.nr), safeName(p.info.name), p.scope ? safeName(p.scope.code) : '', (p.info.date || today())].filter(Boolean).join('_'); }

/** build the Excel / PDF report and offer the file */
async function exportReport(p, act, t) {
  const old = t ? t.innerHTML : ''; if (t) { t.disabled = true; t.textContent = __('Building…'); }
  await Folders.ready(p.id); // write access while the tap is fresh
  try {
    const pv = scopeView(p, repScope(p)); // the part chosen in the «Report» step
    const blob = act === 'xlsx' ? await buildXlsx(pv) : await buildPdf(pv);
    const ok = await offerFile(reportBase(pv) + (act === 'xlsx' ? '.xlsx' : '.pdf'), blob, p);
    if (ok) { p.report.generatedAt = Date.now(); touch(p); }
  } catch (err) { console.error(err); toast(act === 'pdf' && /load/i.test(String(err && err.message)) ? __('The PDF module did not load: internet is needed at the first start') : __('Could not build the report')); }
  if (t) { t.disabled = false; t.innerHTML = old; } if (S.step === 5) render();
}

document.addEventListener('click', async (e) => {
  const t = e.target.closest('[data-act]'); if (!t) return;
  const act = t.dataset.act; const p = cur();
  if (!Access.allow(act)) return;
  if (demoLimited()) { // demo (0.9.21) and the demo account of the full version (0.9.22): 1 own project, 20 points a project
    if (act === 'newProject' && !Access.demoRoom('project')) return;
    if (['addPt', 'addDevice', 'addChild', 'dupPt'].includes(act) && !Access.demoRoom('point', p)) return;
    if (act === 'bulkCreate' && p && S.dlg && p.points.length + bulkCodes(S.dlg.v).length > DEMO_LIMITS.points) { Access.demoRoom('point', { points: { length: DEMO_LIMITS.points } }); return; }
  }
  switch (act) {
    case 'viewPhoto': S.pv = { owner: t.dataset.owner, id: t.dataset.id }; S.confirm = null; pushNav(); renderViewer(); break;
    case 'closeViewer': if (STANDALONE && history.state && history.state.inregelaar) history.back(); else { S.pv = null; S.confirm = null; renderViewer(); refreshOwner(); } break;
    case 'phPrev': case 'phNext': { const list = photoList(p, S.pv.owner, false); const i = list.findIndex(x => x.id === S.pv.id); const j = i + (act === 'phNext' ? 1 : -1); if (list[j]) { S.pv.id = list[j].id; S.confirm = null; renderViewer(); } break; }
    case 'askDelPhoto': S.confirm = 'delPhoto'; renderViewer(); break;
    case 'cancelPhDel': S.confirm = null; renderViewer(); break;
    case 'delPhoto': {
      const list = photoList(p, S.pv.owner, false); const i = list.findIndex(x => x.id === S.pv.id); if (i < 0) break;
      const [ph] = list.splice(i, 1); touch(p); Photos.remove(ph); S.confirm = null;
      S.pv = list.length ? { owner: S.pv.owner, id: list[Math.min(i, list.length - 1)].id } : null;
      renderViewer(); refreshOwner(); toast(__('Photo deleted')); break;
    }
    case 'importTpl': { try { const b = await buildImportTemplate(); await offerFile('Inregelaar_importsjabloon.xlsx', b); } catch (err) { console.error(err); toast(__('Could not create the template')); } break; }
    case 'importXlsx': document.getElementById('importXlsxFile').click(); break;
    case 'aiPlan': { const el = document.getElementById('aiPlanFile-' + (t.dataset.mode || 'new')); if (el) el.click(); break; }
    case 'batchGo': BATCH.go(false); break;
    case 'batchAi': BATCH.go(true); break;
    case 'aiDocs': { const p = cur(); if (p) BATCH.aiPick(p); break; }
    case 'aiDocsGo': BATCH.aiPickGo(); break;
    case 'traceShow': S.dlg = { type: 'trace', i: Number(t.dataset.v) }; pushNav(); renderSheet(); break;
    case 'traceDl': { const p = cur(); const tr = p && (p.traces || [])[Number(t.dataset.v)]; if (tr) offerFile(`routes_${(p.info.name || 'project').replace(/[^\w-]+/g, '_')}.mmd`, new Blob([tr.mermaid], { type: 'text/plain' }), p); break; }
    case 'traceDel': { const p = cur(); if (p && p.traces) { p.traces.splice(Number(t.dataset.v), 1); touch(p); } closeSheet(); render(); break; }
    case 'attDl': BATCH.download(cur(), t.dataset.v); break;
    case 'attDel': BATCH.del(cur(), t.dataset.v); break;
    case 'aiTreeApply': case 'aiTreeRedraw': case 'aiTreeNext': case 'aiTreeBack': AIP.act(act, t); break;
    case 'airStart': case 'airDl': case 'airDel': case 'airAdd': case 'airRm': AIR.act(act, t); break;
    case 'aiRole': case 'aiRun': case 'aiStop': case 'aiApply': case 'aiBack': case 'aiSize': case 'aiOnlyFlag': AIP.act(act, t); break;
    case 'impApply': {
      const d = S.dlg; if (!d || d.type !== 'import') break;
      if (d.mode === 'merge') { const n = IMP.apply(p, d.d, { withInfo: !!d.withInfo }); touch(p); closeSheet(); toast(`${__h('Points added:')} ${n}${impLinks(d.d)}`); }
      else { const np = newProject(); IMP.apply(np, d.d, { withInfo: true }); if (!np.info.company) np.info.company = Settings.v.company; Store.projects[np.id] = np; touch(np); S.dlg = null; closeSheetNow(); openProject(np.id, 1); toast(`${__h('Project created:')} ${np.points.length} ${__h('points')}${impLinks(d.d)}`); }
      break;
    }
    case 'modClose': closeModal(); break;
    case 'pgPick': {
      const m = S.mod; if (!m || m.busy) break; const n = Number(t.dataset.pg);
      if (m.opts.mode === 'cover') {
        const res = m.resolve; m.resolve = null; S.mod = null; modalEl.hidden = true; modalEl.innerHTML = ''; res({ page: n });
        break;
      }
      if (m.sel.has(n)) m.sel.delete(n); else m.sel.add(n);
      t.classList.toggle('on', m.sel.has(n)); const b = modalEl.querySelector('[data-act=pdfUse]'); if (b) { b.disabled = !m.sel.size; b.textContent = `${__h('Add')} ${m.sel.size || ''}`; }
      break;
    }
    case 'pdfUse': {
      const m = S.mod; if (!m || !m.sel.size || m.busy) break; const pages = [...m.sel].sort((a, b) => a - b);
      const res = m.resolve; m.resolve = null; S.mod = null; modalEl.hidden = true; modalEl.innerHTML = ''; if (res) res({ pages }); break;
    }
    case 'cvCrop': {
      const i = Number(t.dataset.i); const it = p.cover.items[i]; if (!it) break;
      openImageEditor({ p, mode: 'cover', ph: it, slot: i, tab: 'crop', sub: it.src ? docLabel(docById(p, it.src.doc), it.src.page) : '' });
      break;
    }
    case 'cvDel': { const i = Number(t.dataset.i); const it = p.cover.items[i]; if (!it) break; p.cover.items[i] = null; touch(p); render(); if (it.photo) Photos.remove(it.photo); if (it.orig) Photos.remove(it.orig); break; }
    case 'uiLang': setUiLang(t.dataset.v); break;
    case 'acctMode': { const A = acctSync(); A.mode = t.dataset.v; A.err = ''; A.info = ''; acctPaint(); break; }
    case 'acctSignIn': { const A = acctSync(); if (Demo.is(A.email, A.pass)) { demoIn(); break; }
      if (!A.email || !A.pass) { A.err = __('Enter the e-mail address and the password'); acctPaint(); break; }
      if (!A.email.includes('@')) { A.err = __('E-mail or password is not correct'); acctPaint(); break; } // a user name: only «demo» exists
      if (!cloudOn()) { A.err = __('In this preview only the demo works: accounts work in the app (APK) and in the web app (PWA).'); acctPaint(); break; }
      acctRun(async () => {
        let r; try { r = await Auth.signIn(A.email.trim(), A.pass); } catch (e) { if (e.code === 'email_not_confirmed') { A.mode = 'confirm'; A.code = ''; } throw e; }
        await Cloud.refresh();
        return r.weak ? __('Signed in. Your password no longer meets the rules: change it in Settings → Account and access') : __('Signed in');
      }); break; }
    case 'acctSignUp': { const A = acctSync(); if (!A.email || !A.pass) { A.err = __('Enter the e-mail address and the password'); acctPaint(); break; }
      if (!/^\S+@\S+\.\S+$/.test(A.email.trim())) { A.err = __('The e-mail address is not valid'); acctPaint(); break; }
      if (!passOK(A.pass)) { A.err = cloudMsg({ code: 'weak_password' }); acctPaint(); break; }
      if (!cloudOn()) { A.err = __('In this preview only the demo works: accounts work in the app (APK) and in the web app (PWA).'); acctPaint(); break; }
      acctRun(async () => { let r; try { r = await Auth.signUp(A.email.trim(), A.pass, A.name.trim()); } catch (e) { if (e.code === 'user_already_exists') { A.mode = 'signin'; A.pass = ''; } throw e; } if (r.confirm) { A.mode = 'confirm'; A.code = ''; return __('Account created. We sent a code to {email}: enter it here.', { email: A.email.trim() }); } await Cloud.refresh(); }, __('Account created and signed in')); break; }
    case 'acctVerify': { const A = acctSync(); const c = String(A.code || '').replace(/\s+/g, '');
      if (!A.email.trim()) { A.err = __('Enter the e-mail address'); acctPaint(); break; }
      if (!/^\d{6,10}$/.test(c)) { A.err = __('Enter the code from the e-mail (6 digits or more)'); acctPaint(); break; }
      acctRun(async () => { await Auth.verify(A.email.trim(), c, 'signup'); A.code = ''; A.pass = ''; A.mode = 'signin'; await Cloud.refresh(); }, __('E-mail address confirmed: you are signed in')); break; }
    case 'acctResend': { const A = acctSync(); if (!A.email.trim()) { A.err = __('Enter the e-mail address'); acctPaint(); break; }
      acctRun(() => Auth.resend(A.email.trim()), __('If the address waits for confirmation, a new code is on its way.')); break; }
    case 'acctRecover': { const A = acctSync(); if (!A.email) { A.err = __('Enter the e-mail address'); acctPaint(); break; }
      if (!cloudOn()) { A.err = __('In this preview only the demo works: accounts work in the app (APK) and in the web app (PWA).'); acctPaint(); break; }
      acctRun(async () => { await Auth.recover(A.email.trim()); A.mode = 'reset'; A.code = ''; A.pass = ''; }, __('If the address is known, a code is on its way.')); break; }
    case 'acctReset': { const A = acctSync(); const c = String(A.code || '').replace(/\s+/g, '');
      if (!A.email.trim()) { A.err = __('Enter the e-mail address'); acctPaint(); break; }
      if (!/^\d{6,10}$/.test(c)) { A.err = __('Enter the code from the e-mail (6 digits or more)'); acctPaint(); break; }
      if (!passOK(A.pass)) { A.err = cloudMsg({ code: 'weak_password' }); acctPaint(); break; }
      acctRun(async () => {
        await Auth.verify(A.email.trim(), c, 'recovery');
        try { await Auth.setPassword(A.pass); } catch (e) { Auth.save(null); e.message = cloudMsg(e) + ' — ' + __('request a new code'); e.code = 'reset_failed'; throw e; }
        A.code = ''; A.pass = ''; A.mode = 'signin'; await Cloud.refresh();
      }, __('New password saved: you are signed in')); break; }
    case 'acctPass': { const A = acctSync(); if (!passOK(A.np)) { A.err = cloudMsg({ code: 'weak_password' }); acctPaint(); break; }
      acctRun(async () => { await Auth.setPassword(A.np); A.np = ''; }, __('Password changed')); break; }
    case 'acctOut': acctRun(() => Cloud.signOut(), __('Signed out')); break;
    case 'acctOutAll': acctRun(() => Cloud.signOut(true), __('Signed out on all devices')); break;
    case 'demoOut': demoOut(t.dataset.v); break;
    case 'fullSignIn': FullApp.setWant(true); demoOut('signin'); break; // demo site: the account screen; after sign-in the full version loads
    case 'acctRefresh': acctRun(() => Cloud.refresh(), __('Updated')); break;
    case 'orgCreate': { const A = acctSync(); if (!String(A.org || '').trim()) { A.err = __('Enter the name of the organisation'); acctPaint(); break; } acctRun(() => Cloud.createOrg(A.org), __('Organisation created: you are the owner')); break; }
    case 'invAccept': { const A = acctSync(); const id = t.dataset.v; const c = String((A.codes || {})[id] || '').trim();
      if (!c) { A.err = cloudMsg({ code: 'invite_code_missing' }); acctPaint(); break; }
      acctRun(async () => { await Cloud.accept(id, c); delete A.codes[id]; }, __('Invitation accepted')); break; }
    case 'invSend': { const A = S.acct; if (!/^\S+@\S+\.\S+$/.test(A.ie || '')) { A.err = __('The e-mail address is not valid'); renderSheet(); break; }
      acctRun(async () => { const em = A.ie.trim().toLowerCase(); await Cloud.invite(em, A.ir); A.ie = ''; const x = (Cloud.sent || []).filter(i => i.email === em).pop();
        return x && x.code ? __('Invitation saved. Code for {email}: {code} — send it with «Send the code».', { email: em, code: invCodeFmt(x.code) }) : __('Invitation saved'); }); break; }
    case 'invShare': { const x = (Cloud.sent || []).find(i => i.id === t.dataset.v); if (!x) break; shareText(invShareText(x), __('Invitation')); break; }
    case 'invCancel': acctRun(() => Cloud.cancelInvite(t.dataset.v), __('Invitation withdrawn')); break;
    case 'memRemove': acctRun(() => Cloud.removeMember(t.dataset.v), __('User removed')); break;
    case 'simRole': case 'simPlan': { const sm = Object.assign({ on: true, role: 'owner', plan: 'business' }, Settings.v.sim || {}); sm[act === 'simRole' ? 'role' : 'plan'] = t.dataset.v; Settings.v.sim = sm; Settings.save(); render(); break; }
    case 'repLang': if (p) { p.report.lang = t.dataset.v; I18N.set('rep', t.dataset.v); touch(p); render(); } break;
    case 'repLangDef': Settings.v.repLang = t.dataset.v; Settings.save(); if (!p) I18N.set('rep', t.dataset.v); renderSheet(); break;
    case 'hints': Settings.v.hints = t.dataset.v; Settings.save(); render(); break;
    case 'theme': Theme.set(t.dataset.v); renderSheet(); break;
    case 'appUpdate': Updater.open(); break;
    case 'appCheck': { toast(__('Checking…')); try { const i = await Updater.check(true); toast(i ? __('Version {v} is available', { v: i.version }) : __('This is the newest version')); } catch (e) { toast(__('Could not check for updates — no connection?')); } if (S.dlg) renderSheet(); else render(); break; }
    case 'langTpl': { try { const d = t.dataset.d; const b = await LANGX.template(d); await offerFile(`Inregelaar_${d === 'ui' ? 'interface' : 'report'}_language_template.xlsx`, b); } catch (err) { console.error(err); toast(__('Could not create the file')); } break; }
    case 'langDel': I18N.removeCustom(t.dataset.d, t.dataset.code); if (t.dataset.d === 'ui') { Settings.v.uiLang = I18N.cur.ui; Settings.save(); } render(); break;
    case 'logoDefault': Settings.v.logoSrc = 'default'; Settings.save(); renderSheet(); break;
    case 'styleSel': Settings.v.styleId = t.dataset.v; Settings.save(); useStyle(); S.confirm = null; renderSheet(); break;
    case 'styleEdit': openStyleEditor(); break;
    case 'styleAskDel': S.confirm = 'styleDel'; renderSheet(); break;
    case 'styleDel': { const id = Settings.v.styleId; Settings.v.styles = (Settings.v.styles || []).filter(x => x.id !== id); Settings.v.styleId = 'freshair'; Settings.save(); useStyle(); S.confirm = null; renderSheet(); toast(__('Style removed')); break; }
    case 'styleFirmYes': { const f = S.styleFirm || {}; for (const k of ['company', 'address', 'footer']) if (f[k]) Settings.v[k] = f[k]; Settings.save(); S.confirm = null; S.styleFirm = null; renderSheet(); toast(__('Company details filled in')); break; }
    case 'styleExport': { try { const o = styleFile(); const slug = String(o.name || 'stijl').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'stijl'; await offerFile(`${slug}.inregelstijl.json`, new Blob([JSON.stringify(o, null, 1)], { type: 'application/json' })); } catch (err) { console.error(err); toast(__('Could not create the file')); } break; }
    case 'logoNone': Settings.v.logoSrc = 'none'; Settings.save(); renderSheet(); break;
    case 'home': S.view = 'home'; S.pid = null; S.confirm = null; I18N.set('rep', Settings.v.repLang || 'nl'); render(); window.scrollTo(0, 0); wakeFor(); break;
    case 'newProject': { const np = newProject(); Store.projects[np.id] = np; touch(np); openProject(np.id, 0); break; }
    case 'example': { const ex = exampleProject(); Store.projects[ex.id] = ex; touch(ex); await addExamplePlan(ex); openProject(ex.id, 2); toast(__('Example opened at step «Measure 1»')); break; }
    case 'open': openProject(t.dataset.id, 0); break;
    case 'import': document.getElementById('importFile').click(); break;
    case 'settings': S.dlg = { type: 'settings' }; pushNav(); renderSheet(); break;
    case 'step': goStep(Number(t.dataset.v)); break;
    case 'vtMore': { S.vtMore = S.vtMore || {}; const k = t.dataset.k; S.vtMore[k] = !S.vtMore[k]; renderKeepAll(); break; }
    case 'prev': goStep(S.step - 1); break;
    case 'handoverDone': { const p = cur(); if (p) { p.handover = { ...(p.handover || {}), completedAt: t.dataset.v === 'done' ? new Date().toISOString() : null }; touch(p); render(); } break; }
    case 'next': goStep(S.step + 1); break;
    case 'fltDir': S.f.dir = t.dataset.v; render(); break;
    case 'fltOrder': S.f.order = t.dataset.v; render(); break;
    case 'addIns': p.instruments.push(INS0()); touch(p); render(); break;
    case 'insFill': { const ph = t.dataset.phase; let n = 0; for (const x of p.points) if (measurable(x) && !isCtx(p, x) && x.method !== 'readout' && readings(x, ph).length && !(x.meas[ph] && x.meas[ph].ins)) { const id = insGuess(p, x); if (id) { x.meas[ph].ins = id; stampPt(p, x, ph); n++; } } touch(p); renderKeepAll(); toast(__('Instruments assigned: {n}', { n })); break; }
    case 'delIns': p.instruments = p.instruments.filter(x => x.id !== t.dataset.id); touch(p); render(); break;
    case 'addSys': { if (isPkg(p)) break; const s = newSystem(p); p.systems.push(s); touch(p); S.dlg = { type: 'sys', id: s.id }; pushNav(); render(); break; }
    case 'editSys': if (isPkg(p)) break; S.dlg = { type: 'sys', id: t.dataset.id }; pushNav(); renderSheet(); updateLive(); break;
    case 'askDelSys': S.confirm = 'delSys'; renderSheet(); break;
    case 'delSys': { const id = S.dlg.id; const phs = [...(p.systems.find(s => s.id === id)?.photos || []), ...p.points.filter(x => x.systemId === id).flatMap(x => x.photos || [])]; p.systems = p.systems.filter(s => s.id !== id); p.points = p.points.filter(x => x.systemId !== id); sysNormalize(p); touch(p); closeSheet(); for (const ph of phs) Photos.remove(ph); break; }
    case 'addPt': case 'addDevice': {
      const last = sortPoints(p, p.points.filter(x => act === 'addDevice' ? x.kind === 'device' : x.kind !== 'device')).pop();
      const sysId = keyMainUnit(p, S.f.sys) || (last?.systemId || p.systems[0]?.id);
      const base = act === 'addDevice'
        ? { kind: 'device', systemId: sysId, dir: S.f.dir !== 'all' ? S.f.dir : (last?.dir || 'T'), branch: last?.branch || '', zone: last?.zone || '', code: last ? uniqCode(p, nextCode(last.code)) : 'BK-01', reg: { type: 'brand', model: '', vmin: null, vmax: null, posBefore: '', posAfter: '', locked: false, state: '', cond: '' }, fd: Object.assign(FD0(), last ? { pass: last.fd?.pass || '', ei: last.fd?.ei || '', act: last.fd?.act || '', sw: !!last.fd?.sw } : {}) }
        : last ? { systemId: sysId, parentId: last.kind === 'terminal' && last.systemId === sysId && (S.f.dir === 'all' || S.f.dir === last.dir) ? last.parentId || '' : '', kind: last.kind, dir: S.f.dir !== 'all' ? S.f.dir : last.dir, branch: last.branch, ttype: last.ttype, size: last.size, designQ: last.designQ, method: last.method, aeff: last.aeff, k: last.k, kU: last.kU, code: uniqCode(p, nextCode(last.code)), duct: clone(last.duct), reg: Object.assign(clone(last.reg), { posBefore: '', posAfter: '', locked: false, state: '' }) }
          : { systemId: sysId, dir: S.f.dir !== 'all' ? S.f.dir : 'T', code: 'T1.01', branch: 'Tak 1' };
      const pt = newPoint(p, base); markAdded(p, pt); p.points.push(pt); touch(p); openEditor(pt.id, 'setup'); break;
    }
    case 'addChild': {
      const m = p.points.find(x => x.id === S.ed.id); if (!m) break;
      const kids = sortPoints(p, childrenOf(p, m.id)); const last = kids[kids.length - 1];
      const pt = newPoint(p, { systemId: m.systemId, dir: m.dir, branch: m.branch, parentId: m.id, kind: last ? last.kind : 'terminal', ttype: last ? last.ttype : 'plafonddiffusor', size: last ? last.size : '', designQ: last ? last.designQ : null, method: last ? last.method : 'hood', k: last ? last.k : null, kU: last ? last.kU : undefined, aeff: last ? last.aeff : null, code: uniqCode(p, last ? nextCode(last.code) : (m.code && !isDev(m) ? m.code + '.1' : '')), room: last ? last.room : m.room, reg: last ? Object.assign(clone(last.reg), { posBefore: '', posAfter: '', locked: false }) : newPoint(p).reg });
      markAdded(p, pt); p.points.push(pt); touch(p); S.ed = { id: pt.id, mode: 'setup', extra: {} }; renderSheet(); toast(__('Slave point for {code}', { code: m.code || __('the node') })); break;
    }
    case 'dupPt': { const src = p.points.find(x => x.id === S.ed.id); const pt = newPoint(p, Object.assign(clone(src), { id: 'q' + uid(), code: uniqCode(p, nextCode(src.code)), meas: { eerste: { r: [] }, controle: { r: [] } }, photos: [], status: '', added: null, fst: null, sst: null })); pt.reg.posBefore = ''; pt.reg.posAfter = ''; markAdded(p, pt); p.points.push(pt); touch(p); S.ed = { id: pt.id, mode: 'setup', extra: {} }; renderSheet(); updateLive(); toast((__('Copy created') + ' ') + (pt.code || '')); break; }
    case 'devKid': {
      const dv = byId(p, S.ed && S.ed.id); const x = byId(p, t.dataset.id); if (!dv || !x || roStruct(p, dv)) break;
      if (x.parentId === dv.id) x.parentId = dv.parentId || ''; else if (!descendantIds(p, x.id).has(dv.id)) { x.parentId = dv.id; if (dv.branch && !x.branch) x.branch = dv.branch; }
      stampPt(p, x, 'struct'); touch(p); renderSheet(); break;
    }
    case 'editPt': { const x = byId(p, t.dataset.id); if (x && isCtx(p, x)) { toast(__('Context: measured by the coordinator')); break; } openEditor(t.dataset.id, t.dataset.mode); break; }
    case 'askDelPt': S.confirm = 'delPt'; renderSheet(); break;
    case 'delPt': { const gone = p.points.find(x => x.id === S.ed.id); if (!gone || !canDelete(p, gone)) break; for (const c of rawChildren(p, gone.id)) c.parentId = gone.parentId || ''; p.points = p.points.filter(x => x !== gone); touch(p); closeSheet(); for (const ph of gone?.photos || []) Photos.remove(ph); break; }
    case 'cancelConfirm': S.confirm = null; render(); break;
    case 'abkNow': { const r = await AutoBackup.take('manual'); toast(r ? __('Copy made: {n} projects', { n: r.n }) : __('There is no project to copy')); renderSheet(); break; }
    case 'abkRestore': { const r = await AutoBackup.restore(t.dataset.k); if (!r) { toast(__('The copy could not be read')); break; }
      Store.projects = Store.spaces[lsKey(LS_KEY)] || Store.projects;
      toast(r.added ? __('{n} projects put back', { n: r.added }) : __('All projects of this copy are already here')); render(); renderSheet(); break; }
    case 'closeSheet': closeSheet(); break;
    case 'setKind': case 'setDir': case 'setShape': {
      const pt = p.points.find(x => x.id === S.ed.id); const v = t.dataset.v;
      if (act === 'setKind') { pt.kind = v; if (v === 'device') { if (!DEVICE_ONLY.includes(pt.reg.type)) pt.reg.type = 'brand'; pt.fd = Object.assign(FD0(), pt.fd || {}); } else if (DEVICE_ONLY.includes(pt.reg.type)) pt.reg.type = 'none'; if (v === 'duct' && pt.reg.type === 'plenum') pt.reg.type = 'regelklep'; if (v === 'duct' && !['pitot', 'traverse', 'readout', 'anemo'].includes(pt.method)) pt.method = 'pitot'; if (v === 'terminal' && (pt.method === 'pitot' || pt.method === 'traverse')) pt.method = 'hood'; }
      if (act === 'setDir') pt.dir = v;
      if (act === 'setShape') pt.duct.shape = v;
      if (act === 'setKind') treeFix(p, pt, 'kind'); if (act === 'setDir') treeFix(p, pt, 'dir');
      stampPt(p, pt, act === 'setShape' ? 'fld' : 'struct');
      touch(p); renderSheet(); updateLive(); break;
    }
    case 'moreRd': S.ed.extra[t.dataset.phase] = (S.ed.extra[t.dataset.phase] || 0) + 1; renderSheet(); updateLive(); break;
    case 'startMeasure': {
      const phase = t.dataset.phase; const ids = S.list.length ? S.list : [];
      const first = ids.find(id => { const x = p.points.find(q => q.id === id); return !isNum(calcQ(x, phase, p).q) && !x.status; }) || ids[0];
      if (first) openEditor(first, phase); else toast(__('No points for the filter')); break;
    }
    case 'edNext': case 'edPrev': {
      const i = S.list.indexOf(S.ed.id); const j = act === 'edNext' ? i + 1 : i - 1;
      if (j >= 0 && j < S.list.length) { S.ed = { id: S.list[j], mode: S.ed.mode, extra: {} }; renderSheet(); updateLive(); const sb = document.getElementById('shBody'); if (sb) sb.scrollTop = 0; }
      else { closeSheet(); if (act === 'edNext') toast(__('All points of the list done')); }
      break;
    }
    case 'bulk': {
      const last = sortPoints(p, p.points.filter(x => x.kind === 'terminal')).pop();
      S.dlg = { type: 'bulk', v: { systemId: keyMainUnit(p, S.f.sys) || (last?.systemId || p.systems[0].id), dir: S.f.dir !== 'all' ? S.f.dir : 'T', branch: 'Tak 1', prefix: 'T1.', start: '1', count: '6', ttype: 'plafonddiffusor', size: '', designQ: null, method: 'hood', reg: 'iris' } };
      pushNav(); renderSheet(); break;
    }
    case 'bkDir': S.dlg.v.dir = t.dataset.v; S.dlg.v.parentId = ''; if (/^[TA]\d*\.?$/.test(S.dlg.v.prefix || '') || !S.dlg.v.prefix) S.dlg.v.prefix = S.dlg.v.prefix.replace(/^[TA]/, t.dataset.v) || t.dataset.v + '1.'; renderSheet(); break;
    case 'bulkCreate': {
      const b = S.dlg.v; const codes = bulkCodes(b);
      if (!codes.length) { toast(__('Enter the number')); break; }
      const bm = b.parentId ? byId(p, b.parentId) : null;
      { const u = sysOf(p, b.systemId); if (u && !unitHas(u, b.dir)) b.dir = unitDirs(u)[0]; } // a supply-only unit has no extract points
      for (const code of codes) { const np = newPoint(p, { systemId: b.systemId, dir: b.dir, branch: bm ? bm.branch : b.branch, zone: b.zone || '', parentId: bm && bm.systemId === b.systemId && bm.dir === b.dir ? bm.id : '', code: uniqCode(p, code), ttype: b.ttype, size: b.size, designQ: b.designQ, method: b.method, reg: { type: b.reg, model: '', vmin: null, vmax: null, posBefore: '', posAfter: '', locked: false, state: '' } }); markAdded(p, np); p.points.push(np); }
      touch(p); toast(`${__h('Points created:')} ${codes.length}`); closeSheet(); break;
    }
    case 'genConclusion': case 'genConclusionYes': {
      const sk = repScope(p); const box = sk === 'all' ? p.report : ((p.report.scopes = p.report.scopes || {})[sk] = (p.report.scopes || {})[sk] || {});
      const cur0 = String(box.conclusion || '').trim();
      if (act === 'genConclusion' && cur0 && cur0 !== String(box.conclusionAuto || '').trim()) { S.confirm = 'genConcl'; render(); break; } // edited by hand: ask first
      const txt = genConclusion(sk === 'all' ? p : scopeView(p, sk, { raw: true })); box.conclusion = txt; box.conclusionAuto = txt; S.confirm = null; touch(p); render(); toast(__('Conclusion written — check and edit it')); break;
    }
    case 'clearSig': p.report.signature = ''; touch(p); render(); break;
    case 'sigOpen': openSigFS(); break;
    case 'folderPick': { if (!p || !Folders.ok()) break; try { const h = await Folders.pick(p.id); toast(__('Project folder: {f}', { f: h.name })); renderKeepAll(); } catch (err) { if (err && err.name !== 'AbortError') { console.error(err); toast(__('Could not open the folder')); } } break; }
    case 'folderForget': { if (!p) break; await Folders.set(p.id, null); renderKeepAll(); break; }
    case 'reorder': S.reorder = !S.reorder; render(); break;
    case 'ptUp': case 'ptDown': { const pt = p && byId(p, t.dataset.id); if (pt && moveSibling(p, pt, act === 'ptUp' ? -1 : 1)) { touch(p); renderKeepAll(); } break; }
    case 'balGo': { const el = document.getElementById(t.dataset.v); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); break; }
    case 'xlsx': case 'pdf': {
      { const pv = scopeView(p, repScope(p)); if (canCl(p) && clOpen(pv).length) { S.dlg = { type: 'cl', act, draft: clDraftInit(pv) }; pushNav(); renderSheet(); break; } } // open checklist questions first (of the part in the report)
      await exportReport(p, act, t); break;
    }
    case 'backup': {
      t.disabled = true; const old = t.innerHTML; t.textContent = __('Packing…');
      try { await Folders.ready(p.id); const b = await backupZip(p); await offerFile(reportBase(p, 'Project') + '.zip', b, p); }
      catch (err) { console.error(err); toast(__('Could not create the file')); }
      t.disabled = false; t.innerHTML = old; break;
    }
    case 'askDelProject': S.confirm = 'delProject'; render(); break;
    case 'delProject': { const id = p.id; const phs = allPhotos(p); const revs = (p.docs || []).flatMap(d => d.revs); S.view = 'home'; S.pid = null; S.confirm = null; await Store.remove(id); render(); toast(__('Project deleted')); for (const ph of phs) Photos.remove(ph); for (const r of revs) Docs.release(r); break; }
  }
});

/* ± button: flips the sign in place; pointerdown keeps the focus (and the on-screen keyboard) on the field */
document.addEventListener('pointerdown', (e) => { if (e.target.closest && e.target.closest('[data-pm]')) e.preventDefault(); });
document.addEventListener('click', (e) => {
  const b = e.target.closest && e.target.closest('[data-pm]'); if (!b) return;
  const el = b.parentElement.querySelector('input'); if (!el || el.disabled || b.disabled) return;
  const t = el.value.trim();
  el.value = /^[-\u2212\u2013]/.test(t) ? t.replace(/^[-\u2212\u2013]\s*/, '') : '-' + t;
  if (document.activeElement !== el) el.focus({ preventScroll: true });
  try { const l = el.value.length; el.setSelectionRange(l, l); } catch { }
  el.dispatchEvent(new Event('input', { bubbles: true }));
  // a value set from script raises no 'change' on blur: send it ourselves, so the page recalculates like after typing
  if (!el._pm) { el._pm = true; el.addEventListener('blur', () => { el._pm = false; el.dispatchEvent(new Event('change', { bubbles: true })); }, { once: true }); }
});
document.addEventListener('input', onField);
document.addEventListener('change', onField);
function onField(e) {
  const el = e.target;
  { const perm = Access.fieldPerm(el); if (perm && !Access.can(perm)) { if (e.type === 'change') toast(Access.why(perm)); return; } }
  if (el.id === 'importFile' && e.type === 'change') return importFile(el);
  if (el.dataset.batch !== undefined) { if (e.type !== 'change') return; const fl = el.files ? [...el.files] : []; el.value = ''; if (fl.length) BATCH.open(fl, el.dataset.batch); return; }
  if (el.dataset.aidocrole !== undefined) { const it = S.dlg && S.dlg.type === 'aidocs' && S.dlg.docs[Number(el.dataset.aidocrole)]; if (it) it.role = el.value; return; }
  if (el.dataset.aidocon !== undefined) { if (e.type !== 'change') return; const d = S.dlg; if (!d || d.type !== 'aidocs') return; const v = el.dataset.aidocon; const it = (v[0] === 'd' ? d.docs : d.tabs)[Number(v.slice(1))]; if (it) { it.on = el.checked; renderSheet(); } return; }
  if (el.dataset.batchrole !== undefined) { const it = S.dlg && S.dlg.type === 'batch' && S.dlg.items[Number(el.dataset.batchrole)]; if (it) { it.role = el.value; if (e.type === 'change') renderSheet(); } return; }
  if (el.dataset.aiinfo !== undefined) { if (typeof AIP !== 'undefined') AIP.infoEdit(el); return; }
  if (el.id === 'airFile') { if (e.type !== 'change') return; const fl = el.files ? [...el.files] : []; el.value = ''; if (fl.length) AIR.addExtra(fl); return; }
  if (el.dataset.aifile !== undefined) { if (e.type !== 'change') return; const fl = el.files ? [...el.files] : []; el.value = ''; if (fl.length) AIP.openFiles(fl, el.dataset.aifile); return; }
  if (el.dataset.aied !== undefined) { if (e.type === 'change') AIP.edit(el); return; }
  if (el.id === 'importXlsxFile' && e.type === 'change') { const f = el.files && el.files[0]; el.value = ''; if (f) importXlsx(f, 'merge'); return; }
  if (el.dataset.addphoto !== undefined) { if (e.type !== 'change') return; const files = [...(el.files || [])]; const owner = el.dataset.addphoto; el.value = ''; if (files.length) addPhotos(owner, files); return; }
  if (el.dataset.phcap !== undefined) { const p = cur(); const ph = p && allPhotos(p).find(x => x.id === el.dataset.phcap); if (ph) { ph.caption = el.value; touch(p); } return; }
  if (el.dataset.cover !== undefined) { if (e.type !== 'change') return; const f = el.files && el.files[0]; el.value = ''; if (f) coverFromFile(Number(el.dataset.cover), f); return; }
  if (el.dataset.lang !== undefined) { if (e.type === 'change') { const fake = { dataset: { act: el.dataset.lang, v: el.value } }; langAct(fake); } return; }
  if (el.dataset.actchk === 'simOn') { if (e.type === 'change') { Settings.v.sim = Object.assign({ role: 'owner', plan: 'business' }, Settings.v.sim || {}, { on: el.checked }); Settings.save(); render(); } return; }
  if (el.id === 'langFile' && e.type === 'change') { const f = el.files && el.files[0]; el.value = ''; if (f) importLangPack(f); return; }
  if (el.id === 'logoFile' && e.type === 'change') { const f = el.files && el.files[0]; el.value = ''; if (f) setLogo(f); return; }
  if (el.id === 'styleFile' && e.type === 'change') { const f = el.files && el.files[0]; el.value = ''; if (f) importStyle(f); return; }
  if (el.dataset.impinfo !== undefined) { if (S.dlg) S.dlg.withInfo = el.checked; return; }
  if (el.dataset.pk !== undefined) { if (e.type === 'change' || el.type === 'text') onPkField(el); return; }
  if (el.dataset.pkphotos !== undefined || el.id === 'pkResFile') return;
  if (el.dataset.flt !== undefined) {
    if (e.type !== 'change') return;
    if (el.dataset.flt === 'sys') S.f.sys = el.value;
    else if (el.dataset.flt === 'zone') { S.f.zone = el.value; if (!roomOpts(cur(), S.f.zone).includes(S.f.room)) S.f.room = 'all'; } // 0.9.5: a room of another floor is dropped
    else if (el.dataset.flt === 'room') S.f.room = el.value;
    else S.f.todo = el.checked;
    return render();
  }
  if (el.dataset.acct !== undefined) { if (S.acct) S.acct[el.dataset.acct] = el.value; return; }
  if (el.dataset.invcode !== undefined) { const A = acctState(); (A.codes = A.codes || {})[el.dataset.invcode] = el.value; return; }
  if (el.dataset.acctorg !== undefined) { if (e.type === 'change') acctRun(() => Cloud.pick(el.value), ''); return; }
  if (el.dataset.set !== undefined) { Settings.v[el.dataset.set] = el.value; Settings.save(); return; }
  if (el.dataset.bk !== undefined) {
    const b = S.dlg.v; const k = el.dataset.bk; const p = cur();
    b[k] = k === 'designQ' ? (parseNum(el.value) ?? null) : el.value;
    if (k === 'systemId' || k === 'parentId') { if (k === 'systemId') b.parentId = ''; else { const m = byId(p, b.parentId); if (m && m.branch) b.branch = m.branch; } renderSheet(); return; }
    const pv = document.getElementById('bkPreview'); const codes = bulkCodes(b);
    if (pv) pv.innerHTML = bulkPreview(codes);
    return;
  }
  if (el.dataset.fan !== undefined) {
    const i = el.dataset.fan.lastIndexOf('|'); const key = el.dataset.fan.slice(0, i), field = el.dataset.fan.slice(i + 1);
    S.fan[key] = S.fan[key] || {}; S.fan[key][field] = field === 'pid' ? el.value : (parseNum(el.value) ?? null);
    return updateLive();
  }
  if (el.dataset.adj !== undefined) {
    const [key, field] = [el.dataset.adj.slice(0, el.dataset.adj.lastIndexOf('|')), el.dataset.adj.slice(el.dataset.adj.lastIndexOf('|') + 1)];
    S.adj[key] = S.adj[key] || {}; S.adj[key][field] = field === 'pid' ? el.value : (parseNum(el.value) ?? null);
    return updateLive();
  }
  if (el.dataset.inspreset !== undefined) {
    if (e.type !== 'change' || !el.value) return;
    const p = cur(); const ins = p && p.instruments.find(x => x.id === el.dataset.inspreset); const pr = INS_PRESETS.find(x => x.key === el.value); if (!ins || !pr) return;
    const kindName = (k) => ((RL.inskind || {})[k] || '').toLowerCase(); const autoName = !ins.name || (ins.kind && ins.name.trim().toLowerCase() === kindName(ins.kind)); // the name was only the kind: follow the new kind
    Object.assign(ins, { qmin: null, qmax: null, qacc: null, vmin: null, vmax: null, pmax: null }, pr); delete ins.key;
    if (autoName) ins.name = (RL.inskind || {})[pr.kind] || ''; touch(p); renderKeepAll(); toast(__('Range taken from the data sheet — check it against your instrument')); return;
  }
  if (el.dataset.insdef !== undefined) { if (e.type !== 'change') return; const p = cur(); if (!p) return; p.insLast = p.insLast || {}; p.insLast[el.dataset.insdef] = el.value; touch(p); renderKeepAll(); return; }
  if (el.dataset.f === undefined) return;
  const p = cur(); if (!p) return;
  let target = p;
  if (el.dataset.pt) target = p.points.find(x => x.id === el.dataset.pt);
  else if (el.dataset.sys) target = p.systems.find(x => x.id === el.dataset.sys);
  else if (el.dataset.ins) target = p.instruments.find(x => x.id === el.dataset.ins);
  else if (el.dataset.grp) target = (p.groups || []).find(x => x.id === el.dataset.grp);
  if (!target) return;
  let v;
  if (el.type === 'checkbox') v = el.checked;
  else if (el.dataset.num !== undefined) {
    if (/^\s*[-\u2212\u2013]\s*$/.test(el.value)) { el.classList.remove('bad-in'); return; } // only the sign so far: wait for the digits
    const r = parseNumX(el.value, { small: el.dataset.small !== undefined }); v = r.v; el.classList.toggle('bad-in', v === undefined); numHint(el, r); if (v === undefined) return;
  }
  else v = el.value;
  if (el.type === 'checkbox' || el.tagName === 'SELECT' ? e.type !== 'change' : false) return;
  if (el.dataset.pt && (el.dataset.f === 'k' || el.dataset.f === 'k2')) { // k is kept in m³/h; the field shows it in the unit of the catalogue
    const elU = +(el.dataset.scale || 1) === K_F.ls ? 'ls' : 'm3h'; // the unit shown next to this field
    if (target.method === 'kfactor' && elU !== kUnitOf(target)) { if (e.type === 'change') return; target.kU = elU; } // a stale field fires «change» while it is replaced after a unit switch: ignore; typing follows what the field shows
    if (isNum(v) && el.dataset.scale) v = +(v * +el.dataset.scale).toPrecision(12);
    if (!target.kU) target.kU = kUnitOf(target); // the unit the value was typed in stays, also when the damper type changes later
  }
  if (el.dataset.pt && el.dataset.f === 'kU') for (const kk of ['k', 'k2']) if (isNum(target[kk])) target[kk] = +(target[kk] / K_F[kUnitOf(target)] * K_F[v]).toPrecision(12); // the typed number stays, its unit changes
  setPath(target, el.dataset.f, v);
  unitsAfterInput(p, el, target);
  if (el.dataset.pt) stampPt(p, target, fieldGroup(el.dataset.f));
  if (el.dataset.pt) { // instrument of the measurement: remember the choice per method, fill it in when the first reading is typed
    const m = /^meas\.(eerste|controle)\.(ins|r\.\d+)$/.exec(el.dataset.f);
    if (m && m[2] === 'ins') { p.insLast = p.insLast || {}; if (v) p.insLast[target.method] = v; }
    else if (m && isNum(v) && !target.meas[m[1]].ins) { const id = insGuess(p, target); if (id) { target.meas[m[1]].ins = id; const s2 = document.getElementById(fid(target.id, 'ins', m[1])); if (s2) s2.value = id; } }
  }
  if (el.dataset.pt && isNum(v) && /^meas\.eerste\.r\./.test(el.dataset.f)) clRemind(p, target);
  if (el.dataset.pt && el.dataset.f === 'systemId') treeFix(p, target, 'sys');
  if (el.dataset.pt && el.dataset.f === 'parentId') treeFix(p, target, 'parent');
  if (el.dataset.pt && (el.dataset.f === 'reg.type' || el.dataset.f === 'designQ') && target.reg) fillVFlows(p, target, ptCat(p, target)); // 0.9.18: Vmin / Vmax / Vnom where empty
  touch(p);
  syncTwins(el, v);
  if (el.dataset.rrw !== undefined && e.type === 'change' && !S.dlg && (!S.ed || dockMode())) { rerenderKeep(); return; }
  if (el.dataset.rr !== undefined && e.type === 'change') { if (dockMode()) { renderKeepAll(); return; } renderSheet(); }
  updateLive();
  // header title follows project name
  if (!S.ed && !S.dlg && (el.dataset.f === 'info.name' || el.dataset.f === 'info.nr' || el.dataset.f === 'info.client')) {
    const h = app.querySelector('.top .title h1, .rail .rt b'); const sub = app.querySelector('.rail .rt span');
    if (h) h.textContent = p.info.name || __('Untitled'); if (sub) sub.textContent = p.info.nr || '';
  }
  if (e.type === 'change' && /^cover\.items\.\d\.caption$/.test(el.dataset.f || '')) { const y = window.scrollY; render(); window.scrollTo(0, y); }
  if (S.ed && el.dataset.f === 'code') { const h = sheetEl.querySelector('.sh-top h2 .mono'); if (h) h.textContent = v || __('New point'); }
}
/** a number typed as 1.500 or 1,500 can mean two things: show how it was read, next to the field */
function numHint(el, r) {
  const host = el.closest('.unit, .sgn') || el; let h = host.nextElementSibling && host.nextElementSibling.classList.contains('num-hint') ? host.nextElementSibling : null;
  el.classList.toggle('amb-in', !!(r && r.amb && isNum(r.v)));
  if (!(r && r.amb && isNum(r.v))) { if (h) h.remove(); return; }
  if (!h) { h = document.createElement('span'); h.className = 'num-hint'; h.setAttribute('aria-live', 'polite'); host.after(h); }
  const d = Math.min(3, (String(r.v).split('.')[1] || '').length);
  h.textContent = __('read as {v}', { v: numText(r.v, d, I18N.num('ui')) });
}
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && S.mod) { if (S.mod.nav) modalExit(); else closeModal(); return; }
  if (e.key === 'Escape' && S.pv) { S.pv = null; S.confirm = null; renderViewer(); return; }
  if (e.key === 'Escape' && (S.ed || S.dlg)) { closeSheet(); return; }
  if (e.key === 'Enter' && e.target.matches('.gate input[data-acct]')) {
    e.preventDefault(); const card = e.target.closest('.card'); const ins = [...card.querySelectorAll('input[data-acct]')]; const nx = ins[ins.indexOf(e.target) + 1];
    if (nx) nx.focus(); else { const b = card.querySelector('[data-go]'); if (b && !b.disabled) b.click(); }
    return;
  }
  if (e.key !== 'Enter' || !e.target.matches('input.num, input[type=text]')) return;
  const inputs = [...sheetEl.querySelectorAll('input.num, input[type=text]')].filter(x => x.offsetParent);
  const i = inputs.indexOf(e.target);
  if (i >= 0) { e.preventDefault(); if (inputs[i + 1] && inputs[i + 1].dataset.rd !== undefined) inputs[i + 1].focus(); else { e.target.blur(); } }
});
async function importFile(el) {
  const f = el.files && el.files[0]; if (!f) return; el.value = '';
  let r;
  try { r = await readTeamFile(f); } catch (err) { console.error(err); toast(/\.xls[xm]$/i.test(f.name) ? __('Could not read the Excel file (.xlsx)') : __('The file does not look like a project backup')); return; }
  if (r.kind === 'zip') return restoreBackupZip(r.zip);
  if (r.kind === 'package') { const o = await PKG.open(r.obj); toast(o.existed ? __('This package is already on the device — opened') : __('Package opened: {name}', { name: r.obj.pkg.name })); openProject(o.p.id, 0); return; }
  if (r.kind === 'result') { if (!Access.can('package.manage')) { toast(Access.why('package.manage')); return; } return pkOpenResult(r.res, f.name); }
  if (r.kind === 'error') { toast(r.msg); return; }
  if (!Access.can('project.create')) { toast(Access.why('project.create')); return; }
  if (r.kind === 'xlsx') return importXlsx(f, 'new', r.sheets);
  restoreBackup(r.obj);
}
/* ---------- backup (.zip): project.json, files/<picture id>, docs/<plan file> — every file once ---------- */
async function backupZip(p) {
  const enc = new TextEncoder(); const files = [];
  const seen = new Set(); let missing = 0;
  for (const ph of allPhotos(p)) { if (!ph || !ph.id || seen.has(ph.id)) continue; seen.add(ph.id); const b = await Photos.blob(ph); if (b) files.push({ name: 'files/' + ph.id, data: new Uint8Array(await b.arrayBuffer()), store: true }); else missing++; }
  for (const d of p.docs || []) for (const r of d.revs) for (const k of new Set([r.file, ...Object.values(r.imgs || {})].filter(Boolean))) {
    if (seen.has('doc:' + k)) continue; seen.add('doc:' + k); const b = await Docs.blob(k); if (b) files.push({ name: 'docs/' + k, data: new Uint8Array(await b.arrayBuffer()), store: true }); else missing++;
  }
  const meta = { app: 'inregelaar-ventilatie', version: 3, exportedAt: new Date().toISOString(), files: files.length, missing };
  files.unshift({ name: 'project.json', data: enc.encode(JSON.stringify(Object.assign(meta, { project: p }))) });
  if (missing) toast(__('{n} files were not on this device and are not in the backup', { n: missing }));
  return XLSXW.zip(files, 'application/zip');
}
const sniffType = (u8) => u8[0] === 0x25 && u8[1] === 0x50 ? 'application/pdf' : u8[0] === 0x89 && u8[1] === 0x50 ? 'image/png' : 'image/jpeg';
async function restoreBackupZip(z) {
  try {
    const obj = JSON.parse(await z.text('project.json') || 'null'); const pr = obj && (obj.project || obj);
    if (!pr || !Array.isArray(pr.points) || !Array.isArray(pr.systems) || !pr.info) throw new Error('format');
    if (!Access.demoRoom('project')) return;
    toast(__('Importing…'));
    const np = migrate(Object.assign(newProject(), pr)); if (Store.projects[np.id]) np.id = 'p' + uid();
    const a = await Photos.assets(); const byId_ = new Map(allPhotos(np).map(ph => [ph.id, ph]));
    for (const name of z.names) {
      const u8 = await z.bytes(name); if (!u8) continue;
      if (name.startsWith('files/')) {
        const id = name.slice(6); const ph = byId_.get(id); const blob = new Blob([u8], { type: (ph && ph.mime) || sniffType(u8) }); await Photos.put(id, blob);
        if (a && ph) { try { const r = await a.upload(blob); ph.assetId = r.id; ph.url = r.url; } catch (e) { ph.assetId = ''; ph.url = ''; } }
      } else if (name.startsWith('docs/')) { const k = name.slice(5); if (!(await Photos.getLocal('doc:' + k))) await Photos.put('doc:' + k, new Blob([u8], { type: sniffType(u8) })); }
    }
    Store.projects[np.id] = np; touch(np); toast(__('Project imported')); render();
  } catch (err) { console.error(err); toast(__('The file does not look like a project backup')); }
}
async function restoreBackup(obj) {
  try {
    const pr = obj.project || obj;
    if (!pr || !Array.isArray(pr.points) || !Array.isArray(pr.systems) || !pr.info) throw new Error('format');
    if (!Access.demoRoom('project')) return;
    const np = migrate(Object.assign(newProject(), pr));
    if (Store.projects[np.id]) np.id = 'p' + uid();
    if (obj.photos) {
      const a = await Photos.assets();
      for (const ph of allPhotos(np)) {
        const durl = obj.photos[ph.id]; if (!durl) continue;
        const blob = await (await fetch(durl)).blob(); await Photos.put(ph.id, blob);
        if (a) { let ok = false; if (ph.url) { try { ok = (await fetch(ph.url)).ok; } catch (e) { } } if (!ok) { try { const r = await a.upload(blob); ph.assetId = r.id; ph.url = r.url; } catch (e) { ph.assetId = ''; ph.url = ''; } } }
      }
    }
    Store.projects[np.id] = np; touch(np); toast(__('Project imported')); render();
  } catch (err) { toast(__('The file does not look like a project backup')); }
}
async function importXlsx(file, mode, sheets) {
  try {
    if (!sheets) { const r = await readTeamFile(file); if (r.kind === 'result') return pkOpenResult(r.res, file.name); if (r.kind === 'error') { toast(r.msg); return; } sheets = r.sheets; }
    const d = IMP.parse(sheets, file.name); S.dlg = { type: 'import', d, mode, file: file.name, withInfo: false }; pushNav(); renderSheet();
  }
  catch (err) { console.error(err); toast(__('Could not read the Excel file (.xlsx)')); }
}
async function addPhotos(owner, files) {
  const p = cur(); if (!p) return;
  const imgs = files.filter(f => !isPdfFile(f)), pdfs = files.filter(isPdfFile);
  let n = 0, heic = 0;
  if (imgs.length) {
    toast(imgs.length > 1 ? __('Processing {n} photos…', { n: imgs.length }) : __('Processing the photo…'));
    for (const f of imgs) { try { const ph = await Photos.add(f); photoList(p, owner).push(ph); n++; } catch (err) { if (err && err.code === 'heic') heic++; console.error(err); } }
    if (n) touch(p);
    refreshOwner();
    toast(heic ? __('HEIC is not supported by the browser — switch the camera to JPEG') : n ? `${__h('Photos added:')} ${n}` : __('Could not read the file'));
  }
  for (const f of pdfs) await addPlanPages(p, owner, f);
}
/** a PDF added to the notes goes to the plans of the project; the chosen pages become fragments (one page: straight to the editor) */
function fragTemplate(d, rev, page) {
  return { id: '', caption: rev.pages.length > 1 ? `${d.name} — p. ${page}` : d.name, w: 0, h: 0, mime: 'image/jpeg', ts: Date.now(), assetId: '', url: '',
    src: { doc: d.id, file: rev.kind === 'img' ? (rev.imgs || {})[page] || rev.file : rev.file, page }, edit: Object.assign(EDIT0(), { crop: [0, 0, 1, 1] }), layout: 'full' };
}
async function addPlanPages(p, owner, file) {
  let d;
  try { toast(__('Saving the plan…')); d = (await Docs.add(p, file)).d; touch(p); }
  catch (err) { console.error(err); toast(err && err.code === 'storage' ? __('Device storage is full') : /load|import|module|fetch/i.test(String(err && err.message)) ? __('The PDF module did not load: internet is needed at the first start') : __('Could not open the PDF')); return; }
  const rev = docCur(d); let pages = rev.pages.slice();
  if (pages.length > 1) { const pick = await openPdfPicker({ pdf: await Docs.pdf(rev.file), name: d.name }, { mode: 'notes', owner }); if (!pick) { refreshOwner(); return; } pages = pick.pages; }
  if (!pages.length) return;
  if (pages.length === 1) { openImageEditor({ p, mode: 'frag', ph: fragTemplate(d, rev, pages[0]), owner, isNew: true, tab: 'crop', sub: docLabel(d, pages[0]) }); return; }
  toast(__('Adding pages…')); let k = 0;
  for (const n of pages) {
    try { const ph = fragTemplate(d, rev, n); const c = await renderPhoto(p, ph); const b = await canvasBlob(c, 'image/jpeg', 0.9); const r = await Photos.addBlob(b, { w: c.width, h: c.height, mime: 'image/jpeg' }); Object.assign(ph, { id: r.id, w: r.w, h: r.h, mime: r.mime, assetId: r.assetId, url: r.url }); photoList(p, owner).push(ph); k++; }
    catch (err) { console.error(err); }
  }
  if (k) touch(p); refreshOwner(); toast(k ? `${__h('Added from PDF:')} ${k}` : __('Could not add the pages'));
}
function refreshOwner() { if (S.ed || S.dlg) renderSheet(); else { const y = window.scrollY; render(); window.scrollTo(0, y); } }
function blobToDataURL(b) { return new Promise((res) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = () => res(null); fr.readAsDataURL(b); }); }
/* ---------- report styles (themes.js): picker in the settings, file import ---------- */
function styleBlockHTML() {
  const st = activeStyle(); const sw = [st.colors?.navy || FRESH_AIR.colors.navy, st.colors?.bar || FRESH_AIR.colors.bar, st.colors?.sub || FRESH_AIR.colors.sub, st.colors?.cream || FRESH_AIR.colors.cream];
  const confirm = S.confirm === 'styleDel' ? `<div class="confirm"><span>${__h('Remove the style «{name}» from this device?', { name: st.name })}</span><span class="spacer"></span><button class="btn sm danger" data-act="styleDel">${__h('Remove')}</button><button class="btn sm" data-act="cancelConfirm">${__h('Cancel')}</button></div>`
    : S.confirm === 'styleFirm' && S.styleFirm ? `<div class="confirm"><span>${__h('Fill in the company details from «{name}»?', { name: S.styleFirm.name || st.name })}</span><span class="spacer"></span><button class="btn sm primary" data-act="styleFirmYes">${__h('Fill in')}</button><button class="btn sm" data-act="cancelConfirm">${__h('No')}</button></div>` : '';
  return `<div class="stack-s"><span class="label">${__h('Report style')}</span>
    ${seg('styleSel', st.id, Object.fromEntries(styleList().map(x => [x.id, x.name])))}
    <div class="row style-row"><span class="style-sw" aria-hidden="true">${sw.map(c => `<i style="background:#${c}"></i>`).join('')}</span><span class="small muted">${st.builtin ? __h('built in') : __h('from a file')}</span><span class="spacer"></span>
      <label class="btn sm" for="styleFile">${__h('Add a style from a file')}<input id="styleFile" class="vh" type="file" accept=".json,application/json"></label>
      <button class="btn sm primary" data-act="styleEdit">${__h('Customise the style')}</button>
      <button class="btn sm ghost" data-act="styleExport">${__h('Save as a style file')}</button>${st.builtin ? '' : `<button class="btn sm ghost" data-act="styleAskDel">${__h('Remove')}</button>`}</div>
    ${confirm}
    <span class="small muted">${__h('Colours, logo and slogan of the PDF and Excel reports. Fresh Air is built in; other styles come from a file (.inregelstijl.json) and are kept with the settings.')}</span></div>`;
}
async function importStyle(file) {
  try {
    if (file.size > 3e6) throw new Error('too big');
    const st = parseStyle(JSON.parse(await file.text()));
    const list = (Settings.v.styles || []).filter(x => x.id !== st.id); list.push(st);
    Settings.v.styles = list; Settings.v.styleId = st.id; Settings.save(); useStyle();
    const v = Settings.v; const f = st.firm;
    if (f && ['company', 'address', 'footer'].some(k => f[k] && f[k] !== v[k])) { S.styleFirm = Object.assign({ name: st.name }, f); S.confirm = 'styleFirm'; } else S.confirm = null;
    renderSheet(); toast(__('Style added: {name}', { name: st.name }));
  } catch (err) { console.error(err); toast(__('This is not a style file')); }
}
async function setLogo(file) {
  try {
    const im = await decodeImage(file);
    const W = im.width || im.naturalWidth || 800, H = im.height || im.naturalHeight || 200;
    const sc = Math.min(1600 / W, 360 / H, 4); const w = Math.max(1, Math.round(W * sc)), h = Math.max(1, Math.round(H * sc));
    const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(im, 0, 0, w, h);
    Settings.v.logo = c.toDataURL('image/png'); Settings.v.logoW = w; Settings.v.logoH = h; Settings.v.logoSrc = 'custom'; Settings.save(); renderSheet(); toast(__('Logo saved'));
  } catch (err) { toast(err && err.code === 'heic' ? __('HEIC is not supported — save the logo as PNG or JPEG') : __('Could not read the image')); }
}

/* ---------- modal: PDF page picker and cover crop ---------- */
const modalEl = document.getElementById('modal');
function closeModal() { const m = S.mod; S.mod = null; if (m && m.stage) m.stage.destroy(); modalEl.hidden = true; modalEl.innerHTML = ''; if (m && m.resolve) m.resolve(null); }
/** page picker: src is a File or {pdf, name}; resolves {page} (cover) or {pages} (notes), null when cancelled */
async function openPdfPicker(src, opts) {
  return new Promise(async (resolve) => {
    S.mod = { type: 'pdf', name: String(src.name || '').replace(/\.pdf$/i, ''), pdf: null, n: 0, sel: new Set(), busy: __('Opening the PDF…'), opts, resolve };
    renderModal();
    try {
      const pdf = src.pdf || await PDFX.open(src);
      if (!S.mod || S.mod.type !== 'pdf') return;
      S.mod.pdf = pdf; S.mod.n = pdf.numPages; S.mod.busy = '';
      if (pdf.numPages === 1 && opts.mode === 'notes') S.mod.sel.add(1);
      renderModal(); renderThumbs();
    } catch (err) { console.error(err); closeModal(); toast(/load|import|module|fetch/i.test(String(err && err.message)) ? __('The PDF module did not load: internet is needed at the first start') : __('Could not open the PDF')); }
  });
}
async function renderThumbs() {
  const m = S.mod; if (!m || m.type !== 'pdf' || !m.pdf) return;
  for (let i = 1; i <= Math.min(m.n, 60); i++) {
    if (S.mod !== m) return;
    const holder = modalEl.querySelector(`[data-pg="${i}"] .pg-img`); if (!holder || holder.dataset.done) continue;
    try { const c = await PDFX.render(m.pdf, i, 320); c.className = 'pg-canvas'; holder.innerHTML = ''; holder.appendChild(c); holder.dataset.done = '1'; } catch (e) { holder.textContent = __('error'); }
  }
}
function renderModal() {
  const m = S.mod;
  if (!m) { modalEl.hidden = true; modalEl.innerHTML = ''; return; }
  modalEl.hidden = false;
  if (m.type === 'pdf') {
    const single = m.opts.mode === 'cover';
    const pages = Array.from({ length: Math.min(m.n, 60) }, (_, k) => k + 1);
    modalEl.innerHTML = `<div class="sheet" role="dialog" aria-modal="true">
      <div class="sh-top"><div class="wrap"><h2>${esc(m.name)}</h2><button class="iconbtn" data-act="modClose" aria-label="${__h('Close')}">${ICON.close}</button></div></div>
      <div class="sh-body"><div class="wrap stack">
        <p class="small muted" style="margin:0">${m.busy ? esc(m.busy) : single ? __h('Choose the page for the cover ({n} pages) — then choose the crop.', { n: m.n }) : __h('Select pages ({n} pages) — each becomes an image in the notes.', { n: m.n })}</p>
        <div class="pg-grid">${pages.map(i => `<button type="button" class="pg${m.sel.has(i) ? ' on' : ''}" data-act="pgPick" data-pg="${i}"><span class="pg-img"></span><span class="pg-n">${i}</span></button>`).join('')}</div>
        ${m.n > 60 ? `<p class="small muted">${__h('The first 60 pages are shown.')}</p>` : ''}
      </div></div>
      <div class="sh-foot"><div class="wrap"><button class="btn" data-act="modClose">${__h('Cancel')}</button>${single ? '' : `<button class="btn primary" data-act="pdfUse"${m.sel.size && !m.busy ? '' : ' disabled'}>${m.busy && m.sel.size ? __('Adding…') : `${__h('Add')} ${m.sel.size || ''}`}</button>`}</div></div>
    </div>`;
    return;
  }
}
const COVER_SLOTS = [{ aspect: 184.6 / 89.6, out: [2000, 971] }, { aspect: 91.3 / 61.5, out: [1400, 943] }, { aspect: 91.3 / 61.5, out: [1400, 943] }];
async function coverFromFile(i, file) {
  const p = cur(); if (!p) return;
  try {
    if (isPdfFile(file)) {
      toast(__('Saving the plan…')); const { d } = await Docs.add(p, file); touch(p); const rev = docCur(d); let page = rev.pages[0];
      if (rev.pages.length > 1) { const pick = await openPdfPicker({ pdf: await Docs.pdf(rev.file), name: d.name }, { mode: 'cover' }); if (!pick) { render(); return; } page = pick.page; }
      openImageEditor({ p, mode: 'cover', ph: { caption: '', src: { doc: d.id, file: rev.file, page }, edit: EDIT0() }, slot: i, isNew: true, tab: 'crop', sub: docLabel(d, page) });
    } else {
      toast(__('Processing the image…'));
      const r = await compressImage(file, 3000, 0.9, { keepPng: true }); const orig = await Photos.addBlob(r.blob, { w: r.w, h: r.h, mime: r.mime });
      openImageEditor({ p, mode: 'cover', ph: { caption: '', orig, edit: EDIT0() }, slot: i, isNew: true, tab: 'crop' });
    }
  } catch (err) { console.error(err); toast(err && err.code === 'heic' ? __('HEIC is not supported — use JPEG or PNG') : __('Could not read the file')); }
}
function coverCard(p) {
  const c = p.cover; const items = c.items || [];
  const slot = (i, cls, label) => {
    const it = items[i];
    return `<div class="cv-cell"><div class="cv-slot ${cls}${it ? ' filled' : ''}">
        ${it ? `<img data-ph="${it.photo.id}" alt="">${it.caption ? `<span class="cv-cap"><i></i>${esc(it.caption)}</span>` : ''}` : `<label class="cv-empty" for="cv-file-${i}">${ICON.image}<span>${label}</span></label>`}
      </div>
      <div class="cv-actions">
        <label class="btn sm" for="cv-file-${i}">${it ? __('Replace') : __('Photo or PDF')}<input id="cv-file-${i}" class="vh" type="file" accept="image/*,application/pdf,.pdf" data-cover="${i}"></label>
        ${it ? `<button class="btn sm" data-act="cvCrop" data-i="${i}">${__h('Crop')}</button><button class="btn sm ghost" data-act="cvDel" data-i="${i}">${__h('Remove')}</button>` : ''}
      </div></div>`;
  };
  const autoSub = _r('Inregelrapport ventilatie-installatie — {lg} {codes}', { lg: p.systems.length > 1 ? _r('luchtgroepen') : _r('luchtgroep'), codes: p.systems.map(s => s.code).join(', ') || 'LG01' });
  return `<section class="card"><div class="hd"><h2>${__h('Report cover')}</h2><span class="small muted">${esc(_r('Omslag'))} · PDF</span></div>
    <p class="small muted" style="margin:0">${__h('Site photos or plan extracts from a PDF, as on the booklet cover. Empty slots are filled automatically with photos from the project notes or a summary of the units.')}</p>
    <div class="cv">${slot(0, 'big', __('Main image'))}<div class="cv-row">${slot(1, 'sm', __('Small 1'))}${slot(2, 'sm', __('Small 2'))}</div></div>
    ${items.some(Boolean) ? `<div class="grid3">${[0, 1, 2].map(i => items[i] ? inp({ f: `cover.items.${i}.caption` }, items[i].caption, { label: `${__h('Caption')} ${i + 1}`, ph: 'Gelijkvloers — vleugel C' }) : '').join('')}</div>` : ''}
    <div class="grid2">
      ${inp({ f: 'cover.title' }, c.title, { label: __('Title'), nl: 'titel', ph: 'AIR BALANCING REPORT', full: true })}
      ${inp({ f: 'cover.subtitle' }, c.subtitle, { label: __('Subtitle'), nl: 'ondertitel', ph: autoSub, full: true })}
      ${inp({ f: 'cover.band' }, c.band, { label: __('Line in the blue band'), nl: 'documenten', ph: p.info.schema ? 'Technisch schema: ' + p.info.schema : 'Ventilatieplannen … · meetrapport lucht', full: true })}
    </div>
  </section>`;
}

/** keep the master/slave tree consistent after edits */
function treeFix(p, pt, what) {
  if (what === 'kind' && pt.kind === 'terminal') for (const c of rawChildren(p, pt.id)) c.parentId = pt.parentId || '';
  if (what === 'dir' || what === 'sys') {
    for (const id of descendantIds(p, pt.id)) { const d = byId(p, id); if (d) { d.dir = pt.dir; d.systemId = pt.systemId; } }
    const par = rawParent(p, pt); if (par && (par.dir !== pt.dir || par.systemId !== pt.systemId)) pt.parentId = '';
  }
  if (what === 'parent') { const par = rawParent(p, pt); if (par && par.branch) { pt.branch = par.branch; for (const id of descendantIds(p, pt.id)) { const d = byId(p, id); if (d) d.branch = par.branch; } } }
}

/** re-render the page after a value changed, keeping scroll position and the field the user moved to */
/** the same value shown twice (table cell and point panel): update the other copy */
function syncTwins(el, v) {
  if (!el.dataset.f || !(el.dataset.pt || el.dataset.sys)) return;
  const sel = `[data-f="${CSS.escape(el.dataset.f)}"]` + (el.dataset.pt ? `[data-pt="${CSS.escape(el.dataset.pt)}"]` : `[data-sys="${CSS.escape(el.dataset.sys)}"]`);
  document.querySelectorAll(sel).forEach(x => {
    if (x === el || x.type === 'file') return;
    if (x.type === 'checkbox') { x.checked = !!v; return; }
    const val = x.dataset.num !== undefined ? fmtIn(x.dataset.scale && isNum(v) ? +(v / +x.dataset.scale).toPrecision(10) : v) : String(v ?? '');
    if (x.value !== val) x.value = val; x.classList.remove('bad-in');
  });
}
function rerenderKeep() {
  clearTimeout(rerenderKeep.t);
  rerenderKeep.t = setTimeout(() => {
    if (S.dlg || (S.ed && !dockMode())) return;
    const a = document.activeElement; const id = a && a.id && a !== document.body ? a.id : null;
    const y = window.scrollY; render(); window.scrollTo(0, y);
    if (id) { const n = document.getElementById(id); if (n && n.focus) { n.focus({ preventScroll: true }); try { const l = n.value.length; n.setSelectionRange(l, l); } catch { } } }
  }, 30);
}

const impLinks = (d) => (d.linked ? ` · ${__h('master/slave links:')} ${d.linked}` : '') + (d.missing ? ` · ${__h('master not found:')} ${d.missing}` : '');

const refG = (up) => up ? (up.fan ? __('the fan') : up.ref) : '';

function uniqCode(p, c) { let g = 0; while (c && p.points.some(x => x.code === c) && g++ < 200) c = nextCode(c); return c; }

const bulkPreview = (codes) => codes.length ? __x('Will create {n}: {list}', { n: codes.length, list: `<span class="mono">${esc(codes.slice(0, 4).join(', '))}${codes.length > 4 ? ' … ' + esc(codes[codes.length - 1]) : ''}</span>` }) : __h('Enter the number');

function setUiLang(code) {
  I18N.set('ui', code); Settings.v.uiLang = I18N.cur.ui; Settings.save(); document.documentElement.lang = I18N.cur.ui; render();
}
function langAct(o) {
  const p = cur(); const v = o.dataset.v;
  if (o.dataset.act === 'uiLang') setUiLang(v);
  else if (o.dataset.act === 'repLang' && p) { p.report.lang = v; I18N.set('rep', v); touch(p); render(); }
  else if (o.dataset.act === 'repLangDef') { Settings.v.repLang = v; Settings.save(); if (!p) I18N.set('rep', v); renderSheet(); }
}
async function importLangPack(file) {
  try {
    const pk = await LANGX.read(file);
    const d = I18N.dom(pk.domain); const code = String(pk.code || '').trim().toLowerCase();
    if (!/^[a-z]{2,3}(-[a-z0-9]{2,8})?$/.test(code) || code === 'xx') { toast(__('Set the language code (for example de or pl) in the template')); return; }
    if (code === I18N.src[d]) { toast(__('The source language cannot be replaced')); return; }
    const obj = { domain: d, code, name: pk.name && pk.name !== 'Language name' ? pk.name : code.toUpperCase(), locale: pk.locale && pk.locale !== 'xx-BE' ? pk.locale : code, labels: pk.labels, strings: pk.strings, custom: true };
    I18N.add(obj); I18N.saveCustom(obj);
    if (d === 'ui') setUiLang(code); else render();
    toast(__('Language pack imported: {name} ({p} %)', { name: obj.name, p: Math.round(LANGX.coverage(d, code) * 100) }));
  } catch (err) { console.error(err); toast(__('This is not a language pack')); }
}
