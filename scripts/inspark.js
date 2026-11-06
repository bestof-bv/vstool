/* ---------- the company's measuring instruments (instrument park) ----------
   Kept in the settings like the catalogue of technical sheets (Settings.v.instruments): typed in, copied from the data-sheet presets or imported from the Excel template.
   A project takes a copy (ins.park = id in the park), so the project file, crew packages and reports carry the data along; «To the company list» writes a project instrument back. */
const insPark = () => (Settings.v.instruments || []).map(x => Object.assign(INS0(), x));
const insParkById = (id) => id ? insPark().find(x => x.id === id) || null : null;
/** calibration date older than a year (most manufacturers advise a yearly calibration) */
function insCalOld(ins, now = Date.now()) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(ins && ins.cal || '')); if (!m) return false;
  return now - Date.UTC(+m[1], +m[2] - 1, +m[3]) > 365 * 864e5;
}
/** a copy for a project, linked to the park entry */
function insFromPark(e) { const c = Object.assign(INS0(), clone(e), { id: uid(), park: e.id }); delete c.key; return c; }
/** an editable copy (park or project) for another device of the same make: new id, no serial number and calibration yet */
function insCopyOf(e) {
  const c = Object.assign(INS0(), clone(e), { id: uid(), park: '', serial: '', cal: '' }); delete c.key;
  return c;
}
/** write a project instrument into the park: the linked entry, else the one with the same serial number and type, else a new one; returns 'add' | 'upd' */
function insToPark(ins) {
  const list = (Settings.v.instruments || []).slice(); const data = Object.assign(INS0(), clone(ins)); delete data.park; delete data.key;
  const same = (x) => (ins.park && x.id === ins.park) || (ins.serial && x.serial && x.serial.trim().toLowerCase() === ins.serial.trim().toLowerCase() && String(x.type || '').trim().toLowerCase() === String(ins.type || '').trim().toLowerCase());
  const i = list.findIndex(same);
  if (i >= 0) { data.id = list[i].id; list[i] = data; } else { data.id = 'i' + uid(); list.push(data); }
  Settings.v.instruments = list; Settings.save(); ins.park = data.id;
  return i >= 0 ? 'upd' : 'add';
}

/* ---- Excel template: sheet «Meettoestellen» (one row per instrument); grey rows = the data-sheet presets ---- */
const INS_KIND_NL = { hood: 'debietkap', funnel: 'trechter', vane: 'schoepenrad', hotwire: 'hittedraad', dp: 'drukverschil', clamp: 'stroomtang', tacho: 'toerentalmeter', other: 'ander' };
const INS_COLS = [['id', 'ID', 12], ['name', 'Toestel', 16], ['type', 'Merk / type', 26], ['kind', 'Soort (debietkap / trechter / schoepenrad / hittedraad / drukverschil / stroomtang / toerentalmeter / ander)', 16],
  ['serial', 'Serienummer', 14], ['cal', 'Kalibratie (datum)', 12], ['qmin', 'Q van m³/h', 9], ['qmax', 'Q tot m³/h', 9], ['qacc', 'Nauwkeurig vanaf m³/h', 10],
  ['vmin', 'v van m/s', 8], ['vmax', 'v tot m/s', 8], ['pmax', 'p max Pa', 9], ['imax', 'I max A', 8], ['rmin', 'n van min⁻¹', 9], ['rmax', 'n tot min⁻¹', 9], ['acc', 'Nauwkeurigheid (datasheet)', 30], ['src', 'Bron: officiële datasheet (URL)', 40]];
