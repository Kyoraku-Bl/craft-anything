/* Kyoraku Replay - canvas candlestick renderer + small statistic charts. No chart library. */
(function (RL) {
  'use strict';
  const U = RL.util;

  const C = {
    bg: '#0d1421',
    panel: '#101a2b',
    grid: '#1b283b',
    gridStrong: '#26364d',
    text: '#8ea0ba',
    textBright: '#e6edf7',
    up: '#2dd4a7',
    down: '#f0616d',
    accent: '#f7b955',
    blue: '#4fc3f7',
    purple: '#b98cff',
    muted: '#5c6b83'
  };

  function rgba(hex, alpha) {
    const h = hex.replace('#', '');
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
  }

  function fitCanvas(canvas) {
    const dpr = Math.min(2, (globalThis.devicePixelRatio || 1));
    const rect = canvas.getBoundingClientRect ? canvas.getBoundingClientRect() : null;
    const w = Math.max(160, rect && rect.width ? rect.width : canvas.clientWidth || 600);
    const h = Math.max(100, rect && rect.height ? rect.height : canvas.clientHeight || 300);
    const pw = Math.round(w * dpr);
    const ph = Math.round(h * dpr);
    if (canvas.width !== pw || canvas.height !== ph) { canvas.width = pw; canvas.height = ph; }
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w, h, dpr };
  }

  class CandleChart {
    constructor(canvas, options) {
      this.canvas = canvas;
      this.opts = Object.assign({
        padRight: 76, padLeft: 10, padTop: 16, padBottom: 24,
        volume: true, rsi: false, showTrades: true,
        visible: 90, offset: 0, decimals: 5, label: '', tf: '5m'
      }, options || {});
      this.bars = [];
      this.overlays = [];
      this.rsi = null;
      this.trades = [];
      this.replayTime = 0;
      this.cross = null;
      this.drag = null;
      this.pick = null;
      this.onPricePick = null;
      this.onViewChange = null;
      this.w = 600; this.h = 300;
      this._bind();
      this.resize();
    }

    setData(data) {
      const d = data || {};
      this.bars = Array.isArray(d.bars) ? d.bars : [];
      this.overlays = Array.isArray(d.overlays) ? d.overlays : [];
      this.rsi = Array.isArray(d.rsi) ? d.rsi : null;
      this.trades = Array.isArray(d.trades) ? d.trades : [];
      this.replayTime = U.isNum(d.replayTime) ? d.replayTime : 0;
      if (U.isNum(d.decimals)) this.opts.decimals = d.decimals;
      if (typeof d.label === 'string') this.opts.label = d.label;
      if (typeof d.tf === 'string') this.opts.tf = d.tf;
      this.render();
    }

    resize() {
      const f = fitCanvas(this.canvas);
      this.ctx = f.ctx;
      this.w = f.w; this.h = f.h;
      this.render();
    }

    layout() {
      const o = this.opts;
      const volumeH = o.volume ? Math.min(72, Math.max(28, this.h * 0.15)) : 0;
      const rsiH = o.rsi ? Math.min(96, Math.max(40, this.h * 0.2)) : 0;
      const top = o.padTop;
      const bottom = Math.max(top + 40, this.h - o.padBottom - volumeH - rsiH);
      const left = o.padLeft;
      const right = Math.max(left + 60, this.w - o.padRight);
      return { top, bottom, left, right, w: right - left, h: bottom - top, volumeH, rsiH, axisBottom: this.h - o.padBottom };
    }

    view() {
      const len = this.bars.length;
      const end = U.clamp(len - this.opts.offset, 0, len);
      const start = U.clamp(end - Math.round(this.opts.visible), 0, end);
      return { start, end, bars: this.bars.slice(start, end) };
    }

    indexForTime(t) {
      let lo = 0; let hi = this.bars.length - 1; let ans = 0;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        if (this.bars[mid].t <= t) { ans = mid; lo = mid + 1; } else hi = mid - 1;
      }
      return ans;
    }

    range(v) {
      let lo = Infinity; let hi = -Infinity;
      for (const b of v.bars) {
        if (b.l < lo) lo = b.l;
        if (b.h > hi) hi = b.h;
      }
      for (const ov of this.overlays) {
        for (let i = v.start; i < v.end; i += 1) {
          const p = ov.values ? ov.values[i] : null;
          if (!U.isNum(p)) continue;
          if (p < lo) lo = p;
          if (p > hi) hi = p;
        }
      }
      if (!Number.isFinite(lo) || !Number.isFinite(hi)) { lo = 1; hi = 2; }
      if (hi - lo < 1e-9) { lo -= 0.001; hi += 0.001; }
      const pad = (hi - lo) * 0.08;
      return { lo: lo - pad, hi: hi + pad };
    }

    render() {
      const ctx = this.ctx;
      if (!ctx) return;
      const L = this.layout();
      ctx.clearRect(0, 0, this.w, this.h);
      ctx.fillStyle = C.bg;
      ctx.fillRect(0, 0, this.w, this.h);
      const v = this.view();
      if (!v.bars.length) {
        ctx.fillStyle = C.text;
        ctx.font = '13px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('لا توجد بيانات / no data', this.w / 2, this.h / 2);
        return;
      }
      const R = this.range(v);
      const pY = (p) => L.top + ((R.hi - p) / (R.hi - R.lo)) * L.h;
      const yP = (y) => R.hi - ((y - L.top) / L.h) * (R.hi - R.lo);
      const bw = L.w / v.bars.length;
      const xI = (i) => L.left + (i + 0.5) * bw;
      this._pY = pY; this._yP = yP; this._L = L; this._bw = bw;

      this._grid(L, R, v, pY, xI, bw);
      this._volume(L, v, bw, xI);
      this._rsiPane(L, v, bw, xI);
      this._overlays(L, v, pY, xI, bw);
      this._candles(L, v, pY, xI, bw);
      this._trades(L, v, pY, xI, bw);
      this._lastPrice(L, R, v, pY);
      this._axes(L, R, v, pY, xI, bw);
      this._crosshair(L, R, v, pY, xI, bw, yP);
      this._watermark(L);
    }

    _grid(L, R, v, pY, xI, bw) {
      const ctx = this.ctx;
      ctx.save();
      ctx.strokeStyle = C.grid;
      ctx.lineWidth = 1;
      for (let k = 0; k <= 5; k += 1) {
        const price = R.lo + ((R.hi - R.lo) * k) / 5;
        const y = Math.round(pY(price)) + 0.5;
        ctx.beginPath(); ctx.moveTo(L.left, y); ctx.lineTo(L.right, y); ctx.stroke();
      }
      const step = Math.max(1, Math.round(v.bars.length / 7));
      for (let i = 0; i < v.bars.length; i += step) {
        const x = Math.round(xI(i)) + 0.5;
        ctx.beginPath(); ctx.moveTo(x, L.top); ctx.lineTo(x, L.axisBottom); ctx.stroke();
      }
      if (this.opts.volume) {
        ctx.strokeStyle = C.gridStrong;
        ctx.beginPath(); ctx.moveTo(L.left, L.bottom + 0.5); ctx.lineTo(L.right, L.bottom + 0.5); ctx.stroke();
      }
      if (this.opts.rsi) {
        ctx.beginPath();
        ctx.moveTo(L.left, L.bottom + L.volumeH + 0.5);
        ctx.lineTo(L.right, L.bottom + L.volumeH + 0.5);
        ctx.stroke();
      }
      ctx.restore();
    }

    _candles(L, v, pY, xI, bw) {
      const ctx = this.ctx;
      const bodyW = Math.max(1, Math.min(16, bw * 0.68));
      ctx.save();
      for (let i = 0; i < v.bars.length; i += 1) {
        const b = v.bars[i];
        const up = b.c >= b.o;
        const color = up ? C.up : C.down;
        const x = xI(i);
        const yH = pY(b.h); const yL = pY(b.l);
        const yO = pY(b.o); const yC = pY(b.c);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(Math.round(x) + 0.5, yH);
        ctx.lineTo(Math.round(x) + 0.5, yL);
        ctx.stroke();
        ctx.fillStyle = color;
        const top = Math.min(yO, yC);
        const height = Math.max(1, Math.abs(yC - yO));
        ctx.fillRect(x - bodyW / 2, top, bodyW, height);
      }
      ctx.restore();
    }

    _volume(L, v, bw, xI) {
      if (!this.opts.volume || !L.volumeH) return;
      const ctx = this.ctx;
      let max = 1;
      for (const b of v.bars) if (b.v > max) max = b.v;
      const base = L.bottom + L.volumeH;
      const w = Math.max(1, Math.min(16, bw * 0.68));
      ctx.save();
      for (let i = 0; i < v.bars.length; i += 1) {
        const b = v.bars[i];
        const h = ((b.v || 0) / max) * (L.volumeH - 6);
        ctx.fillStyle = b.c >= b.o ? rgba(C.up, 0.35) : rgba(C.down, 0.35);
        ctx.fillRect(xI(i) - w / 2, base - h, w, h);
      }
      ctx.fillStyle = C.muted;
      ctx.font = '10px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('VOL', L.left + 4, L.bottom + 12);
      ctx.restore();
    }

    _rsiPane(L, v, bw, xI) {
      if (!this.opts.rsi || !this.rsi || !L.rsiH) return;
      const ctx = this.ctx;
      const top = L.bottom + L.volumeH + 4;
      const h = L.rsiH - 8;
      const y = (r) => top + (1 - U.clamp(r, 0, 100) / 100) * h;
      ctx.save();
      ctx.strokeStyle = C.grid;
      ctx.setLineDash([3, 3]);
      for (const level of [30, 70]) {
        ctx.beginPath(); ctx.moveTo(L.left, y(level)); ctx.lineTo(L.right, y(level)); ctx.stroke();
      }
      ctx.setLineDash([]);
      ctx.beginPath();
      let started = false;
      for (let i = v.start; i < v.end; i += 1) {
        const r = this.rsi[i];
        if (!U.isNum(r)) continue;
        const px = xI(i - v.start);
        if (!started) { ctx.moveTo(px, y(r)); started = true; } else ctx.lineTo(px, y(r));
      }
      ctx.strokeStyle = C.purple;
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.fillStyle = C.muted;
      ctx.font = '10px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('RSI 14', L.left + 4, top + 11);
      ctx.restore();
    }

    _overlays(L, v, pY, xI) {
      const ctx = this.ctx;
      ctx.save();
      ctx.lineWidth = 1.4;
      for (const ov of this.overlays) {
        if (!Array.isArray(ov.values)) continue;
        ctx.strokeStyle = ov.color || C.blue;
        if (ov.dashed) ctx.setLineDash([4, 4]); else ctx.setLineDash([]);
        ctx.beginPath();
        let started = false;
        for (let i = v.start; i < v.end; i += 1) {
          const p = ov.values[i];
          if (!U.isNum(p)) { started = false; continue; }
          const px = xI(i - v.start);
          const py = pY(p);
          if (!started) { ctx.moveTo(px, py); started = true; } else ctx.lineTo(px, py);
        }
        ctx.stroke();
      }
      ctx.setLineDash([]);
      ctx.restore();
    }

    _trades(L, v, pY, xI, bw) {
      if (!this.opts.showTrades || !this.trades.length || !v.bars.length) return;
      const ctx = this.ctx;
      const firstT = v.bars[0].t;
      const endX = L.right - 4;
      ctx.save();
      for (const tr of this.trades) {
        if (!U.isNum(tr.entryTime) || tr.entryTime > this.replayTime) continue;
        if (tr.entryTime < firstT && tr.status !== 'open') continue;
        const inIdx = this.indexForTime(tr.entryTime);
        const outIdx = tr.status === 'closed' && U.isNum(tr.exitTime)
          ? this.indexForTime(tr.exitTime) : this.bars.length - 1;
        const ex = U.clamp(xI(inIdx - v.start), L.left + 2, L.right - 2);
        const xx = U.clamp(xI(outIdx - v.start), L.left + 2, endX);
        const ey = pY(tr.entryPrice);
        const xy = pY(tr.status === 'closed' ? tr.exitPrice : (v.bars[v.bars.length - 1].c));
        const color = tr.side === 'buy' ? C.up : C.down;
        const slY = pY(tr.sl);
        const tpY = pY(tr.tp);
        ctx.setLineDash([5, 4]);
        ctx.lineWidth = 1;
        ctx.strokeStyle = rgba(C.down, 0.8);
        ctx.beginPath(); ctx.moveTo(ex, slY); ctx.lineTo(xx, slY); ctx.stroke();
        ctx.strokeStyle = rgba(C.up, 0.8);
        ctx.beginPath(); ctx.moveTo(ex, tpY); ctx.lineTo(xx, tpY); ctx.stroke();
        ctx.setLineDash([]);
        ctx.strokeStyle = rgba(color, 0.55);
        ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(xx, xy); ctx.stroke();
        // entry arrow
        ctx.fillStyle = color;
        ctx.beginPath();
        const ay = ey + (tr.side === 'buy' ? 9 : -9);
        ctx.moveTo(ex, ey);
        ctx.lineTo(ex - 5, ay);
        ctx.lineTo(ex + 5, ay);
        ctx.closePath(); ctx.fill();
        if (tr.status === 'closed') {
          ctx.beginPath();
          ctx.arc(xx, xy, 3.5, 0, Math.PI * 2);
          ctx.fillStyle = tr.pnl >= 0 ? C.up : C.down;
          ctx.fill();
        }
        ctx.font = '9px system-ui, sans-serif';
        ctx.fillStyle = rgba(C.text, 0.75);
        ctx.textAlign = 'right';
        ctx.fillText('SL', xx - 2, slY - 2);
        ctx.fillText('TP', xx - 2, tpY - 2);
      }
      ctx.restore();
    }

    _lastPrice(L, R, v, pY) {
      const ctx = this.ctx;
      const last = v.bars[v.bars.length - 1];
      if (!last) return;
      const y = pY(last.c);
      ctx.save();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = rgba(C.accent, 0.7);
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(L.left, y); ctx.lineTo(L.right, y); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = C.accent;
      ctx.fillRect(L.right + 1, y - 9, Math.max(10, this.w - L.right - 2), 18);
      ctx.fillStyle = '#10141c';
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(U.fmtPrice(last.c, this.opts.decimals), L.right + 5, y + 4);
      ctx.restore();
    }

    _axes(L, R, v, pY, xI) {
      const ctx = this.ctx;
      ctx.save();
      ctx.fillStyle = C.text;
      ctx.font = '10px system-ui, sans-serif';
      ctx.textAlign = 'left';
      for (let k = 0; k <= 5; k += 1) {
        const price = R.lo + ((R.hi - R.lo) * k) / 5;
        ctx.fillText(U.fmtPrice(price, this.opts.decimals), L.right + 5, pY(price) + 3);
      }
      ctx.textAlign = 'center';
      const step = Math.max(1, Math.round(v.bars.length / 6));
      for (let i = step - 1; i < v.bars.length; i += step) {
        const t = v.bars[i].t;
        const label = this.opts.tf === '1d' ? U.fmtDate(t) : (U.fmtDate(t).slice(5) + ' ' + U.fmtClock(t));
        ctx.fillText(label, xI(i), L.axisBottom + 14);
      }
      ctx.strokeStyle = C.gridStrong;
      ctx.beginPath(); ctx.moveTo(L.right + 0.5, L.top); ctx.lineTo(L.right + 0.5, L.axisBottom); ctx.stroke();
      ctx.restore();
    }

    _crosshair(L, R, v, pY, xI, bw, yP) {
      const c = this.cross;
      if (!c || c.x < L.left || c.x > L.right || c.y < L.top || c.y > L.bottom) return;
      const ctx = this.ctx;
      const price = yP(c.y);
      const idx = U.clamp(Math.floor((c.x - L.left) / bw), 0, v.bars.length - 1);
      const t = v.bars[idx] ? v.bars[idx].t : 0;
      ctx.save();
      ctx.setLineDash([3, 4]);
      ctx.strokeStyle = rgba(C.textBright, 0.5);
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(L.left, Math.round(c.y) + 0.5); ctx.lineTo(L.right, Math.round(c.y) + 0.5); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(Math.round(c.x) + 0.5, L.top); ctx.lineTo(Math.round(c.x) + 0.5, L.axisBottom); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#243450';
      ctx.fillRect(L.right + 1, c.y - 9, this.w - L.right - 2, 18);
      ctx.fillStyle = C.textBright;
      ctx.font = '10px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(U.fmtPrice(price, this.opts.decimals), L.right + 5, c.y + 3);
      const label = U.fmtDate(t) + ' ' + U.fmtClock(t) + ' UTC';
      ctx.fillStyle = '#243450';
      const tw = ctx.measureText(label).width + 10;
      ctx.fillRect(U.clamp(c.x - tw / 2, L.left, L.right - tw), L.axisBottom + 2, tw, 16);
      ctx.fillStyle = C.textBright;
      ctx.textAlign = 'center';
      ctx.fillText(label, U.clamp(c.x, L.left + tw / 2, L.right - tw / 2), L.axisBottom + 14);
      ctx.restore();
    }

    _watermark(L) {
      const ctx = this.ctx;
      ctx.save();
      ctx.fillStyle = rgba(C.text, 0.55);
      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText((this.opts.label || '') + '  ·  ' + (this.opts.tf || ''), L.left + 6, L.top + 12);
      ctx.fillStyle = rgba(C.accent, 0.75);
      ctx.font = '10px system-ui, sans-serif';
      ctx.fillText('KYORAKU REPLAY · المستقبل مخفي', L.left + 6, L.top + 26);
      ctx.restore();
    }

    setPick(mode) {
      this.pick = mode || null;
      this.canvas.style.cursor = this.pick ? 'crosshair' : 'grab';
    }

    zoom(delta) {
      const before = this.opts.visible;
      this.opts.visible = U.clamp(Math.round(before * (delta > 0 ? 1.15 : 0.87)), 20, 600);
      this.opts.offset = U.clamp(this.opts.offset, 0, Math.max(0, this.bars.length - this.opts.visible));
      if (this.onViewChange) this.onViewChange(this.opts);
      this.render();
    }

    _bind() {
      const cv = this.canvas;
      if (!cv || !cv.addEventListener) return;
      cv.style.cursor = 'grab';
      cv.addEventListener('wheel', (e) => {
        e.preventDefault();
        this.zoom(-e.deltaY);
      }, { passive: false });
      cv.addEventListener('mousedown', (e) => {
        const r = cv.getBoundingClientRect();
        this.drag = { x: e.clientX - r.left, offset: this.opts.offset, moved: false };
        cv.style.cursor = 'grabbing';
      });
      cv.addEventListener('mousemove', (e) => {
        const r = cv.getBoundingClientRect();
        const x = e.clientX - r.left;
        const y = e.clientY - r.top;
        this.cross = { x, y };
        if (this.drag) {
          const dx = x - this.drag.x;
          if (Math.abs(dx) > 3) this.drag.moved = true;
          const bw = this._bw || 8;
          this.opts.offset = U.clamp(this.drag.offset + Math.round(dx / bw), 0,
            Math.max(0, this.bars.length - this.opts.visible));
        }
        this.render();
      });
      cv.addEventListener('mouseup', (e) => {
        const r = cv.getBoundingClientRect();
        const y = e.clientY - r.top;
        if (this.drag && !this.drag.moved && this.pick && typeof this.onPricePick === 'function' && this._yP) {
          this.onPricePick(this.pick, U.round(this._yP(y), this.opts.decimals + 2));
        }
        if (this.drag && this.drag.moved && this.onViewChange) this.onViewChange(this.opts);
        this.drag = null;
        cv.style.cursor = this.pick ? 'crosshair' : 'grab';
      });
      cv.addEventListener('mouseleave', () => {
        this.cross = null;
        this.drag = null;
        cv.style.cursor = this.pick ? 'crosshair' : 'grab';
        this.render();
      });
      if (typeof ResizeObserver !== 'undefined') {
        try {
          this._observer = new ResizeObserver(() => this.resize());
          this._observer.observe(cv);
        } catch (err) { /* optional */ }
      }
    }

    toDataURL() {
      try { return this.canvas.toDataURL('image/png'); } catch (err) { return null; }
    }
  }

  /* ---- small charts for analytics --------------------------------------- */

  function frame(canvas) {
    const f = fitCanvas(canvas);
    if (!f.ctx) return null;
    f.ctx.clearRect(0, 0, f.w, f.h);
    f.ctx.fillStyle = C.bg;
    f.ctx.fillRect(0, 0, f.w, f.h);
    return f;
  }

  function lineChart(canvas, values, options) {
    const f = frame(canvas);
    if (!f) return;
    const o = options || {};
    const ctx = f.ctx;
    const data = (values || []).filter((x) => U.isNum(x));
    if (!data.length) return;
    let lo = Math.min.apply(null, data);
    let hi = Math.max.apply(null, data);
    if (U.isNum(o.zero) && o.zero < lo) lo = o.zero;
    if (hi - lo < 1e-9) { lo -= 1; hi += 1; }
    const pad = (hi - lo) * 0.12;
    lo -= pad; hi += pad;
    const left = 8; const right = f.w - 8; const top = 10; const bottom = f.h - 18;
    const x = (i) => left + (i / Math.max(1, data.length - 1)) * (right - left);
    const y = (v) => top + ((hi - v) / (hi - lo)) * (bottom - top);
    ctx.strokeStyle = C.grid;
    ctx.lineWidth = 1;
    for (let k = 0; k <= 3; k += 1) {
      const yy = top + ((bottom - top) * k) / 3;
      ctx.beginPath(); ctx.moveTo(left, yy); ctx.lineTo(right, yy); ctx.stroke();
    }
    if (U.isNum(o.zero)) {
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = C.muted;
      ctx.beginPath(); ctx.moveTo(left, y(o.zero)); ctx.lineTo(right, y(o.zero)); ctx.stroke();
      ctx.setLineDash([]);
    }
    const color = o.color || C.up;
    ctx.beginPath();
    ctx.moveTo(x(0), y(data[0]));
    for (let i = 1; i < data.length; i += 1) ctx.lineTo(x(i), y(data[i]));
    ctx.lineTo(x(data.length - 1), bottom);
    ctx.lineTo(x(0), bottom);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, top, 0, bottom);
    grad.addColorStop(0, rgba(color, 0.28));
    grad.addColorStop(1, rgba(color, 0.01));
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x(0), y(data[0]));
    for (let i = 1; i < data.length; i += 1) ctx.lineTo(x(i), y(data[i]));
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.8;
    ctx.stroke();
    ctx.fillStyle = C.text;
    ctx.font = '10px system-ui, sans-serif';
    ctx.textAlign = 'left';
    if (o.leftLabel) ctx.fillText(o.leftLabel, left + 2, top + 10);
    ctx.textAlign = 'right';
    if (o.rightLabel) ctx.fillText(o.rightLabel, right - 2, top + 10);
  }

  function barChart(canvas, values, options) {
    const f = frame(canvas);
    if (!f) return;
    const o = options || {};
    const ctx = f.ctx;
    const data = values || [];
    if (!data.length) return;
    let lo = 0; let hi = 0;
    for (const v of data) { if (v < lo) lo = v; if (v > hi) hi = v; }
    if (hi - lo < 1e-9) { hi += 1; lo -= 1; }
    const top = 12; const bottom = f.h - 20; const left = 8; const right = f.w - 8;
    const zeroY = top + ((hi - 0) / (hi - lo)) * (bottom - top);
    ctx.strokeStyle = C.grid;
    ctx.beginPath(); ctx.moveTo(left, zeroY); ctx.lineTo(right, zeroY); ctx.stroke();
    const bw = (right - left) / data.length;
    for (let i = 0; i < data.length; i += 1) {
      const v = data[i];
      const y = top + ((hi - v) / (hi - lo)) * (bottom - top);
      ctx.fillStyle = o.colorFn ? o.colorFn(v, i) : (v >= 0 ? C.up : C.down);
      ctx.fillRect(left + i * bw + 1, Math.min(y, zeroY), Math.max(1, bw - 2), Math.max(1, Math.abs(zeroY - y)));
    }
    ctx.fillStyle = C.text;
    ctx.font = '9px system-ui, sans-serif';
    ctx.textAlign = 'center';
    const labels = o.labels || [];
    const labelStep = Math.max(1, Math.ceil(data.length / 12));
    for (let i = 0; i < data.length; i += labelStep) {
      if (labels[i] != null) ctx.fillText(labels[i], left + i * bw + bw / 2, f.h - 6);
    }
  }

  function histogram(canvas, values, options) {
    const f = frame(canvas);
    if (!f) return;
    const o = options || {};
    const ctx = f.ctx;
    const bins = U.clamp(o.bins || 16, 4, 60);
    const data = (values || []).filter((x) => U.isNum(x));
    if (!data.length) return;
    let lo = Math.min.apply(null, data);
    let hi = Math.max.apply(null, data);
    if (hi - lo < 1e-9) { lo -= 1; hi += 1; }
    const counts = new Array(bins).fill(0);
    for (const v of data) {
      const b = U.clamp(Math.floor(((v - lo) / (hi - lo)) * bins), 0, bins - 1);
      counts[b] += 1;
    }
    const max = Math.max.apply(null, counts) || 1;
    const left = 8; const right = f.w - 8; const top = 12; const bottom = f.h - 20;
    const bw = (right - left) / bins;
    for (let i = 0; i < bins; i += 1) {
      const center = lo + ((i + 0.5) / bins) * (hi - lo);
      const h = (counts[i] / max) * (bottom - top);
      ctx.fillStyle = center >= 0 ? C.up : C.down;
      ctx.fillRect(left + i * bw + 1, bottom - h, Math.max(1, bw - 2), h);
    }
    const zeroX = left + ((0 - lo) / (hi - lo)) * (right - left);
    if (zeroX >= left && zeroX <= right) {
      ctx.strokeStyle = C.textBright;
      ctx.beginPath(); ctx.moveTo(zeroX, top); ctx.lineTo(zeroX, bottom); ctx.stroke();
    }
    ctx.fillStyle = C.text;
    ctx.font = '10px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(U.fmtNum(lo, 1), left + 2, f.h - 5);
    ctx.textAlign = 'right';
    ctx.fillText(U.fmtNum(hi, 1), right - 2, f.h - 5);
    ctx.textAlign = 'center';
    ctx.fillText(o.title || '', f.w / 2, f.h - 5);
  }

  RL.chart = { CandleChart, lineChart, barChart, histogram, colors: C };
})(globalThis.RL = globalThis.RL || {});
