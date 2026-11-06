/* ---------- the company's measuring instruments: list in the settings, entry dialog, Excel template; «From the company list» in a project ---------- */
const insKindName = (k) => (L.inskind || {})[k] || k || '';
const insCalTxt = (ins) => ins.cal ? (insCalOld(ins) ? `<span class="warn-t">${__h('calibration {d} — older than a year', { d: fmtDate(ins.cal, false) })}</span>` : __h('calibration {d}', { d: fmtDate(ins.cal, false) })) : `<span class="warn-t">${__h('no calibration date')}</span>`;
/* ---- settings: the instrument park ---- */
function insParkCardHTML() {
  const list = insPark();
  const rows = list.map(e => `<div class="row small" style="flex-wrap:nowrap;align-items:center"><div style="min-width:0;flex:1"><b>${esc(insLabel(e))}</b><br><span class="muted">${[e.kind ? esc(insKindName(e.kind)) : '', e.serial ? 'SN ' + esc(e.serial) : '', insCalTxt(e)].filter(Boolean).join(' · ')}</span></div>
    <button class="btn sm ghost" data-act="insEdit" data-id="${esc(e.id)}">${__h('Edit')}</button><button class="btn sm ghost" data-act="insCopy" data-id="${esc(e.id)}" title="${__h('Copy for another device of the same make')}">${__h('Copy')}</button></div>`).join('');
  return `<section class="card"><h3>${__h('Measuring instruments of the company')}</h3>
    <p class="small muted" style="margin:0">${__h('Instruments with serial number, calibration date and the range from the manufacturer\'s data sheet. Enter them once here; in a project add them with «From the company list».')}</p>
    <div class="stack-s"><span class="label">${__h('Instruments')} · ${list.length}</span>${rows || `<span class="small muted">${__h('none yet')}</span>`}</div>
    <div class="row"><button class="btn sm" data-act="insNew">${__h('+ Instrument')}</button><button class="btn sm" data-act="insTpl">${ICON.grid} ${__h('Excel template / export')}</button>
      <label class="btn sm" for="insFile">${__h('Import Excel')}<input id="insFile" class="vh" type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"></label></div>
    <span class="small muted">${__h('Range and accuracy only from the official data sheet of the manufacturer; the presets «From the data sheet» name their source.')}</span></section>`;
}
/* ---- dialog: one instrument of the park ---- */
function insDialogHTML(d) {
  const e = d.e, k = e.kind;
  const kinds = Object.assign({ '': '—' }, Object.fromEntries(INS_KINDS.map(x => [x, insKindName(x)])));
  const f = (key, label, o = {}) => { const id = 'insd-' + key; const v = e[key];
    const field = o.opts ? `<select id="${id}" data-insd="${key}">${Object.entries(o.opts).map(([a, b]) => `<option value="${esc(a)}"${String(v ?? '') === a ? ' selected' : ''}>${esc(b)}</option>`).join('')}</select>`
      : o.type === 'date' ? `<input id="${id}" type="date" data-insd="${key}" value="${esc(v || '')}">`
        : `<input id="${id}" data-insd="${key}"${o.num ? ' class="num" inputmode="decimal" autocomplete="off" data-num' : ' type="text" autocomplete="off"'} value="${esc(o.num ? fmtIn(v) : v ?? '')}" placeholder="${esc(o.ph || '')}">`;
    return `<label class="field${o.full ? ' full' : ''}" for="${id}">${lbl(label, o.nl)}${o.unit ? `<div class="unit">${field}<em>${o.unit}</em></div>` : field}</label>`; };
  const rng = k === 'hood' ? f('qmin', __('Q from'), { num: true, unit: __('m³/h'), ph: '42' }) + f('qmax', __('Q to'), { num: true, unit: __('m³/h'), ph: '4250' }) + f('qacc', __('Accuracy specified from'), { num: true, unit: __('m³/h'), ph: '85' })
    : k === 'funnel' ? f('qmin', __('Q from'), { num: true, unit: __('m³/h') }) + f('qmax', __('Q to'), { num: true, unit: __('m³/h') }) + f('vmin', __('v from (vane)'), { num: true, unit: __('m/s'), ph: '0,3' })
      : k === 'vane' || k === 'hotwire' ? f('vmin', __('v from'), { num: true, unit: __('m/s'), ph: k === 'vane' ? '0,3' : '0,1' }) + f('vmax', __('v to'), { num: true, unit: __('m/s'), ph: '20' }) + '<div></div>'
        : k === 'dp' ? f('pmax', __('p max'), { num: true, unit: __('Pa'), ph: '200' }) + f('vmin', __('v from (Pitot)'), { num: true, unit: __('m/s'), ph: '2' }) + f('vmax', __('v to (Pitot)'), { num: true, unit: __('m/s'), ph: '17,5' }) 
          : k === 'clamp' ? f('imax', __('I max'), { num: true, unit: __('A'), ph: '400' }) + '<div></div><div></div>'
            : k === 'tacho' ? f('rmin', __('n from'), { num: true, unit: 'min⁻¹', ph: '30' }) + f('rmax', __('n to'), { num: true, unit: 'min⁻¹', ph: '99999' }) + '<div></div>' : '';
  return sheetFrame(d.copy ? __('Measuring instrument — copy') : __('Measuring instrument'), `
    <section class="card"><div class="grid2">
      ${f('name', __('Instrument'), { nl: 'Toestel', ph: (RL.inskind || {})[k] || 'Debietkap' })}${f('type', __('Make / type'), { nl: 'Type', ph: 'TSI PH731' })}
      ${f('kind', __('Kind'), { opts: kinds })}
      <label class="field" for="insd-preset">${lbl(__('From the data sheet'))}<select id="insd-preset" data-insdp><option value="">—</option>${INS_PRESETS.map(x => `<option value="${x.key}">${esc(x.type)}</option>`).join('')}</select></label>
      ${f('serial', __('Serial no.'), { nl: 'Serienummer' })}${f('cal', __('Calibration'), { nl: 'Kalibratie', type: 'date' })}
    </div>
    ${rng ? `<div class="grid3">${rng}</div>` : ''}
    <div class="grid2">${f('acc', __('Accuracy (data sheet)'), { ph: '±3 % ±12 m³/h' })}${f('src', __('Source (data sheet, link)'), { ph: 'https://…' })}</div>
    ${d.copy ? `<div class="small muted">${__h('A copy is another device of the same make: fill in its serial number and calibration date.')}</div>` : ''}
    ${insCalOld(e) ? `<div class="small warn-t">${__h('The calibration is older than a year — have the instrument calibrated before you use it for a report.')}</div>` : ''}
    ${d.err ? `<div class="banner" style="background:var(--bad-soft);border-color:transparent">${esc(d.err)}</div>` : ''}</section>`,
    `<div class="row">${d.isNew ? '' : `<button class="btn danger" data-act="insDel">${__h('Delete')}</button><button class="btn" data-act="insDup">${__h('Copy')}</button>`}<span class="spacer"></span><button class="btn" data-act="insBack">${__h('Cancel')}</button><button class="btn primary" data-act="insSave">${__h('Save')}</button></div>`);
}
function insOpen(e, isNew, copy) { const back = S.dlg && S.dlg.type === 'insEd' ? S.dlg.back : S.dlg; S.dlg = { type: 'insEd', e: Object.assign(INS0(), clone(e)), isNew, copy: !!copy, back }; renderSheet(); }
/** the project part of the instrument card: add from the park, copy, write back */
function insFromSelHTML(p) {
  const park = insPark(); if (!park.length) return '';
  const inP = new Set(p.instruments.map(x => x.park).filter(Boolean));
  return `<select data-insfrom aria-label="${__h('From the company list')}" style="max-width:220px"><option value="">${__h('+ From the company list')}</option>${park.map(e => `<option value="${esc(e.id)}"${inP.has(e.id) ? ' disabled' : ''}>${esc(insLabel(e))}${e.serial ? ' · SN ' + esc(e.serial) : ''}${inP.has(e.id) ? ' ✓' : ''}</option>`).join('')}</select>`;
}
function insRowToolsHTML(ins) {
  const linked = !!(ins.park && insParkById(ins.park));
  return `<button class="btn sm ghost" data-act="insDupP" data-id="${ins.id}" title="${__h('Copy for another device of the same make')}">${__h('Copy')}</button><button class="btn sm ghost" data-act="insPark" data-id="${ins.id}">${linked ? __h('Update in the company list') : __h('Save in the company list')}</button>`;
}
document.addEventListener('click', async (ev) => {
  const t = ev.target.closest('[data-act]'); if (!t) return; const act = t.dataset.act;
  if (!['insNew', 'insEdit', 'insCopy', 'insDup', 'insSave', 'insDel', 'insBack', 'insTpl', 'insDupP', 'insPark'].includes(act)) return;
  if (act === 'insNew') return insOpen(Object.assign(INS0(), { id: 'i' + uid() }), true);
  if (act === 'insEdit') { const e = insParkById(t.dataset.id); if (e) insOpen(e, false); return; }
  if (act === 'insCopy') { const e = insParkById(t.dataset.id); if (e) insOpen(Object.assign(insCopyOf(e), { id: 'i' + uid() }), true, true); return; }
  if (act === 'insBack') { S.dlg = S.dlg && S.dlg.back || null; return renderSheet(); }
  if (act === 'insTpl') { try { const b = await insTemplate(insPark()); await offerFile('Inregelaar_meettoestellen.xlsx', b); } catch (err) { console.error(err); toast(__('Could not create the file')); } return; }
  if (act === 'insDupP' || act === 'insPark') {
    const p = cur(); if (!p) return; const i = p.instruments.findIndex(x => x.id === t.dataset.id); if (i < 0) return;
    if (act === 'insDupP') { if (!Access.allow('addIns')) return; p.instruments.splice(i + 1, 0, insCopyOf(p.instruments[i])); touch(p); render(); toast(__('Copied — fill in the serial number and calibration')); return; }
    const r = insToPark(p.instruments[i]); touch(p); render(); toast(r === 'upd' ? __('Updated in the company list') : __('Saved in the company list')); return;
  }
  const d = S.dlg; if (!d || d.type !== 'insEd') return;
  if (act === 'insDup') return insOpen(Object.assign(insCopyOf(d.e), { id: 'i' + uid() }), true, true);
  const list = (Settings.v.instruments || []).slice();
  if (act === 'insDel') { Settings.v.instruments = list.filter(x => x.id !== d.e.id); Settings.save(); S.dlg = d.back || null; toast(__('Deleted')); return renderSheet(); }
  if (act === 'insSave') {
    const e = Object.assign(INS0(), d.e); delete e.park; delete e.key;
    if (!String(e.name || '').trim() && !String(e.type || '').trim()) { d.err = __('Fill in the instrument or the make / type.'); return renderSheet(); }
    const i = list.findIndex(x => x.id === e.id); if (i >= 0) list[i] = e; else list.push(e);
    Settings.v.instruments = list; Settings.save(); S.dlg = d.back || null; toast(__('Saved in the company list')); return renderSheet();
  }
});
document.addEventListener('input', (ev) => {
  const el = ev.target; if (el.dataset.insd === undefined || !S.dlg || S.dlg.type !== 'insEd' || el.tagName === 'SELECT') return;
  const k = el.dataset.insd; let v = el.value;
  if (el.dataset.num !== undefined) { const r = parseNumX(v, { small: true }); v = v.trim() === '' ? null : isNum(r.v) ? r.v : S.dlg.e[k]; }
  S.dlg.e[k] = v;
});
document.addEventListener('change', async (ev) => {
  const el = ev.target;
  if (el.dataset.insd !== undefined && S.dlg && S.dlg.type === 'insEd') {
    if (el.tagName === 'SELECT') { S.dlg.e[el.dataset.insd] = el.value; renderSheet(); }
    else if (el.type === 'date') S.dlg.e[el.dataset.insd] = el.value;
    return;
  }
  if (el.dataset.insdp !== undefined && S.dlg && S.dlg.type === 'insEd') {
    const e = S.dlg.e; const pr = INS_PRESETS.find(x => x.key === el.value); if (!pr) return;
    const kindName = (k) => ((RL.inskind || {})[k] || '').toLowerCase(); const autoName = !e.name || (e.kind && e.name.trim().toLowerCase() === kindName(e.kind));
    Object.assign(e, { qmin: null, qmax: null, qacc: null, vmin: null, vmax: null, pmax: null }, pr); delete e.key;
    if (autoName) e.name = (RL.inskind || {})[pr.kind] || ''; renderSheet(); toast(__('Range taken from the data sheet — check it against your instrument')); return;
  }
  if (el.dataset.insfrom !== undefined) {
    const p = cur(); const e = insParkById(el.value); el.value = ''; if (!p || !e) return;
    { const perm = Access.fieldPerm(el); if (perm && !Access.can(perm)) { toast(Access.why(perm)); return; } }
    p.instruments.push(insFromPark(e)); touch(p); render(); toast(__('Instrument added: {name}', { name: insLabel(e) })); return;
  }
  if (el.id === 'insFile') {
    const file = el.files && el.files[0]; el.value = ''; if (!file) return;
    try {
      const rows = await insRead(await file.arrayBuffer()); if (!rows.length) { toast(__('No instruments found in the file')); return; }
      const r = insMerge(rows); toast(__('Instruments: {a} added, {u} updated', { a: r.add, u: r.upd })); renderSheet();
    } catch (err) { console.error(err); toast(__('The file does not look like the instrument template')); }
  }
});
