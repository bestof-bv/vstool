/* ---------- air handling units in the interface: type and system of a unit, fans and motors, control and communication, fan readings, fan calculator ---------- */
const UL = () => ULab();
const dirsOpts = (s) => Object.fromEntries(unitDirs(s).map(d => [d, UL().dir[d]]).concat(unitDirs(s).length === 2 ? [['TA', UL().dir.TA]] : []));

/* ---- unit dialog: type, recovery, design flows ---- */
function unitMainHTML(p, s) {
  const ds = unitDirs(s);
  return `<div class="grid2">
        ${inp({ sys: s.id, f: 'code' }, s.code, { label: __('Code'), nl: 'Luchtgroep', ph: 'LG01' })}
        ${inp({ sys: s.id, f: 'unit' }, s.unit, { label: __('Unit type'), ph: 'WTW-unit' })}
        ${sel({ sys: s.id, f: 'type' }, s.type || 'TA', UL().type, { label: __('Supply / extract'), rr: true })}
        ${s.type === 'TA' ? sel({ sys: s.id, f: 'rec' }, s.rec || '', UL().rec, { label: __('Heat recovery') }) : '<div></div>'}
        ${inp({ sys: s.id, f: 'name' }, s.name, { label: __('Purpose'), nl: 'Omschrijving', full: true, ph: 'Kantoren verdieping 1' })}
        ${inp({ sys: s.id, f: 'location' }, s.location, { label: __('Location'), nl: 'Locatie', full: true })}
        ${ds.includes('T') ? inp({ sys: s.id, f: 'design.T' }, s.design.T, { label: __('Design supply'), nl: 'Ontwerp toevoer', num: true, unit: __('m³/h') }) : ''}
        ${ds.includes('A') ? inp({ sys: s.id, f: 'design.A' }, s.design.A, { label: __('Design extract'), nl: 'Ontwerp afvoer', num: true, unit: __('m³/h') }) : ''}
      </div>`;
}

/* ---- unit dialog: the system the unit belongs to ---- */
function unitSysHTML(p, s) {
  const g = grpOf(p, s.id);
  if (!g) {
    const others = sysEntries(p).filter(e => !e.units.some(u => u.id === s.id));
    if (!others.length) return '';
    return `<section class="card"><div class="hd"><h3>${__h('System')}</h3><span class="small muted">${__h('this unit alone')}</span></div>
      <label class="field" for="sysjoin-${s.id}">${lbl(__('Combine with'))}<select id="sysjoin-${s.id}" data-sysjoin="${s.id}"><option value="">${__h('— separate system —')}</option>${others.map(e => `<option value="${esc(e.key)}">${esc(entryLabel(e))}</option>`).join('')}</select></label>
      <p class="small muted" style="margin:0">${__h('Units that work together on one zone — in cascade, supplementing or compensating each other — form one system: the lists show them as one installation, the report gives the balance of the system and can be printed per system.')}</p></section>`;
  }
  const e = entryOf(p, s.id); const linkHelp = {
    cascade: __('Cascade: the main unit feeds the secondary units; their flow is not counted twice in the totals of the system. Balance the main unit first, then the secondary units, then measure the main unit again.'),
    supplement: __('Supplement: extra units (for example local extract fans) add to the main unit; all of them count in the balance of the system.'),
    compensation: __('Compensation: a make-up air unit compensates an extract (kitchen hood, process); the balance supply / extract of the system is checked.'),
    parallel: __('Parallel / standby: several units on one network; a standby unit is not counted. With «common network» the points belong to the system and the fan calculator treats the units together.'),
  }[g.link] || '';
  return `<section class="card"><div class="hd"><h3>${__h('System')} <span class="mono">${esc(entryCode(e))}</span></h3><button class="btn sm ghost" data-act="sysLeave" data-id="${s.id}">${__h('Leave the system')}</button></div>
    <div class="grid2">
      ${inp({ grp: g.id, f: 'name' }, g.name, { label: __('Name of the system'), ph: __('Kitchen and restaurant') })}
      ${sel({ grp: g.id, f: 'link' }, g.link, UL().link, { label: __('How the units work together'), rr: true })}
      ${sel({ grp: g.id, f: 'roles.' + s.id }, roleOf(p, s.id), UL().role, { label: __('Role of {s}', { s: s.code || '?' }), rr: true, id: fid(g.id, 'role', s.id) })}
      <div class="field" style="align-self:end">${chk({ grp: g.id, f: 'shared' }, g.shared, __('Common duct network'), { rr: true })}</div>
    </div>
    <div class="small">${e.units.map(u => `<span class="tag D">${esc(u.code || '?')}</span> ${esc(UL().role[roleOf(p, u.id)] || '')}`).join(' · ')}</div>
    <p class="small muted" style="margin:0">${esc(linkHelp)}</p></section>`;
}

