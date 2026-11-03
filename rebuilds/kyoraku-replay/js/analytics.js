/* Kyoraku Replay - performance statistics and Monte Carlo resampling. Pure functions. */
(function (RL) {
  'use strict';
  const U = RL.util;

  function closedTrades(trades) {
    return (Array.isArray(trades) ? trades : [])
      .filter((t) => t && t.status === 'closed' && U.isNum(t.pnl))
      .slice()
      .sort((a, b) => (a.exitTime || 0) - (b.exitTime || 0));
  }

  function equityCurve(trades, initialBalance) {
    const start = U.isNum(initialBalance) ? initialBalance : 10000;
    const curve = [{ t: 0, eq: start }];
    let eq = start;
    for (const tr of closedTrades(trades)) {
      eq += tr.pnl;
      curve.push({ t: tr.exitTime || 0, eq });
    }
    return curve;
  }

  function maxDrawdown(curve) {
    let peak = -Infinity;
    let amount = 0;
    let pct = 0;
    for (const p of curve) {
      if (!U.isNum(p.eq)) continue;
      if (p.eq > peak) peak = p.eq;
      const d = peak - p.eq;
      if (d > amount) { amount = d; pct = peak > 0 ? d / peak : 0; }
    }
    return { amount, pct };
  }

  function compute(trades, initialBalance) {
    const start = U.isNum(initialBalance) ? initialBalance : 10000;
    const closed = closedTrades(trades);
    const curve = equityCurve(closed, start);
    const wins = closed.filter((t) => t.pnl > 0);
    const losses = closed.filter((t) => t.pnl <= 0);
    const grossProfit = wins.reduce((a, t) => a + t.pnl, 0);
    const grossLoss = Math.abs(losses.reduce((a, t) => a + t.pnl, 0));
    const net = grossProfit - grossLoss;
    const rs = closed.map((t) => (U.isNum(t.r) ? t.r : 0));
    const avgR = rs.length ? rs.reduce((a, b) => a + b, 0) / rs.length : 0;
    const byHour = new Array(24).fill(0);
    const byWeekday = new Array(7).fill(0);
    const byDay = {};
    let holdSum = 0;
    let streak = 0;
    let maxLoseStreak = 0;
    let best = null;
    let worst = null;
    for (const t of closed) {
      const d = new Date(t.entryTime || 0);
      if (Number.isFinite(d.getTime())) {
        byHour[d.getUTCHours()] += t.pnl;
        byWeekday[d.getUTCDay()] += t.pnl;
      }
      const key = U.fmtDate(t.exitTime || t.entryTime || 0);
      byDay[key] = (byDay[key] || 0) + t.pnl;
      if (U.isNum(t.entryTime) && U.isNum(t.exitTime)) holdSum += Math.max(0, t.exitTime - t.entryTime);
      if (t.pnl <= 0) { streak += 1; maxLoseStreak = Math.max(maxLoseStreak, streak); } else streak = 0;
      if (!best || t.pnl > best.pnl) best = t;
      if (!worst || t.pnl < worst.pnl) worst = t;
    }
    const dd = maxDrawdown(curve);
    return {
      total: closed.length,
      wins: wins.length,
      losses: losses.length,
      winRate: closed.length ? wins.length / closed.length : 0,
      net,
      grossProfit,
      grossLoss,
      profitFactor: grossLoss > 0 ? grossProfit / grossLoss : (grossProfit > 0 ? Infinity : 0),
      avgWin: wins.length ? grossProfit / wins.length : 0,
      avgLoss: losses.length ? grossLoss / losses.length : 0,
      expectancy: closed.length ? net / closed.length : 0,
      avgR,
      expectancyR: avgR * (closed.length ? 1 : 0),
      best: best ? best.pnl : 0,
      worst: worst ? worst.pnl : 0,
      finalEquity: start + net,
      maxDD: dd.amount,
      maxDDPct: dd.pct,
      avgHoldMs: closed.length ? holdSum / closed.length : 0,
      maxLoseStreak,
      curve,
      rs,
      byHour,
      byWeekday,
      byDay,
      longs: closed.filter((t) => t.side === 'buy').length,
      shorts: closed.filter((t) => t.side === 'sell').length
    };
  }

  /* Resample realized PnL values to project possible futures. No assumptions about
     the market: it only shuffles what this trader actually did. */
  function monteCarlo(trades, options) {
    const opts = options || {};
    const pnls = closedTrades(trades).map((t) => t.pnl);
    const start = U.isNum(opts.initialBalance) ? opts.initialBalance : 10000;
    const n = U.clamp(Math.round(opts.trades || 100), 1, 5000);
    const runs = U.clamp(Math.round(opts.runs || 1000), 10, 5000);
    const ddLimit = U.clamp(Number(opts.ddLimitPct || 10) / 100, 0.01, 1);
    if (pnls.length < 5) return { ok: false, reason: 'need5', sample: pnls.length };
    const rng = U.mulberry32(U.hashString('mc|' + pnls.length + '|' + n + '|' + runs + '|' + Math.round(pnls[0] * 100)));
    const finals = [];
    const maxDDs = [];
    let ruined = 0;
    let profitable = 0;
    for (let r = 0; r < runs; r += 1) {
      let eq = start;
      let peak = start;
      let worstDD = 0;
      let bust = false;
      for (let i = 0; i < n; i += 1) {
        eq += pnls[Math.floor(rng() * pnls.length)];
        if (eq > peak) peak = eq;
        const dd = peak > 0 ? (peak - eq) / peak : 1;
        if (dd > worstDD) worstDD = dd;
        if (eq <= 0 || dd >= ddLimit) bust = true;
      }
      finals.push(eq);
      maxDDs.push(worstDD);
      if (bust) ruined += 1;
      if (eq > start) profitable += 1;
    }
    finals.sort((a, b) => a - b);
    maxDDs.sort((a, b) => a - b);
    const pct = (arr, p) => arr[Math.min(arr.length - 1, Math.max(0, Math.floor(arr.length * p)))];
    return {
      ok: true,
      sample: pnls.length,
      trades: n,
      runs,
      start,
      p5: pct(finals, 0.05),
      p50: pct(finals, 0.5),
      p95: pct(finals, 0.95),
      min: finals[0],
      max: finals[finals.length - 1],
      medianMaxDD: pct(maxDDs, 0.5),
      probProfit: profitable / runs,
      probBust: ruined / runs,
      finals
    };
  }

  function dailyPnl(trades) {
    const closed = closedTrades(trades);
    const out = {};
    for (const t of closed) {
      const key = U.fmtDate(t.exitTime || t.entryTime || 0);
      out[key] = (out[key] || 0) + t.pnl;
    }
    return out;
  }

  RL.analytics = { closedTrades, equityCurve, maxDrawdown, compute, monteCarlo, dailyPnl };
})(globalThis.RL = globalThis.RL || {});
