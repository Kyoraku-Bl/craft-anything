/* Kyoraku Replay - technical indicators, computed from OHLC arrays. No dependencies. */
(function (RL) {
  'use strict';
  const U = RL.util;

  function sma(values, period) {
    const p = Math.max(1, Math.floor(period || 20));
    const out = new Array(values.length).fill(null);
    let sum = 0;
    for (let i = 0; i < values.length; i += 1) {
      sum += values[i];
      if (i >= p) sum -= values[i - p];
      if (i >= p - 1) out[i] = sum / p;
    }
    return out;
  }

  function ema(values, period) {
    const p = Math.max(1, Math.floor(period || 20));
    const out = new Array(values.length).fill(null);
    if (!values.length) return out;
    const k = 2 / (p + 1);
    let prev = values[0];
    out[0] = prev;
    for (let i = 1; i < values.length; i += 1) {
      prev = values[i] * k + prev * (1 - k);
      out[i] = prev;
    }
    return out;
  }

  function rsi(values, period) {
    const p = Math.max(2, Math.floor(period || 14));
    const out = new Array(values.length).fill(null);
    if (values.length < 2) return out;
    let gain = 0;
    let loss = 0;
    for (let i = 1; i <= Math.min(p, values.length - 1); i += 1) {
      const diff = values[i] - values[i - 1];
      if (diff >= 0) gain += diff; else loss -= diff;
    }
    gain /= p; loss /= p;
    out[Math.min(p, values.length - 1)] = loss === 0 ? 100 : 100 - 100 / (1 + gain / loss);
    for (let i = p + 1; i < values.length; i += 1) {
      const diff = values[i] - values[i - 1];
      const g = diff > 0 ? diff : 0;
      const l = diff < 0 ? -diff : 0;
      gain = (gain * (p - 1) + g) / p;
      loss = (loss * (p - 1) + l) / p;
      out[i] = loss === 0 ? 100 : 100 - 100 / (1 + gain / loss);
    }
    return out;
  }

  function bollinger(values, period, mult) {
    const p = Math.max(2, Math.floor(period || 20));
    const m = U.isNum(mult) ? mult : 2;
    const mid = sma(values, p);
    const upper = new Array(values.length).fill(null);
    const lower = new Array(values.length).fill(null);
    for (let i = p - 1; i < values.length; i += 1) {
      let variance = 0;
      for (let j = i - p + 1; j <= i; j += 1) variance += Math.pow(values[j] - mid[i], 2);
      const sd = Math.sqrt(variance / p);
      upper[i] = mid[i] + m * sd;
      lower[i] = mid[i] - m * sd;
    }
    return { mid, upper, lower };
  }

  /* Session VWAP: resets at each UTC day boundary. */
  function vwap(bars) {
    const out = new Array(bars.length).fill(null);
    let cumPV = 0;
    let cumV = 0;
    let day = -1;
    for (let i = 0; i < bars.length; i += 1) {
      const b = bars[i];
      const d = Math.floor(b.t / 86400000);
      if (d !== day) { day = d; cumPV = 0; cumV = 0; }
      const typical = (b.h + b.l + b.c) / 3;
      const vol = Math.max(1, b.v || 0);
      cumPV += typical * vol;
      cumV += vol;
      out[i] = cumV > 0 ? cumPV / cumV : null;
    }
    return out;
  }

  function atr(bars, period) {
    const p = Math.max(1, Math.floor(period || 14));
    const tr = bars.map((b, i) => {
      if (i === 0) return b.h - b.l;
      const pc = bars[i - 1].c;
      return Math.max(b.h - b.l, Math.abs(b.h - pc), Math.abs(b.l - pc));
    });
    return ema(tr, p);
  }

  /* Build overlay series aligned with the bar array. */
  function build(bars, enabled) {
    const e = enabled || {};
    const closes = bars.map((b) => b.c);
    const out = [];
    if (e.sma20) out.push({ id: 'sma20', label: 'SMA 20', color: '#f7b955', values: sma(closes, 20) });
    if (e.sma50) out.push({ id: 'sma50', label: 'SMA 50', color: '#c58cff', values: sma(closes, 50) });
    if (e.ema20) out.push({ id: 'ema20', label: 'EMA 20', color: '#4fc3f7', values: ema(closes, 20) });
    if (e.bollinger) {
      const bb = bollinger(closes, 20, 2);
      out.push({ id: 'bb-up', label: 'BB upper', color: '#6f7d9c', values: bb.upper, dashed: true });
      out.push({ id: 'bb-low', label: 'BB lower', color: '#6f7d9c', values: bb.lower, dashed: true });
    }
    if (e.vwap) out.push({ id: 'vwap', label: 'VWAP', color: '#ff8f6b', values: vwap(bars) });
    return { overlays: out, rsi: e.rsi ? rsi(closes, 14) : null };
  }

  RL.indicators = { sma, ema, rsi, bollinger, vwap, atr, build };
})(globalThis.RL = globalThis.RL || {});
