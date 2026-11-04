/* Kyoraku Replay — pro workspace, pure logic layer.
   No DOM, no network, no dependencies. Everything here is deterministic and
   unit-testable; js/pro.js is the DOM/UI layer on top of it. */
(function (RL) {
  'use strict';
  const U = RL.util;
  const I = RL.indicators;
  const A = RL.analytics;
  const D = RL.data;
  const STORAGE_KEY = 'kyoraku-replay:pro:v1';

  const CHECKLIST_DEFAULT = [
    { id: 'c1', text: 'proCheckRule1' },
    { id: 'c2', text: 'proCheckRule2' },
    { id: 'c3', text: 'proCheckRule3' },
    { id: 'c4', text: 'proCheckRule4' }
  ];

  function uid(prefix) {
    return String(prefix || 'x') + '-' + Date.now().toString(36) + '-' +
      Math.random().toString(36).slice(2, 7);
  }
  function num(v, fallback, lo, hi) {
    return U.isNum(v) ? U.clamp(v, lo, hi) : fallback;
  }
  function str(v, fallback, max) {
    return typeof v === 'string' ? v.slice(0, max || 200) : fallback;
  }
  function bool(v, fallback) { return typeof v === 'boolean' ? v : fallback; }

  function defaultState() {
    return {
      version: 1,
      accent: 'indigo',
      lang: 'en',
      layout: 'dual',
      thirdTf: '15m',
      customTfs: [],
      indicators: { ema50: false, supertrend: false, macd: true, stoch: true, atr: false, sessions: true },
      drawings: [],
      events: [],
      strategies: [],
      assignments: {},
      checklists: {},
      checklistTemplate: CHECKLIST_DEFAULT.map((x) => ({ id: x.id, text: x.text })),
      screenshots: {},
      pending: [],
      lastTool: 'cursor',
      strategyFilter: 'all',
      eventsOnChart: true
    };
  }

  function sanitize(raw) {
    const d = defaultState();
    if (!raw || typeof raw !== 'object') return d;
    const flags = (raw.indicators && typeof raw.indicators === 'object') ? raw.indicators : {};
    d.accent = ['indigo', 'cyan', 'violet', 'emerald'].includes(raw.accent) ? raw.accent : 'indigo';
    d.lang = raw.lang === 'ar' ? 'ar' : 'en';
    d.layout = ['single', 'dual', 'triple'].includes(raw.layout) ? raw.layout : 'dual';
    d.thirdTf = str(raw.thirdTf, '15m', 8);
    d.customTfs = Array.isArray(raw.customTfs)
      ? raw.customTfs.filter((n) => U.isNum(n) && n >= 1 && n <= 1440).map((n) => Math.round(n)).slice(0, 12) : [];
    d.indicators = {
      ema50: bool(flags.ema50, false), supertrend: bool(flags.supertrend, false),
      macd: bool(flags.macd, true), stoch: bool(flags.stoch, true),
      atr: bool(flags.atr, false), sessions: bool(flags.sessions, true)
    };
    d.drawings = Array.isArray(raw.drawings) ? raw.drawings.slice(0, 200).map((x) => {
      if (!x || !Array.isArray(x.points)) return null;
      const pts = x.points.slice(0, 6)
        .map((p) => ({ t: num(p && p.t, 0, 0, 1e15), p: num(p && p.p, 0, -1e9, 1e9) }))
        .filter((p) => p.t > 0 && p.p > 0);
      if (!pts.length) return null;
      return { id: str(x.id, uid('d'), 40), symbol: str(x.symbol, '', 30), tf: str(x.tf, '5m', 8),
        type: str(x.type, 'hline', 12), points: pts, text: str(x.text, '', 80), color: str(x.color, '#7c6cff', 20) };
    }).filter(Boolean) : [];
    d.events = Array.isArray(raw.events) ? raw.events.slice(0, 500).map((x) => ({
      id: str(x && x.id, uid('e'), 40), t: num(x && x.t, 0, 0, 1e15),
      title: str(x && x.title, 'Event', 80), impact: ['high', 'medium', 'low'].includes(x && x.impact) ? x.impact : 'medium'
    })).filter((x) => x.t > 0) : [];
    d.strategies = Array.isArray(raw.strategies) ? raw.strategies.slice(0, 40).map((x) => ({
      id: str(x && x.id, uid('s'), 40), name: str(x && x.name, 'Strategy', 40)
    })).filter((x) => x.name) : [];
    d.assignments = {};
    if (raw.assignments && typeof raw.assignments === 'object') {
      for (const k of Object.keys(raw.assignments).slice(0, 20000)) {
        d.assignments[str(k, '', 40)] = str(raw.assignments[k], '', 40);
      }
    }
    d.checklists = {};
    if (raw.checklists && typeof raw.checklists === 'object') {
      for (const k of Object.keys(raw.checklists).slice(0, 20000)) {
        const items = Array.isArray(raw.checklists[k]) ? raw.checklists[k] : [];
        d.checklists[str(k, '', 40)] = items.slice(0, 30).map((it) => ({
          id: str(it && it.id, uid('i'), 40), text: str(it && it.text, '', 100), done: bool(it && it.done, false)
        }));
      }
    }
    d.checklistTemplate = Array.isArray(raw.checklistTemplate) && raw.checklistTemplate.length
      ? raw.checklistTemplate.slice(0, 30).map((it) => ({ id: str(it && it.id, uid('t'), 40), text: str(it && it.text, '', 100) }))
      : CHECKLIST_DEFAULT.map((x) => ({ id: x.id, text: x.text }));
    d.screenshots = {};
    if (raw.screenshots && typeof raw.screenshots === 'object') {
      for (const k of Object.keys(raw.screenshots).slice(0, 20)) {
        const v = raw.screenshots[k];
        if (typeof v === 'string' && v.startsWith('data:image/') && v.length < 180000) {
          d.screenshots[str(k, '', 40)] = v;
        }
      }
    }
    d.pending = Array.isArray(raw.pending) ? raw.pending.slice(0, 50)
      .filter((x) => x && U.isNum(x.price) && x.price > 0)
      .map((x) => ({
      id: str(x && x.id, uid('o'), 40), side: x && x.side === 'sell' ? 'sell' : 'buy',
      type: x && x.type === 'stop' ? 'stop' : (x && x.type === 'limit' ? 'limit' : 'market'),
      price: num(x && x.price, 0, 1e-9, 1e9), sl: num(x && x.sl, 0, 1e-9, 1e9),
      tp: num(x && x.tp, 0, 1e-9, 1e9), tags: str(x && x.tags, '', 200), notes: str(x && x.notes, '', 500),
      strategyId: str(x && x.strategyId, '', 40), createdAt: num(x && x.createdAt, 0, 0, 1e15),
      symbol: str(x && x.symbol, '', 30), tf: str(x && x.tf, '5m', 8)
    })).filter((x) => x.price > 0) : [];
    d.lastTool = ['cursor', 'hline', 'trend', 'rect', 'fib', 'text'].includes(raw.lastTool) ? raw.lastTool : 'cursor';
    d.strategyFilter = str(raw.strategyFilter, 'all', 40);
    d.eventsOnChart = bool(raw.eventsOnChart, true);
    return d;
  }

  function load() {
    try {
      if (!globalThis.localStorage) return defaultState();
      const raw = globalThis.localStorage.getItem(STORAGE_KEY);
      return raw ? sanitize(JSON.parse(raw)) : defaultState();
    } catch (err) { return defaultState(); }
  }
  function save(state) {
    try {
      if (!globalThis.localStorage) return { ok: false, error: 'no-storage' };
      globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return { ok: true };
    } catch (err) { return { ok: false, error: String(err && err.message || err) }; }
  }
  function clear() {
    try { if (globalThis.localStorage) globalThis.localStorage.removeItem(STORAGE_KEY); return true; }
    catch (err) { return false; }
  }

  /* ---------------- indicators ---------------- */

  function macd(closes, fast, slow, signal) {
    const f = fast || 12; const s = slow || 26; const g = signal || 9;
    const ef = I.ema(closes, f); const es = I.ema(closes, s);
    const line = closes.map((_, i) => (U.isNum(ef[i]) && U.isNum(es[i]) ? ef[i] - es[i] : null));
    const sig = I.ema(line.map((v) => U.isNum(v) ? v : 0), g);
    const hist = line.map((v, i) => U.isNum(v) && U.isNum(sig[i]) ? v - sig[i] : null);
    return { line, signal: sig, hist };
  }

  function stochastic(bars, kPeriod, dPeriod) {
    const k = kPeriod || 14; const d = dPeriod || 3;
    const kv = new Array(bars.length).fill(null);
    for (let i = k - 1; i < bars.length; i += 1) {
      let hi = -Infinity; let lo = Infinity;
      for (let j = i - k + 1; j <= i; j += 1) { hi = Math.max(hi, bars[j].h); lo = Math.min(lo, bars[j].l); }
      kv[i] = hi - lo < 1e-12 ? 50 : ((bars[i].c - lo) / (hi - lo)) * 100;
    }
    const dv = I.ema(kv.map((v) => U.isNum(v) ? v : 50), d);
    return { k: kv, d: dv };
  }

  /* Classic Supertrend with EMA-based ATR. Returns two gap-separated series so
     the up leg and down leg can be drawn in different colours. */
  function supertrend(bars, period, mult) {
    const p = period || 10; const m = U.isNum(mult) ? mult : 3;
    const atr = I.atr(bars, p);
    const up = new Array(bars.length).fill(null);
    const down = new Array(bars.length).fill(null);
    let prevUpper = Infinity; let prevLower = -Infinity; let prevClose = bars.length ? bars[0].c : 0;
    let dir = 1;
    for (let i = 0; i < bars.length; i += 1) {
      const b = bars[i]; const a = U.isNum(atr[i]) ? atr[i] : 0;
      const mid = (b.h + b.l) / 2;
      let upper = mid + m * a; let lower = mid - m * a;
      if (prevClose > prevUpper || !Number.isFinite(prevUpper)) upper = Math.min(upper, prevUpper);
      if (prevClose < prevLower || !Number.isFinite(prevLower)) lower = Math.max(lower, prevLower);
      // Final band flip rule
      if (prevUpper !== Infinity && b.c > prevUpper) dir = 1;
      else if (prevLower !== -Infinity && b.c < prevLower) dir = -1;
      if (dir === 1) up[i] = lower; else down[i] = upper;
      prevUpper = Number.isFinite(upper) ? upper : prevUpper;
      prevLower = Number.isFinite(lower) ? lower : prevLower;
      prevClose = b.c;
    }
    return { up, down };
  }

  function atrBands(bars, period, mult) {
    const p = period || 14; const m = U.isNum(mult) ? mult : 2;
    const mid = I.ema(bars.map((b) => b.c), 20);
    const atr = I.atr(bars, p);
    const upper = new Array(bars.length).fill(null);
    const lower = new Array(bars.length).fill(null);
    for (let i = 0; i < bars.length; i += 1) {
      if (!U.isNum(mid[i]) || !U.isNum(atr[i])) continue;
      upper[i] = mid[i] + m * atr[i];
      lower[i] = mid[i] - m * atr[i];
    }
    return { mid, upper, lower };
  }

  function overlays(bars, flags) {
    const out = [];
    if (!bars || !bars.length) return out;
    const f = flags || {};
    if (f.ema50) out.push({ id: 'ema50', label: 'EMA 50', color: '#22d3ee', values: I.ema(bars.map((b) => b.c), 50) });
    if (f.supertrend) {
      const st = supertrend(bars, 10, 3);
      out.push({ id: 'st-up', label: 'Supertrend up', color: '#1fd39a', values: st.up });
      out.push({ id: 'st-down', label: 'Supertrend down', color: '#ff5d78', values: st.down });
    }
    if (f.atr) {
      const ab = atrBands(bars);
      out.push({ id: 'atr-up', label: 'ATR upper', color: '#b18cff', values: ab.upper, dashed: true });
      out.push({ id: 'atr-low', label: 'ATR lower', color: '#b18cff', values: ab.lower, dashed: true });
    }
    return out;
  }

  function panes(bars, flags) {
    const out = { macd: null, stoch: null, atr: null };
    if (!bars || !bars.length) return out;
    const f = flags || {};
    if (f.macd) out.macd = macd(bars.map((b) => b.c));
    if (f.stoch) out.stoch = stochastic(bars);
    if (f.atr) {
      const ab = atrBands(bars);
      const last = ab.mid.length - 1;
      out.atr = U.isNum(ab.mid[last]) && U.isNum(I.atr(bars, 14)[last]) ? I.atr(bars, 14)[last] : null;
    }
    return out;
  }

  /* Consecutive UTC-hour blocks for session shading. */
  function sessionSegments(bars) {
    const out = [];
    if (!bars || !bars.length) return out;
    const kindOf = (h) => (h >= 0 && h < 7 ? 'asia' : (h >= 7 && h < 12 ? 'london' : (h >= 12 && h < 21 ? 'ny' : null)));
    let start = 0; let kind = kindOf(new Date(bars[0].t).getUTCHours());
    for (let i = 1; i <= bars.length; i += 1) {
      const k = i < bars.length ? kindOf(new Date(bars[i].t).getUTCHours()) : null;
      if (k !== kind) {
        if (kind) out.push({ start, end: i, kind });
        start = i; kind = k;
      }
    }
    return out;
  }

  /* ---------------- custom timeframes ---------------- */

  function customTfLabel(minutes) {
    const m = Math.round(Number(minutes));
    if (!Number.isFinite(m) || m < 1 || m > 1440) return null;
    return m + 'm';
  }
  function registerCustomTf(minutes) {
    const label = customTfLabel(minutes);
    if (!label) return null;
    const ms = Math.round(Number(minutes)) * 60000;
    D.TF_MS[label] = ms;
    if (!D.TF_LIST.includes(label)) D.TF_LIST.push(label);
    return label;
  }

  /* ---------------- strategy analytics ---------------- */

  function strategyStats(trades, assignments, strategies, language) {
    const groups = new Map();
    const byId = new Map((strategies || []).map((s) => [s.id, s.name]));
    for (const t of trades || []) {
      const sid = (assignments && assignments[t.id]) || '';
      if (!groups.has(sid)) groups.set(sid, []);
      groups.get(sid).push(t);
    }
    const rows = [];
    for (const [sid, list] of groups) {
      const st = A.compute(list, 10000);
      if (!st.total) continue;
      rows.push({
        id: sid || '__none__',
        name: sid ? (byId.get(sid) || (language === 'ar' ? 'محذوفة' : 'Deleted')) : (language === 'ar' ? 'بدون استراتيجية' : 'Unassigned'),
        count: st.total, net: st.net, winRate: st.winRate, avgR: st.avgR,
        profitFactor: st.profitFactor
      });
    }
    return rows.sort((a, b) => b.count - a.count);
  }

  /* ---------------- deterministic insights ---------------- */

  function insights(trades, language) {
    const closed = (trades || []).filter((t) => t && t.status === 'closed' && U.isNum(t.pnl));
    if (closed.length < 5) return { ok: false, reason: 'sample', count: closed.length };
    const ar = language === 'ar';
    const byHour = new Array(24).fill(0);
    const byDay = new Map();
    const tagPnl = new Map();
    let loseStreak = 0; let maxLose = 0; let revenge = 0; let outliers = 0;
    let lastLossExit = null;
    for (const t of closed) {
      const d = new Date(t.entryTime || 0);
      if (Number.isFinite(d.getTime())) byHour[d.getUTCHours()] += t.pnl;
      const day = U.fmtDate(t.entryTime || 0);
      byDay.set(day, (byDay.get(day) || 0) + 1);
      for (const tag of (t.tags || [])) tagPnl.set(tag, (tagPnl.get(tag) || 0) + t.pnl);
      if (t.pnl <= 0) { loseStreak += 1; maxLose = Math.max(maxLose, loseStreak); lastLossExit = t.exitTime || t.entryTime; }
      else loseStreak = 0;
      if (lastLossExit && U.isNum(t.entryTime) && t.entryTime > lastLossExit && t.entryTime - lastLossExit < 15 * 60000) revenge += 1;
      if (U.isNum(t.r) && Math.abs(t.r) > 3) outliers += 1;
    }
    let bestHour = 0; let worstHour = 0;
    for (let h = 1; h < 24; h += 1) {
      if (byHour[h] > byHour[bestHour]) bestHour = h;
      if (byHour[h] < byHour[worstHour]) worstHour = h;
    }
    let maxPerDay = 0;
    for (const n of byDay.values()) maxPerDay = Math.max(maxPerDay, n);
    let bestTag = null; let worstTag = null;
    for (const [tag, pnl] of tagPnl) {
      if (!bestTag || pnl > bestTag.pnl) bestTag = { tag, pnl };
      if (!worstTag || pnl < worstTag.pnl) worstTag = { tag, pnl };
    }
    const cards = [];
    const card = (id, value, tone, detail) => cards.push({ id, value, tone: tone || 'neutral', detail: detail || '' });
    card('proInsSample', closed.length + (ar ? ' صفقة' : ' trades'), 'neutral', ar ? 'كل الرؤى مبنية على هاد العيّنة.' : 'All insights are based on this sample.');
    card('proInsBestHour', String(bestHour).padStart(2, '0') + ':00 UTC', byHour[bestHour] > 0 ? 'good' : 'neutral', U.fmtMoney(byHour[bestHour]));
    card('proInsWorstHour', String(worstHour).padStart(2, '0') + ':00 UTC', byHour[worstHour] < 0 ? 'bad' : 'neutral', U.fmtMoney(byHour[worstHour]));
    card('proInsStreak', String(maxLose), maxLose >= 3 ? 'bad' : 'neutral', ar ? 'خسائر متتالية' : 'consecutive losses');
    card('proInsOvertrade', String(maxPerDay), maxPerDay > 5 ? 'bad' : 'good', ar ? 'أكثر عدد صفقات فنهار' : 'max trades in one day');
    card('proInsRevenge', String(revenge), revenge > 0 ? 'bad' : 'good', ar ? 'دخول فأقل من 15 دقيقة بعد خسارة' : 'entries < 15 min after a loss');
    card('proInsRisk', String(outliers), outliers > 0 ? 'bad' : 'good', '|R| > 3');
    if (bestTag) card('proInsBestTag', bestTag.tag, bestTag.pnl > 0 ? 'good' : 'neutral', U.fmtMoney(bestTag.pnl));
    if (worstTag && (!bestTag || worstTag.tag !== bestTag.tag)) card('proInsWorstTag', worstTag.tag, worstTag.pnl < 0 ? 'bad' : 'neutral', U.fmtMoney(worstTag.pnl));
    if (maxLose === 0) card('proInsNoLoss', '👍', 'good', '');
    return { ok: true, cards };
  }

  /* ---------------- R:R simulator ---------------- */

  function simulateRR(trades, bars, targetR, stopMult) {
    const list = (trades || []).filter((t) => t && t.status === 'closed' && U.isNum(t.entryPrice) &&
      U.isNum(t.initialSL) && t.initialSL > 0 && U.isNum(t.size) && U.isNum(t.contract));
    if (!list.length || !bars || bars.length < 2) return null;
    const R = U.clamp(num(targetR, 2, 0.1, 20), 0.1, 20);
    const M = U.clamp(num(stopMult, 1, 0.2, 5), 0.2, 5);
    let net = 0; let wins = 0; let rSum = 0;
    const sorted = bars.slice().sort((a, b) => a.t - b.t);
    for (const t of list) {
      const dir = t.side === 'buy' ? 1 : -1;
      const riskDist = Math.abs(t.entryPrice - t.initialSL) * M;
      if (!(riskDist > 0)) continue;
      const sl = t.entryPrice - dir * riskDist;
      const tp = t.entryPrice + dir * riskDist * R;
      let exit = null;
      for (const b of sorted) {
        if (b.t <= t.entryTime) continue;
        if (dir > 0) {
          if (b.l <= sl) { exit = sl; break; }
          if (b.h >= tp) { exit = tp; break; }
        } else {
          if (b.h >= sl) { exit = sl; break; }
          if (b.l <= tp) { exit = tp; break; }
        }
        exit = b.c;
      }
      if (exit === null) exit = sorted[sorted.length - 1].c;
      const pnl = (exit - t.entryPrice) * dir * t.size * t.contract - (t.commission || 0);
      net += pnl;
      if (pnl > 0) wins += 1;
      rSum += pnl / Math.max(1e-9, riskDist * t.size * t.contract);
    }
    const original = A.compute(list, 10000);
    const simulated = { net, winRate: list.length ? wins / list.length : 0, avgR: list.length ? rSum / list.length : 0 };
    return {
      count: list.length,
      original: { net: original.net, winRate: original.winRate, avgR: original.avgR },
      simulated,
      delta: net - original.net
    };
  }

  RL.proCore = {
    STORAGE_KEY, CHECKLIST_DEFAULT,
    uid, num, str, bool,
    defaultState, sanitize, load, save, clear,
    macd, stochastic, supertrend, atrBands, overlays, panes, sessionSegments,
    customTfLabel, registerCustomTf,
    strategyStats, insights, simulateRR
  };
})(globalThis.RL = globalThis.RL || {});