async function insTemplate(entries) {
  const wb = new XLSXW.Workbook(); wb.title = 'Ventilation Setup Tool — meettoestellen'; wb.creator = Settings.v.company || '';
  const H = { font: { b: true, sz: 9, color: 'FFFFFF' }, fill: '262157', align: { v: 'center', wrap: true } };
  const T = { font: { sz: 9 }, align: { v: 'top', wrap: true } }, IN = { font: { sz: 9, color: '0000FF' }, fill: 'FFF8E1', border: { all: true, color: 'CFCFD8' }, align: { v: 'top', wrap: true } };
  const LIB = { font: { sz: 9, color: '777777' }, align: { v: 'top', wrap: true } };
  const ws = wb.sheet('Meettoestellen'); ws.landscape = true;
  ws.set(1, 1, 'Meettoestellen van de firma — één rij per toestel. Bereik en nauwkeurigheid alleen uit de officiële datasheet van de fabrikant. Grijze rijen (ID «lib:…») zijn de ingebouwde datasheets en worden bij het importeren overgeslagen.', { font: { b: true, sz: 10 }, align: { v: 'center', wrap: true } });
  ws.merge(1, 1, 1, INS_COLS.length); ws.height(1, 30);
  INS_COLS.forEach(([, h, w], i) => { ws.set(3, i + 1, h, H); ws.width(i + 1, w); }); ws.height(3, 42); ws.freeze = { r: 4, c: 3 };
  let r = 4;
  const put = (e, st) => { INS_COLS.forEach(([k], i) => { let v = e[k]; if (k === 'kind') v = INS_KIND_NL[e.kind] || ''; ws.set(r, i + 1, v == null ? '' : v, st); }); r++; };
  for (const e of entries) put(e, IN);
  for (let i = 0; i < 15; i++, r++) INS_COLS.forEach((c, j) => ws.set(r, j + 1, '', IN));
  r++;
  for (const x of INS_PRESETS) put(Object.assign(INS0(), x, { id: 'lib:' + x.key, name: (RL.inskind || {})[x.kind] || '' }), LIB);
  const wi = wb.sheet('Instructie'); wi.width(1, 110);
  ['Meettoestellen — invullen', '',
    '1. Eén rij per toestel: toestel (bv. Debietkap), merk / type, soort, serienummer en datum van de laatste kalibratie (JJJJ-MM-DD of DD-MM-JJJJ).',
    '2. Soort: debietkap, trechter, schoepenrad, hittedraad, drukverschil (manometer, ook met pitotbuis), stroomtang, toerentalmeter of ander — bepaalt bij welke meetmethoden het toestel past.',
    '3. Bereik: debietkap en trechter Q van–tot (m³/h); schoepenrad en hittedraad v van–tot (m/s); drukverschil p max (Pa) en v van–tot met de pitotbuis; stroomtang I max (A); toerentalmeter n van–tot (min⁻¹).',
    '4. Nauwkeurigheid en bron: tekst en link van de officiële datasheet van de fabrikant.',
    '5. Een grijze rij gebruiken: kopieer ze naar een lege rij bovenaan, wis de ID en vul serienummer en kalibratie in.',
    '6. Importeren: Instellingen → Meettoestellen van de firma → Excel importeren. Rijen met een bestaande ID of met hetzelfde serienummer en type worden vervangen, nieuwe rijen toegevoegd.'].forEach((t, i) => wi.set(i + 1, 1, t, i ? T : { font: { b: true, sz: 12 } }));
  return wb.blob();
}
/** date in a cell: Excel serial number, DD-MM-YYYY, DD.MM.YYYY or YYYY-MM-DD → YYYY-MM-DD */
function insDate(v) {
  if (typeof v === 'number' && v > 20000 && v < 80000) return new Date(Date.UTC(1899, 11, 30) + Math.round(v) * 864e5).toISOString().slice(0, 10);
  const s = String(v ?? '').trim(); let m = /^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})/.exec(s); if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s); return m ? `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}` : '';
}
/** read the template back: own instruments (preset rows skipped) */
async function insRead(buf) {
  const sheets = await XLSXR.read(buf); const sh = sheets.find(s => /meettoest|instrument/i.test(s.name)) || sheets[0]; if (!sh) throw new Error('format');
  const hr = sh.rows.findIndex(row => (row || []).some(c => /^(toestel|instrument)$/i.test(String(c ?? '').trim())));
  if (hr < 0) throw new Error('format');
  const head = sh.rows[hr].map(c => String(c ?? '').trim().toLowerCase());
  const col = {}; INS_COLS.forEach(([k, h]) => { col[k] = head.findIndex(x => x === h.toLowerCase()); });
  if (col.name < 0) col.name = head.findIndex(x => x === 'instrument');
  if (col.name < 0) throw new Error('format');
  const num = (v) => { if (v == null || v === '') return null; if (typeof v === 'number') return v; const r = parseNumX(String(v), { small: true }); return isNum(r.v) ? r.v : null; };
  const str = (v) => v == null ? '' : String(v).trim();
  const kindOf = (v, name) => { const t = str(v).toLowerCase(); if (INS_KINDS.includes(t)) return t; const k = Object.keys(INS_KIND_NL).find(x => INS_KIND_NL[x] === t); if (k) return k;
    if (/^(ander|other|autre|другое)/.test(t)) return 'other'; return insKindGuess(t) || insKindGuess(name) || ''; };
  const out = [];
  for (let i = hr + 1; i < sh.rows.length; i++) {
    const row = sh.rows[i] || []; const g = (k) => col[k] >= 0 ? row[col[k]] : null;
    const id = str(g('id')); if (id.startsWith('lib:')) continue;
    const name = str(g('name')), type = str(g('type')); if (!name && !type) continue;
    out.push(Object.assign(INS0(), { id: id || 'i' + uid(), name, type, kind: kindOf(g('kind'), name + ' ' + type), serial: str(g('serial')), cal: insDate(g('cal')),
      qmin: num(g('qmin')), qmax: num(g('qmax')), qacc: num(g('qacc')), vmin: num(g('vmin')), vmax: num(g('vmax')), pmax: num(g('pmax')), imax: num(g('imax')), rmin: num(g('rmin')), rmax: num(g('rmax')), acc: str(g('acc')), src: str(g('src')) }));
  }
  return out;
}
/** merge imported rows into the park: same ID, or same serial number and type → replaced; {add, upd} */
function insMerge(rows) {
  const list = (Settings.v.instruments || []).slice(); let add = 0, upd = 0;
  const low = (x) => String(x || '').trim().toLowerCase();
  for (const e of rows) {
    const i = list.findIndex(x => x.id === e.id || (e.serial && low(x.serial) === low(e.serial) && low(x.type) === low(e.type)));
    if (i >= 0) { list[i] = Object.assign(e, { id: list[i].id }); upd++; } else { list.push(e); add++; }
  }
  Settings.v.instruments = list; Settings.save(); return { add, upd };
}
