/* ---------- TSI capture hood / micromanometer over Bluetooth (0.13.0): reading the answers, the session, «Take from the instrument» ----------
   Captured from a real Airflow PH731 (firmware 1.10.0, Dutch menu): every answer is CR LF lines ended by a form feed (0x0C).
   V → «14:52:11    19/11/26» then one quantity per line: label, value («-----» = none), unit, an optional mark of the mode:
     «Druk 8.661 Pa» · «Baro Druk 983 hPa bp» · «Flow (KFactor) 23.83 m3/h» · «LS (matrix) ----- m/s MX» · «Flow (Pitot) ----- m3/h Pt»,
     the hood «Standaard Flow (hoed) … m3/h» (extract negative), a line «Standaard» / «Actual» = the density basis.
   I → «Model: PH731», «Serieel: PH7311409003», «Gekalibreerd: 13/06/17», «REV: 1.10.0».
   The labels follow the language of the instrument: the reader goes by the units and the marks, not by the words.
   «V» must end with CR (without it the instrument collects the letters and answers «VVVVV ERROR»). */
const TSI = {
  UNIT: [
    [/^(hpa|mbar)$/i, 'p', 100], [/^kpa$/i, 'p', 1000], [/^pa$/i, 'p', 1], [/^in ?h2o$/i, 'p', 249.089], [/^mm ?h2o$/i, 'p', 9.80665],
    [/^m\/s$/i, 'v', 1], [/^(fpm|ft\/min)$/i, 'v', 0.00508],
    [/^(m3\/h|m3\/hr|m³\/h)$/i, 'q', 1], [/^l\/s$/i, 'q', 3.6], [/^m3\/s$/i, 'q', 3600], [/^m3\/min$/i, 'q', 60], [/^(cfm|ft3\/min)$/i, 'q', 1.699011],
    [/^[øº°]?c$/i, 't', 1], [/^%\s?rh$/i, 'rh', 1],
  ],
  LINE: /^(.*?)\s+(-?[\d.,]+|-{3,})\s+(hPa|mbar|kPa|Pa|in ?H2O|mm ?H2O|m\/s|fpm|ft\/min|m3\/hr?|m³\/h|l\/s|m3\/s|m3\/min|cfm|ft3\/min|[øº°]?C|[øº°]?F|%\s?rh)(?:\s+(\S+))?\s*$/i,
  num(s) {
    if (/^-{3,}$/.test(s)) return null;
    let t = s; if (t.includes('.') && t.includes(',')) t = t.indexOf(',') < t.indexOf('.') ? t.replace(/,/g, '') : t.replace(/\./g, '').replace(',', '.');
    else if (t.includes(',')) t = /,\d{3}$/.test(t) && !/^-?0,/.test(t) ? t.replace(/,/g, '') : t.replace(',', '.');
    const v = parseFloat(t); return isFinite(v) ? v : null;
  },
  /** one answer of V (or I) → { time, date, items: [{ label, kind, v (SI: Pa, m/s, m³/h, °C), unit, mode, raw }], basis, err } */
  parse(text) {
    const out = { time: '', date: '', items: [], basis: '', err: '', info: {} };
    const lines = String(text || '').replace(/\f/g, '').split(/\r?\n|\r/).map(l => l.replace(/\s+$/, '')).filter(Boolean);
    for (const l of lines) {
      let m;
      if (/\bERROR\b/i.test(l)) { out.err = 'error'; continue; }
      if ((m = /^\s*(\d{1,2}:\d{2}:\d{2})\s+(\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4})\s*$/.exec(l))) { out.time = m[1]; out.date = m[2]; continue; }
      if ((m = /^\s*([^:]{2,30}):\s*(.+)$/.exec(l)) && !this.LINE.test(l)) { // I: «Model: PH731»
        const k = m[1].trim().toLowerCase(), v = m[2].trim();
        if (/^(model|modèle|modell)$/.test(k)) out.info.model = v;
        else if (/^(serieel|serial|série|serie|seriennummer|serial number)/.test(k)) out.info.serial = v;
        else if (/^(gekalibreerd|calibrated|cal|étalonné|kalibriert|calibration)/.test(k)) out.info.cal = v;
        else if (/^(rev|firmware|version)/.test(k)) out.info.rev = v;
        continue;
      }
      if ((m = this.LINE.exec(l))) {
        const label = m[1].trim(), unit = m[3].replace(/^[øº]/, '°'), mark = (m[4] || '').trim();
        const u = this.UNIT.find(x => x[0].test(m[3].replace(/^[øº°](?=[cf]$)/i, '').replace(/^F$/i, 'f')) || x[0].test(m[3]));
        let kind = u ? u[1] : '', f = u ? u[2] : 1;
        if (/^[øº°]?F$/i.test(m[3])) { kind = 't'; f = 0; }
        if (kind === 'p' && /^bp$/i.test(mark)) kind = 'baro';
        const raw = this.num(m[2]);
        const v = raw == null ? null : kind === 't' && f === 0 ? (raw - 32) / 1.8 : raw * f;
        const mode = /^Pt$/i.test(mark) || /pitot/i.test(label) ? 'pitot' : /^MX$/i.test(mark) || /matri/i.test(label) ? 'matrix'
          : /k-?fact/i.test(label) ? 'kfactor' : /(hoed|hood|hotte|haube|kap)/i.test(label) ? 'hood' : '';
        out.items.push({ label, kind, v, unit, mode, raw: l });
        continue;
      }
      if (/^\s*(standaard|standard|actual|werkelijk|actuel|réel|norm|ist)\s*$/i.test(l)) out.basis = l.trim();
    }
    return out;
  },
  /** the calibration date of I («13/06/17») as ISO; day-first unless the instrument writes month-first (seen from the date in V) */
  calISO(s, monthFirst) {
    const m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/.exec(String(s || '').trim()); if (!m) return '';
    let d = +m[1], mo = +m[2]; if (monthFirst || mo > 12) [d, mo] = [mo, d]; if (mo > 12 || d > 31) return '';
    const y = m[3].length === 2 ? 2000 + +m[3] : +m[3];
    return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  },
  /** month-first when the date in V is today written as mm/dd/yy */
  monthFirst(date) {
    const m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/.exec(date || ''); if (!m) return false;
    const n = new Date(); return +m[1] === n.getMonth() + 1 && +m[2] === n.getDate() && +m[1] !== +m[2];
  },
};

