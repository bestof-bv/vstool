/* ---------- several documents at once (0.9.29) ----------
   On a new project and on the step «Points»: plans, schemas, tables, photos, texts and DXF drawings in one go, each with
   what it is. Plans and schemas (PDF, image, DXF → PNG) go to «Plans and documents» (the points are placed on them),
   a table of points is imported, a text goes to the notes of the project, photos to the notes, everything else is kept as an
   attachment of the project (p.attach: [{ id, name, key, size, mime, role, at }], file stored on the device by its hash).
   «Add and read with AI» then reads the plans / schemas: project data, the route tree (Mermaid) and the points with their pins. */
const BATCH = {
  ROLES: { plan: 'floor plan', schema: 'aeraulic schema', table: 'table (points / dampers)', text: 'text / notes', photo: 'photo for the notes', attach: 'attachment', skip: 'not used' },
  ext(f) { const m = /\.([a-z0-9]+)$/i.exec(f.name || ''); return m ? m[1].toLowerCase() : ''; },
  kind(f) {
    const e = this.ext(f);
    if (e === 'pdf' || f.type === 'application/pdf') return 'pdf';
    if (['xlsx', 'xlsm', 'xls'].includes(e)) return 'xls';
    if (e === 'csv') return 'csv';
    if (['txt', 'md', 'text'].includes(e) || /^text\/plain/.test(f.type)) return 'txt';
    if (e === 'dxf') return 'dxf';
    if (e === 'dwg') return 'dwg';
    if (/^image\//.test(f.type) || ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif', 'gif'].includes(e)) return 'img';
    return 'other';
  },
  /** what the file probably is, from its type and name */
  guess(f) {
    const k = this.kind(f), n = String(f.name || '');
    if (k === 'dwg') return 'skip';
    if (k === 'xls' || k === 'csv') return /offerte|factuur|invoice/i.test(n) ? 'attach' : 'table';
    if (k === 'txt') return 'text';
    if (k === 'other') return 'attach';
    if (/pid|p&id|sch[eé]ma|aeraul|principe|riser|flow|stroom/i.test(n)) return 'schema';
    if (k === 'img' && /^(img|dsc|pxl|photo|foto)[-_ ]?\d/i.test(n)) return 'photo';
    return 'plan';
  },
  choices(f) {
    const k = this.kind(f);
    if (k === 'pdf' || k === 'dxf') return ['plan', 'schema', 'attach', 'skip'];
    if (k === 'img') return ['plan', 'schema', 'photo', 'skip'];
    if (k === 'xls' || k === 'csv') return ['table', 'attach', 'skip'];
    if (k === 'txt') return ['text', 'attach', 'skip'];
    if (k === 'dwg') return ['skip'];
    return ['attach', 'skip'];
  },
  open(files, mode) {
    const items = [...files].slice(0, 20).map((f, i) => ({ i, file: f, kind: this.kind(f), role: this.guess(f) }));
    if (!items.length) return;
    S.dlg = { type: 'batch', mode, items }; pushNav(); renderSheet();
  },
  html(d) {
    const kb = (n) => n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' kB';
    const ai = typeof AIP !== 'undefined' && Access.can('ai.plan') && !Demo.on();
    const reads = d.items.some(it => it.role === 'plan' || it.role === 'schema');
    return sheetFrame(__('Add documents'), `
      <section class="card"><p class="small" style="margin:0">${__h('Mark what each file is. Plans and schemas go to «Plans and documents» (the points are placed on them), a table of points is imported, texts and photos go to the notes, other files are kept as attachments.')}</p>
        <div class="stack-s">${d.items.map(it => `<div class="row batch-it"><span class="chip">${esc(it.kind === 'other' ? (this.ext(it.file) || '?') : it.kind).toUpperCase()}</span>
          <span class="grow small"><b>${esc(it.file.name)}</b> <span class="muted">${kb(it.file.size)}</span>${it.kind === 'dwg' ? `<br><span class="muted">${__h('DWG cannot be read in the app: export the plan from AutoCAD as PDF or DXF.')}</span>` : it.kind === 'dxf' ? `<br><span class="muted">${__h('DXF is turned into a picture; only the picture is kept.')}</span>` : ''}</span>
          <select data-batchrole="${it.i}"${it.kind === 'dwg' ? ' disabled' : ''}>${this.choices(it.file).map(r => `<option value="${r}"${r === it.role ? ' selected' : ''}>${esc(__(this.ROLES[r]))}</option>`).join('')}</select></div>`).join('')}</div>
        ${ai ? `<p class="small muted" style="margin:0">${__h('With AI: the assistant reads the plans and schemas, fills in the project data, draws the route tree of the ducts and makes the points from it, with their place on the plan. You check every step.')}</p>` : ''}
      </section>`,
      `<button class="btn" data-act="closeSheet">${__h('Cancel')}</button><button class="btn" data-act="batchGo">${__h('Add to the project')}</button>${ai && reads ? `<button class="btn primary" data-act="batchAi">✦ ${__h('Add and read with AI')}</button>` : ''}`);
  },
  async go(withAi) {
    const d = S.dlg; if (!d || d.type !== 'batch') return;
    let p = cur();
    if (d.mode === 'new' || !p) { p = newProject(); if (!p.info.company) p.info.company = Settings.v.company; Store.projects[p.id] = p; S.pid = p.id; }
    const done = { plan: 0, table: 0, text: 0, photo: 0, attach: 0, skip: 0 }; const sources = [], tables = []; const errs = [];
    S.dlg = null; closeSheetNow(); toast(__('Saving the documents…'));
    for (const it of d.items) {
      const f = it.file; const role = it.kind === 'dwg' ? 'skip' : it.role;
      try {
        if (role === 'skip') { done.skip++; continue; }
        if (role === 'plan' || role === 'schema') {
          const file = it.kind === 'dxf' ? await DXF.toPng(f) : f;
          const nm = String(f.name || '').replace(/\.(pdf|png|jpe?g|webp|dxf|heic)$/i, '');
          const r = await Docs.add(p, file, role === 'schema' ? `${__('Schema')} · ${nm}` : nm);
          done.plan++; sources.push({ file, role, doc: r.d.id, name: f.name });
        } else if (role === 'table') {
          if (typeof IMP === 'undefined') throw Object.assign(new Error('no import'), { code: 'noimp' });
          const sheets = await this.readSheets(f); await this.keep(p, f, role); done.table++;
          if (withAi) { tables.push(this.table(sheets, f.name)); continue; } // with AI: the table helps to read the plans (codes, sizes, types), it is not imported on its own
          const n = IMP.apply(p, IMP.parse(sheets, f.name), { withInfo: !p.points.length }); if (!n) errs.push(__('{f}: no points found in the table', { f: f.name }));
        } else if (role === 'text') {
          const t = (await f.text()).trim().slice(0, 20000); const n = p.notes.project || (p.notes.project = { text: '', photos: [] });
          n.text = [n.text, `— ${f.name} —\n${t}`].filter(Boolean).join('\n\n'); done.text++;
          if (withAi) tables.push(this.textRef(t, f.name)); // 0.9.32: with AI the text goes along (makes, types, notes of the designer)
        } else if (role === 'photo') { const ph = await Photos.add(f); photoList(p, 'page:project').push(ph); done.photo++; }
        else { await this.keep(p, f, role); done.attach++; }
      } catch (e) {
        console.error(e);
        errs.push(`${f.name}: ${e && e.code === 'storage' ? __('Device storage is full') : e && e.code === 'heic' ? __('HEIC is not supported — use JPEG or PNG') : e && (e.code === 'dxf_bad' || e.code === 'dxf_empty') ? __('the DXF could not be read') : e && e.code === 'noimp' ? __('import is not available here') : e && e.code === 'xls' ? __('old .xls: save it as .xlsx') : __('Could not read the file')}`);
      }
    }
    touch(p); openProject(p.id, d.mode === 'new' ? 0 : S.step ?? 1);
    toast([__('Plans and schemas: {n}', { n: done.plan }), done.table ? __('tables imported: {n}', { n: done.table }) : '', done.attach ? __('attachments: {n}', { n: done.attach }) : ''].filter(Boolean).join(' · ') + (errs.length ? ' · ' + errs.join(' · ') : ''));
    if (withAi && sources.length && typeof AIP !== 'undefined') AIP.open(sources, 'merge', tables);
  },
  /** a table → the import: .xlsx / .xlsm as usual, .csv here (separator ; , or tab, quotes), old .xls asks for .xlsx */
  /** a table file → sheets [{ name, rows }]: .xlsx / .xlsm as usual, .csv here (separator ; , or tab, quotes), old .xls asks for .xlsx */
  async readSheets(f) {
    if (this.kind(f) === 'csv') {
      const t = (await f.text()).replace(/^﻿/, ''); const first = t.split(/\r?\n/)[0] || '';
      const sep = [';', '\t', ','].sort((a, b) => first.split(b).length - first.split(a).length)[0];
      const rows = []; let row = [], cell = '', q = false;
      for (let i = 0; i < t.length; i++) {
        const ch = t[i];
        if (q) { if (ch === '"' && t[i + 1] === '"') { cell += '"'; i++; } else if (ch === '"') q = false; else cell += ch; continue; }
        if (ch === '"') q = true; else if (ch === sep) { row.push(cell); cell = ''; } else if (ch === '\n' || ch === '\r') { if (ch === '\r' && t[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; } else cell += ch;
      }
      if (cell || row.length) { row.push(cell); rows.push(row); }
      const num = (v) => { const s2 = String(v).trim(); return /^-?\d+([.,]\d+)?$/.test(s2) ? Number(s2.replace(',', '.')) : s2; };
      return [{ name: String(f.name).replace(/\.csv$/i, ''), rows: rows.filter(r => r.some(c => String(c).trim())).map(r => r.map(num)) }];
    }
    try { return await XLSXR.read(await f.arrayBuffer()); } catch (e) { throw Object.assign(new Error('xls'), { code: this.ext(f) === 'xls' ? 'xls' : 'read' }); }
  },
  async readTable(f) { return IMP.parse(await this.readSheets(f), f.name); },
  /** a table for the AI: its text (≤ 400 rows) and the points the import recognises in it (code, room, flow, size, type) */
  table(sheets, name) {
    const L = []; for (const sh of sheets) { L.push(`# ${sh.name}`); for (const r of sh.rows) { const c = r.map(v => String(v ?? '').replace(/\s+/g, ' ').trim()); if (c.some(Boolean)) L.push(c.join(' | ')); if (L.length > 400) break; } if (L.length > 400) break; }
    let pts = []; try { pts = (IMP.parse(sheets, name).points || []).map(q => ({ code: q.code || '', room: q.room || '', dir: q.dir === 'A' ? 'EX' : q.dir === 'T' ? 'PU' : '', q: isNum(q.designQ) ? q.designQ : null, size: q.size || '', model: q.model || '', reg: typeof q.reg === 'string' ? q.reg : '' })); } catch (e) { }
    return { name, text: L.join('\n').slice(0, 60000), pts };
  },
  /** a text (notes, a description of the installation) as a reference for the AI */
  textRef(t, name) { return { name, kind: 'text', text: String(t || '').trim().slice(0, 20000), pts: [] }; },
  /** a file kept as it is (attachment of the project, on the device, stored once by its hash) */
  async keep(p, f, role) {
    if (f.size > 25 * 1048576) throw Object.assign(new Error('big'), { code: 'storage' });
    const buf = await f.arrayBuffer(); const hash = await sha256hex(buf); const key = 'att:' + hash;
    if (!(await Photos.getLocal(key))) { const ok = await Photos.put(key, new Blob([buf], { type: f.type || 'application/octet-stream' })); if (!ok) throw Object.assign(new Error('storage'), { code: 'storage' }); }
    p.attach = p.attach || []; if (p.attach.some(a => a.key === key)) return;
    p.attach.push({ id: 'a' + uid(), name: String(f.name || 'file').slice(0, 120), key, size: f.size, mime: f.type || '', role, at: Date.now() });
  },
  async download(p, id) { const a = (p.attach || []).find(x => x.id === id); if (!a) return; const b = await Photos.getLocal(a.key); if (!b) { toast(__('This file is not on this device')); return; } offerFile(a.name, b, p); },
  async del(p, id) {
    const a = (p.attach || []).find(x => x.id === id); if (!a) return; p.attach = p.attach.filter(x => x !== a);
    const used = Object.values(Store.projects).some(q => (q.attach || []).some(x => x.key === a.key)); if (!used) await Photos.delLocal(a.key);
    touch(p); render();
  },
  /** list of the attachments (and the route trees) of the project, under «Plans and documents» */
  /** 0.9.31: the plans, schemas and tables already in the project → the AI assistant (choose which, plan or schema) */
  aiPick(p) {
    const docs = (p.docs || []).filter(d => d.revs && d.revs.length);
    const tabs = (p.attach || []).filter(a => /\.(xlsx|xlsm|csv)$/i.test(a.name));
    if (!docs.length) { toast(__('Add the plans first')); return; }
    const isSch = (n) => /^sch[eé]ma\s*·|pid|p&id|sch[eé]ma|aeraul|principe|riser/i.test(n) || n.startsWith(__('Schema') + ' ·');
    const tabsAll = tabs.map(a => ({ id: a.id, name: a.name, on: true }));
    const nt = String((p.notes && p.notes.project && p.notes.project.text) || '').trim(); if (nt) tabsAll.push({ id: 'notes', name: __('Notes of the project'), on: true, note: true });
    S.dlg = { type: 'aidocs', docs: docs.map(d => ({ id: d.id, name: d.name, role: isSch(d.name) ? 'schema' : 'plan', on: true })), tabs: tabsAll };
    pushNav(); renderSheet();
  },
  aiPickHtml(d) {
    const sel = (it, i) => `<select data-aidocrole="${i}"><option value="plan"${it.role === 'plan' ? ' selected' : ''}>${esc(__(this.ROLES.plan))}</option><option value="schema"${it.role === 'schema' ? ' selected' : ''}>${esc(__(this.ROLES.schema))}</option></select>`;
    return sheetFrame(__('Read the plans with AI'), `
      <section class="card"><p class="small" style="margin:0">${__h('Choose the plans, schemas and tables of the project the assistant reads together.')}</p>
        <div class="stack-s">${d.docs.map((it, i) => `<label class="row batch-it"><input type="checkbox" data-aidocon="d${i}"${it.on ? ' checked' : ''}><span class="grow small"><b>${esc(it.name)}</b></span>${sel(it, i)}</label>`).join('')}
        ${d.tabs.map((it, i) => `<label class="row batch-it"><input type="checkbox" data-aidocon="t${i}"${it.on ? ' checked' : ''}><span class="chip">${esc(it.note ? __('text') : __('table'))}</span><span class="grow small"><b>${esc(it.name)}</b></span></label>`).join('')}</div>
      </section>`,
      `<button class="btn" data-act="closeSheet">${__h('Cancel')}</button><button class="btn primary" data-act="aiDocsGo"${d.docs.some(x => x.on) ? '' : ' disabled'}>✦ ${__h('Read with AI')}</button>`);
  },
  async aiPickGo() {
    const d = S.dlg; const p = cur(); if (!d || d.type !== 'aidocs' || !p) return;
    const sources = [], tables = [];
    for (const it of d.docs) {
      if (!it.on) continue; const doc = (p.docs || []).find(x => x.id === it.id); if (!doc) continue;
      const r = docCur(doc); const b = await Docs.blob(r.file);
      if (!b) { toast(__('This file is not on this device') + ' · ' + it.name); continue; }
      const ext = r.kind === 'pdf' ? '.pdf' : (/png/.test(b.type) ? '.png' : '.jpg');
      sources.push({ file: new File([b], it.name + ext, { type: b.type || (r.kind === 'pdf' ? 'application/pdf' : 'image/jpeg') }), role: it.role, doc: doc.id, name: it.name });
    }
    for (const it of d.tabs) {
      if (!it.on) continue;
      if (it.note) { tables.push(this.textRef((p.notes.project || {}).text, __('Notes of the project'))); continue; }
      const a = (p.attach || []).find(x => x.id === it.id); if (!a) continue;
      try { const b = await Photos.getLocal(a.key); if (!b) continue; tables.push(this.table(await this.readSheets(new File([b], a.name, { type: a.mime || b.type })), a.name)); }
      catch (e) { toast(__('Could not read the file') + ' · ' + a.name); }
    }
    if (!sources.length) { toast(__('Choose a PDF of the drawings')); return; }
    S.dlg = null; closeSheetNow();
    AIP.open(sources, 'merge', tables);
  },
  listHtml(p) {
    const L = p.attach || []; const T = p.traces || []; if (!L.length && !T.length) return '';
    const kb = (n) => n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' kB';
    return `<div class="stack-s">${T.map((t, i) => `<div class="row small"><span class="chip">MMD</span><span class="grow">${__h('Route tree of the ducts (AI)')} · ${esc(new Date(t.at).toLocaleDateString())}</span>
        <button class="btn sm" data-act="traceShow" data-v="${i}">${__h('Open')}</button></div>`).join('')}
      ${L.map(a => `<div class="row small"><span class="chip">${esc((/\.([a-z0-9]+)$/i.exec(a.name) || [, '?'])[1]).toUpperCase()}</span><span class="grow">${esc(a.name)} <span class="muted">${kb(a.size)}</span></span>
        <button class="btn sm ghost" data-act="attDl" data-v="${a.id}">${__h('Download')}</button><button class="btn sm ghost" data-act="attDel" data-v="${a.id}">${__h('Delete')}</button></div>`).join('')}</div>`;
  },
};

/* ---------- Mermaid diagrams (route tree of the ducts), library loaded on first use ---------- */
const MMD = {
  lib: null, n: 0,
  load() {
    if (this.lib) return this.lib;
    this.lib = new Promise((res, rej) => {
      if (window.mermaid) return res(window.mermaid);
      const sc = document.createElement('script'); sc.src = (typeof LIB !== 'undefined' && LIB.mermaid) || 'vendor/mermaid.min.js';
      sc.onload = () => { try { window.mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: 'neutral', themeVariables: { fontSize: '16px' }, flowchart: { htmlLabels: false, useMaxWidth: false, nodeSpacing: 30, rankSpacing: 50 } }); res(window.mermaid); } catch (e) { rej(e); } };
      sc.onerror = () => { this.lib = null; rej(new Error('mermaid')); }; document.head.appendChild(sc);
    });
    return this.lib;
  },
  async svg(text) { const m = await this.load(); const { svg } = await m.render('mmd' + (++this.n), String(text || '')); return svg; },
  /** every [data-mmd] box: its <pre> text becomes the drawing; on an error (or offline) the text stays */
  async hydrate(root = document) {
    for (const box of root.querySelectorAll('[data-mmd]:not([data-done])')) {
      box.dataset.done = '1'; const pre = box.querySelector('pre'); if (!pre) continue;
      try {
        const svg = await this.svg(pre.textContent); const div = document.createElement('button'); div.type = 'button'; div.className = 'mmd-svg'; div.title = __('Tap to enlarge');
        div.innerHTML = svg + `<span class="mmd-hint">⤢ ${__h('Tap to enlarge')}</span>`; div.addEventListener('click', () => this.zoom(svg)); box.prepend(div); pre.hidden = true;
      }
      catch (e) { console.warn('mermaid', e); box.insertAdjacentHTML('afterbegin', `<p class="small muted">${__h('The drawing could not be made here; the text of the tree is shown.')}</p>`); }
    }
  },
  /** full screen view of a drawing: pinch / wheel to zoom, drag to move, buttons − + and «whole» */
  zoom(svg) {
    const ov = document.createElement('div'); ov.className = 'mmd-zoom'; ov.setAttribute('role', 'dialog');
    ov.innerHTML = `<div class="mmd-zbar"><button type="button" class="btn sm" data-z="out" aria-label="−">−</button><button type="button" class="btn sm" data-z="in" aria-label="+">+</button><button type="button" class="btn sm" data-z="fit">${__h('Whole tree')}</button><span class="spacer"></span><button type="button" class="btn sm primary" data-z="close">${__h('Close')}</button></div><div class="mmd-zstage"><div class="mmd-zin">${svg}</div></div>`;
    document.body.appendChild(ov);
    const st = ov.querySelector('.mmd-zstage'), inner = ov.querySelector('.mmd-zin'), el = inner.querySelector('svg');
    const W = el.viewBox && el.viewBox.baseVal && el.viewBox.baseVal.width || el.getBBox().width, H = el.viewBox && el.viewBox.baseVal && el.viewBox.baseVal.height || el.getBBox().height;
    el.setAttribute('width', W); el.setAttribute('height', H); el.style.maxWidth = 'none';
    let k = 1, x = 0, y = 0; const set = () => { inner.style.transform = `translate(${x}px, ${y}px) scale(${k})`; };
    const fit = () => { const r = st.getBoundingClientRect(); k = Math.min(r.width / W, r.height / H) * 0.95; x = (r.width - W * k) / 2; y = (r.height - H * k) / 2; set(); };
    const zoomAt = (f, cx, cy) => { const nk = Math.max(0.1, Math.min(8, k * f)); x = cx - (cx - x) * nk / k; y = cy - (cy - y) * nk / k; k = nk; set(); };
    const close = () => { ov.remove(); document.removeEventListener('keydown', key); };
    const key = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', key);
    ov.addEventListener('click', (e) => { const z = e.target.closest('[data-z]'); if (!z) return; const r = st.getBoundingClientRect();
      if (z.dataset.z === 'close') close(); else if (z.dataset.z === 'fit') fit(); else zoomAt(z.dataset.z === 'in' ? 1.4 : 1 / 1.4, r.width / 2, r.height / 2); });
    st.addEventListener('wheel', (e) => { e.preventDefault(); const r = st.getBoundingClientRect(); zoomAt(e.deltaY < 0 ? 1.15 : 1 / 1.15, e.clientX - r.left, e.clientY - r.top); }, { passive: false });
    const pts = new Map(); let last = null;
    st.addEventListener('pointerdown', (e) => { st.setPointerCapture(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]); last = null; });
    st.addEventListener('pointermove', (e) => {
      if (!pts.has(e.pointerId)) return; const prev = pts.get(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]);
      if (pts.size === 1) { x += e.clientX - prev[0]; y += e.clientY - prev[1]; set(); return; }
      const [a, b] = [...pts.values()]; const d = Math.hypot(a[0] - b[0], a[1] - b[1]); const r = st.getBoundingClientRect();
      if (last) zoomAt(d / last, (a[0] + b[0]) / 2 - r.left, (a[1] + b[1]) / 2 - r.top); last = d;
    });
    const up = (e) => { pts.delete(e.pointerId); last = null; };
    st.addEventListener('pointerup', up); st.addEventListener('pointercancel', up);
    requestAnimationFrame(fit);
  },
  dlgHtml(d) {
    const p = cur(); const t = p && (p.traces || [])[d.i]; if (!t) return sheetFrame(__('Route tree of the ducts (AI)'), '', `<button class="btn" data-act="closeSheet">${__h('Close')}</button>`);
    setTimeout(() => this.hydrate(), 0);
    return sheetFrame(__('Route tree of the ducts (AI)'), `<section class="card"><div class="hd"><h3>${esc(t.file || '')}</h3><span class="small muted">${esc(new Date(t.at).toLocaleString())}</span></div>
      <div class="mmd-box" data-mmd="trace"><pre class="small mono">${esc(t.mermaid)}</pre></div>
      ${(t.questions || []).length ? `<div class="banner"><b>${__h('Questions of the AI')}</b><ul class="small" style="margin:4px 0;padding-left:18px">${t.questions.map(q => `<li>${esc(q)}</li>`).join('')}</ul></div>` : ''}</section>`,
      `<button class="btn ghost" data-act="traceDel" data-v="${d.i}">${__h('Delete')}</button><button class="btn" data-act="traceDl" data-v="${d.i}">${__h('Download (.mmd)')}</button><button class="btn primary" data-act="closeSheet">${__h('Close')}</button>`);
  },
};
