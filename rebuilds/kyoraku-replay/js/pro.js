/* Kyoraku Replay — pro workspace UI layer.
   Owns its own localStorage bucket so the core engine state is never rewritten.
   All heavy logic lives in pro-core.js; this file only wires DOM + canvas. */
(function (RL) {
  'use strict';
  const U = RL.util;
  const C = RL.proCore;
  const D = RL.data;
  const I = RL.indicators;
  const T = RL.i18n;
  const $ = (id) => document.getElementById(id);
  const qsa = (sel) => Array.from(document.querySelectorAll(sel));

  let S = C.load();
  let engine = null;
  let thirdChart = null;
  let activeTool = S.lastTool || 'cursor';
  let draft = [];
  let currentTradeId = null;
  let lastRR = null;
  let lastTradeCount = 0;
  let filling = false;
  let drawQueued = false;
  let importMode = 'events';
  let bound = false;

  function toast(msg) { if (RL.app && RL.app.toast) RL.app.toast(msg); }
  function persist() { const r = C.save(S); if (!r.ok) toast(T.t('toastStorage')); }
  function symKey() { return engine ? engine.symbol.id + '|' + engine.s.tf : '|'; }
  function visibleBars() { return engine ? engine.visibleBars() : []; }
  function allBars() {
    if (!engine) return [];
    try { return D.getBars(engine.symbol.id, engine.s.tf); } catch (err) { return engine.bars || []; }
  }
  function selectedTrades() { return engine ? engine.selectedTrades() : []; }
  function closedTrades() { return selectedTrades().filter((t) => t.status === 'closed' && U.isNum(t.pnl)); }

  /* ---------- public bridge used by app.js ---------- */
  RL.pro = {
    overlays(bars) { return C.overlays(bars, S.indicators); },
    filterTrade(t) {
      const f = S.strategyFilter;
      if (!f || f === 'all') return true;
      const sid = S.assignments[t.id] || '';
      return f === '__none__' ? !sid : sid === f;
    },
    workingOrder(side) { return placeWorkingOrder(side); },
    clearAll() { C.clear(); S = C.defaultState(); },
    onLanguage(lang) {
      S.lang = lang; persist();
      renderStrategySelects(); renderStrategies(); renderInsights();
      renderEvents(); renderPending(); renderRR(); renderTradeDialog();
      scheduleDraw();
    },
    onTab(name) {
      if (name === 'strategies') renderStrategies();
      else if (name === 'insights') renderInsights();
      else if (name === 'rrsim') renderRR();
      else if (name === 'events') renderEvents();
      else if (name === 'pending') renderPending();
      scheduleDraw();
    }
  };

  /* ---------- boot ---------- */
  function init(retries) {
    if (!RL.app || !RL.app.engine || !RL.app.engine.ready) {
      if (retries > 0) setTimeout(() => init(retries - 1), 30);
      return;
    }
    if (bound) return;
    bound = true;
    engine = RL.app.engine;
    applyAccent();
    for (const m of S.customTfs) C.registerCustomTf(m);
    try {
      thirdChart = new RL.chart.CandleChart($('chart-third'), {
        label: 'MTF', tf: S.thirdTf, decimals: engine.symbol.decimals,
        visible: 90, volume: false, showTrades: false
      });
    } catch (err) { thirdChart = null; }

    // Wrap the engine change callback so pro panels and overlays stay in sync.
    const original = engine.onChange;
    engine.onChange = function () {
      if (typeof original === 'function') original.apply(this, arguments);
      onEngineChange();
    };

    lastTradeCount = engine.s.trades.length;
    bindEvents();
    syncIndicatorInputs();
    renderStrategySelects();
    renderStrategies(); renderInsights(); renderEvents(); renderPending(); renderRR();
    applyLayout();
    scheduleDraw();
  }

  /* ---------- engine hook ---------- */
  function onEngineChange() {
    if (!engine) return;
    assignNewTrades();
    fillWorkingOrders();
    renderThird();
    if (RL.app.activeTab === 'strategies') renderStrategies();
    if (RL.app.activeTab === 'insights') renderInsights();
    if (RL.app.activeTab === 'pending') renderPending();
    scheduleDraw();
  }

  function assignNewTrades() {
    const count = engine.s.trades.length;
    if (count <= lastTradeCount) { lastTradeCount = count; return; }
    const strategyId = $('sel-trade-strategy') ? $('sel-trade-strategy').value : '';
    if (strategyId) {
      for (let i = lastTradeCount; i < count; i += 1) {
        const tr = engine.s.trades[i];
        if (tr && !tr.isPartial && !S.assignments[tr.id]) S.assignments[tr.id] = strategyId;
      }
      persist();
    }
    lastTradeCount = count;
  }

  /* ---------- working orders ---------- */
  function placeWorkingOrder(side) {
    const type = $('sel-order-type') ? $('sel-order-type').value : 'market';
    if (type === 'market') return false;
    const price = parseFloat($('input-order-price').value);
    if (!Number.isFinite(price) || price <= 0) { toast(T.t('proToastTfInvalid')); return true; }
    const bar = engine.currentBar();
    if (bar) {
      const buy = side === 'buy';
      const valid = type === 'limit'
        ? (buy ? price < bar.c : price > bar.c)
        : (buy ? price > bar.c : price < bar.c);
      if (!valid) { toast(T.t('toastBadLevels')); return true; }
    }
    const lv = RL.app.activeLevels(side);
    S.pending.push({
      id: C.uid('o'), side, type, price, sl: lv.sl, tp: lv.tp,
      tags: $('input-tags') ? $('input-tags').value.slice(0, 200) : '',
      notes: $('input-notes') ? $('input-notes').value.slice(0, 500) : '',
      strategyId: $('sel-trade-strategy') ? $('sel-trade-strategy').value : '',
      createdAt: Date.now(), symbol: engine.s.symbol, tf: engine.s.tf
    });
    persist(); renderPending(); toast(T.t('proToastOrder'));
    return true;
  }

  function fillWorkingOrders() {
    if (filling || !S.pending.length) return;
    const bar = engine.currentBar();
    if (!bar) return;
    const hit = [];
    for (const o of S.pending) {
      if (o.symbol && o.symbol !== engine.s.symbol) continue;
      const touched = o.type === 'limit'
        ? (o.side === 'buy' ? bar.l <= o.price : bar.h >= o.price)
        : (o.side === 'buy' ? bar.h >= o.price : bar.l <= o.price);
      if (touched) hit.push(o);
    }
    if (!hit.length) return;
    filling = true;
    const ids = new Set(hit.map((x) => x.id));
    S.pending = S.pending.filter((x) => !ids.has(x.id));
    for (const o of hit) {
      const opts = {
        slPrice: o.sl, tpPrice: o.tp,
        tags: o.tags ? o.tags.split(',').map((x) => x.trim()).filter(Boolean).slice(0, 8) : [],
        notes: o.notes
      };
      try {
        engine.openTrade(o.side, opts);
        const last = engine.s.trades[engine.s.trades.length - 1];
        if (o.strategyId && last) S.assignments[last.id] = o.strategyId;
      } catch (err) { /* invalid levels: drop the order safely */ }
    }
    filling = false;
    lastTradeCount = engine.s.trades.length;
    persist(); renderPending(); toast(T.t('proToastOrderFilled'));
  }

  /* ---------- layout ---------- */
  function applyLayout() {
    const l = S.layout;
    const htf = $('htf-wrap'); const third = $('third-wrap'); const pane = $('pro-pane-wrap');
    const htfVisible = engine.ui.htf && l !== 'single';
    if (htf) htf.classList.toggle('hidden', !htfVisible);
    if (third) third.classList.toggle('hidden', l !== 'triple');
    const anyPane = S.indicators.macd || S.indicators.stoch || S.indicators.atr;
    if (pane) pane.classList.toggle('hidden', !anyPane);
    if ($('sel-layout')) $('sel-layout').value = l;
    setTimeout(() => {
      if (htfVisible && RL.app.htfChart) RL.app.htfChart.resize();
      if (l === 'triple' && thirdChart) thirdChart.resize();
      renderThird(); scheduleDraw();
    }, 0);
  }

  function renderThird() {
    if (!thirdChart || S.layout !== 'triple') return;
    const tf = D.TF_MS[S.thirdTf] ? S.thirdTf : '15m';
    let bars = [];
    try { bars = engine.visibleBars(D.getBars(engine.symbol.id, D.effectiveTf(engine.symbol, tf))); }
    catch (err) { bars = visibleBars(); }
    const built = I.build(bars, { sma20: true });
    thirdChart.opts.rsi = false;
    thirdChart.opts.showTrades = $('chk-trades') ? $('chk-trades').checked : true;
    thirdChart.setData({
      bars, overlays: built.overlays, rsi: null,
      trades: engine.s.trades, replayTime: engine.s.replayTime,
      decimals: engine.symbol.decimals, label: engine.symbol.label + ' · MTF', tf
    });
    if ($('pro-pane-label')) $('pro-pane-label').textContent = tf;
  }

  /* ---------- canvas helpers ---------- */
  function ctxFor(canvas) {
    const dpr = Math.min(2, (globalThis.devicePixelRatio || 1));
    const rect = canvas.getBoundingClientRect ? canvas.getBoundingClientRect() : null;
    const w = Math.max(160, rect && rect.width ? rect.width : canvas.clientWidth || 600);
    const h = Math.max(90, rect && rect.height ? rect.height : canvas.clientHeight || 200);
    const pw = Math.round(w * dpr); const ph = Math.round(h * dpr);
    if (canvas.width !== pw || canvas.height !== ph) { canvas.width = pw; canvas.height = ph; }
    const ctx = canvas.getContext('2d');
    if (ctx && ctx.setTransform) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w, h };
  }

  function scheduleDraw() {
    if (drawQueued) return;
    drawQueued = true;
    const run = () => { drawQueued = false; drawAll(); };
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(run);
    else setTimeout(run, 0);
  }

  function drawAll() { drawOverlay(); drawProPane(); }

  function chartGeom() {
    const mc = RL.app.mainChart;
    if (!mc || !mc._L || !mc._pY || !mc._yP || !mc._bw) return null;
    const view = mc.view();
    const xI = (i) => mc._L.left + (i - view.start + 0.5) * mc._bw;
    return { mc, L: mc._L, pY: mc._pY, yP: mc._yP, bw: mc._bw, view, xI,
      xIdx: (abs) => mc._L.left + (abs - view.start + 0.5) * mc._bw };
  }

  function drawOverlay() {
    const ov = $('chart-overlay');
    if (!ov) return;
    const { ctx, w, h } = ctxFor(ov);
    if (!ctx) return;
    ctx.clearRect(0, 0, w, h);
    const g = chartGeom();
    if (!g || !g.view.bars.length) return;
    const L = g.L;

    // Session shading (very translucent: candles stay readable).
    if (S.indicators.sessions) {
      const colors = { asia: 'rgba(124,108,255,.055)', london: 'rgba(34,211,238,.05)', ny: 'rgba(251,191,92,.05)' };
      for (const seg of C.sessionSegments(g.view.bars)) {
        const x1 = g.xI(seg.start); const x2 = g.xI(Math.min(seg.end, g.view.bars.length));
        ctx.fillStyle = colors[seg.kind] || 'transparent';
        ctx.fillRect(x1, L.top, Math.max(1, x2 - x1), L.bottom - L.top);
      }
    }

    // Local event markers.
    if (S.eventsOnChart && S.events.length) {
      const first = g.view.bars[0].t; const last = g.view.bars[g.view.bars.length - 1].t;
      for (const ev of S.events) {
        if (ev.t < first || ev.t > last) continue;
        const abs = g.mc.indexForTime(ev.t);
        const x = g.xIdx(abs);
        const color = ev.impact === 'high' ? '#ff5d78' : (ev.impact === 'medium' ? '#fbbf5c' : '#1fd39a');
        ctx.save(); ctx.setLineDash([3, 4]); ctx.strokeStyle = color; ctx.globalAlpha = .75;
        ctx.beginPath(); ctx.moveTo(x, L.top); ctx.lineTo(x, L.bottom); ctx.stroke();
        ctx.setLineDash([]); ctx.globalAlpha = 1;
        ctx.fillStyle = color; ctx.beginPath();
        ctx.moveTo(x - 4, L.top); ctx.lineTo(x + 4, L.top); ctx.lineTo(x, L.top + 7); ctx.closePath(); ctx.fill();
        ctx.font = '9px system-ui, sans-serif'; ctx.textAlign = 'left';
        ctx.fillText(ev.title.slice(0, 18), x + 5, L.top + 10);
        ctx.restore();
      }
    }

    // Persisted drawings for this symbol + timeframe.
    const key = symKey();
    for (const d of S.drawings) {
      if (d.symbol + '|' + d.tf !== key) continue;
      drawShape(ctx, g, d, false);
    }
    if (draft.length) drawShape(ctx, g, { type: activeTool, points: draft, color: '#7c6cff', text: '' }, true);
  }

  function drawShape(ctx, g, d, isDraft) {
    const L = g.L; const pts = d.points || [];
    if (!pts.length) return;
    ctx.save();
    ctx.strokeStyle = d.color || '#7c6cff';
    ctx.fillStyle = d.color || '#7c6cff';
    ctx.lineWidth = isDraft ? 1.2 : 1.6;
    if (isDraft) ctx.setLineDash([5, 4]);
    const xFor = (p) => g.xIdx(g.mc.indexForTime(p.t));
    const yFor = (p) => g.pY(p.p);
    if (d.type === 'hline' && pts[0]) {
      const y = yFor(pts[0]);
      ctx.globalAlpha = .85; ctx.beginPath(); ctx.moveTo(L.left, y); ctx.lineTo(L.right, y); ctx.stroke();
      ctx.globalAlpha = .55; ctx.font = '10px system-ui, sans-serif'; ctx.textAlign = 'left';
      ctx.fillText(U.fmtPrice(pts[0].p, 5), L.left + 4, y - 3);
    } else if (d.type === 'trend' && pts.length >= 2) {
      ctx.beginPath(); ctx.moveTo(xFor(pts[0]), yFor(pts[0])); ctx.lineTo(xFor(pts[1]), yFor(pts[1])); ctx.stroke();
      for (const p of pts.slice(0, 2)) { ctx.beginPath(); ctx.arc(xFor(p), yFor(p), 3, 0, Math.PI * 2); ctx.fill(); }
    } else if (d.type === 'rect' && pts.length >= 2) {
      const x1 = xFor(pts[0]); const x2 = xFor(pts[1]); const y1 = yFor(pts[0]); const y2 = yFor(pts[1]);
      ctx.globalAlpha = .12; ctx.fillRect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1));
      ctx.globalAlpha = .85; ctx.strokeRect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1));
    } else if (d.type === 'fib' && pts.length >= 2) {
      const p1 = pts[0].p; const p2 = pts[1].p;
      const levels = [0, .236, .382, .5, .618, .786, 1];
      ctx.font = '9px system-ui, sans-serif'; ctx.textAlign = 'left';
      for (const lv of levels) {
        const price = p1 + (p2 - p1) * lv; const y = g.pY(price);
        ctx.globalAlpha = lv === 0 || lv === 1 ? .9 : .5;
        ctx.beginPath(); ctx.moveTo(L.left, y); ctx.lineTo(L.right, y); ctx.stroke();
        ctx.globalAlpha = .8; ctx.fillText((lv * 100).toFixed(1) + '%', L.left + 4, y - 2);
      }
    } else if (d.type === 'text' && pts[0]) {
      ctx.globalAlpha = .95; ctx.font = '11px system-ui, sans-serif'; ctx.textAlign = 'left';
      ctx.fillText(d.text || 'Note', xFor(pts[0]), yFor(pts[0]));
      ctx.fillRect(xFor(pts[0]) - 3, yFor(pts[0]) - 12, 2, 14);
    }
    ctx.restore();
  }

  function drawProPane() {
    const canvas = $('chart-pro');
    const wrap = $('pro-pane-wrap');
    if (!canvas || !wrap || wrap.classList.contains('hidden')) return;
    const { ctx, w, h } = ctxFor(canvas);
    if (!ctx) return;
    ctx.clearRect(0, 0, w, h);
    const bars = visibleBars();
    if (!bars.length) return;
    const p = C.panes(bars, S.indicators);
    const mid = h / 2;
    ctx.strokeStyle = 'rgba(151,168,198,.25)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, mid); ctx.lineTo(w, mid); ctx.stroke();
    const bw = Math.max(1, w / Math.max(1, bars.length));
    if (p.macd) {
      let max = 1e-9;
      for (const v of p.macd.hist) if (U.isNum(v)) max = Math.max(max, Math.abs(v));
      for (let i = 0; i < bars.length; i += 1) {
        const v = p.macd.hist[i]; if (!U.isNum(v)) continue;
        const bh = (v / max) * (h * .42);
        ctx.fillStyle = v >= 0 ? 'rgba(31,211,154,.65)' : 'rgba(255,93,120,.65)';
        ctx.fillRect(i * bw, mid - bh, Math.max(1, bw - .5), Math.abs(bh));
      }
      ctx.strokeStyle = '#22d3ee'; ctx.beginPath();
      let started = false;
      for (let i = 0; i < bars.length; i += 1) {
        const v = p.macd.line[i]; if (!U.isNum(v)) { started = false; continue; }
        const y = mid - (v / max) * (h * .42);
        if (!started) { ctx.moveTo(i * bw, y); started = true; } else ctx.lineTo(i * bw, y);
      }
      ctx.stroke();
      ctx.strokeStyle = '#b18cff'; ctx.beginPath(); started = false;
      for (let i = 0; i < bars.length; i += 1) {
        const v = p.macd.signal[i]; if (!U.isNum(v)) { started = false; continue; }
        const y = mid - (v / max) * (h * .42);
        if (!started) { ctx.moveTo(i * bw, y); started = true; } else ctx.lineTo(i * bw, y);
      }
      ctx.stroke();
    }
    if (p.stoch) {
      const draw = (arr, color) => {
        ctx.strokeStyle = color; ctx.beginPath(); let started = false;
        for (let i = 0; i < bars.length; i += 1) {
          const v = arr[i]; if (!U.isNum(v)) { started = false; continue; }
          const y = h - (v / 100) * h;
          if (!started) { ctx.moveTo(i * bw, y); started = true; } else ctx.lineTo(i * bw, y);
        }
        ctx.stroke();
      };
      draw(p.stoch.k, '#7c6cff'); draw(p.stoch.d, '#fbbf5c');
      ctx.strokeStyle = 'rgba(151,168,198,.2)';
      for (const lv of [20, 80]) { const y = h - (lv / 100) * h; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    }
    ctx.fillStyle = 'rgba(151,168,198,.85)'; ctx.font = '9px system-ui, sans-serif'; ctx.textAlign = 'left';
    const bits = [];
    if (S.indicators.macd) bits.push('MACD 12/26/9');
    if (S.indicators.stoch) bits.push('Stoch 14/3');
    if (S.indicators.atr && U.isNum(p.atr)) bits.push('ATR ' + U.fmtPrice(p.atr, 4));
    ctx.fillText(bits.join(' · '), 4, 10);
  }

  /* ---------- panels ---------- */
  function renderStrategySelects() {
    const opts = [{ id: 'all', name: T.t('proStrategyAll') }, { id: '__none__', name: T.t('proUntagged') }]
      .concat(S.strategies.map((x) => ({ id: x.id, name: x.name })));
    fillSelect('filter-strategy', opts, S.strategyFilter, true);
    fillSelect('sel-trade-strategy', opts.filter((x) => x.id !== '__none__'), $('sel-trade-strategy') ? $('sel-trade-strategy').value : 'all', false);
    fillSelect('sel-trade-detail-strategy', opts.filter((x) => x.id !== '__none__'), currentTradeId ? (S.assignments[currentTradeId] || 'all') : 'all', false);
  }
  function fillSelect(id, opts, selected, keepAll) {
    const el = $(id); if (!el) return;
    el.innerHTML = '';
    for (const o of opts) {
      const n = document.createElement('option');
      n.value = o.id; n.textContent = o.name; el.appendChild(n);
    }
    if (selected) el.value = selected;
    if (!el.value && el.options.length) el.selectedIndex = keepAll ? 0 : 0;
  }

  function renderStrategies() {
    const list = $('strategy-list'); if (!list) return;
    if (!S.strategies.length) { list.innerHTML = '<div class="no-data-hint">' + T.t('proNoStrategies') + '</div>'; }
    else {
      list.innerHTML = S.strategies.map((s) =>
        '<div class="pro-item"><span class="pill">◆</span><span class="grow">' + U.escapeHtml(s.name) + '</span>' +
        '<button data-del-strategy="' + U.escapeHtml(s.id) + '">✕</button></div>').join('');
    }
    const rows = C.strategyStats(closedTrades(), S.assignments, S.strategies, T.lang);
    const box = $('strategy-table-wrap'); if (!box) return;
    if (!rows.length) { box.innerHTML = '<p class="note">' + T.t('proToastNoTrades') + '</p>'; return; }
    let html = '<table class="strategy-table"><thead><tr><th>' + T.t('strategy') + '</th><th>' + T.t('tradesCount') +
      '</th><th>' + T.t('netPnl') + '</th><th>' + T.t('winRate') + '</th><th>' + T.t('avgR') + '</th></tr></thead><tbody>';
    for (const r of rows) {
      html += '<tr><td>' + U.escapeHtml(r.name) + '</td><td>' + r.count + '</td><td class="' + (r.net >= 0 ? 'pos' : 'neg') + '">' +
        U.fmtMoney(r.net) + '</td><td>' + U.fmtNum(r.winRate * 100, 1) + '%</td><td>' + U.fmtSigned(r.avgR, 2) + 'R</td></tr>';
    }
    box.innerHTML = html + '</tbody></table>';
  }

  function renderInsights() {
    const box = $('insights-content'); if (!box) return;
    const res = C.insights(closedTrades(), T.lang);
    if (!res.ok) { box.innerHTML = '<div class="pro-card"><p>' + T.t('proNoInsights') + '</p></div>'; return; }
    box.innerHTML = res.cards.map((c) =>
      '<div class="pro-card ' + (c.tone === 'good' ? 'good' : (c.tone === 'bad' ? 'bad' : '')) + '">' +
      '<h4>' + U.escapeHtml(T.t(c.id)) + '</h4><div class="big">' + U.escapeHtml(String(c.value)) + '</div>' +
      '<p>' + U.escapeHtml(c.detail || '') + '</p></div>').join('');
  }

  function runRR() {
    const r = C.simulateRR(closedTrades(), allBars(),
      parseFloat($('input-rr-target').value), parseFloat($('input-rr-stop').value));
    lastRR = r;
    renderRR();
  }
  function renderRR() {
    const kpis = $('rr-results'); const detail = $('rr-detail');
    if (!kpis || !detail) return;
    if (!lastRR) {
      kpis.innerHTML = ''; detail.innerHTML = '<div class="pro-card"><p>' + T.t('proToastNoTrades') + '</p></div>';
      return;
    }
    const a = lastRR.original; const b = lastRR.simulated;
    const kpi = (label, value, clsName) => '<div class="kpi"><span>' + label + '</span><b class="' + (clsName || '') + '">' + value + '</b></div>';
    kpis.innerHTML =
      kpi(T.t('proRRBefore') + ' · ' + T.t('netPnl'), U.fmtMoney(a.net), a.net >= 0 ? 'pos' : 'neg') +
      kpi(T.t('proRRAfter') + ' · ' + T.t('netPnl'), U.fmtMoney(b.net), b.net >= 0 ? 'pos' : 'neg') +
      kpi(T.t('proRRDelta'), U.fmtMoney(lastRR.delta), lastRR.delta >= 0 ? 'pos' : 'neg') +
      kpi(T.t('proRRTrades'), String(lastRR.count), '') +
      kpi(T.t('proRRAfter') + ' · ' + T.t('winRate'), U.fmtNum(b.winRate * 100, 1) + ' %', '') +
      kpi(T.t('proRRAfter') + ' · ' + T.t('avgR'), U.fmtSigned(b.avgR, 2) + 'R', b.avgR >= 0 ? 'pos' : 'neg');
    detail.innerHTML = '<div class="pro-card"><h4>' + T.t('proRRNote') + '</h4><p>' +
      T.t('proRRBefore') + ': ' + U.fmtSigned(a.avgR, 2) + 'R · ' + U.fmtNum(a.winRate * 100, 1) + '% · ' +
      T.t('proRRAfter') + ': ' + U.fmtSigned(b.avgR, 2) + 'R · ' + U.fmtNum(b.winRate * 100, 1) + '%</p></div>';
  }

  function renderEvents() {
    const box = $('events-list'); if (!box) return;
    if (!S.events.length) { box.innerHTML = '<div class="no-data-hint">' + T.t('proNoEvents') + '</div>'; return; }
    const sorted = S.events.slice().sort((a, b) => b.t - a.t);
    box.innerHTML = sorted.slice(0, 120).map((e) =>
      '<div class="pro-item"><span class="pill ' + e.impact + '">' + T.t('proEvent' + cap(e.impact)) + '</span>' +
      '<span class="grow">' + U.escapeHtml(e.title) + '</span><small>' + U.fmtTime(e.t) + ' UTC</small>' +
      '<button data-del-event="' + U.escapeHtml(e.id) + '">✕</button></div>').join('');
  }
  function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }

  function renderPending() {
    const box = $('pending-list'); if (!box) return;
    if (!S.pending.length) { box.innerHTML = '<div class="no-data-hint">' + T.t('proNoPending') + '</div>'; return; }
    box.innerHTML = S.pending.map((o) =>
      '<div class="pro-item"><span class="pill">' + (o.type === 'limit' ? T.t('proOrderLimit') : T.t('proOrderStop')) + '</span>' +
      '<span class="' + (o.side === 'buy' ? 'side-buy' : 'side-sell') + '">' + (o.side === 'buy' ? 'Long' : 'Short') + '</span>' +
      '<span class="grow">' + T.t('proOrderPrice') + ' ' + U.fmtPrice(o.price, 4) + ' · ' + o.symbol + '</span>' +
      '<small>' + T.t('proOrderWaiting') + '</small>' +
      '<button data-del-order="' + U.escapeHtml(o.id) + '">✕</button></div>').join('');
  }

  function renderTradeDialog() {
    if (!currentTradeId) return;
    const tr = selectedTrades().find((x) => x.id === currentTradeId) ||
      (engine ? engine.s.trades.find((x) => x.id === currentTradeId) : null);
    if (!tr) return;
    if ($('trade-dialog-title')) $('trade-dialog-title').textContent = T.t('proTradeReview') + ' · ' + tr.id;
    const sum = $('trade-summary');
    if (sum) {
      const cell = (label, value, clsName) => '<div class="kpi"><span>' + label + '</span><b class="' + (clsName || '') + '">' + value + '</b></div>';
      sum.innerHTML = cell(T.t('colSymbol'), U.escapeHtml(tr.symbol), '') +
        cell(T.t('colSide'), tr.side === 'buy' ? 'Long' : 'Short', tr.side === 'buy' ? 'pos' : 'neg') +
        cell(T.t('colEntry'), U.fmtPrice(tr.entryPrice, tr.decimals), '') +
        cell(T.t('colPnl'), tr.status === 'closed' ? U.fmtMoney(tr.pnl) : T.t('openNow'),
          tr.status === 'closed' ? (tr.pnl >= 0 ? 'pos' : 'neg') : '') +
        cell(T.t('colR'), tr.status === 'closed' ? U.fmtSigned(tr.r, 2) + 'R' : '—', '');
    }
    const sel = $('sel-trade-detail-strategy');
    if (sel) sel.value = S.assignments[tr.id] || 'all';
    const checklist = $('trade-checklist');
    if (checklist) {
      const items = S.checklists[tr.id] || S.checklistTemplate.map((x) => ({ id: x.id, text: x.text, done: false }));
      S.checklists[tr.id] = items;
      checklist.innerHTML = items.length ? items.map((it, i) =>
        '<div class="checklist-item ' + (it.done ? 'done' : '') + '">' +
        '<input type="checkbox" data-check="' + i + '"' + (it.done ? ' checked' : '') + '>' +
        '<span class="grow">' + U.escapeHtml(T.has(it.text) ? T.t(it.text) : it.text) + '</span></div>').join('')
        : '<div class="no-data-hint">' + T.t('proNoStrategies') + '</div>';
    }
    const shot = $('trade-shot');
    if (shot) {
      const url = S.screenshots[tr.id];
      shot.innerHTML = url
        ? '<img src="' + url + '" alt="chart"><button id="btn-shot-inline" class="mini-btn">' + T.t('proShotRemove') + '</button>'
        : '<div class="no-shot">' + T.t('proShotNone') + '</div>';
      const inline = $('btn-shot-inline');
      if (inline) inline.addEventListener('click', () => { delete S.screenshots[tr.id]; persist(); renderTradeDialog(); });
    }
  }

  /* ---------- events ---------- */
  function syncIndicatorInputs() {
    const map = {
      'ind-ema50': 'ema50', 'ind-supertrend': 'supertrend', 'ind-macd': 'macd',
      'ind-stoch': 'stoch', 'ind-atr': 'atr'
    };
    for (const id of Object.keys(map)) if ($(id)) $(id).checked = !!S.indicators[map[id]];
    if ($('chk-pro-sessions')) $('chk-pro-sessions').checked = !!S.indicators.sessions;
    if ($('chk-events-chart')) $('chk-events-chart').checked = !!S.eventsOnChart;
    const tfs = D.TF_LIST.slice();
    fillSelect('sel-third-tf', tfs.map((x) => ({ id: x, name: x })), S.thirdTf, false);
  }

  function applyAccent() {
    document.documentElement.dataset.accent = S.accent;
    for (const dot of qsa('.accent-dot')) dot.classList.toggle('active', dot.getAttribute('data-accent-value') === S.accent);
  }

  function setTool(tool) {
    activeTool = tool; draft = []; S.lastTool = tool; persist();
    for (const b of qsa('.tool-btn[data-tool]')) b.classList.toggle('active', b.getAttribute('data-tool') === tool);
    const ov = $('chart-overlay');
    if (ov) ov.classList.toggle('drawing', tool !== 'cursor');
    scheduleDraw();
  }

  function readTextFile(file, cb) {
    if (typeof FileReader === 'undefined') { toast(T.t('proToastError')); return; }
    const r = new FileReader();
    r.onload = () => cb(String(r.result || ''));
    r.onerror = () => toast(T.t('proToastError'));
    r.readAsText(file);
  }

  function bindEvents() {
    const on = (id, ev, fn) => { const el = $(id); if (el) el.addEventListener(ev, fn); };

    for (const dot of qsa('.accent-dot')) {
      dot.addEventListener('click', () => { S.accent = dot.getAttribute('data-accent-value') || 'indigo'; persist(); applyAccent(); scheduleDraw(); });
    }

    on('sel-layout', 'change', () => { S.layout = $('sel-layout').value; persist(); applyLayout(); });
    on('sel-third-tf', 'change', () => { S.thirdTf = $('sel-third-tf').value; persist(); renderThird(); scheduleDraw(); });
    on('chk-pro-sessions', 'change', () => { S.indicators.sessions = $('chk-pro-sessions').checked; persist(); scheduleDraw(); });
    on('chk-events-chart', 'change', () => { S.eventsOnChart = $('chk-events-chart').checked; persist(); scheduleDraw(); });
    on('chk-htf', 'change', () => setTimeout(applyLayout, 0));
    for (const [id, key] of [['ind-ema50', 'ema50'], ['ind-supertrend', 'supertrend'], ['ind-macd', 'macd'], ['ind-stoch', 'stoch'], ['ind-atr', 'atr']]) {
      on(id, 'change', () => { S.indicators[key] = $(id).checked; persist(); applyLayout(); RL.app.requestRender(); });
    }
    on('btn-add-tf', 'click', () => {
      const m = Math.round(parseFloat($('input-custom-tf').value));
      if (!Number.isFinite(m) || m < 1 || m > 1440) { toast(T.t('proToastTfInvalid')); return; }
      const label = C.registerCustomTf(m);
      if (!label) { toast(T.t('proToastTfInvalid')); return; }
      if (!S.customTfs.includes(m)) S.customTfs.push(m);
      persist(); RL.app.buildSelects(); syncIndicatorInputs();
      const tf = $('sel-tf'); if (tf) { tf.value = label; engine.switchMarket(engine.s.symbol, label); RL.app.requestRender(); }
      toast(T.t('proToastTfAdded') + ' · ' + label);
    });

    // Step-N shortcuts in the toolbar.
    const stepN = () => U.clamp(Math.round(parseFloat($('input-step-n') ? $('input-step-n').value : '10') || 10), 1, 500);
    on('btn-step-back', 'click', () => { RL.app.stopPlay(); for (let i = 0; i < stepN(); i += 1) engine.step(-1); });
    on('btn-step-fwd', 'click', () => { RL.app.stopPlay(); for (let i = 0; i < stepN(); i += 1) engine.step(1); });

    // Drawing tools.
    for (const b of qsa('.tool-btn[data-tool]')) b.addEventListener('click', () => setTool(b.getAttribute('data-tool')));
    on('btn-undo-drawing', 'click', () => {
      const key = symKey();
      for (let i = S.drawings.length - 1; i >= 0; i -= 1) {
        const d = S.drawings[i];
        if (d.symbol + '|' + d.tf === key) { S.drawings.splice(i, 1); break; }
      }
      persist(); scheduleDraw(); toast(T.t('proToastDrawing'));
    });
    on('btn-clear-drawings', 'click', () => {
      if (typeof window.confirm === 'function' && !window.confirm(T.t('proConfirmClearDrawings'))) return;
      const key = symKey();
      S.drawings = S.drawings.filter((d) => d.symbol + '|' + d.tf !== key);
      draft = []; persist(); scheduleDraw(); toast(T.t('proToastDrawCleared'));
    });
    const ov = $('chart-overlay');
    if (ov) ov.addEventListener('click', (e) => {
      if (activeTool === 'cursor') return;
      const g = chartGeom(); if (!g) return;
      const rect = ov.getBoundingClientRect ? ov.getBoundingClientRect() : { left: 0, top: 0 };
      const x = e.clientX - (rect.left || 0); const y = e.clientY - (rect.top || 0);
      if (!g.mc._yP) return;
      const price = g.mc._yP(y);
      const idx = U.clamp(Math.floor((x - g.L.left) / g.bw), 0, g.view.bars.length - 1);
      const t = g.view.bars[idx] ? g.view.bars[idx].t : engine.s.replayTime;
      draft.push({ t, p: price });
      const need = (activeTool === 'hline' || activeTool === 'text') ? 1 : 2;
      if (draft.length >= need) {
        const text = activeTool === 'text' ? (($('input-notes') && $('input-notes').value || '').trim() || 'Note') : '';
        S.drawings.push({
          id: C.uid('d'), symbol: engine.symbol.id, tf: engine.s.tf, type: activeTool,
          points: draft.slice(0, need), text, color: '#7c6cff'
        });
        draft = []; persist(); toast(T.t('proToastDrawing'));
      }
      scheduleDraw();
    });

    // Strategies.
    on('btn-add-strategy', 'click', () => {
      const name = ($('input-strategy-name').value || '').trim().slice(0, 40);
      if (!name) return;
      S.strategies.push({ id: C.uid('s'), name }); $('input-strategy-name').value = '';
      persist(); renderStrategySelects(); renderStrategies(); toast(T.t('proToastSaved'));
    });
    on('input-strategy-name', 'keydown', (e) => { if (e.key === 'Enter') $('btn-add-strategy').click(); });
    on('filter-strategy', 'change', () => { S.strategyFilter = $('filter-strategy').value; persist(); RL.app.requestRender(); });
    const delStrategy = (id) => {
      S.strategies = S.strategies.filter((x) => x.id !== id);
      for (const k of Object.keys(S.assignments)) if (S.assignments[k] === id) delete S.assignments[k];
      if (S.strategyFilter === id) S.strategyFilter = 'all';
      persist(); renderStrategySelects(); renderStrategies(); RL.app.requestRender();
    };
    $('strategy-list').addEventListener('click', (e) => {
      const b = e.target.closest('[data-del-strategy]'); if (b) delStrategy(b.getAttribute('data-del-strategy'));
    });

    on('btn-run-rr', 'click', runRR);

    // Events.
    on('btn-add-event', 'click', () => {
      const raw = $('input-event-time').value;
      const t = raw ? Date.parse(raw + (raw.length === 16 ? ':00Z' : 'Z')) : NaN;
      const title = ($('input-event-title').value || '').trim().slice(0, 80) || 'Event';
      if (!Number.isFinite(t)) { toast(T.t('proToastError')); return; }
      S.events.push({ id: C.uid('e'), t, title, impact: $('sel-event-impact').value });
      $('input-event-title').value = '';
      persist(); renderEvents(); scheduleDraw(); toast(T.t('proToastSaved'));
    });
    on('btn-export-events', 'click', () => {
      U.download('kyoraku-replay-events.json', JSON.stringify(S.events, null, 2), 'application/json');
      toast(T.t('proToastExported'));
    });
    on('btn-import-events', 'click', () => { importMode = 'events'; $('file-events').click(); });
    on('btn-export-pro', 'click', () => {
      U.download('kyoraku-replay-pro.json', JSON.stringify(S, null, 2), 'application/json');
      toast(T.t('proToastExported'));
    });
    on('btn-import-pro', 'click', () => { importMode = 'pro'; $('file-events').click(); });
    on('file-events', 'change', (e) => {
      const file = e.target.files && e.target.files[0]; if (!file) return;
      readTextFile(file, (text) => {
        try {
          if (importMode === 'pro') {
            S = C.sanitize(JSON.parse(text)); persist();
            applyAccent(); for (const m of S.customTfs) C.registerCustomTf(m);
            syncIndicatorInputs(); renderStrategySelects(); renderStrategies(); renderInsights();
            renderEvents(); renderPending(); applyLayout(); RL.app.requestRender();
          } else {
            let arr;
            if (text.trim().startsWith('[')) arr = JSON.parse(text);
            else arr = text.split(/\r?\n/).filter(Boolean).slice(1).map((line) => {
              const parts = line.split(',');
              const t = Date.parse(parts[0]) || Number(parts[0]);
              return { t: Number.isFinite(t) ? t : 0, title: (parts[1] || 'Event').slice(0, 80), impact: (parts[2] || 'medium').trim() };
            });
            const clean = C.sanitize({ events: arr });
            S.events = clean.events.slice(0, 500); persist(); renderEvents(); scheduleDraw();
          }
          toast(T.t('proToastImported'));
        } catch (err) { toast(T.t('proImportProError')); }
        e.target.value = '';
      });
    });
    $('events-list').addEventListener('click', (e) => {
      const b = e.target.closest('[data-del-event]');
      if (b) { S.events = S.events.filter((x) => x.id !== b.getAttribute('data-del-event')); persist(); renderEvents(); scheduleDraw(); }
    });

    // Pending orders.
    on('sel-order-type', 'change', () => {
      const type = $('sel-order-type').value;
      const price = $('input-order-price');
      price.disabled = type === 'market';
      if (type !== 'market') {
        const bar = engine.currentBar();
        if (bar) price.value = (bar.c + (type === 'limit' ? -1 : 1) * engine.cfg.slPips * engine.symbol.pip).toFixed(engine.symbol.decimals + 2);
      }
    });
    on('btn-cancel-pending', 'click', () => {
      if (typeof window.confirm === 'function' && !window.confirm(T.t('proConfirmCancelOrders'))) return;
      S.pending = []; persist(); renderPending(); toast(T.t('proToastOrderCancelled'));
    });
    $('pending-list').addEventListener('click', (e) => {
      const b = e.target.closest('[data-del-order]');
      if (b) { S.pending = S.pending.filter((x) => x.id !== b.getAttribute('data-del-order')); persist(); renderPending(); }
    });

    // Trade review dialog (delegated from journal rows).
    on('journal-body', 'click', (e) => {
      const detail = e.target.closest('[data-detail]');
      if (detail) { openTradeDialog(detail.getAttribute('data-detail')); return; }
      const row = e.target.closest('tr[data-trade]');
      if (row && !e.target.closest('input, button')) openTradeDialog(row.getAttribute('data-trade'));
    });
    on('btn-trade-close', 'click', closeTradeDialog);
    on('btn-trade-done', 'click', closeTradeDialog);
    on('sel-trade-detail-strategy', 'change', () => {
      if (!currentTradeId) return;
      const v = $('sel-trade-detail-strategy').value;
      if (v === 'all') delete S.assignments[currentTradeId]; else S.assignments[currentTradeId] = v;
      persist(); renderStrategies(); RL.app.requestRender();
    });
    $('trade-checklist').addEventListener('change', (e) => {
      const el = e.target.closest('[data-check]'); if (!el || !currentTradeId) return;
      const idx = Number(el.getAttribute('data-check'));
      const items = S.checklists[currentTradeId] || [];
      if (items[idx]) { items[idx].done = !!el.checked; persist(); renderTradeDialog(); }
    });
    on('btn-add-checklist', 'click', () => {
      const text = ($('input-checklist-new').value || '').trim().slice(0, 100);
      if (!text) return;
      const item = { id: C.uid('i'), text, done: false };
      S.checklistTemplate.push({ id: item.id, text });
      if (currentTradeId) (S.checklists[currentTradeId] = S.checklists[currentTradeId] || []).push(item);
      $('input-checklist-new').value = '';
      persist(); renderTradeDialog(); toast(T.t('proToastSaved'));
    });
    on('btn-capture-shot', 'click', captureShot);
    on('btn-delete-shot', 'click', () => { if (currentTradeId) { delete S.screenshots[currentTradeId]; persist(); renderTradeDialog(); } });
    on('btn-jump-trade', 'click', () => {
      const tr = selectedTrades().find((x) => x.id === currentTradeId);
      if (tr) { RL.app.goToTime(tr.entryTime); closeTradeDialog(); RL.app.switchTab('journal'); }
    });

    // Shortcuts dialog.
    const shortcutsDlg = $('shortcuts-dialog');
    const openShortcuts = () => {
      if (!shortcutsDlg) return;
      if (typeof shortcutsDlg.showModal === 'function') shortcutsDlg.showModal();
      else shortcutsDlg.setAttribute('open', '');
    };
    on('btn-shortcuts', 'click', openShortcuts);
    on('btn-shortcuts-close', 'click', () => { if (shortcutsDlg && shortcutsDlg.close) shortcutsDlg.close(); else shortcutsDlg.removeAttribute('open'); });
    on('btn-shortcuts-ok', 'click', () => { if (shortcutsDlg && shortcutsDlg.close) shortcutsDlg.close(); else shortcutsDlg.removeAttribute('open'); });

    // Keyboard shortcuts (capture so Shift+Arrow does not double-step).
    document.addEventListener('keydown', (e) => {
      const tag = (e.target && e.target.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      const key = e.key;
      if (key === '?') { e.preventDefault(); openShortcuts(); return; }
      if (/^[1-9]$/.test(key)) {
        const tab = qsa('.tab')[Number(key) - 1];
        if (tab) { e.preventDefault(); RL.app.switchTab(tab.getAttribute('data-tab')); return; }
      }
      if (key === 'Shift' || (e.shiftKey && (key === 'ArrowLeft' || key === 'ArrowRight'))) {
        if (e.shiftKey && (key === 'ArrowLeft' || key === 'ArrowRight')) {
          e.preventDefault(); e.stopPropagation();
          RL.app.stopPlay();
          const dir = key === 'ArrowRight' ? 1 : -1;
          for (let i = 0; i < 10; i += 1) engine.step(dir);
        }
        return;
      }
      if (key === '[' || key === ']') {
        e.preventDefault();
        const speeds = [0.5, 1, 2, 5, 10, 20, 50, 100, 200];
        let i = speeds.indexOf(engine.ui.speed); if (i < 0) i = 1;
        i = U.clamp(i + (key === ']' ? 1 : -1), 0, speeds.length - 1);
        engine.ui.speed = speeds[i];
        const sel = $('sel-speed'); if (sel) sel.value = String(speeds[i]);
        engine.emit(); return;
      }
      if (key === 'l' || key === 'L') {
        e.preventDefault();
        S.layout = S.layout === 'single' ? 'dual' : (S.layout === 'dual' ? 'triple' : 'single');
        persist(); applyLayout(); return;
      }
      if (key === 'r' || key === 'R') { e.preventDefault(); RL.app.stopPlay(); engine.jumpBars(-20); return; }
      if (key === 'c' || key === 'C') { e.preventDefault(); engine.closeAll('manual'); engine.emit(); return; }
      if (key === 'Escape') { setTool('cursor'); }
    }, true);

    window.addEventListener('resize', () => {
      if (thirdChart) thirdChart.resize();
      renderThird(); scheduleDraw();
    });
  }

  function openTradeDialog(id) {
    const tr = selectedTrades().find((x) => x.id === id) || (engine ? engine.s.trades.find((x) => x.id === id) : null);
    if (!tr) { toast(T.t('proSelectTrade')); return; }
    currentTradeId = id;
    renderStrategySelects(); renderTradeDialog();
    const dlg = $('trade-dialog');
    if (!dlg) return;
    if (typeof dlg.showModal === 'function') dlg.showModal();
    else dlg.setAttribute('open', '');
  }
  function closeTradeDialog() {
    const dlg = $('trade-dialog');
    if (!dlg) return;
    if (typeof dlg.close === 'function') dlg.close(); else dlg.removeAttribute('open');
    currentTradeId = null;
  }

  function captureShot() {
    if (!currentTradeId) return;
    const main = $('chart-main'); if (!main) return;
    const keys = Object.keys(S.screenshots);
    if (!S.screenshots[currentTradeId] && keys.length >= 20) { toast(T.t('proToastShotFull')); return; }
    try {
      const tmp = document.createElement('canvas');
      const scale = Math.min(1, 360 / Math.max(1, main.width || 360));
      tmp.width = Math.max(1, Math.round((main.width || 360) * scale));
      tmp.height = Math.max(1, Math.round((main.height || 200) * scale));
      const ctx = tmp.getContext('2d');
      if (ctx && ctx.drawImage) ctx.drawImage(main, 0, 0, tmp.width, tmp.height);
      S.screenshots[currentTradeId] = tmp.toDataURL ? tmp.toDataURL('image/jpeg', 0.55) : '';
      if (!S.screenshots[currentTradeId]) delete S.screenshots[currentTradeId];
      persist(); renderTradeDialog(); toast(T.t('proToastShot'));
    } catch (err) { toast(T.t('proToastError')); }
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => init(60));
    else init(60);
  }
})(globalThis.RL = globalThis.RL || {});