/* ---- unit dialog: fans and motors ---- */
function fanSumText(s, f) {
  const L0 = UL(); return [L0.dir[f.dir], f.n > 1 ? f.n + ' ×' : '', f.motor, L0.supply[f.supply] && f.supply ? L0.supply[f.supply] : '', f.drive ? L0.drive[f.drive] : '', ctlOn(f.ctl) ? L0.ctl[f.ctl.mode] : '',
    isNum(f.np.P) ? fmt(f.np.P, 2) + ' kW' : '', isNum(f.np.I) ? 'In ' + fmt(f.np.I, 1) + ' A' : ''].filter(Boolean).join(' · ');
}
function fansCardHTML(p, s) {
  const fs = s.fans || [];
  return `<section class="card"><div class="hd"><h3>${__h('Fans and motors')}</h3><button class="btn sm" data-act="fanAdd" data-sid="${s.id}">${__h('+ Fan')}</button></div>
    ${fs.length ? fs.map(f => `<div class="row small" style="flex-wrap:nowrap;align-items:center"><div style="min-width:0;flex:1"><b>${esc(fanName(s, f))}</b>${f.maker || f.model ? ' ' + esc([f.maker, f.model].filter(Boolean).join(' ')) : ''}<br><span class="muted">${esc(fanSumText(s, f))}</span></div>
      <button class="btn sm ghost" data-act="fanEdit" data-sid="${s.id}" data-fid="${f.id}">${__h('Edit')}</button><button class="btn sm ghost" data-act="fanCopy" data-sid="${s.id}" data-fid="${f.id}">${__h('Copy')}</button></div>`).join('')
      : `<p class="small muted" style="margin:0">${__h('No fans yet.')}</p>`}
    <p class="small muted" style="margin:0">${__h('One line per fan (or per group of identical fans). Motor, supply and drive decide what is read at the controller and what the fan calculator proposes.')}</p></section>`;
}
function fanDialogHTML(p, d) {
  const s = sysOf(p, d.sid); const i = s ? (s.fans || []).findIndex(f => f.id === d.fid) : -1; if (i < 0) return '';
  const f = s.fans[i]; const P = `fans.${i}.`; const L0 = UL();
  const reads = (f.drive === 'ec' || f.drive === 'other') ? `<div class="stack-s"><span class="label">${__h('What the controller shows / is set')}</span><div class="row" style="gap:6px;flex-wrap:wrap">${READS.map(k => `<label class="check" for="fr-${f.id}-${k}" style="min-height:auto"><input id="fr-${f.id}-${k}" type="checkbox" data-fanread="${s.id}|${f.id}|${k}"${fanReads(f).includes(k) ? ' checked' : ''}><span class="small">${esc(L0.read[k])}</span></label>`).join('')}</div>
      <span class="small muted">${__h('Depends on the maker of the EC controller; the choice is remembered for the maker.')}</span></div>` : '';
  const kcU = s.np && s.np.kcF === 'rho' ? __('m²') : s.np && s.np.kcU === 'ls' ? __('l/s') : __('m³/h');
  return sheetFrame(`${__h('Fan')} <span class="mono">${esc(s.code || '')} ${esc(fanName(s, f))}</span>`, `
    <section class="card"><div class="grid2">
      ${inp({ sys: s.id, f: P + 'pos' }, f.pos, { label: __('Position'), ph: 'M1' })}
      ${sel({ sys: s.id, f: P + 'dir' }, f.dir, dirsOpts(s), { label: __('Side'), rr: true })}
      ${inp({ sys: s.id, f: P + 'n' }, f.n, { label: __('Number of identical fans'), num: true, ph: '1' })}
      ${inp({ sys: s.id, f: P + 'maker' }, f.maker, { label: __('Maker'), list: 'dl-fanmakers', ph: 'ebm-papst' })}
      ${inp({ sys: s.id, f: P + 'model' }, f.model, { label: __('Fan / motor type'), full: true })}
      ${sel({ sys: s.id, f: P + 'motor' }, f.motor, L0.motor, { label: __('Motor'), rr: true })}
      ${sel({ sys: s.id, f: P + 'supply' }, f.supply, L0.supply, { label: __('Supply'), rr: true })}
      ${sel({ sys: s.id, f: P + 'drive' }, f.drive, L0.drive, { label: __('Speed control'), rr: true, full: true })}
      ${f.drive === 'vfd' ? inp({ sys: s.id, f: P + 'fmax' }, f.fmax, { label: __('Maximum frequency (parameter)'), num: true, unit: __('Hz'), ph: '50' }) + '<div></div>' : ''}
      ${f.drive === 'belt' ? inp({ sys: s.id, f: P + 'pulley.dm' }, f.pulley.dm, { label: __('Motor pulley Ø'), num: true, unit: 'mm' }) + inp({ sys: s.id, f: P + 'pulley.df' }, f.pulley.df, { label: __('Fan pulley Ø'), num: true, unit: 'mm' }) : ''}
    </div><datalist id="dl-fanmakers">${EC_MAKERS.map(m => `<option value="${esc(m)}">`).join('')}</datalist>
    ${reads}</section>
    <section class="card"><div class="hd"><h3>${__h('Nameplate')}</h3><span class="small muted">${__h('motor')}</span></div><div class="grid3">
      ${inp({ sys: s.id, f: P + 'np.P' }, f.np.P, { label: __('Rated power'), num: true, small: true, unit: 'kW' })}
      ${inp({ sys: s.id, f: P + 'np.I' }, f.np.I, { label: __('Rated current'), nl: 'Nominale stroom (typeplaat)', num: true, small: true, unit: __('A') })}
      ${inp({ sys: s.id, f: P + 'np.U' }, f.np.U, { label: __('Rated voltage'), num: true, unit: 'V', ph: f.supply === '3~400' ? '400' : f.supply ? '230' : '' })}
      ${inp({ sys: s.id, f: P + 'np.rpm' }, f.np.rpm, { label: __('Rated speed'), num: true, unit: 'min⁻¹' })}
      ${inp({ sys: s.id, f: P + 'np.cos' }, f.np.cos, { label: 'cos φ', num: true, small: true, ph: '0,85' })}
      ${inp({ sys: s.id, f: P + 'np.ie' }, f.np.ie, { label: __('Efficiency class'), ph: 'IE3' })}
    </div>
    ${s.np && s.np.flowM === 'cone' ? `<div class="grid2">${inp({ sys: s.id, f: P + 'kc' }, f.kc, { label: __('k-factor of the fan'), nl: 'k-factor ventilator', num: true, small: true, unit: kcU })}<div class="small muted" style="align-self:end">${__h('From the documentation of the unit; {f}.', { f: coneFormula(s.np) })}</div></div>` : ''}</section>
    <section class="card"><div class="hd"><h3>${__h('Control and communication')}</h3></div>${ctlHTML(p, { sys: s.id }, P + 'ctl', f.ctl, { fan: true })}</section>
    <section class="card">${inp({ sys: s.id, f: P + 'note' }, f.note, { label: __('Note'), area: true })}</section>`,
    `<div class="row"><button class="btn danger" data-act="fanDel" data-sid="${s.id}" data-fid="${f.id}">${__h('Delete')}</button><button class="btn" data-act="fanCopy" data-sid="${s.id}" data-fid="${f.id}">${__h('Copy')}</button>${fansOf(s, f.dir === 'TA' ? 'T' : f.dir).length > 1 ? `<button class="btn" data-act="fanAll" data-sid="${s.id}" data-fid="${f.id}" title="${__h('Motor, supply, drive, nameplate and control type to the other fans of this side')}">${__h('Same for the side')}</button>` : ''}<span class="spacer"></span><button class="btn primary" data-act="fanBack">${__h('Done')}</button></div>`);
}

