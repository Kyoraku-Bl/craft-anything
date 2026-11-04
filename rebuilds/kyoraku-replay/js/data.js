/* Kyoraku Replay - market data: deterministic demo series, timeframe aggregation, free CSV import. */
(function (RL) {
  'use strict';
  const U = RL.util;

  const TF_MS = {
    '1m': 60000,
    '5m': 300000,
    '15m': 900000,
    '30m': 1800000,
    '1h': 3600000,
    '4h': 14400000,
    '1d': 86400000
  };
  const TF_LIST = Object.keys(TF_MS);
  const START_TS = Date.UTC(2025, 0, 6, 0, 0, 0); // a Monday, UTC
  const DEFAULT_BARS = 16000; // ~11 trading days of 1-minute bars

  // contract = account-currency PnL for a 1.0 price move at size 1.00.
  // These are simplified educational values, not broker specifications.
  const SYMBOLS = [
    { id: 'EURUSD', label: 'EUR/USD', name: 'Euro / US Dollar', market: 'forex', price: 1.08500, vol: 0.00011, decimals: 5, pip: 0.0001, contract: 100000, seed: 1013 },
    { id: 'GBPJPY', label: 'GBP/JPY', name: 'Pound / Yen', market: 'forex', price: 193.250, vol: 0.018, decimals: 3, pip: 0.01, contract: 1000, seed: 2027 },
    { id: 'XAUUSD', label: 'XAU/USD', name: 'Gold / US Dollar', market: 'metal', price: 2350.50, vol: 0.48, decimals: 2, pip: 0.1, contract: 100, seed: 3041 },
    { id: 'BTCUSD', label: 'BTC/USD', name: 'Bitcoin / US Dollar', market: 'crypto', price: 64250.00, vol: 38, decimals: 2, pip: 1, contract: 1, seed: 4057 },
    { id: 'US30', label: 'US30', name: 'Dow Jones Index', market: 'index', price: 39200.00, vol: 7.5, decimals: 2, pip: 1, contract: 1, seed: 5069 }
  ];

  const baseCache = new Map();
  const tfCache = new Map();

  function symbolById(id) {
    for (const s of SYMBOLS) if (s.id === id) return s;
    return null;
  }

  function sessionVolatility(hour, market) {
    if (market === 'crypto') return 0.85 + 0.35 * Math.sin((hour / 24) * Math.PI * 2);
    if (hour >= 12 && hour < 17) return 1.35; // London / New York overlap
    if (hour >= 7 && hour < 12) return 1.1;   // London
    if (hour >= 0 && hour < 7) return 0.65;   // Asia
    return 0.8;
  }

  /* Deterministic synthetic OHLCV. Same seed always produces the same chart. */
  function generateSeries(symbolId, count) {
    const s = symbolById(symbolId);
    const n = U.clamp(Math.floor(count || DEFAULT_BARS), 100, 200000);
    if (!s) return [];
    const rng = U.mulberry32(U.hashString(symbolId + ':' + s.seed));
    const bars = [];
    let t = START_TS;
    let prev = s.price;
    let guard = 0;
    const limit = n * 4 + 10000;
    while (bars.length < n && guard < limit) {
      guard += 1;
      const d = new Date(t);
      const day = d.getUTCDay();
      if (day === 6 || day === 0) { // no weekend bars, jump to Monday
        t += (day === 6 ? 2 : 1) * 86400000;
        continue;
      }
      const hour = d.getUTCHours();
      const session = sessionVolatility(hour, s.market);
      const i = bars.length;
      const drift = s.vol * (0.18 * Math.sin(i / 620 + s.seed) + 0.1 * Math.sin(i / 1700));
      let shock = 0;
      if (i > 100 && rng() < 0.0016) shock = U.gaussian(rng) * s.vol * 7; // news spike
      const move = drift + U.gaussian(rng) * s.vol * session + shock;
      const o = prev;
      const c = Math.max(s.price * 0.15, o + move);
      const wick = Math.abs(U.gaussian(rng)) * s.vol * session * 0.85 + s.vol * 0.08;
      const h = Math.max(o, c) + wick * (0.35 + rng() * 0.65);
      const l = Math.min(o, c) - wick * (0.35 + rng() * 0.65);
      const v = Math.round(60 + rng() * 260 + (Math.abs(move) / s.vol) * 90);
      bars.push({
        t,
        o: U.round(o, s.decimals + 1),
        h: U.round(h, s.decimals + 1),
        l: U.round(Math.max(l, 0.00001), s.decimals + 1),
        c: U.round(c, s.decimals + 1),
        v
      });
      prev = c;
      t += 60000;
    }
    return bars;
  }

  function getBaseBars(symbolId) {
    if (!baseCache.has(symbolId)) baseCache.set(symbolId, generateSeries(symbolId, DEFAULT_BARS));
    return baseCache.get(symbolId);
  }

  function aggregate(bars, tfMs) {
    if (!Array.isArray(bars) || !U.isNum(tfMs) || tfMs < 60000) return [];
    if (tfMs === 60000) return bars;
    const out = [];
    let bucket = -1;
    let cur = null;
    for (const b of bars) {
      if (!b || !U.isNum(b.t)) continue;
      const k = Math.floor(b.t / tfMs) * tfMs;
      if (k !== bucket) {
        if (cur) out.push(cur);
        cur = { t: k, o: b.o, h: b.h, l: b.l, c: b.c, v: b.v || 0 };
        bucket = k;
      } else if (cur) {
        if (b.h > cur.h) cur.h = b.h;
        if (b.l < cur.l) cur.l = b.l;
        cur.c = b.c;
        cur.v += b.v || 0;
      }
    }
    if (cur) out.push(cur);
    return out;
  }

  function getBars(symbolId, tf) {
    const sym = symbolById(symbolId);
    const useTf = effectiveTf(sym, tf);
    const ms = TF_MS[useTf] || TF_MS['5m'];
    const key = symbolId + '|' + useTf;
    if (!tfCache.has(key)) tfCache.set(key, aggregate(getBaseBars(symbolId), ms));
    return tfCache.get(key);
  }

  /* ---- free CSV import ---------------------------------------------------- */

  function detectDelimiter(line) {
    const candidates = [',', ';', '\t', '|'];
    let best = ',';
    let bestCount = 0;
    for (const d of candidates) {
      let count = 0;
      for (const ch of line) if (ch === d) count += 1;
      if (count > bestCount) { bestCount = count; best = d; }
    }
    return best;
  }

  function splitLine(line, delim) {
    const out = [];
    let cur = '';
    let quoted = false;
    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i];
      if (ch === '"') {
        if (quoted && line[i + 1] === '"') { cur += '"'; i += 1; }
        else quoted = !quoted;
      } else if (ch === delim && !quoted) {
        out.push(cur.trim()); cur = '';
      } else cur += ch;
    }
    out.push(cur.trim());
    return out;
  }

  function parseTime(raw) {
    if (raw == null) return null;
    const s = String(raw).trim().replace(/^\uFEFF/, '');
    if (!s) return null;
    if (/^\d{9,13}$/.test(s)) {
      const n = Number(s);
      return n < 1e11 ? n * 1000 : n;
    }
    let v = s.replace(/\./g, '-').replace(/\//g, '-');
    let m = v.match(/^(\d{4})(\d{2})(\d{2})(?:[\sT]*(\d{2}):?(\d{2})?)?/);
    if (m) {
      const t = Date.UTC(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0), 0);
      return Number.isFinite(t) ? t : null;
    }
    m = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[\sT]+(\d{1,2}):?(\d{2})?(?::?(\d{2}))?)?/);
    if (m) {
      const t = Date.UTC(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0));
      return Number.isFinite(t) ? t : null;
    }
    const parsed = Date.parse(v);
    return Number.isFinite(parsed) ? parsed : null;
  }

  const HEADERS = {
    t: ['time', 'timestamp', 'date', 'datetime', 'datetime_utc', 'open_time', 'ts', 'الوقت', 'التاريخ'],
    o: ['o', 'open', 'الافتتاح'],
    h: ['h', 'high', 'اعلى', 'الأعلى'],
    l: ['l', 'low', 'ادنى', 'الأدنى'],
    c: ['c', 'close', 'الاغلاق', 'الإغلاق'],
    v: ['v', 'vol', 'volume', 'الحجم']
  };

  /* Accepts: header-based OHLCV, or positional time,o,h,l,c[,v] / o,h,l,c,v.
     Returns { bars, columns, rows }. Throws a plain Error with a readable message. */
  function parseCsv(text, options) {
    const opts = options || {};
    if (typeof text !== 'string' || !text.trim()) throw new Error('CSV file is empty');
    const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) throw new Error('CSV needs at least 2 rows');
    const delim = detectDelimiter(lines[0]);
    const head = splitLine(lines[0], delim).map((x) => x.toLowerCase().replace(/[^a-z0-9\u0600-\u06ff]/g, ''));
    let col = { t: -1, o: -1, h: -1, l: -1, c: -1, v: -1 };
    const normalize = (x) => String(x).toLowerCase().replace(/[^a-z0-9\u0600-\u06ff]/g, '');
    let hasHeader = false;
    for (const key of Object.keys(HEADERS)) {
      const aliases = HEADERS[key].map(normalize);
      const idx = head.findIndex((h) => aliases.indexOf(h) >= 0);
      if (idx >= 0) col[key] = idx;
    }
    if (col.o >= 0 && col.h >= 0 && col.l >= 0 && col.c >= 0) hasHeader = true;
    if (!hasHeader) {
      const first = splitLine(lines[0], delim);
      if (parseTime(first[0]) !== null && first.length >= 5) col = { t: 0, o: 1, h: 2, l: 3, c: 4, v: 5 };
      else col = { t: -1, o: 0, h: 1, l: 2, c: 3, v: 4 };
    }
    if (col.o < 0 || col.h < 0 || col.l < 0 || col.c < 0) throw new Error('Missing OHLC columns');
    const bars = [];
    const start = hasHeader ? 1 : 0;
    const interval = U.isNum(opts.intervalMs) ? opts.intervalMs : 60000;
    let syntheticTime = START_TS;
    let skipped = 0;
    for (let i = start; i < lines.length && bars.length < 200000; i += 1) {
      const cells = splitLine(lines[i], delim);
      const num = (k) => {
        if (k < 0 || k >= cells.length) return NaN;
        const raw = cells[k].replace(/[,\s]/g, '');
        return Number(raw);
      };
      const o = num(col.o), h = num(col.h), l = num(col.l), c = num(col.c);
      let vol = num(col.v);
      if (!Number.isFinite(vol) || vol < 0) vol = 0;
      let t = col.t >= 0 ? parseTime(cells[col.t]) : null;
      if (t === null) { t = syntheticTime; syntheticTime += interval; }
      else syntheticTime = t + interval;
      if (![o, h, l, c].every((x) => Number.isFinite(x) && x > 0) || !Number.isFinite(t)) { skipped += 1; continue; }
      const hi = Math.max(o, c, h);
      const lo = Math.min(o, c, l);
      bars.push({ t, o, h: hi, l: lo, c, v: vol });
    }
    if (bars.length < 3) throw new Error('Fewer than 3 valid rows');
    bars.sort((a, b) => a.t - b.t);
    const unique = [];
    for (const b of bars) {
      if (unique.length && b.t === unique[unique.length - 1].t) unique[unique.length - 1] = b;
      else unique.push(b);
    }
    return { bars: unique, columns: col, rows: lines.length - start, skipped };
  }

  function makeCustomSymbol(fields) {
    const f = fields || {};
    return {
      id: String(f.id || 'CUSTOM'),
      label: String(f.label || f.id || 'CUSTOM').slice(0, 24),
      name: String(f.name || f.id || 'Custom'),
      market: String(f.market || 'custom'),
      price: 1,
      vol: 0.001,
      decimals: U.clamp(Math.round(U.isNum(f.decimals) ? f.decimals : 2), 0, 8),
      pip: U.clamp(Number(f.pip) || 0.0001, 1e-8, 100000),
      contract: U.clamp(Number(f.contract) || 1, 0.000001, 1e9),
      baseTf: TF_MS[f.baseTf] ? f.baseTf : (TF_MS[f.tf] ? f.tf : '1m'),
      source: String(f.source || 'CSV'),
      license: String(f.license || 'user'),
      bundled: f.bundled === true,
      real: f.real === true || f.bundled === true || f.source === 'Yahoo Finance (live)' || String(f.license || '') === 'runtime',
      repo: String(f.repo || ''),
      seed: 1,
      custom: true
    };
  }

  /* A dataset whose base resolution is 15m cannot honestly produce 1m bars.
     Snap any smaller requested timeframe up to the base resolution. */
  function effectiveTf(symbol, tf) {
    const requested = TF_MS[tf] ? tf : '5m';
    const base = symbol && TF_MS[symbol.baseTf] ? symbol.baseTf : '1m';
    return TF_MS[requested] < TF_MS[base] ? base : requested;
  }

  function allowedTimeframes(symbol) {
    const base = symbol && TF_MS[symbol.baseTf] ? symbol.baseTf : '1m';
    return TF_LIST.filter((tf) => TF_MS[tf] >= TF_MS[base]);
  }

  function registerCustom(symbol, bars) {
    if (!symbol || !Array.isArray(bars) || !bars.length) return;
    baseCache.set(symbol.id, bars);
    tfCache.delete(symbol.id + '|1m');
    for (const tf of TF_LIST) tfCache.delete(symbol.id + '|' + tf);
    let replaced = false;
    for (let i = 0; i < SYMBOLS.length; i += 1) {
      if (SYMBOLS[i].id === symbol.id) { SYMBOLS[i] = symbol; replaced = true; break; }
    }
    if (!replaced) SYMBOLS.push(symbol);
  }

  function customSymbols() { return SYMBOLS.filter((s) => s.custom); }

  RL.data = {
    TF_MS, TF_LIST, START_TS, SYMBOLS, DEFAULT_BARS,
    symbolById, generateSeries, getBaseBars, aggregate, getBars,
    effectiveTf, allowedTimeframes,
    parseCsv, parseTime, makeCustomSymbol, registerCustom, customSymbols
  };
})(globalThis.RL = globalThis.RL || {});
