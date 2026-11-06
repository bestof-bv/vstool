/* ---------- catalogue of technical sheets: link at the damper / controller of a point, list in the settings, entry dialog, Excel template ---------- */
/** select of the sheets that fit the damper type; the size of the point first */
function catSelHTML(p, pt) {
  const r = pt.reg || {}; const dn = ptDN(pt); const cur = ptCat(p, pt);
  const list = catAll().filter(e => e.kind === r.type);
  if (cur && !list.some(e => e.id === cur.id)) list.unshift(cur);
  if (!list.length) return `<div class="small muted full">${__h('No technical sheets for this type in the catalogue yet — Settings → Catalogue.')}</div>`;
  // rectangular point (0.9.16): B × H of the duct, or «400x300» in the model / size; entries «B×H» sorted by the nearest size (either way round)
  const rs = ptRect(pt);
  const near = (e) => { if (isNum(dn) && isNum(e.dn)) return Math.abs(e.dn - dn); const es = rectOf(e.size); return rs && es ? Math.min(Math.abs(es[0] - rs[0]) + Math.abs(es[1] - rs[1]), Math.abs(es[0] - rs[1]) + Math.abs(es[1] - rs[0])) : 1e9; };
  const exact = (e) => (isNum(dn) && e.dn === dn) || (rs && near(e) === 0 && !!rectOf(e.size));
  const sorted = list.slice().sort((a, b) => near(a) - near(b) || natCmp(a.maker + a.series, b.maker + b.series) || (a.dn || 0) - (b.dn || 0) || natCmp(a.size || '', b.size || ''));
  const id = fid(pt.id, 'cat');
  const opts = `<option value="">${__h('— no technical sheet —')}</option>` + sorted.map(e => `<option value="${esc(e.id)}"${cur && cur.id === e.id ? ' selected' : ''}>${esc(catName(e))}${exact(e) ? ' ★' : ''}</option>`).join('');
  return `<label class="field full" for="${id}">${lbl(__('Technical sheet (catalogue)'), 'Technische fiche')}<select id="${id}" data-catpt="${pt.id}">${opts}</select></label>${cur ? `<div class="full">${catInfoHTML(p, pt, cur)}</div>` : ''}`;
}
/** one line about the linked sheet: source, k or range, and a check against the design flow */
function catInfoHTML(p, pt, e) {
  const u = e.kU === 'm3h' ? __h('m³/h') : __h('l/s');
  const ks = (e.kPos || []).map(([, k]) => k).filter(isNum);
  const parts = [ks.length ? __h('k {a}–{b} {u} over {n} positions, open = {o}', { a: fmt(Math.min(...ks), 1), b: fmt(Math.max(...ks), 1), u, n: ks.length, o: esc(e.posOpen || '—') }) : '',
    isNum(e.k) ? __h('k {k} {u}', { k: fmt(e.k, 1), u }) : '',
    isNum(e.qmin) && isNum(e.qmax) ? __h('range {a}–{b} m³/h', { a: fmt(e.qmin), b: fmt(e.qmax) }) : '',
    (e.kind === 'cav' || e.kind === 'vav') && isNum(catDpMin(e, designOf(p, pt))) ? __h('Δp min ≈ {v} Pa at the design flow', { v: fmt(catDpMin(e, designOf(p, pt))) }) : '',
    isNum(e.dpmax) ? __h('Δp max {v} Pa', { v: fmt(e.dpmax) }) : ''].filter(Boolean);
  const warn = catRangeNote(p, pt);
  const pre = catPresetHTML(p, pt, e);
  return `${pre}<div class="small">${parts.join(' · ')}${e.src ? ` · <a href="${esc(e.src)}" target="_blank" rel="noopener">${__h('technical sheet')} ↗</a>` : ''}${e.doc ? `<br><span class="muted">${esc(e.doc)}</span>` : ''}${warn ? `<br><span class="warn-t">${esc(warn)}</span>` : ''}</div>`;
}
/** calculated preset (0.9.18): iris / control damper position for the design flow, CAV / VAV set value */
function catPresetHTML(p, pt, e) {
  const r = catPreset(p, pt, e); if (!r) return isNum(designOf(p, pt)) ? '' : `<div class="small muted">${__h('Preset: enter the design flow first.')}</div>`;
  if (r.kind === 'set') return `<div class="preset"><span class="label">${__h('Preset')}</span><b>${__h('set value {q} m³/h', { q: fmt(r.q) })}</b>${r.low || r.high ? ` <span class="warn-t">${__h('outside the range of the sheet')}</span>` : ''}</div>`;
  const u = r.unit === 'ls' ? __h('l/s') : __h('m³/h');
  const base = r.src === 'm1' ? __h('Δp at the taps from measurement 1: {v} Pa', { v: fmt(r.dp, 1) }) : r.src === 'set' ? __h('Δp for the preset: {v} Pa', { v: fmt(r.dp) }) : __h('Δp assumed 50 Pa — enter the Δp for the preset');
  const main = isNum(r.pos) ? `<b>${__h('position ≈ {a}', { a: fmt(r.pos, 1) })}</b>${isNum(r.near) && Math.abs(r.near - r.pos) > 0.05 ? ` <span class="muted">(${__h('nearest in the table: {n}', { n: fmt(r.near, r.near % 1 ? 1 : 0) })})</span>` : ''}`
    : r.over ? `<span class="warn-t">${__h('even fully open ({o}) gives less: at least {d} Pa needed', { o: esc(String(r.open ?? '—')), d: fmt(r.dpNeed) })}</span>`
    : `<span class="warn-t">${__h('below the most closed position of the table ({c})', { c: esc(String(r.closed ?? '—')) })}</span>`;
  return `<div class="preset"><span class="label">${__h('Preset')}</span>${main}<div class="small muted">${__h('for {q} m³/h: k {k} {u}', { q: fmt(r.q), k: fmt(r.kNeed, 1), u })} · ${base}</div></div>`;
}
/** k-factor block of a point linked to a sheet with k per position */
function catKParamsHTML(p, pt, e) { return `<div data-live="catk|${pt.id}">${catKInner(p, pt, e)}</div>`; }
function catKInner(p, pt, e) {
  const u = e.kU === 'm3h' ? 'm3h' : 'ls', f = K_F[u], unit = u === 'ls' ? __h('l/s') : __h('m³/h');
  const show = (ph) => { const ki = kInfo(p, pt, ph);
    return ki.src === 'cat' ? `<b class="mono">${fmt(ki.k / f, 1)}</b> ${unit} <span class="muted">(${__h('position {a}', { a: fmt(ki.pos, Math.abs(ki.pos * 10 % 1) > 1e-9 ? 2 : ki.pos % 1 ? 1 : 0) })})</span>`
      : `<span class="warn-t">${__h('position «{t}» is not in the table', { t: esc(posOfPhase(pt, ph) || '—') })}</span>`; };
  return `<div class="stack-s"><span class="label">${__h('k-factor')} · ${esc(catName(e))}</span>
    <div class="small">${__h('Measure 1')}: ${show('eerste')} · ${__h('Measure 2')}: ${show('controle')}</div>
    <div class="small muted">${__h('k from the technical sheet at the damper position before and after adjusting (Q = k · √Δp). Enter the positions at the damper below; «open» is the open position of the sheet, positions between two rows are interpolated.')}</div></div>`;
}
/* ---- settings: the catalogue ---- */
const CAT_OPEN = new Set(); // groups of the built-in list the user opened (kept over a re-render)
document.addEventListener('toggle', (ev) => { const el = ev.target; if (!el || !el.dataset || el.dataset.catgrp === undefined) return; if (el.open) CAT_OPEN.add(el.dataset.catgrp); else CAT_OPEN.delete(el.dataset.catgrp); }, true);
const catSizeTxt = (e) => e.dn ? 'Ø' + e.dn : e.size || '—';
function catEntryRow(e, own) {
  const facts = [own ? catKind(e) : '', (e.kPos || []).length ? __h('{n} positions', { n: e.kPos.length }) : '', isNum(e.qmin) && isNum(e.qmax) ? `${fmt(e.qmin)}–${fmt(e.qmax)} ${__h('m³/h')}` : '',
    own && !e.src ? '<span class="warn-t">' + __h('no source') + '</span>' : ''].filter(Boolean).join(' · ');
  return `<div class="row small" style="flex-wrap:nowrap;align-items:center"><div style="min-width:0;flex:1"><b>${esc(own ? catName(e) : catSizeTxt(e))}</b>${facts ? (own ? '<br>' : ' ') + `<span class="muted">${facts}</span>` : ''}</div>
    ${own ? `<button class="btn sm ghost" data-act="catEdit" data-id="${esc(e.id)}">${__h('Edit')}</button>` : ''}<button class="btn sm ghost" data-act="catCopy" data-id="${esc(e.id)}" title="${__h('Copy into an own entry and edit it')}">${__h('Copy')}</button></div>`;
}
function catCardHTML() {
  const own = catOwn(); const lib = CAT_LIB;
  const byMaker = (arr) => { const m = new Map(); for (const e of arr) { const k = `${e.maker} ${e.series} · ${catKind(e)}`; if (!m.has(k)) m.set(k, []); m.get(k).push(e); } return [...m.entries()]; };
  const libRows = byMaker(lib).map(([k, arr]) => `<details class="more" data-catgrp="${esc(k)}"${CAT_OPEN.has(k) ? ' open' : ''}><summary><span style="min-width:0">${esc(k)}</span><span class="small muted" style="font-family:var(--font-data);font-weight:400;min-width:0">${arr.map(catSizeTxt).join(', ')}</span></summary>
    <div class="inner">${arr[0].src ? `<div class="small"><a href="${esc(arr[0].src)}" target="_blank" rel="noopener">${__h('source')} ↗</a> <span class="muted">${esc(arr[0].doc || '')}</span></div>` : ''}${arr.map(e => catEntryRow(e, false)).join('')}</div></details>`).join('');
  const ownRows = own.map(e => catEntryRow(e, true)).join('');
  return `<section class="card"><h3>${__h('Catalogue of technical sheets')}</h3>
    <p class="small muted" style="margin:0">${__h('Iris dampers, control dampers and CAV / VAV controllers: k per position, flow range and minimum Δp from the official sheet of the manufacturer. Link a sheet at the damper of a point; the project keeps a copy and the report lists the sheets used.')}</p>
    <div class="stack-s"><span class="label">${__h('Built-in (official sheets)')}</span>${libRows}<span class="small muted">${__h('Built-in entries cannot be changed: «Copy» makes an own entry with the same data to edit.')}</span></div>
    <div class="stack-s"><span class="label">${__h('Own entries on this device')} · ${own.length}</span>${ownRows || `<span class="small muted">${__h('none yet')}</span>`}</div>
    <div class="row"><button class="btn sm" data-act="catNew">+ ${__h('Entry')}</button><button class="btn sm" data-act="catTpl">${ICON.grid} ${__h('Excel template / export')}</button>
      <label class="btn sm" for="catFile">${__h('Import Excel')}<input id="catFile" class="vh" type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"></label></div>
    <span class="small muted">${__h('Values only from the official technical sheet of the manufacturer — fill in the source (link) and the document with its date.')}</span></section>`;
}
/* ---- dialog: own entry ---- */
const catKPosText = (kp) => (kp || []).map(([a, k]) => `${String(a).replace('.', dataDec())}=${String(k).replace('.', dataDec())}`).join('; ');
function catKPosParse(t) {
  const out = []; for (const part of String(t || '').split(/[;\n]+/)) { const m = part.split(/[=:]/); if (m.length < 2) continue; const a = parseNumX(m[0].trim(), { small: true }).v, k = parseNumX(m[1].trim(), { small: true }).v; if (isNum(a) && isNum(k)) out.push([a, k]); }
  return out.sort((x, y) => x[0] - y[0]);
}
function catDialogHTML(d) {
  const e = d.e; const kinds = Object.fromEntries(CAT_KINDS.map(k => [k, (L.reg || {})[k] || k]));
  const f = (k, label, o = {}) => { const id = 'catf-' + k; const v = e[k];
    return `<label class="field${o.full ? ' full' : ''}" for="${id}">${lbl(label, o.nl)}${o.opts ? `<select id="${id}" data-catf="${k}">${Object.entries(o.opts).map(([a, b]) => `<option value="${esc(a)}"${String(v) === a ? ' selected' : ''}>${esc(b)}</option>`).join('')}</select>`
      : `<${o.area ? 'textarea' : 'input'} id="${id}" data-catf="${k}"${o.num ? ' class="num" inputmode="decimal" data-num' : ''} ${o.area ? '' : `value="${esc(o.num ? fmtIn(v) : v ?? '')}"`} placeholder="${esc(o.ph || '')}">${o.area ? esc(v ?? '') + '</textarea>' : ''}`}</label>`; };
  return sheetFrame(d.copy ? __('Technical sheet — copy') : __('Technical sheet'), `
    <section class="card"><div class="grid2">
      ${f('maker', __('Manufacturer'), { nl: 'Fabrikant', ph: 'Grada' })}${f('series', __('Type / series'), { nl: 'Type', ph: 'IRIS' })}
      ${f('kind', __('Kind'), { opts: kinds })}${f('dn', __('Nominal size DN'), { num: true, ph: '200' })}
      ${f('size', __('Size (rectangular)'), { ph: '400x200' })}${f('kU', __('Unit of k'), { opts: { ls: __('Q in l/s = k · √Δp'), m3h: __('Q in m³/h = k · √Δp') } })}
      ${f('k', __('k at the measuring taps (one value)'), { num: true })}${f('posOpen', __('Position «open»'), { ph: '1' })}
      ${f('kPosText', __('k per position (position=k; …)'), { full: true, area: true, ph: '1=44,2; 1,5=36,6; 2=30,9' })}
      ${f('qmin', __('Q min (m³/h)'), { num: true })}${f('qmax', __('Q max (m³/h)'), { num: true })}
      ${f('dpmin', __('Δp min, constant (Pa)'), { num: true })}${f('dpQmax', __('Δp min at Q max (Pa)'), { num: true })}
      ${f('dpmax', __('Δp max (Pa)'), { num: true, ph: '500' })}<div></div>
      ${f('src', __('Source: official technical sheet (link)'), { full: true, ph: 'https://…' })}${f('doc', __('Document / date'), { full: true, ph: 'TF IRIS, 2024-03' })}
      ${f('note', __('Note'), { full: true })}
    </div>${d.err ? `<div class="banner" style="background:var(--bad-soft);border-color:transparent">${esc(d.err)}</div>` : ''}</section>`,
    `<div class="row">${d.isNew ? '' : `<button class="btn danger" data-act="catDel">${__h('Delete')}</button><button class="btn" data-act="catDup">${__h('Copy')}</button>`}<span class="spacer"></span><button class="btn" data-act="catBack">${__h('Cancel')}</button><button class="btn primary" data-act="catSave">${__h('Save')}</button></div>`);
}
function catOpen(e, isNew, copy) { const back = S.dlg && S.dlg.type === 'catEd' ? S.dlg.back : S.dlg; S.dlg = { type: 'catEd', e: Object.assign(CAT0(), clone(e), { kPosText: catKPosText(e.kPos) }), isNew, copy: !!copy, back }; renderSheet(); }
const catCopyOpen = (e) => catOpen(catCopyOf(e, _r('kopie'), e.lib ? _r('kopie van {name}', { name: catName(e) }) : ''), true, true); // data: in the report language
document.addEventListener('click', async (ev) => {
  const t = ev.target.closest('[data-act]'); if (!t) return; const act = t.dataset.act;
  if (!['catNew', 'catEdit', 'catCopy', 'catDup', 'catSave', 'catDel', 'catBack', 'catTpl'].includes(act)) return;
  if (act === 'catNew') return catOpen(Object.assign(CAT0(), { id: 'c' + uid() }), true);
  if (act === 'catEdit') { const e = catOwn().find(x => x.id === t.dataset.id); if (e) catOpen(e, false); return; }
  if (act === 'catCopy') { const e = catById(t.dataset.id); if (e) catCopyOpen(e); return; }
  if (act === 'catDup') { const d = S.dlg; if (!d || d.type !== 'catEd') return; const e = Object.assign(CAT0(), d.e); e.kPos = catKPosParse(d.e.kPosText); delete e.kPosText; return catCopyOpen(e); }
  if (act === 'catBack') { S.dlg = S.dlg && S.dlg.back || null; return renderSheet(); }
  if (act === 'catTpl') { try { const b = await catTemplate([...CAT_LIB, ...catOwn()]); await offerFile('Inregelaar_catalogus_technische_fiches.xlsx', b); } catch (err) { console.error(err); toast(__('Could not create the file')); } return; }
  const d = S.dlg; if (!d || d.type !== 'catEd') return;
  const list = (Settings.v.catalog || []).slice();
  if (act === 'catDel') { Settings.v.catalog = list.filter(x => x.id !== d.e.id); Settings.save(); S.dlg = d.back || null; toast(__('Deleted')); return renderSheet(); }
  if (act === 'catSave') {
    const e = Object.assign(CAT0(), d.e); e.kPos = catKPosParse(d.e.kPosText); delete e.kPosText; e.lib = false;
    if (!e.maker.trim() || !e.series.trim()) { d.err = __('Fill in the manufacturer and the type.'); return renderSheet(); }
    const i = list.findIndex(x => x.id === e.id); if (i >= 0) list[i] = e; else list.push(e);
    Settings.v.catalog = list; Settings.save(); S.dlg = d.back || null; toast(__('Saved in the catalogue')); return renderSheet();
  }
});
document.addEventListener('input', (ev) => {
  const el = ev.target; if (el.dataset.catf === undefined || !S.dlg || S.dlg.type !== 'catEd') return;
  const k = el.dataset.catf; let v = el.value;
  if (el.dataset.num !== undefined) { const r = parseNumX(v, { small: true }); v = v.trim() === '' ? null : isNum(r.v) ? r.v : S.dlg.e[k]; }
  S.dlg.e[k] = k === 'dn' && isNum(v) ? Math.round(v) : v;
});
document.addEventListener('change', async (ev) => {
  const el = ev.target;
  if (el.dataset.catf !== undefined && el.tagName === 'SELECT' && S.dlg && S.dlg.type === 'catEd') { S.dlg.e[el.dataset.catf] = el.value; return; }
  if (el.dataset.catpt !== undefined) {
    const p = cur(); const pt = p && p.points.find(x => x.id === el.dataset.catpt); if (!pt) return;
    { const perm = Access.fieldPerm(el); if (perm && !Access.can(perm)) { toast(Access.why(perm)); return; } }
    catLink(p, pt, el.value); touch(p);
    if (S.dlg || (S.ed && !dockMode())) renderSheet(); else renderKeepAll();
    return;
  }
  if (el.id === 'catFile') {
    const file = el.files && el.files[0]; el.value = ''; if (!file) return;
    try {
      const rows = await catRead(await file.arrayBuffer()); if (!rows.length) { toast(__('No entries found in the file')); return; }
      const list = (Settings.v.catalog || []).slice(); let add = 0, upd = 0;
      for (const e of rows) { const i = list.findIndex(x => x.id === e.id || (x.maker.toLowerCase() === e.maker.toLowerCase() && x.series.toLowerCase() === e.series.toLowerCase() && (x.dn ?? null) === (e.dn ?? null) && (x.size || '') === (e.size || ''))); if (i >= 0) { list[i] = Object.assign(e, { id: list[i].id }); upd++; } else { list.push(e); add++; } }
      Settings.v.catalog = list; Settings.save(); toast(__('Catalogue: {a} added, {u} updated', { a: add, u: upd })); renderSheet();
    } catch (err) { console.error(err); toast(__('The file does not look like the catalogue template')); }
  }
});