/* ---- control and communication: one block for a fan, the controller of a unit and a VAV / CAV actuator ---- */
function ctlHTML(p, bind, pre, c, o = {}) {
  c = c || CTL0(); const L0 = UL(); const B = (f) => Object.assign({}, bind, { f: pre + '.' + f }); const m = c.mode;
  const baud = (lab) => inp(B('baud'), c.baud, { label: lab || __('Baud rate'), list: 'dl-baud', ph: '19200' });
  const fields = m === 'mrtu' ? inp(B('addr'), c.addr, { label: __('Modbus address'), ph: '1…247' }) + baud() + sel(B('par'), c.par, L0.par, { label: __('Parity') }) + sel(B('stop'), c.stop, { '': '—', 1: '1', 2: '2' }, { label: __('Stop bits') }) + inp(B('bus'), c.bus, { label: __('Bus / segment'), ph: 'RS485-1' })
    : m === 'mtcp' ? inp(B('ip'), c.ip, { label: __('IP address'), ph: '192.168.1.20' }) + inp(B('port'), c.port, { label: __('Port'), ph: '502' }) + inp(B('uid'), c.uid, { label: 'Unit ID', ph: '1' })
      : m === 'bmstp' ? inp(B('mac'), c.mac, { label: __('MAC address'), ph: '0…127' }) + inp(B('inst'), c.inst, { label: 'Device Instance', ph: '1201' }) + baud() + inp(B('maxm'), c.maxm, { label: 'Max Master', ph: '127' }) + inp(B('bus'), c.bus, { label: __('Bus / segment'), ph: 'MSTP-1' })
        : m === 'bip' ? inp(B('ip'), c.ip, { label: __('IP address'), ph: '192.168.1.21' }) + inp(B('port'), c.port, { label: __('UDP port'), ph: '47808' }) + inp(B('inst'), c.inst, { label: 'Device Instance', ph: '1201' })
          : m === 'mpbus' ? inp(B('addr'), c.addr, { label: __('MP address'), ph: '1' }) + inp(B('bus'), c.bus, { label: __('Bus / segment'), ph: 'MP-1' })
            : m === 'v010' || m === 'v210' ? inp(B('sig0'), c.sig0, { label: o.fan ? __('Signal at minimum') : __('Signal at Vmin'), ph: m === 'v210' ? '2 V' : '0 V' }) + inp(B('sig1'), c.sig1, { label: o.fan ? __('Signal at maximum') : __('Signal at Vmax'), ph: '10 V' }) + inp(B('fb'), c.fb, { label: __('Feedback signal'), ph: m === 'v210' ? '2–10 V' : '0–10 V' })
              : '';
  const dup = p ? ctlDupOf(p, c) : [];
  const dupTxt = dup.map(x => x.kind === 'di' ? __('BACnet device instance {v} also at {list}', { v: c.inst, list: x.items.filter(e => e.ctl !== c).map(e => e.name).join(', ') })
    : x.kind === 'ip' ? __('IP address {v} also at {list}', { v: c.ip, list: x.items.filter(e => e.ctl !== c).map(e => e.name).join(', ') })
      : __('address {v} also at {list} on the same bus', { v: c.mode === 'bmstp' ? c.mac : c.addr, list: x.items.filter(e => e.ctl !== c).map(e => e.name).join(', ') })).join(' · ');
  return `<div class="grid2">
      ${sel(B('pwr'), c.pwr, L0.pwr, { label: o.fan ? __('Control voltage') : __('Supply of the actuator') })}
      ${sel(B('mode'), c.mode, L0.ctl, { label: __('Control'), rr: true })}
      ${fields}
      ${m ? inp(B('bms'), c.bms, { label: __('Name in the BMS'), ph: o.fan ? 'LG01_TV_M1' : 'VAV_1_01' }) + inp(B('note'), c.note, { label: __('Note') }) : ''}
    </div><datalist id="dl-baud">${CTL_BAUD.map(x => `<option value="${x}">`).join('')}</datalist>
    ${dupTxt ? `<div class="small warn-t">${__h('Same address: {t}', { t: dupTxt })}</div>` : ''}`;
}

