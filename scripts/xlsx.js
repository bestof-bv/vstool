/* Minimal XLSX writer + reader. Writer: styles, formulas with cached values, merges, widths, freeze panes,
   conditional formatting, list validations, PNG/JPEG images, print setup, footer, print titles. Reader: values of all sheets. */
const XLSXW = (() => {
  const CRC = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
    return t;
  })();
  function crc32(u8) { let c = 0xFFFFFFFF; for (let i = 0; i < u8.length; i++) c = CRC[(c ^ u8[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
  const enc = new TextEncoder();
  async function deflateRaw(u8) {
    if (typeof CompressionStream === 'undefined') return null;
    try { return new Uint8Array(await new Response(new Blob([u8]).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer()); } catch (e) { return null; }
  }
  async function zip(files, mime) {
    const parts = []; const central = []; let offset = 0;
    const d = new Date();
    const dosTime = (d.getHours() << 11) | (d.getMinutes() << 5) | (Math.floor(d.getSeconds() / 2));
    const dosDate = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
    for (const f of files) {
      const name = enc.encode(f.name);
      const data = typeof f.data === 'string' ? enc.encode(f.data) : f.data;
      const crc = crc32(data);
      let comp = f.store ? null : await deflateRaw(data); let method = 8;
      if (!comp || comp.length >= data.length) { comp = data; method = 0; }
      const lh = new DataView(new ArrayBuffer(30));
      lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(8, method, true);
      lh.setUint16(10, dosTime, true); lh.setUint16(12, dosDate, true); lh.setUint32(14, crc, true);
      lh.setUint32(18, comp.length, true); lh.setUint32(22, data.length, true); lh.setUint16(26, name.length, true);
      parts.push(new Uint8Array(lh.buffer), name, comp);
      const ch = new DataView(new ArrayBuffer(46));
      ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true); ch.setUint16(10, method, true);
      ch.setUint16(12, dosTime, true); ch.setUint16(14, dosDate, true); ch.setUint32(16, crc, true); ch.setUint32(20, comp.length, true);
      ch.setUint32(24, data.length, true); ch.setUint16(28, name.length, true); ch.setUint32(42, offset, true);
      central.push(new Uint8Array(ch.buffer), name);
      offset += 30 + name.length + comp.length;
    }
    const cdSize = central.reduce((s, x) => s + x.length, 0);
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true);
    end.setUint32(12, cdSize, true); end.setUint32(16, offset, true);
    return new Blob([...parts, ...central, new Uint8Array(end.buffer)], { type: mime || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }

  const x = (s) => String(s ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  function colName(c) { let s = ''; while (c > 0) { const m = (c - 1) % 26; s = String.fromCharCode(65 + m) + s; c = Math.floor((c - 1) / 26); } return s; }
  const ref = (r, c) => colName(c) + r;
  function imgBytes(src) {
    if (src && src.bytes) return { u8: src.bytes, ext: src.ext === 'png' ? 'png' : 'jpeg' };
    const m = /^data:image\/(png|jpe?g);base64,(.*)$/.exec(src || ''); if (!m) return null;
    const bin = atob(m[2]); const u8 = new Uint8Array(bin.length); for (let j = 0; j < bin.length; j++) u8[j] = bin.charCodeAt(j);
    return { u8, ext: m[1] === 'png' ? 'png' : 'jpeg' };
  }

  class Styles {
    constructor() {
      this.fonts = ['<font><sz val="9"/><name val="Arial"/><family val="2"/></font>'];
      this.fills = ['<fill><patternFill patternType="none"/></fill>', '<fill><patternFill patternType="gray125"/></fill>'];
      this.borders = ['<border><left/><right/><top/><bottom/><diagonal/></border>'];
      this.numFmts = []; this.xfs = ['<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'];
      this.cache = new Map(); this.dxfs = []; this.fmtMap = new Map();
    }
    idx(arr, s) { let i = arr.indexOf(s); if (i < 0) { arr.push(s); i = arr.length - 1; } return i; }
    font(f = {}) { return this.idx(this.fonts, `<font>${f.b ? '<b/>' : ''}${f.i ? '<i/>' : ''}<sz val="${f.sz || 9}"/>${f.color ? `<color rgb="FF${f.color}"/>` : ''}<name val="Arial"/><family val="2"/></font>`); }
    fill(hex) { if (!hex) return 0; return this.idx(this.fills, `<fill><patternFill patternType="solid"><fgColor rgb="FF${hex}"/><bgColor indexed="64"/></patternFill></fill>`); }
    border(b) {
      if (!b) return 0;
      const side = (n, on) => { if (!on) return `<${n}/>`; const o = typeof on === 'object' ? on : { style: on === true ? 'thin' : on }; return `<${n} style="${o.style || 'thin'}"><color rgb="FF${o.color || b.color || 'CFCFD8'}"/></${n}>`; };
      const all = b.all;
      return this.idx(this.borders, `<border>${side('left', all || b.left)}${side('right', all || b.right)}${side('top', all || b.top)}${side('bottom', all || b.bottom)}<diagonal/></border>`);
    }
    numFmt(code) {
      if (!code) return 0;
      const builtin = { '0': 1, '0.00': 2, '#,##0': 3, '#,##0.00': 4, '0%': 9, '0.00%': 10, '@': 49 };
      if (builtin[code]) return builtin[code];
      if (!this.fmtMap.has(code)) { const id = 164 + this.fmtMap.size; this.fmtMap.set(code, id); this.numFmts.push(`<numFmt numFmtId="${id}" formatCode="${x(code)}"/>`); }
      return this.fmtMap.get(code);
    }
    get(st = {}) {
      const key = JSON.stringify(st);
      if (this.cache.has(key)) return this.cache.get(key);
      const fontId = this.font(st.font), fillId = this.fill(st.fill), borderId = this.border(st.border), numFmtId = this.numFmt(st.numFmt);
      const a = st.align || {};
      const align = (a.h || a.v || a.wrap || a.indent) ? `<alignment${a.h ? ` horizontal="${a.h}"` : ''}${a.v ? ` vertical="${a.v}"` : ''}${a.wrap ? ' wrapText="1"' : ''}${a.indent ? ` indent="${a.indent}"` : ''}/>` : '';
      const prot = st.unlocked ? '<protection locked="0"/>' : '';
      const inner = align + prot;
      const xf = `<xf numFmtId="${numFmtId}" fontId="${fontId}" fillId="${fillId}" borderId="${borderId}" xfId="0"${numFmtId ? ' applyNumberFormat="1"' : ''}${fontId ? ' applyFont="1"' : ''}${fillId ? ' applyFill="1"' : ''}${borderId ? ' applyBorder="1"' : ''}${align ? ' applyAlignment="1"' : ''}${prot ? ' applyProtection="1"' : ''}${inner ? '>' + inner + '</xf>' : '/>'}`;
      this.xfs.push(xf); const id = this.xfs.length - 1; this.cache.set(key, id); return id;
    }
    dxf(d) { this.dxfs.push(`<dxf><font><b/><color rgb="FF${d.color}"/></font><fill><patternFill patternType="solid"><bgColor rgb="FF${d.fill}"/></patternFill></fill></dxf>`); return this.dxfs.length - 1; }
    xml() {
      return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${this.numFmts.length ? `<numFmts count="${this.numFmts.length}">${this.numFmts.join('')}</numFmts>` : ''}<fonts count="${this.fonts.length}">${this.fonts.join('')}</fonts><fills count="${this.fills.length}">${this.fills.join('')}</fills><borders count="${this.borders.length}">${this.borders.join('')}</borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="${this.xfs.length}">${this.xfs.join('')}</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles><dxfs count="${this.dxfs.length}">${this.dxfs.join('')}</dxfs></styleSheet>`;
    }
  }

  class Sheet {
    constructor(wb, name) {
      this.wb = wb; this.name = String(name).replace(/[:\\/?*\[\]]/g, '-').slice(0, 31); this.rows = new Map(); this.cols = []; this.merges = []; this.freeze = null; this.cf = []; this.images = [];
      this.heights = new Map(); this.landscape = true; this.paper = 9; this.gridlines = false; this.footer = null; this.printTitles = null; this.validations = []; this.maxR = 0; this.maxC = 0; this.tab = null;
      this.hiddenCols = new Set(); this.hiddenRows = new Set(); this.hidden = false; this.protect = false;
    }
    hideCol(c) { this.hiddenCols.add(c); }
    hideRow(r) { this.hiddenRows.add(r); }
    set(r, c, v, st) {
      if (!this.rows.has(r)) this.rows.set(r, new Map());
      this.rows.get(r).set(c, { v, s: st ? this.wb.styles.get(st) : 0 });
      this.maxR = Math.max(this.maxR, r); this.maxC = Math.max(this.maxC, c); return ref(r, c);
    }
    style(r, c, st) { const row = this.rows.get(r); if (row && row.has(c)) row.get(c).s = this.wb.styles.get(st); else this.set(r, c, null, st); }
    fillRange(r, c1, c2, st) { for (let c = c1; c <= c2; c++) this.style(r, c, st); }
    merge(r1, c1, r2, c2) { if (r1 === r2 && c1 === c2) return; this.merges.push(`${ref(r1, c1)}:${ref(r2, c2)}`); }
    width(c, w) { this.cols[c] = w; }
    height(r, h) { this.heights.set(r, h); }
    addCF(range, operator, formula, dxfId) { this.cf.push({ range, operator, formula, dxfId }); }
    addList(sqref, items) { this.validations.push({ sqref, list: items }); }
    image(src, r, c, wPx, hPx, o = {}) { const b = imgBytes(src); if (b) this.images.push({ ...b, r, c, wPx, hPx, dx: o.dx || 0, dy: o.dy || 0 }); }
    cellXml(r, c, cell) {
      const a = `r="${ref(r, c)}"${cell.s ? ` s="${cell.s}"` : ''}`;
      const v = cell.v;
      if (v === null || v === undefined || v === '') return `<c ${a}/>`;
      if (typeof v === 'number') return isFinite(v) ? `<c ${a}><v>${v}</v></c>` : `<c ${a}/>`;
      if (typeof v === 'boolean') return `<c ${a} t="b"><v>${v ? 1 : 0}</v></c>`;
      if (typeof v === 'object' && v.f) {
        const cv = v.v;
        if (typeof cv === 'number' && isFinite(cv)) return `<c ${a}><f>${x(v.f)}</f><v>${cv}</v></c>`;
        if (typeof cv === 'string') return `<c ${a} t="str"><f>${x(v.f)}</f><v>${x(cv)}</v></c>`;
        return `<c ${a}><f>${x(v.f)}</f></c>`;
      }
      return `<c ${a} t="inlineStr"><is><t xml:space="preserve">${x(v)}</t></is></c>`;
    }
    xml(drawingRid) {
      const idx = [...new Set([...this.rows.keys(), ...this.heights.keys(), ...this.hiddenRows])].sort((a, b) => a - b);
      const allRows = idx.map(r => {
        const h = this.heights.get(r); const hh = (h ? ` ht="${h}" customHeight="1"` : '') + (this.hiddenRows.has(r) ? ' hidden="1"' : '');
        if (!this.rows.has(r)) return `<row r="${r}"${hh}/>`;
        const cells = [...this.rows.get(r).entries()].sort((a, b) => a[0] - b[0]).map(([c, cell]) => this.cellXml(r, c, cell)).join('');
        return `<row r="${r}"${hh}>${cells}</row>`;
      }).join('');
      const cols = this.cols.map((w, c) => w || this.hiddenCols.has(c) ? `<col min="${c}" max="${c}" width="${w || 2}" customWidth="1"${this.hiddenCols.has(c) ? ' hidden="1"' : ''}/>` : '').join('');
      const pane = this.freeze ? `<pane ${this.freeze.c > 1 ? `xSplit="${this.freeze.c - 1}" ` : ''}${this.freeze.r > 1 ? `ySplit="${this.freeze.r - 1}" ` : ''}topLeftCell="${ref(this.freeze.r, this.freeze.c)}" activePane="bottomRight" state="frozen"/><selection pane="bottomRight" activeCell="${ref(this.freeze.r, this.freeze.c)}" sqref="${ref(this.freeze.r, this.freeze.c)}"/>` : '';
      const cf = this.cf.map((f, i) => `<conditionalFormatting sqref="${f.range}"><cfRule type="cellIs" dxfId="${f.dxfId}" priority="${i + 1}" operator="${f.operator}"><formula>${x(f.formula)}</formula></cfRule></conditionalFormatting>`).join('');
      const dv = this.validations.length ? `<dataValidations count="${this.validations.length}">${this.validations.map(v => `<dataValidation type="list" allowBlank="1" showInputMessage="1" showErrorMessage="0" sqref="${v.sqref}"><formula1>${x('"' + v.list.join(',') + '"')}</formula1></dataValidation>`).join('')}</dataValidations>` : '';
      const ft = this.footer ? `<headerFooter><oddFooter>${x(this.footer)}</oddFooter></headerFooter>` : '';
      return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheetPr>${this.tab ? `<tabColor rgb="FF${this.tab}"/>` : ''}<pageSetUpPr fitToPage="1"/></sheetPr><dimension ref="A1:${ref(Math.max(1, this.maxR), Math.max(1, this.maxC))}"/><sheetViews><sheetView workbookViewId="0"${this.gridlines ? '' : ' showGridLines="0"'}${this.wb.sheets[0] === this ? ' tabSelected="1"' : ''}>${pane}</sheetView></sheetViews><sheetFormatPr defaultRowHeight="12.75"/>${cols ? `<cols>${cols}</cols>` : ''}<sheetData>${allRows}</sheetData>${this.protect ? '<sheetProtection sheet="1" objects="1" scenarios="1" formatCells="0" formatColumns="0" formatRows="0" insertRows="0"/>' : ''}${this.merges.length ? `<mergeCells count="${this.merges.length}">${this.merges.map(m => `<mergeCell ref="${m}"/>`).join('')}</mergeCells>` : ''}${cf}${dv}<pageMargins left="0.35" right="0.35" top="0.45" bottom="0.55" header="0.25" footer="0.25"/><pageSetup paperSize="${this.paper}" orientation="${this.landscape ? 'landscape' : 'portrait'}" fitToWidth="1" fitToHeight="0"/>${ft}${drawingRid ? `<drawing r:id="${drawingRid}"/>` : ''}</worksheet>`;
    }
  }

  class Workbook {
    constructor() { this.styles = new Styles(); this.sheets = []; }
    sheet(name) { const s = new Sheet(this, name); this.sheets.push(s); return s; }
    async blob() {
      const files = []; const overrides = []; let imgN = 0, drawN = 0; const exts = new Set();
      this.sheets.forEach((s, i) => {
        const n = i + 1; let rid = null;
        if (s.images.length) {
          drawN++; rid = 'rId1';
          const anchors = []; const drels = [];
          s.images.forEach((im, k) => {
            imgN++; exts.add(im.ext);
            files.push({ name: `xl/media/image${imgN}.${im.ext}`, data: im.u8, store: true });
            drels.push(`<Relationship Id="rId${k + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image${imgN}.${im.ext}"/>`);
            const emu = 9525, cx = Math.round(im.wPx * emu), cy = Math.round(im.hPx * emu);
            anchors.push(`<xdr:oneCellAnchor><xdr:from><xdr:col>${im.c - 1}</xdr:col><xdr:colOff>${Math.round(im.dx * emu)}</xdr:colOff><xdr:row>${im.r - 1}</xdr:row><xdr:rowOff>${Math.round(im.dy * emu)}</xdr:rowOff></xdr:from><xdr:ext cx="${cx}" cy="${cy}"/><xdr:pic><xdr:nvPicPr><xdr:cNvPr id="${k + 2}" name="Afbeelding ${k + 1}"/><xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr></xdr:nvPicPr><xdr:blipFill><a:blip r:embed="rId${k + 1}"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill><xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic><xdr:clientData/></xdr:oneCellAnchor>`);
          });
          files.push({ name: `xl/drawings/drawing${drawN}.xml`, data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">${anchors.join('')}</xdr:wsDr>` });
          files.push({ name: `xl/drawings/_rels/drawing${drawN}.xml.rels`, data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${drels.join('')}</Relationships>` });
          files.push({ name: `xl/worksheets/_rels/sheet${n}.xml.rels`, data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing${drawN}.xml"/></Relationships>` });
          overrides.push(`<Override PartName="/xl/drawings/drawing${drawN}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>`);
        }
        files.push({ name: `xl/worksheets/sheet${n}.xml`, data: s.xml(rid) });
        overrides.push(`<Override PartName="/xl/worksheets/sheet${n}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`);
      });
      const sheetsXml = this.sheets.map((s, i) => `<sheet name="${x(s.name)}" sheetId="${i + 1}"${s.hidden ? ' state="hidden"' : ''} r:id="rId${i + 1}"/>`).join('');
      const names = this.sheets.map((s, i) => s.printTitles ? `<definedName name="_xlnm.Print_Titles" localSheetId="${i}">'${x(s.name.replace(/'/g, "''"))}'!$${s.printTitles[0]}:$${s.printTitles[1]}</definedName>` : '').join('');
      files.unshift(
        { name: '[Content_Types].xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Default Extension="jpeg" ContentType="image/jpeg"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>${overrides.join('')}</Types>` },
        { name: '_rels/.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>` },
        { name: 'docProps/core.xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${x(this.title || 'Inregelrapport ventilatie')}</dc:title><dc:creator>${x(this.creator || '')}</dc:creator>${this.app ? `<dc:description>${x(this.app)}</dc:description>` : ''}<dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString().replace(/\.\d+Z$/, 'Z')}</dcterms:created></cp:coreProperties>` },
        { name: 'xl/workbook.xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView/></bookViews><sheets>${sheetsXml}</sheets>${names ? `<definedNames>${names}</definedNames>` : ''}<calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>` },
        { name: 'xl/_rels/workbook.xml.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${this.sheets.map((s, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${this.sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>` },
        { name: 'xl/styles.xml', data: this.styles.xml() }
      );
      return zip(files);
    }
  }
  return { Workbook, colName, ref, zip };
})();

/* ---------- reader ---------- */
const XLSXR = (() => {
  async function unzip(buf) {
    const u8 = new Uint8Array(buf), dv = new DataView(buf instanceof ArrayBuffer ? buf : u8.buffer);
    let eocd = -1;
    for (let i = u8.length - 22; i >= Math.max(0, u8.length - 65557); i--) if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    if (eocd < 0) throw new Error('not a zip');
    const n = dv.getUint16(eocd + 10, true); let off = dv.getUint32(eocd + 16, true);
    const files = {}; const td = new TextDecoder();
    for (let i = 0; i < n; i++) {
      if (dv.getUint32(off, true) !== 0x02014b50) break;
      const method = dv.getUint16(off + 10, true), csize = dv.getUint32(off + 20, true), nlen = dv.getUint16(off + 28, true), xlen = dv.getUint16(off + 30, true), clen = dv.getUint16(off + 32, true), lho = dv.getUint32(off + 42, true);
      const name = td.decode(u8.subarray(off + 46, off + 46 + nlen));
      const start = lho + 30 + dv.getUint16(lho + 26, true) + dv.getUint16(lho + 28, true);
      files[name.replace(/^\//, '')] = { method, data: u8.subarray(start, start + csize) };
      off += 46 + nlen + xlen + clen;
    }
    return {
      names: Object.keys(files),
      async bytes(name) {
        const f = files[name.replace(/^\//, '')]; if (!f) return null;
        let d = f.data;
        if (f.method === 8) {
          if (typeof DecompressionStream === 'undefined') throw new Error('no inflate');
          d = new Uint8Array(await new Response(new Blob([d]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());
        }
        return d;
      },
      async text(name) { const d = await this.bytes(name); return d == null ? null : td.decode(d); },
    };
  }
  const parse = (s) => new DOMParser().parseFromString(s, 'application/xml');
  const all = (node, tag) => [...node.getElementsByTagNameNS('*', tag)];
  function colIdx(r) { const m = /^([A-Z]+)/.exec(r || ''); if (!m) return -1; let c = 0; for (const ch of m[1]) c = c * 26 + (ch.charCodeAt(0) - 64); return c - 1; }
  async function read(buf) {
    const z = await unzip(buf);
    const wbx = parse(await z.text('xl/workbook.xml'));
    const relx = parse((await z.text('xl/_rels/workbook.xml.rels')) || '<r/>');
    const rel = {}; for (const r of all(relx, 'Relationship')) rel[r.getAttribute('Id')] = r.getAttribute('Target');
    const ssx = await z.text('xl/sharedStrings.xml'); const shared = [];
    if (ssx) for (const si of all(parse(ssx), 'si')) shared.push(all(si, 't').filter(t => t.parentNode.localName !== 'rPh').map(t => t.textContent).join(''));
    const out = [];
    for (const sh of all(wbx, 'sheet')) {
      const rid = sh.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id') || sh.getAttribute('r:id');
      let target = rel[rid] || ''; target = target.startsWith('/') ? target.slice(1) : 'xl/' + target.replace(/^\.\//, '');
      const sx = await z.text(target); if (!sx) continue;
      const doc = parse(sx); const rows = [];
      for (const row of all(doc, 'row')) {
        const ri = Number(row.getAttribute('r')) - 1; const arr = [];
        let auto = 0;
        for (const c of all(row, 'c')) {
          const ci = c.getAttribute('r') ? colIdx(c.getAttribute('r')) : auto; auto = ci + 1;
          const t = c.getAttribute('t'); const vEl = all(c, 'v')[0]; const v = vEl ? vEl.textContent : null;
          let val = null;
          if (t === 's') val = v != null ? shared[Number(v)] ?? '' : '';
          else if (t === 'inlineStr') val = all(c, 't').map(e => e.textContent).join('');
          else if (t === 'str') val = v ?? '';
          else if (t === 'b') val = v === '1';
          else if (t === 'e') val = null;
          else if (v != null && v !== '') val = Number(v);
          arr[ci] = val;
        }
        rows[ri >= 0 ? ri : rows.length] = arr;
      }
      out.push({ name: sh.getAttribute('name'), rows: Array.from(rows, r => r || []) });
    }
    return out;
  }
  return { read, unzip };
})();
