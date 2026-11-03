/* Kyoraku Replay - shared helpers. Original clean-room code, no third-party libraries. */
(function (RL) {
  'use strict';

  const isNum = (x) => typeof x === 'number' && Number.isFinite(x);
  const clamp = (x, lo, hi) => (isNum(x) ? Math.min(hi, Math.max(lo, x)) : lo);

  function round(x, d) {
    const digits = isNum(d) ? d : 2;
    if (!isNum(x)) return 0;
    const f = Math.pow(10, digits);
    return Math.round((x + Number.EPSILON) * f) / f;
  }

  function mulberry32(seed) {
    let a = (isNum(seed) ? Math.floor(seed) : 1) >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hashString(str) {
    let h = 2166136261 >>> 0;
    const s = String(str || '');
    for (let i = 0; i < s.length; i += 1) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h >>> 0;
  }

  function gaussian(rng) {
    let u = 0;
    let v = 0;
    while (u === 0) u = rng();
    while (v === 0) v = rng();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  const pad = (n) => String(n).padStart(2, '0');

  function fmtDate(t) {
    if (!isNum(t)) return '--';
    const d = new Date(t);
    if (Number.isNaN(d.getTime())) return '--';
    return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate());
  }

  function fmtClock(t) {
    if (!isNum(t)) return '--';
    const d = new Date(t);
    if (Number.isNaN(d.getTime())) return '--';
    return pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes());
  }

  function fmtTime(t) {
    if (!isNum(t)) return '--';
    return fmtDate(t) + ' ' + fmtClock(t);
  }

  function fmtNum(x, d) {
    const digits = isNum(d) ? d : 2;
    if (!isNum(x)) return '--';
    return x.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  }

  function fmtMoney(x) {
    if (!isNum(x)) return '--';
    return (x < 0 ? '-' : '') + '$' + fmtNum(Math.abs(x), 2);
  }

  function fmtPrice(x, d) {
    const digits = isNum(d) ? d : 2;
    return isNum(x) ? x.toFixed(digits) : '--';
  }

  function fmtSigned(x, d) {
    if (!isNum(x)) return '--';
    return (x > 0 ? '+' : '') + fmtNum(x, isNum(d) ? d : 2);
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function uid(prefix) {
    return String(prefix || 'id') + '-' + Date.now().toString(36) + '-' +
      Math.random().toString(36).slice(2, 8);
  }

  function download(filename, content, mime) {
    try {
      const blob = new Blob([content], { type: mime || 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      return true;
    } catch (err) {
      return false;
    }
  }

  function debounce(fn, ms) {
    let timer = null;
    return function () {
      const args = arguments;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => { timer = null; fn.apply(null, args); }, ms || 200);
    };
  }

  function deepCopy(value) {
    try { return JSON.parse(JSON.stringify(value)); } catch (err) { return null; }
  }

  RL.util = {
    isNum, clamp, round, mulberry32, hashString, gaussian,
    fmtDate, fmtClock, fmtTime, fmtNum, fmtMoney, fmtPrice, fmtSigned,
    escapeHtml, uid, download, debounce, deepCopy
  };
})(globalThis.RL = globalThis.RL || {});