/* ---- readings of the fans in a measurement (unit card) ---- */
function fanMeasHTML(p, s, phase) {
  const fs = (s.fans || []).filter(f => f.dir === 'TA' ? unitDirs(s).length === 2 : unitHas(s, f.dir)); if (!fs.length) return '';
  const cone = s.np && s.np.flowM === 'cone'; const m0 = s.meas[phase] || {};
  const insSel = (k, kinds, label) => { const list = (p.instruments || []).filter(i => kinds.includes(i.kind)); if (!list.length) return '';
    return sel({ sys: s.id, f: `meas.${phase}.${k}` }, m0[k] || '', Object.assign({ '': '—' }, Object.fromEntries(list.map(i => [i.id, insLabel(i)]))), { label, rr: true }); };
  const ins = insSel('insI', ['clamp', 'other'], __('Instrument for the currents')) + insSel('insN', ['tacho'], __('Instrument for the speed'));
  return (ins ? `<div class="grid2">${ins}</div>` : '') + fs.map(f => {
    const P = `meas.${phase}.fan.${f.id}.`; const m = fanM(s, phase, f); const B = (k) => ({ sys: s.id, f: P + k });
    const rd = fanReads(f).map(k => k === 'stage' ? inp(B('stage'), m.stage, { label: __('Step'), num: true, small: true, ph: '2' })
      : inp(B(k), m[k], { label: UL().read[k] || k, num: true, small: k === 'hz' || k === 'volt', unit: k === 'rpm' ? 'min⁻¹' : k === 'q' ? __('m³/h') : k === 'pa' ? __('Pa') : READ_U[k] })).join('');
    const cur = is3ph(f) ? inp(B('i1'), m.i1, { label: 'I L1', num: true, small: true, unit: __('A') }) + inp(B('i2'), m.i2, { label: 'I L2', num: true, small: true, unit: __('A') }) + inp(B('i3'), m.i3, { label: 'I L3', num: true, small: true, unit: __('A') })
      : inp(B('i'), m.i, { label: __('Motor current'), nl: 'Stroom', num: true, small: true, unit: __('A') });
    const volt = is3ph(f) ? `<details class="more"${[m.u12, m.u23, m.u31].some(isNum) ? ' open' : ''}><summary class="small">${__h('Voltages L1-L2, L2-L3, L3-L1 (optional)')}</summary><div class="inner"><div class="grid3">${inp(B('u12'), m.u12, { label: 'U L1-L2', num: true, unit: 'V' })}${inp(B('u23'), m.u23, { label: 'U L2-L3', num: true, unit: 'V' })}${inp(B('u31'), m.u31, { label: 'U L3-L1', num: true, unit: 'V' })}</div></div></details>` : '';
    return `<div class="stack-s" style="padding-top:8px;border-top:1px solid var(--line)"><span style="font-weight:600;font-size:14px">${esc(fanName(s, f))} · ${esc(UL().dir[f.dir])} <span class="small muted" style="font-weight:400">${esc([f.motor, f.supply ? UL().supply[f.supply] : '', f.drive ? UL().drive[f.drive] : ''].filter(Boolean).join(' · '))}</span></span>
      <div class="grid3">${rd}${inp(B('kw'), m.kw, { label: __('Power (display)'), num: true, small: true, unit: 'kW' })}${cone && isNum(f.kc) ? inp(B('dpc'), m.dpc, { label: __('Cone pressure'), nl: 'Conusdruk', num: true, unit: __('Pa') }) : ''}</div>
      <div class="grid3">${cur}</div>${volt}
      <div class="small" data-live="fanm|${s.id}|${f.id}|${phase}">${fanMLive(p, s, f, phase)}</div></div>`;
  }).join('');
}
/** live line under the readings of a fan: current against the nameplate, unbalance, power */
function fanMLive(p, s, f, phase) {
  const c = fanCur(s, phase, f); const v = fanVolt(s, phase, f); const pw = fanPow(s, phase, f); const lim = unbLimit(p); const out = [];
  if (c) {
    out.push(c.three ? __h('I avg. {a} A, max. {m} A', { a: fmt(c.avg, 2), m: fmt(c.max, 1) }) : __h('I {a} A', { a: fmt(c.avg, 1) }));
    if (isNum(c.In)) out.push(c.over ? `<span class="warn-t">${__h('above the rated current {n} A', { n: fmt(c.In, 1) })}</span>` : __h('rated {n} A — OK', { n: fmt(c.In, 1) }));
    if (isNum(c.unb)) out.push(lim == null ? __h('unbalance {u} % (limit not set)', { u: fmt(c.unb, 1) }) : c.unb > lim ? `<span class="warn-t">${__h('unbalance {u} % > {l} %', { u: fmt(c.unb, 1), l: fmt(lim, 1) })}</span>` : __h('unbalance {u} % ≤ {l} %', { u: fmt(c.unb, 1), l: fmt(lim, 1) }));
    else if (c.three && c.n < 3) out.push(`<span class="muted">${__h('enter the three phases for the unbalance')}</span>`);
  }
  if (v && isNum(v.unb)) out.push(__h('voltage unbalance {u} %', { u: fmt(v.unb, 1) }));
  const mm = (s.meas && s.meas[phase]) || {}; const iI = mm.insI && (p.instruments || []).find(i => i.id === mm.insI), iN = mm.insN && (p.instruments || []).find(i => i.id === mm.insN);
  if (c && iI && isNum(iI.imax) && c.max > iI.imax) out.push(`<span class="warn-t">${__h('above the range of {i}: {v} A > {m} A', { i: esc(insLabel(iI)), v: fmt(c.max, 1), m: fmt(iI.imax) })}</span>`);
  const rpm = fanM(s, phase, f).rpm; if (iN && isNum(rpm) && ((isNum(iN.rmin) && rpm < iN.rmin) || (isNum(iN.rmax) && rpm > iN.rmax))) out.push(`<span class="warn-t">${__h('speed outside the range of {i}', { i: esc(insLabel(iN)) })}</span>`);
  if (pw) out.push((pw.est ? '≈ ' : '') + __h('{p} kW', { p: fmt(pw.kw, 2) }) + (pw.est ? ' ' + __h('(U · I · cos φ)') : ''));
  return out.join(' · ');
}

