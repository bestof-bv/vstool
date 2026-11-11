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
    const done = { plan: 0, table: 0, text: 0, photo: 0, attach: 0, skip: 0 }; const sources = []; const errs = [];
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
          const x = await this.readTable(f); const n = IMP.apply(p, x, { withInfo: !p.points.length });
          done.table++; await this.keep(p, f, role); if (!n) errs.push(__('{f}: no points found in the table', { f: f.name }));
        } else if (role === 'text') {
          const t = (await f.text()).trim().slice(0, 20000); const n = p.notes.project || (p.notes.project = { text: '', photos: [] });
          n.text = [n.text, `— ${f.name} —\n${t}`].filter(Boolean).join('\n\n'); done.text++;
        } else if (role === 'photo') { const ph = await Photos.add(f); photoList(p, 'page:project').push(ph); done.photo++; }
        else { await this.keep(p, f, role); done.attach++; }
      } catch (e) {
        console.error(e);
        errs.push(`${f.name}: ${e && e.code === 'storage' ? __('Device storage is full') : e && e.code === 'heic' ? __('HEIC is not supported — use JPEG or PNG') : e && (e.code === 'dxf_bad' || e.code === 'dxf_empty') ? __('the DXF could not be read') : e && e.code === 'noimp' ? __('import is not available here') : e && e.code === 'xls' ? __('old .xls: save it as .xlsx') : __('Could not read the file')}`);
      }
    }
    touch(p); openProject(p.id, d.mode === 'new' ? 0 : S.step ?? 1);
    toast([__('Plans and schemas: {n}', { n: done.plan }), done.table ? __('tables imported: {n}', { n: done.table }) : '', done.attach ? __('attachments: {n}', { n: done.attach }) : ''].filter(Boolean).join(' · ') + (errs.length ? ' · ' + errs.join(' · ') : ''));
    if (withAi && sources.length && typeof AIP !== 'undefined') AIP.open(sources, 'merge');
  },
  /** a table → the import: .xlsx / .xlsm as usual, .csv here (separator ; , or tab, quotes), old .xls asks for .xlsx */
  async readTable(f) {
    if (this.kind(f) === 'csv') {
      const t = (await f.text()).replace(/^\uFEFF/, ''); const first = t.split(/\r?\n/)[0] || '';
      const sep = [';', '\t', ','].sort((a, b) => first.split(b).length - first.split(a).length)[0];
      const rows = []; let row = [], cell = '', q = false;
      for (let i = 0; i < t.length; i++) {
        const ch = t[i];
        if (q) { if (ch === '"' && t[i + 1] === '"') { cell += '"'; i++; } else if (ch === '"') q = false; else cell += ch; continue; }
        if (ch === '"') q = true; else if (ch === sep) { row.push(cell); cell = ''; } else if (ch === '\n' || ch === '\r') { if (ch === '\r' && t[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; } else cell += ch;
      }
      if (cell || row.length) { row.push(cell); rows.push(row); }
      const num = (v) => { const s2 = String(v).trim(); return /^-?\d+([.,]\d+)?$/.test(s2) ? Number(s2.replace(',', '.')) : s2; };
      return IMP.parse([{ name: String(f.name).replace(/\.csv$/i, ''), rows: rows.filter(r => r.some(c => String(c).trim())).map(r => r.map(num)) }], f.name);
    }
    try { return await IMP.readFile(f); } catch (e) { throw Object.assign(new Error('xls'), { code: this.ext(f) === 'xls' ? 'xls' : 'read' }); }
  },
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
      sc.onload = () => { try { window.mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: 'neutral', flowchart: { htmlLabels: false, useMaxWidth: true } }); res(window.mermaid); } catch (e) { rej(e); } };
      sc.onerror = () => { this.lib = null; rej(new Error('mermaid')); }; document.head.appendChild(sc);
    });
    return this.lib;
  },
  async svg(text) { const m = await this.load(); const { svg } = await m.render('mmd' + (++this.n), String(text || '')); return svg; },
  /** every [data-mmd] box: its <pre> text becomes the drawing; on an error (or offline) the text stays */
  async hydrate(root = document) {
    for (const box of root.querySelectorAll('[data-mmd]:not([data-done])')) {
      box.dataset.done = '1'; const pre = box.querySelector('pre'); if (!pre) continue;
      try { const svg = await this.svg(pre.textContent); const div = document.createElement('div'); div.className = 'mmd-svg'; div.innerHTML = svg; box.prepend(div); pre.hidden = true; }
      catch (e) { console.warn('mermaid', e); box.insertAdjacentHTML('afterbegin', `<p class="small muted">${__h('The drawing could not be made here; the text of the tree is shown.')}</p>`); }
    }
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
