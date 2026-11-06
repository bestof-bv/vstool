/* ---------- measurement table (tablets): one row per point; the measured flow and the damper position are typed in the cells, a tap on the point opens its panel beside / below the table ---------- */
const REG_SHORT = { iris: 'IRIS', regelklep: 'RK', cav: 'CAV', vav: 'VAV', plenum: 'PL', afsluit: 'AK', brand: 'BK', terugslag: 'TK' };
/** the flow can be typed straight into the cell: one direct reading (flow hood or controller read-out) */
function cellQ(pt, phase) {
  if (!(pt.method === 'hood' || pt.method === 'readout')) return false;
  const r = (pt.meas && pt.meas[phase] && pt.meas[phase].r) || [];
  return r.slice(1).every(x => !isNum(x));
}
const VT_LIM = 80;
function measTables(p, pts, phase) {
  const flt = (x) => inKey(p, S.f.sys, x.systemId) && (S.f.dir === 'all' || x.dir === S.f.dir) && (!S.f.zone || S.f.zone === 'all' || (x.zone || '') === S.f.zone) && roomOk(x);
  const devs = S.f.todo ? [] : p.points.filter(x => isDev(x) && flt(x));
  const byRoom = S.f.order === 'room'; // 0.9.5: one section per floor / zone and room, supply and extract of the room together
  const groups = new Map();
  if (byRoom) for (const g of roomGroups(p, [...pts, ...devs])) groups.set('room|' + g.zone + '|' + g.room, g.pts);
  else for (const pt of [...pts, ...devs]) { const k = pt.systemId + '|' + pt.dir; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(pt); }
  const order = [];
  const ctl = phase === 'controle';
  const posF = ctl ? 'reg.posAfter' : 'reg.posBefore';
  const ents = [...groups.entries()];
  if (!byRoom) ents.sort((a, b) => { const ia = p.systems.findIndex(s => s.id === a[1][0].systemId), ib = p.systems.findIndex(s => s.id === b[1][0].systemId); return ia - ib || (a[1][0].dir === b[1][0].dir ? 0 : a[1][0].dir === 'T' ? -1 : 1); });
  const html = ents.map(([k, arr]) => {
    const s = sysOf(p, arr[0].systemId); const dir = arr[0].dir; const tree = byRoom ? arr.map(pt => ({ pt, lvl: 1 })) : treeOrder(p, arr);
    const more = !!(S.vtMore && S.vtMore[k]); let shown = 0; // 0.9.4: a long table draws its first VT_LIM rows; the rest on request
    let br = null, rows = '';
    for (const { pt, lvl } of tree) {
      if (!more && ++shown > VT_LIM) { if (!isDev(pt) && !isCtx(p, pt)) order.push(pt.id); continue; }
      if (!byRoom && lvl === 1 && (pt.branch || '') !== br) { br = pt.branch || ''; rows += `<tr class="vt-br"><td colspan="8">${esc(br || __('no branch'))}<span data-live="vbr|${esc(k)}|${esc(br)}|${phase}"></span></td></tr>`; }
      const ctx = isCtx(p, pt); const dev = isDev(pt);
      if (!dev && !ctx) order.push(pt.id);
      const tag = dev ? '<span class="tag D">—</span>' : `<span class="tag ${pt.dir}${isNode(pt) ? ' node' : ''}">${pt.dir}</span>`;
      const code = ctx ? `<span class="vt-code">${tag}<b>${esc(pt.code || '—')}</b></span>` : `<button type="button" class="vt-code" data-act="editPt" data-id="${pt.id}" data-mode="${phase}">${tag}<b>${esc(pt.code || __('no code'))}</b></button>`;
      const chips = ptChips(p, pt, phase);
      const rtype = hasReg(pt) ? `<span class="rtag${dev ? ' dev' : ''}" title="${esc(L.reg[pt.reg.type] || '')}">${esc(REG_SHORT[pt.reg.type] || pt.reg.type)}</span>` : '';
      let q = '', pos = '', dsg = '';
      if (dev) {
        dsg = '<span class="muted">—</span>'; q = '<span class="muted">—</span>';
        pos = ctx ? esc(L.state[pt.reg.state || ''] || '—') : `<select class="cell" id="${fid(pt.id, 'vstate')}" data-pt="${pt.id}" data-f="reg.state" data-rrw aria-label="${__h('Position')} ${esc(pt.code || '')}">${Object.entries(posLabels()).map(([v, t]) => `<option value="${v}"${(pt.reg.state || '') === v ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select>`;
      } else {
        const d = designOf(p, pt), di = isNum(d) || isNum(pt.designQ) ? null : kidsDesignInfo(p, pt);
        dsg = di && di.partial != null ? `<span class="warn-t" title="${__h('{k} of {n} without design flow', { k: di.m - di.n, n: di.m })}">Σ ?</span>` : `${isNum(pt.designQ) ? '' : isNum(d) ? '<small>Σ </small>' : ''}${fmt(d)}`;
        q = !ctx && cellQ(pt, phase)
          ? `<input class="num cell" id="${fid(pt.id, 'vq', phase)}" inputmode="decimal" enterkeyhint="next" autocomplete="off" data-num data-col="q" data-pt="${pt.id}" data-f="meas.${phase}.r.0" value="${esc(fmtIn(((pt.meas && pt.meas[phase] && pt.meas[phase].r) || [])[0]))}" aria-label="${__h('Measured')} ${esc(pt.code || '')}">`
          : `<span class="vt-q" data-live="vq|${pt.id}|${phase}"></span>`;
        pos = hasReg(pt) ? (ctx ? esc((ctl ? pt.reg.posAfter : pt.reg.posBefore) || '—') : `<input class="cell" type="text" id="${fid(pt.id, 'vpos', phase)}" enterkeyhint="next" autocomplete="off" data-col="pos" data-pt="${pt.id}" data-f="${posF}" value="${esc((ctl ? pt.reg.posAfter : pt.reg.posBefore) || '')}" placeholder="${ctl && pt.reg.posBefore ? esc(pt.reg.posBefore) : ''}" aria-label="${__h(ctl ? 'Position after' : 'Position before')} ${esc(pt.code || '')}">`) : '';
      }
      rows += `<tr data-row="${pt.id}"${ctx ? '' : ` data-open="${pt.id}" data-mode="${phase}"`} class="${dev ? 'dev' : ''}${isNode(pt) ? ' node' : ''}${ctx ? ' ctx' : ''}" style="--lvl:${lvl - 1}">
        <td class="c-code">${code}</td>
        <td class="c-room"><span>${esc(pt.room || (dev ? [pt.fd && pt.fd.ei, [pt.fd && pt.fd.from, pt.fd && pt.fd.to].filter(Boolean).join(' → ')].filter(Boolean).join(' · ') : '') || '')}</span>${chips ? `<span class="chips">${chips}</span>` : ''}</td>
        <td class="c-type">${rtype}</td>
        <td class="c-dsg n">${dsg}</td>
        <td class="c-q n">${q}</td>
        <td class="c-pct n"${dev ? '' : ` data-live="vpct|${pt.id}|${phase}"`}></td>
        <td class="c-pos">${pos}</td>
        <td class="c-st" data-live="vst|${pt.id}|${phase}"></td>
      </tr>`;
    }
    return `<section class="vt">
      ${byRoom ? `<div class="vt-hd"><h3>${esc(roomLabel(arr[0]))}</h3><span class="sum">${esc(roomSumText(p, arr))}</span></div>`
        : `<div class="vt-hd"><span class="tag ${dir}">${dir}</span><h3>${esc(s ? s.code : '?')} · ${esc(L.dir[dir])}</h3><span class="sum" data-live="vsum|${esc(k)}|${phase}"></span></div>`}
      <table class="vtab"><thead><tr>
        <th class="c-code">${__h('Code')}</th><th class="c-room">${__h('Room')}</th><th class="c-type">${__h('Type')}</th><th class="c-dsg n">${__h('Project')}</th>
        <th class="c-q n">${__h('Measured')}</th><th class="c-pct n">${ctl ? __h('Deviation') : '%'}</th><th class="c-pos" title="${__h(ctl ? 'Position after' : 'Position before')}">${__h(ctl ? 'Pos. after' : 'Pos. before')}</th><th class="c-st">${__h('Status')}</th>
      </tr></thead><tbody>${rows}</tbody></table>${tree.length > VT_LIM ? `<div class="vt-more"><button class="btn sm ghost" data-act="vtMore" data-k="${esc(k)}">${more ? __h('Show fewer') : __h('Show all points ({n})', { n: tree.length })}</button></div>` : ''}
    </section>`;
  }).join('');
  S.list = order;
  return html;
}
/** live cells of the table (called from updateLive) */
function vtLive(el, p, parts) {
  const [k, a, b] = parts;
  if (k === 'vsum' || k === 'vbr') {
    const [, sid, dir] = parts; const br = k === 'vbr' ? parts.slice(3, -1).join('|') : null; const ph = parts[parts.length - 1];
    const arr = p.points.filter(x => x.systemId === sid && x.dir === dir && isEndFlow(p, x) && (k === 'vsum' || (x.branch || '') === br));
    let d = 0, q = 0, n = 0; for (const x of arr) { if (isNum(x.designQ)) d += x.designQ; const v = ptQ(p, x, ph); if (isNum(v)) { q += v; n++; } }
    el.textContent = arr.length ? (k === 'vbr' ? ' · ' : '') + `Σ ${n ? fmt(q) : '—'} / ${fmt(d)} ${__('m³/h')}` + (n && n < arr.length ? ` (${n}/${arr.length})` : '') : '';
    return;
  }
  const pt = ptAt(p, a); if (!pt) return;
  if (k === 'vq') {
    const nq = nodeQ(p, pt, b); const r = calcQ(pt, b, p);
    el.innerHTML = isNum(nq.q) ? `${nq.derived ? '<small>Σ </small>' : ''}${fmt(nq.q)}` : nq.derived && nq.n ? `<small>Σ ${fmt(nq.partial)} (${nq.n}/${nq.m})</small>` : r.need ? `<small class="muted">${esc(r.need)}</small>` : '<span class="muted">—</span>';
  } else if (k === 'vpct') {
    const q = ptQ(p, pt, b), d = designOf(p, pt);
    if (b === 'eerste') { const r = ratioOf(q, d); el.textContent = isNum(r) ? fmt(r * 100) : ''; el.className = 'c-pct n' + (isNum(r) && !inTol(r - 1, p.tol.terminal) ? ' warn' : ''); }
    else { const dv = devOf(q, d); const ok = inTol(dv, p.tol.terminal); el.textContent = isNum(dv) ? fmtDev(dv) : ''; el.className = 'c-pct n' + (ok === false ? ' bad' : ok ? ' good' : ''); }
  } else if (k === 'vst') {
    if (isDev(pt)) { el.innerHTML = pt.reg.cond ? `<span class="${pt.reg.cond === 'defect' ? 'bad' : 'good'}">${esc(L.cond[pt.reg.cond])}</span>` : ''; return; }
    if (pt.status) { el.innerHTML = `<span class="bad">${esc(L.status[pt.status])}</span>`; return; }
    if (insBad(p, pt, b)) { el.innerHTML = `<span class="bad" title="${esc(insCheck(p, pt, b).map(x => x.k === 'kind' ? __('the instrument does not fit the method') : `${fmt(x.v, x.unit === 'm/s' ? 2 : 0)} ${x.unit} / ${fmt(x.lim, x.unit === 'm/s' ? 1 : 0)} ${x.unit}`).join(' · '))}">${__h('instrument range')}</span>`; return; }
    const q = ptQ(p, pt, b);
    if (!isNum(q)) { el.innerHTML = `<span class="muted">${__h('not measured')}</span>`; return; }
    if (b === 'controle') { const st = ptStatus(pt, p); el.innerHTML = st ? `<span class="${st === 'ok' ? 'good' : 'bad'}">${st === 'ok' ? 'OK' : 'NOK'}</span>` : ''; }
    else el.innerHTML = `<span class="good">${esc(L.status[''])}</span>`;
  }
}
/* tap on a row (outside the cells) opens the point panel; with the panel on the right it follows the row being typed in */
app.addEventListener('click', (e) => {
  const tr = e.target.closest('tr[data-open]'); if (!tr || e.target.closest('input, select, textarea, button, label, a')) return;
  const p = cur(); if (!p || !byId(p, tr.dataset.open) || !Access.allow('editPt')) return;
  openEditor(tr.dataset.open, tr.dataset.mode);
});
app.addEventListener('focusin', (e) => {
  const d = dockMode(); if (!d || !S.ed) return;
  const tr = e.target.closest && e.target.closest('tr[data-open]'); if (!tr) return;
  if (d === 'b' && e.target.classList.contains('cell')) document.body.dataset.dockmin = '1'; // portrait: the panel folds down while typing in the table
  if (S.ed.id === tr.dataset.open) return;
  S.ed = { id: tr.dataset.open, mode: tr.dataset.mode || S.ed.mode, extra: {} }; S.confirm = null; renderSheet();
});
app.addEventListener('focusout', (e) => {
  if (!e.target.classList || !e.target.classList.contains('cell')) return;
  setTimeout(() => { const a = document.activeElement; if (!(a && a.classList && a.classList.contains('cell') && app.contains(a))) delete document.body.dataset.dockmin; }, 0);
});
/* Enter / «next» on the keyboard: down the column */
app.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' || !e.target.dataset || !e.target.dataset.col) return;
  const all = [...app.querySelectorAll(`[data-col="${e.target.dataset.col}"]`)].filter(x => x.offsetParent && !x.disabled);
  const i = all.indexOf(e.target); e.preventDefault();
  if (all[i + 1]) { all[i + 1].focus(); try { all[i + 1].select(); } catch (err) { } } else e.target.blur();
});