/** balance of a combined system in the unit card: totals of the counted units per side, supply − extract */
function sysBalLive(p, key, phase) {
  const e = entryByKey(p, key); if (!e) return ''; const b = entryBalance(p, e, phase);
  const side = (x, nm) => x.any ? `${nm} ${fmt(x.q)} / ${fmt(x.qd)} ${__h('m³/h')}${isNum(x.q) && isNum(x.qd) ? ` (${fmtDev(devOf(x.q, x.qd))})` : ''}${x.partial ? ' ' + __h('(not all units measured)') : ''}` : '';
  return `<b>${__h('System {c}', { c: esc(entryCode(e)) })}</b>: ${[side(b.T, __h('supply')), side(b.A, __h('extract')), isNum(b.d) ? __h('supply − extract {d} m³/h (design {dd})', { d: fmt(b.d), dd: fmt(b.dd) }) : ''].filter(Boolean).join(' · ')}`;
}
/* ---- systems in the list of the «Points» step ---- */
function sysListHTML(p, pk) {
  const es = sysEntries(p); const many = es.length > 1;
  const unitBtn = (s, sub) => `<button class="pt" ${pk ? 'disabled' : `data-act="editSys" data-id="${s.id}"`} style="border-top:0${sub ? ';padding-left:28px' : ''}">
      <span class="tag D">${esc(s.code || '—')}</span>
      <span style="min-width:0"><span class="code" style="font-family:var(--font-body)">${esc(s.name || __('Unit without a name'))}</span><span class="meta">${esc([UL().type[s.type || 'TA'], s.rec && s.type === 'TA' ? UL().rec[s.rec] : '', sub ? UL().role[roleOf(p, s.id)] : '', s.unit, s.location].filter(Boolean).join(' · ') || __('type and location not given'))}</span></span>
      <span class="val">${unitDirs(s).map(d => `${d} ${fmt(s.design[d])}`).join('<br>')} <small>${__h('m³/h')}</small></span>
    </button>`;
  const mv = (e, i) => many && !pk ? `<div class="sysmv"><button class="btn sm ghost" data-act="sysUp" data-key="${esc(e.key)}" aria-label="${__h('Up')}"${i === 0 ? ' disabled' : ''}>↑</button><button class="btn sm ghost" data-act="sysDown" data-key="${esc(e.key)}" aria-label="${__h('Down')}"${i === es.length - 1 ? ' disabled' : ''}>↓</button></div>` : '';
  return es.map((e, i) => {
    if (!e.g) return `<div class="sysrow">${unitBtn(e.units[0], false)}${mv(e, i)}</div>`;
    const b = entryBalance(p, e, 'eerste');
    return `<div class="sysrow sysgrp"><div style="flex:1;min-width:0"><div class="sysgrp-hd"><span class="tag D">${esc(entryCode(e))}</span> <b>${esc(UL().link[e.g.link])}</b>${e.g.name ? ' · ' + esc(e.g.name) : ''}${e.g.shared ? ` · <span class="small muted">${__h('common network')}</span>` : ''}
        <span class="small muted" style="margin-left:auto">${['T', 'A'].filter(d => (d === 'T' ? b.T : b.A).any).map(d => `${d} ${fmt((d === 'T' ? b.T : b.A).qd)}`).join(' · ')} ${__h('m³/h')}</span></div>
      ${e.units.map(s => unitBtn(s, true)).join('')}</div>${mv(e, i)}</div>`;
  }).join('');
}
/** filter of the steps: one entry per system, the units of a combined system below it */
function sysFilterOpts(p) {
  return sysEntries(p).map(e => `<option value="${esc(e.key)}"${S.f.sys === e.key ? ' selected' : ''}>${esc(entryLabel(e))}</option>` + (e.g ? e.units.map(s => `<option value="${s.id}"${S.f.sys === s.id ? ' selected' : ''}>  · ${esc(s.code)} ${esc(s.name)}</option>`).join('') : '')).join('');
}
/** unit of a point: systems as one entry (a common network once), the units of a combined system as a group */
function unitSelHTML(p, pt, o = {}) {
  const id = o.id || fid(pt.id, 'systemId'); const opt = (v, t, cur) => `<option value="${esc(v)}"${cur ? ' selected' : ''}>${esc(t)}</option>`;
  const body = sysEntries(p).map(e => {
    if (!e.g) { const s = e.units[0]; return opt(s.id, `${s.code} ${s.name}`, pt.systemId === s.id); }
    if (e.g.shared) { const main = e.units.find(u => roleOf(p, u.id) === 'main') || e.units[0]; const on = e.units.some(u => u.id === pt.systemId); return opt(on ? pt.systemId : main.id, `${entryLabel(e)} — ${__('common network')}`, on); }
    return `<optgroup label="${esc(entryLabel(e))}">${e.units.map(s => opt(s.id, `${s.code} ${s.name}`, pt.systemId === s.id)).join('')}</optgroup>`;
  }).join('');
  return `<label class="field" for="${id}">${lbl(__('Unit'), 'Luchtgroep')}<select id="${id}" data-pt="${pt.id}" data-f="systemId" data-rr${o.ro ? ' disabled' : ''}>${body}</select></label>`;
}