/* ---------- the session: one instrument, remembered on this device, polled once a second while a measurement is open ---------- */
const BTI = {
  LS: 'inregelaar.bt.v1',
  P() { return typeof Platform !== 'undefined' && Platform.native() ? Platform.plugin('TsiSpp') : null; },
  on() { return !!this.P(); },
  s: { addr: '', name: '', conn: false, connecting: false, info: null, hist: [], last: null, err: '', miss: 0, timer: null, busy: false, mf: false },
  saved() { try { return JSON.parse(localStorage.getItem(this.LS) || 'null') || {}; } catch (e) { return {}; } },
  save(o) { try { localStorage.setItem(this.LS, JSON.stringify(Object.assign(this.saved(), o))); } catch (e) { } },
  async send(cmd, max) {
    const r = await this.P().send({ text: cmd, eol: '\r', waitMs: 700, maxMs: max || 3000, endByte: 12 });
    return r;
  },
  async connect(addr, name) {
    const s = this.s; if (s.connecting) return; s.connecting = true; s.err = '';
    try {
      const r = await this.P().connect({ address: addr }); s.conn = true; s.addr = addr; s.name = r.name || name || addr; s.miss = 0;
      this.save({ addr, name: s.name });
      const a = await this.send('I'); const i = TSI.parse(a.text).info; s.info = i.model || i.serial ? i : s.info;
    } catch (e) { s.conn = false; s.err = (e && e.message) || String(e); throw e; }
    finally { s.connecting = false; }
  },
  async disconnect() { this.stop(); try { await this.P().disconnect(); } catch (e) { } this.s.conn = false; },
  /** one V; the parsed answer goes to the history (12 last) */
  async read() {
    const s = this.s; if (!s.conn || s.busy) return null; s.busy = true;
    try {
      const r = await this.send('V'); const a = TSI.parse(r.text); a.t = Date.now(); a.text = r.text;
      if (!r.bytes) { s.miss++; return null; }
      if (a.err && !a.items.length) { s.miss++; return null; } // «VVVVV ERROR»: the next poll is clean again
      s.miss = 0; if (a.date && !s.mfSet) { s.mf = TSI.monthFirst(a.date); s.mfSet = true; }
      s.last = a; s.hist.push(a); if (s.hist.length > 12) s.hist.shift(); return a;
    } catch (e) { s.conn = false; s.err = (e && e.message) || String(e); this.stop(); return null; }
    finally { s.busy = false; }
  },
  start(onTick) {
    this.stop(); const s = this.s;
    s.timer = setInterval(async () => { if (!s.conn) return this.stop(); await this.read(); try { onTick && onTick(); } catch (e) { console.error(e); } }, 1000);
  },
  stop() { if (this.s.timer) { clearInterval(this.s.timer); this.s.timer = null; } },
  /** the values of one kind in the last seconds (newest last) */
  series(kind, mode, sec = 10) {
    const t0 = Date.now() - sec * 1000; const out = [];
    for (const a of this.s.hist) { if (a.t < t0) continue; const it = pickItem(a, kind, mode); if (it && it.v != null) out.push({ v: it.v, it, a }); }
    return out;
  },
};
/** the item of an answer for a kind: the instrument shows several (e.g. matrix velocity and flow); prefer the given mode, then any */
function pickItem(a, kind, mode) {
  const its = (a && a.items || []).filter(x => x.kind === kind);
  return (mode && its.find(x => x.mode === mode && x.v != null)) || its.find(x => x.v != null) || its[0] || null;
}
/** what a method takes from the instrument: hood/readout → flow, anemo/traverse → velocity, kfactor/pitot → differential pressure */
const BT_TAKE = { hood: 'q', readout: 'q', anemo: 'v', traverse: 'v', kfactor: 'p', pitot: 'p' };