/* ---- fan calculator (step «Devices»): per duct network and side; a common network of a system counts as one ---- */
function fanNets(p) {
  const out = [];
  for (const e of sysEntries(p)) {
    if (!e.units.some(s => inKey(p, S.f.sys, s.id))) continue;
    if (e.g && e.g.shared) out.push({ key: e.key, units: e.units, code: entryCode(e) });
    else for (const s of e.units) if (inKey(p, S.f.sys, s.id)) out.push({ key: s.id, units: [s], code: s.code || '?' });
  }
  return out;
}
const netDirs = (net) => ['T', 'A'].filter(d => net.units.some(s => clDirs(s).includes(d)));
function netIndex(p, net, dir) {
  let best = null, br = Infinity; const ids = new Set(net.units.map(s => s.id));
  for (const x of p.points) { if (!ids.has(x.systemId) || x.dir !== dir || x.kind !== 'terminal' || !measurable(x) || x.status) continue; const r = ptRatio(x, p); if (isNum(r) && r > 0 && r < br) { br = r; best = x; } }
  return best;
}
/** factor Qtarget / Qnow of a network side: from the flow index measured now; without it the rough estimate from measurement 1 */
function netFactor(p, net, dir) {
  const st = S.fan[net.key + '|' + dir] || {};
  const pt = st.pid ? byId(p, st.pid) : netIndex(p, net, dir);
  if (pt && isNum(st.q) && st.q > 0) { const qd = designOf(p, pt); if (isNum(qd)) return { src: 'index', pt, q: st.q, qd, factor: qd / st.q }; }
  let qd = 0, q = 0, n = 0;
  for (const s of net.units) { if (!unitHas(s, dir) || (net.units.length > 1 && !countedIn(p, s))) continue; const d = s.design[dir], v = unitQ(p, s, dir, 'eerste') ?? sumTerminals(p, s.id, dir, 'eerste'); if (isNum(d) && isNum(v) && v > 0) { qd += d; q += v; n++; } }
  return n ? { src: 'rough', q, qd, factor: qd / q, pt } : { src: '', pt };
}
function fanCardsHTML(p) {
  return fanNets(p).map(net => {
    const parts = netDirs(net).map(dir => {
      const key = net.key + '|' + dir; const ix0 = netIndex(p, net, dir); const ids = new Set(net.units.map(s => s.id));
      const st = S.fan[key] || (S.fan[key] = { pid: ix0 ? ix0.id : '', q: null });
      const cands = p.points.filter(x => ids.has(x.systemId) && x.dir === dir && isEndFlow(p, x) && measurable(x) && isNum(designOf(p, x)));
      const fans = net.units.flatMap(s => fansOf(s, dir).map(f => ({ s, f })));
      const rows = fans.map(({ s, f }) => {
        const k0 = (fanCtlVal(s, 'eerste', f) || {}).k || fanReads(f)[0]; if (!k0) return `<div class="small muted">${esc((net.units.length > 1 ? s.code + ' ' : '') + fanName(s, f))}: ${__h('fixed speed — adjust the flow with the dampers or the pulleys')}</div>`;
        const now0 = fanM(s, 'eerste', f)[k0]; const v = st['v:' + f.id];
        return `<label class="field" for="${fid('fan', key, f.id)}">${lbl(`${net.units.length > 1 ? s.code + ' ' : ''}${fanName(s, f)} · ${__('now')}`)}<div class="unit"><input id="${fid('fan', key, f.id)}" class="num" inputmode="decimal" data-fan="${esc(key)}|v:${f.id}" value="${esc(fmtIn(v))}" placeholder="${esc(fmtIn(now0))}"><em>${k0 === 'stage' ? __h('step') : esc(k0 === 'q' ? __('m³/h') : k0 === 'pa' ? __('Pa') : READ_U[k0])}</em></div></label>`;
      }).join('');
      return `<div class="stack-s"><span class="label">${dir === 'T' ? __h('Supply fan') : __h('Extract fan')}${fans.length > 1 ? ' · ' + fans.length : ''}</span>
        <div class="grid3">
          <label class="field" for="${fid('fan', key, 'pid')}">${lbl(__('Flow index'))}<select id="${fid('fan', key, 'pid')}" data-fan="${esc(key)}|pid">${cands.map(o => `<option value="${o.id}"${st.pid === o.id ? ' selected' : ''}>${esc(o.code)}${o === ix0 ? ' ★' : ''}</option>`).join('')}</select></label>
          <label class="field" for="${fid('fan', key, 'q')}">${lbl(__('Flow index now'))}<div class="unit"><input id="${fid('fan', key, 'q')}" class="num" inputmode="decimal" data-fan="${esc(key)}|q" value="${esc(fmtIn(st.q))}"><em>${__h('m³/h')}</em></div></label>
          ${rows}
        </div><div class="small" data-live="fan|${esc(key)}">${fanNetLive(p, key)}</div></div>`;
    }).join('');
    if (!parts) return '';
    return `<section class="card"><div class="hd"><h3>${esc(net.code)} · ${__h('fan setting')}</h3></div>${parts}
      <p class="small muted" style="margin:0">${__h('After balancing the branches measure the flow index (★, it stayed open) and enter it with the setting of each fan at that moment. Fan laws: Q ~ n, Δp ~ n², P ~ n³ — frequency, speed and flow setpoint change with Q, a pressure setpoint with Q²; an EC signal (% or V) only about linearly: check with the speed. Then check by the control measurement.')}</p></section>`;
  }).join('');
}
function fanNetLive(p, key) {
  const i = key.lastIndexOf('|'); const nk = key.slice(0, i), dir = key.slice(i + 1);
  const net = fanNets(p).find(n => n.key === nk) || (() => { const e = entryByKey(p, nk); if (e) return { key: nk, units: e.units, code: entryCode(e) }; const s = sysOf(p, nk); return s ? { key: nk, units: [s], code: s.code } : null; })();
  if (!net) return '';
  const fc = netFactor(p, net, dir); const st = S.fan[key] || {};
  if (!isNum(fc.factor)) return `<span class="muted">${__h('Enter the flow of the index measured after balancing and the setting of the fans.')}</span>`;
  const head = fc.src === 'index' ? __h('index {code}: {q} of {qd} m³/h ({r}) → flow × {f}', { code: esc(fc.pt.code || '?'), q: fmt(fc.q), qd: fmt(fc.qd), r: fmtPct(fc.q / fc.qd), f: fmt(fc.factor, 3) })
    : __h('Rough estimate from measurement 1, before the dampers were closed (usually too low): {q} of {qd} m³/h → flow × {f}', { q: fmt(fc.q), qd: fmt(fc.qd), f: fmt(fc.factor, 3) });
  const lines = net.units.flatMap(s => fansOf(s, dir).map(f => {
    const nm = esc((net.units.length > 1 ? s.code + ' ' : '') + fanName(s, f)); const k0 = (fanCtlVal(s, 'eerste', f) || {}).k || fanReads(f)[0]; if (!k0) return '';
    const typed = st['v:' + f.id]; const now = isNum(typed) ? { k: k0, v: typed } : fanCtlVal(s, 'eerste', f);
    if (!now) return `${nm}: <span class="muted">${__h('enter the setting now')}</span>`;
    const r = fanRec(s, f, now, fc.factor, 'eerste'); if (!r) return '';
    let main = r.k === 'stage' ? (r.up > 0 ? __h('one step higher, then check') : r.up < 0 ? __h('one step lower, then check') : __h('keep the step')) : `<b class="mono" style="font-size:16px">≈ ${esc(ctlValUI({ k: r.k, v: r.v }))}</b>`;
    if (r.dm) main += ' · ' + __h('motor pulley Ø {d} mm', { d: fmt(r.dm) });
    const warn = [r.over ? __h('above the maximum {m}', { m: r.k === 'pct' ? '100 %' : r.k === 'volt' ? '10 V' : esc(ctlValUI({ k: r.k, v: r.max })) }) : '', r.kwOver ? __h('power ≈ {p} kW above the rated input {n} kW', { p: fmt(r.kw, 2), n: fmt(r.kwMax, 2) }) : ''].filter(Boolean).join(' · ');
    const info = [r.approx ? __h('about — check with the speed') : '', isNum(r.kw) && !r.kwOver ? __h('power after ≈ {p} kW', { p: fmt(r.kw, 2) }) : ''].filter(Boolean).join(' · ');
    return `${nm}: ${main}${warn ? ` <span class="warn-t">${warn}</span>` : ''}${info ? ` <span class="small muted">${info}</span>` : ''}`;
  })).filter(Boolean);
  return `<div class="small muted">${head}</div>${lines.map(l => `<div>${l}</div>`).join('')}`;
}

/* ---- events ---- */
document.addEventListener('click', (ev) => {
  const t = ev.target.closest('[data-act]'); if (!t) return; const act = t.dataset.act;
  if (!['fanAdd', 'fanEdit', 'fanCopy', 'fanDel', 'fanAll', 'fanBack', 'sysLeave', 'sysUp', 'sysDown', 'sysSort'].includes(act)) return;
  const p = cur(); if (!p || !Access.allow(act)) return;
  if (act === 'sysUp' || act === 'sysDown') { if (sysMove(p, t.dataset.key, act === 'sysUp' ? -1 : 1)) { touch(p); render(); } return; }
  if (act === 'sysSort') { sysSortByCode(p); touch(p); render(); toast(__('Units ordered by code')); return; }
  if (act === 'sysLeave') { sysLeave(p, t.dataset.id); touch(p); renderSheet(); toast(__('The unit is a separate system again')); return; }
  if (act === 'fanBack') { S.dlg = (S.dlg && S.dlg.back) || null; renderSheet(); return; }
  const s = sysOf(p, t.dataset.sid); if (!s) return; s.fans = s.fans || [];
  const back = S.dlg && S.dlg.type === 'fan' ? S.dlg.back : S.dlg;
  if (act === 'fanAdd') { const d = unitDirs(s); const f = FAN0(d.length === 2 && fansOf(s, 'T').length > fansOf(s, 'A').length ? 'A' : d[0]); f.pos = 'M' + (s.fans.length + 1); s.fans.push(f); touch(p); S.dlg = { type: 'fan', sid: s.id, fid: f.id, back }; renderSheet(); return; }
  const i = s.fans.findIndex(f => f.id === t.dataset.fid); if (i < 0) return; const f = s.fans[i];
  if (act === 'fanEdit') { S.dlg = { type: 'fan', sid: s.id, fid: f.id, back }; renderSheet(); return; }
  if (act === 'fanCopy') { const c = fanFix(clone(f)); c.id = 'f' + uid(); c.pos = 'M' + (s.fans.length + 1); s.fans.splice(i + 1, 0, c); touch(p); S.dlg = { type: 'fan', sid: s.id, fid: c.id, back }; renderSheet(); toast(__('Fan copied')); return; }
  if (act === 'fanDel') { s.fans.splice(i, 1); for (const ph of ['eerste', 'controle']) if (s.meas[ph] && s.meas[ph].fan) delete s.meas[ph].fan[f.id]; touch(p); S.dlg = back; renderSheet(); toast(__('Fan deleted')); return; }
  if (act === 'fanAll') {
    const others = fansOf(s, f.dir === 'TA' ? 'T' : f.dir).filter(x => x !== f); for (const x of others) Object.assign(x, { motor: f.motor, supply: f.supply, drive: f.drive, read: f.read.slice(), fmax: f.fmax, np: clone(f.np), kc: f.kc, ctl: Object.assign(CTL0(), { pwr: f.ctl.pwr, mode: f.ctl.mode, baud: f.ctl.baud, par: f.ctl.par, stop: f.ctl.stop, bus: f.ctl.bus, sig0: f.ctl.sig0, sig1: f.ctl.sig1 }) });
    touch(p); renderSheet(); toast(__('Copied to {n} fans', { n: others.length })); return;
  }
});
document.addEventListener('change', (ev) => {
  const el = ev.target; const p = cur(); if (!p) return;
  if (el.dataset.sysjoin !== undefined) {
    if (!el.value) return; { const perm = Access.fieldPerm(el); if (perm && !Access.can(perm)) { toast(Access.why(perm)); return; } }
    const g = sysJoin(p, el.dataset.sysjoin, el.value, 'cascade'); if (g) { touch(p); renderSheet(); toast(__('Combined into system {c}', { c: entryCode(entryOf(p, el.dataset.sysjoin)) })); } return;
  }
  if (el.dataset.fanread !== undefined) {
    const [sid, fId, k] = el.dataset.fanread.split('|'); const s = sysOf(p, sid); const f = s && (s.fans || []).find(x => x.id === fId); if (!f) return;
    { const perm = Access.fieldPerm(el); if (perm && !Access.can(perm)) { toast(Access.why(perm)); el.checked = !el.checked; return; } }
    const set = new Set(fanReads(f)); if (el.checked) set.add(k); else set.delete(k); f.read = READS.filter(x => set.has(x));
    if (String(f.maker || '').trim()) { Settings.v.ecRead = Object.assign({}, Settings.v.ecRead || {}, { [f.maker.trim().toLowerCase()]: f.read.slice() }); Settings.save(); }
    touch(p); renderSheet(); return;
  }
});
/** a unit or a fan changed: keep the fans of the sides, remember the reading per maker, keep systems tidy */
function unitsAfterInput(p, el, target) {
  const f = el.dataset.f || '';
  if (el.dataset.sys && f === 'type') { unitTypeFix(target); for (const pt of p.points) if (pt.systemId === target.id && !unitHas(target, pt.dir) && measurable(pt)) pt.dir = unitDirs(target)[0]; }
  const m = /^fans\.(\d+)\.(maker|drive)$/.exec(f);
  if (el.dataset.sys && m) { const fan = target.fans[+m[1]]; const known = Settings.v.ecRead && Settings.v.ecRead[String(fan.maker || '').trim().toLowerCase()]; if (known && !(fan.read || []).length) fan.read = known.slice(); }
  if (el.dataset.grp && f === 'link') { if (target.link === 'parallel' && !target.shared) target.shared = true; }
  if (el.dataset.pt && f === 'systemId') { const u = sysOf(p, target.systemId); if (u && !unitHas(u, target.dir)) target.dir = unitDirs(u)[0]; }
}

/* ---- report step: scope of the report (whole project, a system, a unit) and one PDF per system ---- */
function scopeCardHTML(p) {
  const es = sysEntries(p); if (es.length < 2 && !(p.groups || []).length) return '';
  const k = repScope(p); const list = scopeList(p);
  return `<section class="card"><div class="hd"><h2>${__h('Scope of the report')}</h2>${k !== 'all' ? `<span class="chip acc">${esc(scopeCode(p, k))}</span>` : ''}</div>
    <label class="field" for="repscope">${lbl(__('Report for'))}<select id="repscope" data-repscope>${list.map(o => `<option value="${esc(o.key)}"${o.key === k ? ' selected' : ''}>${o.sub ? ' · ' : ''}${esc(o.label)}</option>`).join('')}</select></label>
    <p class="small muted" style="margin:0">${__h('PDF, Excel, conclusion, summary and checklist questions follow the choice: only the units, points, dampers, plans and instruments of that part.')}</p>
    ${es.length > 1 ? `<button class="btn" data-act="pdfZip">${ICON.file} ${__h('One PDF per system (.zip)')}</button>` : ''}
  </section>`;
}
document.addEventListener('change', (ev) => {
  const el = ev.target; if (el.dataset.repscope === undefined) return; const p = cur(); if (!p) return;
  S.repScope = { pid: p.id, key: el.value }; S.confirm = null; render();
});
document.addEventListener('click', async (ev) => {
  const t = ev.target.closest('[data-act="pdfZip"]'); if (!t) return; const p = cur(); if (!p || !Access.allow('pdf')) return;
  const old = t.innerHTML; t.disabled = true; const files = []; const es = sysEntries(p);
  try {
    for (let i = 0; i < es.length; i++) {
      t.textContent = __('Building {i} of {n}…', { i: i + 1, n: es.length });
      const pv = scopeView(p, es[i].key); const b = await buildPdf(pv);
      files.push({ name: reportBase(pv) + '.pdf', data: new Uint8Array(await b.arrayBuffer()), store: true });
    }
    const z = await XLSXW.zip(files, 'application/zip'); const ok = await offerFile(reportBase(p, _r('Inregelrapporten')) + '.zip', z, p);
    if (ok) { p.report.generatedAt = Date.now(); touch(p); }
  } catch (err) { console.error(err); toast(/load/i.test(String(err && err.message)) ? __('The PDF module did not load: internet is needed at the first start') : __('Could not build the report')); }
  t.disabled = false; t.innerHTML = old;
});
