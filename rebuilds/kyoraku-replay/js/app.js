/* Kyoraku Replay - UI wiring. Local-first; the only network call is an opt-in live-data refresh. */
(function (RL) {
  'use strict';
  const U = RL.util;
  const D = RL.data;
  const I = RL.indicators;
  const A = RL.analytics;
  const E = RL.engine;
  const CH = RL.chart;
  const T = RL.i18n;

  const $ = (id) => document.getElementById(id);
  let engine = null;
  let mainChart = null;
  let htfChart = null;
  let playing = false;
  let lastFrame = 0;
  let accumulator = 0;
  let renderQueued = false;
  let pickMode = null;
  let toastTimer = null;
  let activeTab = 'journal';
  let booted = false;
  let lastPositionsHtml = '';
  let lastJournalHtml = '';
  let lastSessionSignature = '';

  /* ---------------- helpers ---------------- */

  function toast(message) {
    const el = $('toast');
    if (!el) return;
    el.textContent = message;
    el.classList.remove('hidden');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.add('hidden'), 2600);
  }

  const persist = U.debounce(() => {
    if (!engine) return;
    const result = engine.save();
    if (!result.ok) toast(T.t('toastStorage'));
  }, 500);

  function requestRender() {
    if (renderQueued) return;
    renderQueued = true;
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => { renderQueued = false; renderAll(); });
    } else { renderQueued = false; renderAll(); }
  }

  function on(id, event, handler) {
    const el = $(id);
    if (el) el.addEventListener(event, handler);
  }

  function numValue(id) {
    const el = $(id);
    if (!el) return NaN;
    const v = parseFloat(el.value);
    return Number.isFinite(v) ? v : NaN;
  }

  function cls(value) { return value > 0 ? 'pos' : (value < 0 ? 'neg' : ''); }
  function signed(value, digits) { return U.fmtSigned(value, digits); }

  function reasonLabel(reason) {
    if (!reason) return '—';
    if (reason.indexOf('sl') === 0) return T.t('reasonSl') + (reason.indexOf('gap') >= 0 ? ' · ' + T.t('reasonGap') : '');
    if (reason.indexOf('tp') === 0) return T.t('reasonTp') + (reason.indexOf('gap') >= 0 ? ' · ' + T.t('reasonGap') : '');
    if (reason === 'market-change') return T.t('reasonSwitch');
    if (reason === 'auto-partial') return T.t('reasonAutoPartial');
    if (reason === 'partial') return T.t('reasonPartial');
    return T.t('reasonManual');
  }

  function kpi(label, value, colorClass) {
    return '<div class="kpi"><span>' + U.escapeHtml(label) + '</span><b class="' + (colorClass || '') + '">' + value + '</b></div>';
  }

  /* ---------------- real market data ---------------- */

  function bundledRegistered(id) {
    const sym = D.symbolById(id);
    return !!(sym && sym.bundled);
  }

  function ensureBundled(id) {
    if (!RL.marketdata.bundledFor(id) || bundledRegistered(id)) return Promise.resolve(true);
    return RL.marketdata.loadBundled(id).then(() => true);
  }

  function applyMarket(id, tf) {
    stopPlay();
    engine.switchMarket(id, tf || engine.s.tf);
    buildSelects();
    syncInputs();
    updateSourceInfo();
    requestRender();
  }

  function updateSourceInfo() {
    const sym = engine.symbol || {};
    const badge = $('data-source');
    const meta = $('market-meta');
    if (badge) {
      let text = T.t('demoGroup');
      let kind = 'demo';
      if (sym.bundled) { text = 'REAL · MIT'; kind = 'real'; }
      else if (sym.real && sym.license === 'runtime') { text = 'LIVE · ' + (sym.source || 'Yahoo'); kind = 'live'; }
      else if (sym.custom) { text = 'CSV · ' + (sym.baseTf || '1m'); kind = 'demo'; }
      badge.textContent = text;
      badge.className = 'source-badge ' + kind;
    }
    if (meta) {
      const bits = [sym.id, 'base ' + (sym.baseTf || '1m'), 'pip ' + sym.pip, 'contract ' + sym.contract];
      if (sym.source) bits.push(sym.source);
      if (sym.license) bits.push(sym.license);
      meta.textContent = bits.join(' · ');
    }
  }

  /* ---------------- boot ---------------- */

  function boot() {
    if (booted) return;
    booted = true;
    const saved = E.storage.load();
    engine = new E.ReplayEngine(saved);
    T.set(engine.ui.lang);
    T.apply(document);
    $('btn-lang').textContent = T.t('lang');
    $('csv-format').textContent = 'CSV: time,open,high,low,close,volume  |  YYYY-MM-DD HH:mm  |  epoch (s/ms)  |  , ; TAB |';

    engine.loadMarket(engine.s.symbol, engine.s.tf);
    mainChart = new CH.CandleChart($('chart-main'), { label: engine.symbol.label, tf: engine.s.tf, decimals: engine.symbol.decimals, visible: 90 });
    htfChart = new CH.CandleChart($('chart-htf'), { label: engine.symbol.label, tf: engine.s.htf, decimals: engine.symbol.decimals, visible: 90, volume: false });
    mainChart.onPricePick = handlePricePick;
    htfChart.onPricePick = handlePricePick;

    buildSelects();
    syncInputs();
    bindEvents();
    engine.onChange = () => { persist(); requestRender(); };
    $('input-goto').value = utcInputValue(engine.s.replayTime);
    toggleHtfVisibility();
    updateSourceInfo();
    renderAll();
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(loop);
    // Real NQ E-mini data by default; silently stays on demo if offline file fails.
    tryInitialRealData();
  }

  function tryInitialRealData() {
    const first = RL.marketdata.bundled()[0];
    if (!first || engine.s.trades.length) return;
    ensureBundled(first.id).then(() => {
      if (engine.s.trades.length) return;
      applyMarket(first.id, D.effectiveTf(D.symbolById(first.id), engine.s.tf));
    }).catch(() => { /* demo data remains active */ });
  }

  function utcInputValue(t) {
    if (!U.isNum(t)) return '';
    const d = new Date(t);
    const p = (n) => String(n).padStart(2, '0');
    return d.getUTCFullYear() + '-' + p(d.getUTCMonth() + 1) + '-' + p(d.getUTCDate()) +
      'T' + p(d.getUTCHours()) + ':' + p(d.getUTCMinutes());
  }

  function buildSelects() {
    const symSel = $('sel-symbol');
    symSel.innerHTML = '';
    const marketNames = { forex: 'Forex', metal: 'Metal', crypto: 'Crypto', index: 'Index',
      futures: 'Futures', energy: 'Energy', custom: 'CSV' };
    const addOption = (parent, id, label) => {
      const opt = document.createElement('option');
      opt.value = id; opt.textContent = label;
      parent.appendChild(opt);
    };
    const realList = RL.marketdata.bundled();
    const realIds = new Set(realList.map((x) => x.id));

    const gReal = document.createElement('optgroup');
    gReal.label = T.t('realGroup');
    for (const m of realList) addOption(gReal, m.id, m.label + ' · ' + (marketNames[m.market] || m.market));
    symSel.appendChild(gReal);

    const gDemo = document.createElement('optgroup');
    gDemo.label = T.t('demoGroup');
    for (const sym of D.SYMBOLS) {
      if (sym.custom || realIds.has(sym.id)) continue;
      addOption(gDemo, sym.id, sym.label + ' · ' + (marketNames[sym.market] || sym.market));
    }
    symSel.appendChild(gDemo);

    const gCustom = document.createElement('optgroup');
    gCustom.label = T.t('customGroup');
    for (const sym of D.SYMBOLS) {
      if (sym.custom && !realIds.has(sym.id)) addOption(gCustom, sym.id, sym.label);
    }
    if (!gCustom.children.length) addOption(gCustom, 'MYDATA', '—');
    symSel.appendChild(gCustom);

    symSel.value = engine.s.symbol;
    if (!symSel.value || !D.symbolById(symSel.value)) symSel.value = 'EURUSD';

    const sym = D.symbolById(engine.s.symbol) || D.symbolById('EURUSD');
    const allowed = D.allowedTimeframes(sym);
    const fillTf = (id, selected) => {
      const el = $(id);
      el.innerHTML = '';
      for (const tf of allowed) {
        const opt = document.createElement('option');
        opt.value = tf; opt.textContent = tf;
        el.appendChild(opt);
      }
      el.value = D.effectiveTf(sym, selected);
      if (!el.value && allowed.length) el.value = allowed[0];
    };
    fillTf('sel-tf', engine.s.tf);
    fillTf('sel-htf', engine.s.htf);

    const liveSel = $('sel-live-asset');
    if (liveSel && liveSel.dataset.ready !== '1') {
      liveSel.innerHTML = '';
      for (const a of RL.marketdata.live()) addOption(liveSel, a.id, a.label + ' · ' + (marketNames[a.market] || a.market));
      liveSel.dataset.ready = '1';
    }
    const fillSimple = (id, values, selected) => {
      const el = $(id);
      if (!el || el.dataset.ready === '1') return;
      el.innerHTML = '';
      for (const v of values) {
        const opt = document.createElement('option');
        opt.value = typeof v === 'string' ? v : v[0];
        opt.textContent = typeof v === 'string' ? v : v[1];
        el.appendChild(opt);
      }
      el.value = selected;
      el.dataset.ready = '1';
    };
    fillSimple('sel-live-interval', ['1m', '5m', '15m', '30m', '1h', '1d'], '5m');
    fillSimple('sel-live-range', [['5d', '5d'], ['1mo', '1mo'], ['3mo', '3mo'],
      ['6mo', '6mo'], ['1y', '1y'], ['2y', '2y']], '1mo');
  }

  function syncInputs() {
    const c = engine.cfg;
    const p = engine.prop;
    const ui = engine.ui;
    $('input-balance').value = engine.s.initialBalance;
    $('input-risk').value = c.riskPct;
    $('input-spread').value = c.spreadPips;
    $('input-commission').value = c.commissionPerLot;
    $('input-slpips').value = c.slPips;
    $('input-rr').value = c.rr;
    $('input-ber').value = c.beR;
    $('chk-autobe').checked = c.autoBE;
    $('chk-trail').checked = c.trailEnabled;
    $('input-trail-start').value = c.trailStartR;
    $('input-trail-dist').value = c.trailDistPips;
    $('chk-autopartial').checked = c.autoPartial;
    $('input-partial-at').value = c.partialAtR;
    $('input-partial-pct').value = c.partialPct;
    $('trail-config').style.display = c.trailEnabled ? '' : 'none';
    $('partial-config').style.display = c.autoPartial ? '' : 'none';
    $('chk-prop').checked = p.enabled;
    $('input-target').value = p.targetPct;
    $('input-daily').value = p.dailyPct;
    $('input-total').value = p.totalPct;
    $('input-mindays').value = p.minDays;
    $('prop-config').style.display = p.enabled ? '' : 'none';
    const ind = ui.indicators;
    $('ind-sma20').checked = ind.sma20;
    $('ind-sma50').checked = ind.sma50;
    $('ind-ema20').checked = ind.ema20;
    $('ind-bollinger').checked = ind.bollinger;
    $('ind-vwap').checked = ind.vwap;
    $('ind-rsi').checked = ind.rsi;
    $('ind-volume').checked = ui.volume !== false;
    $('sel-speed').value = String(ui.speed);
    $('chk-htf').checked = ui.htf;
    $('input-goto').value = utcInputValue(engine.s.replayTime);
    buildSelects();
    fillCustomLevels();
  }

  /* ---------------- events ---------------- */

  function bindEvents() {
    on('btn-play', 'click', togglePlay);
    on('btn-next', 'click', () => { stopPlay(); engine.step(1); });
    on('btn-prev', 'click', () => { stopPlay(); engine.step(-1); });
    on('btn-rewind', 'click', () => { stopPlay(); engine.jumpBars(-20); });
    on('btn-reset', 'click', () => { stopPlay(); engine.resetSession(); toast(T.t('toastReset')); });
    on('btn-goto', 'click', () => {
      const raw = $('input-goto').value;
      if (!raw) return;
      const t = Date.parse(raw + (raw.length === 16 ? ':00Z' : 'Z'));
      if (!Number.isFinite(t)) return;
      stopPlay();
      engine.goTo(t);
    });
    on('sel-speed', 'change', () => { engine.ui.speed = U.clamp(numValue('sel-speed') || 1, 0.25, 50); persist(); });

    on('sel-symbol', 'change', () => {
      const id = $('sel-symbol').value;
      stopPlay();
      if (!RL.marketdata.bundledFor(id)) { applyMarket(id); return; }
      toast(T.t('toastRealLoading'));
      ensureBundled(id).then(() => {
        applyMarket(id);
        toast(T.t('toastRealOk') + ' · ' + id);
      }).catch((err) => {
        toast(T.t('toastRealError') + ': ' + (err && err.message ? err.message : ''));
        $('sel-symbol').value = engine.s.symbol;
      });
    });
    on('sel-tf', 'change', () => { stopPlay(); engine.switchMarket(engine.s.symbol, $('sel-tf').value); requestRender(); });
    on('sel-htf', 'change', () => {
      engine.s.htf = D.effectiveTf(engine.symbol, $('sel-htf').value);
      requestRender(); persist();
    });
    on('chk-htf', 'change', () => { engine.ui.htf = $('chk-htf').checked; toggleHtfVisibility(); requestRender(); persist(); });
    on('chk-trades', 'change', () => requestRender());

    const indMap = {
      'ind-sma20': 'sma20', 'ind-sma50': 'sma50', 'ind-ema20': 'ema20',
      'ind-bollinger': 'bollinger', 'ind-vwap': 'vwap', 'ind-rsi': 'rsi'
    };
    for (const id of Object.keys(indMap)) {
      on(id, 'change', () => { engine.ui.indicators[indMap[id]] = $(id).checked; requestRender(); persist(); });
    }
    on('ind-volume', 'change', () => { engine.ui.volume = $('ind-volume').checked; requestRender(); persist(); });

    const settingMap = {
      'input-risk': ['riskPct', 0.01, 100], 'input-spread': ['spreadPips', 0, 1000],
      'input-commission': ['commissionPerLot', 0, 10000], 'input-slpips': ['slPips', 0.1, 1e6],
      'input-rr': ['rr', 0.1, 100], 'input-ber': ['beR', 0.1, 20],
      'input-trail-start': ['trailStartR', 0.1, 20], 'input-trail-dist': ['trailDistPips', 0.1, 1e6],
      'input-partial-at': ['partialAtR', 0.1, 20], 'input-partial-pct': ['partialPct', 1, 99]
    };
    for (const id of Object.keys(settingMap)) {
      on(id, 'change', () => {
        const spec = settingMap[id];
        const v = numValue(id);
        if (!Number.isFinite(v)) return;
        engine.cfg[spec[0]] = U.clamp(v, spec[1], spec[2]);
        engine.recompute();
        fillCustomLevels();
        requestRender(); persist();
      });
    }
    on('input-balance', 'change', () => {
      const v = numValue('input-balance');
      if (!Number.isFinite(v) || v <= 0) return;
      engine.s.initialBalance = U.clamp(v, 1, 1e12);
      engine.recompute(); engine.emit();
    });
    on('chk-autobe', 'change', () => { engine.cfg.autoBE = $('chk-autobe').checked; persist(); });
    on('chk-trail', 'change', () => {
      engine.cfg.trailEnabled = $('chk-trail').checked;
      $('trail-config').style.display = engine.cfg.trailEnabled ? '' : 'none';
      requestRender(); persist();
    });
    on('chk-autopartial', 'change', () => {
      engine.cfg.autoPartial = $('chk-autopartial').checked;
      $('partial-config').style.display = engine.cfg.autoPartial ? '' : 'none';
      requestRender(); persist();
    });

    const propMap = {
      'input-target': ['targetPct', 0.1, 1000], 'input-daily': ['dailyPct', 0.1, 100],
      'input-total': ['totalPct', 0.1, 100], 'input-mindays': ['minDays', 0, 365]
    };
    for (const id of Object.keys(propMap)) {
      on(id, 'change', () => {
        const spec = propMap[id];
        const v = numValue(id);
        if (!Number.isFinite(v)) return;
        engine.prop[spec[0]] = U.clamp(v, spec[1], spec[2]);
        engine.recompute(); requestRender(); persist();
      });
    }
    on('chk-prop', 'change', () => {
      engine.prop.enabled = $('chk-prop').checked;
      $('prop-config').style.display = engine.prop.enabled ? '' : 'none';
      engine.recompute(); requestRender(); persist();
    });

    on('btn-buy', 'click', () => openTrade('buy'));
    on('btn-sell', 'click', () => openTrade('sell'));
    on('chk-custom-levels', 'change', () => {
      const onOff = $('chk-custom-levels').checked;
      $('input-sl-price').disabled = !onOff;
      $('input-tp-price').disabled = !onOff;
      $('btn-pick-sl').disabled = !onOff;
      $('btn-pick-tp').disabled = !onOff;
      if (onOff) fillCustomLevels();
      requestRender();
    });
    on('btn-pick-sl', 'click', () => setPick('sl'));
    on('btn-pick-tp', 'click', () => setPick('tp'));
    on('input-sl-price', 'change', () => requestRender());
    on('input-tp-price', 'change', () => requestRender());
    on('btn-close-all', 'click', () => { engine.closeAll('manual'); engine.emit(); });

    on('positions-list', 'click', (e) => {
      const part = e.target.closest('[data-partial]');
      if (part) {
        const id = part.getAttribute('data-partial');
        const pct = parseFloat(part.getAttribute('data-pct')) / 100;
        const child = engine.partialClose(id, pct);
        if (child) toast(T.t('toastPartial') + ' · ' + U.fmtNum(parseFloat(part.getAttribute('data-pct')), 0) + '%');
        return;
      }
      const btn = e.target.closest('[data-close]');
      if (btn) engine.closeTrade(btn.getAttribute('data-close'));
    });
    on('positions-list', 'change', (e) => {
      const el = e.target;
      const id = el.getAttribute('data-sl') || el.getAttribute('data-tp');
      if (!id) return;
      const v = parseFloat(el.value);
      if (!Number.isFinite(v) || v <= 0) return;
      const patch = {};
      if (el.hasAttribute('data-sl')) patch.slPrice = v; else patch.tpPrice = v;
      engine.modifyTrade(id, patch);
    });

    on('btn-save-session', 'click', () => {
      engine.saveSession();
      toast(T.t('toastSaved'));
      syncInputs();
    });
    on('btn-reset-session', 'click', () => { engine.resetSession(); toast(T.t('toastReset')); });
    on('btn-open-archive', 'click', () => {
      const id = $('sel-archive').value;
      if (id && engine.openArchived(id)) { buildSelects(); syncInputs(); }
    });
    on('btn-del-archive', 'click', () => {
      const id = $('sel-archive').value;
      if (id) engine.deleteArchived(id);
    });

    on('filter-session', 'change', () => { engine.ui.sessionFilter = $('filter-session').value; requestRender(); persist(); });
    on('filter-side', 'change', () => requestRender());
    on('filter-result', 'change', () => requestRender());
    on('filter-text', 'input', U.debounce(requestRender, 200));
    on('journal-body', 'change', (e) => {
      const el = e.target;
      const id = el.getAttribute('data-id');
      if (!id) return;
      if (el.classList.contains('cell-notes')) engine.editTrade(id, { notes: el.value });
      else if (el.classList.contains('cell-tags')) engine.editTrade(id, { tags: el.value });
    });
    on('journal-body', 'click', (e) => {
      const btn = e.target.closest('[data-del]');
      if (!btn) return;
      if (window.confirm('حذف هاد الصفقة؟ / Delete this trade?')) engine.deleteTrade(btn.getAttribute('data-del'));
    });
    on('btn-export-csv', 'click', exportTradesCsv);

    on('btn-mc', 'click', runMonteCarlo);

    on('btn-load-live', 'click', () => {
      const id = $('sel-live-asset').value;
      const interval = $('sel-live-interval').value;
      const range = $('sel-live-range').value;
      const status = $('live-status');
      status.className = 'live-status';
      status.textContent = T.t('toastRealLoading');
      RL.marketdata.loadLive(id, interval, range).then((result) => {
        applyMarket(result.symbol.id, D.effectiveTf(result.symbol, interval));
        status.className = 'live-status ok';
        status.textContent = T.t('toastLiveOk') + ' · ' + result.symbol.id + ' · ' +
          result.bars.toLocaleString() + ' bars · ' + result.symbol.source;
        toast(T.t('toastLiveOk'));
      }).catch((err) => {
        status.className = 'live-status err';
        status.textContent = T.t('toastLiveError') + ' — ' + (err && err.message ? err.message : '');
        toast(T.t('toastLiveError'));
      });
    });
    on('btn-load-csv', 'click', () => $('file-csv').click());
    on('file-csv', 'change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      readTextFile(file, (text) => {
        try {
          const fields = {
            id: ($('csv-symbol').value || 'MYDATA').toUpperCase().replace(/[^A-Z0-9_]/g, '').slice(0, 20),
            name: ($('csv-symbol').value || 'MYDATA'),
            pip: numValue('csv-pip') || 0.0001,
            contract: numValue('csv-contract') || 1,
            decimals: U.clamp(Math.round(numValue('csv-decimals') || 5), 0, 8)
          };
          fields.label = fields.id;
          const result = engine.addCustomDataset(text, fields);
          buildSelects();
          $('sel-symbol').value = result.symbol.id;
          engine.switchMarket(result.symbol.id, engine.s.tf);
          syncInputs();
          toast(T.t('toastCsv') + ' (' + result.count.toLocaleString() + ')');
        } catch (err) { toast(T.t('toastCsvError') + ': ' + (err && err.message ? err.message : '')); }
        e.target.value = '';
      });
    });
    on('btn-export-json', 'click', () => {
      U.download('kyoraku-replay-backup.json', JSON.stringify(engine.toJSON(), null, 2), 'application/json');
      toast(T.t('toastExport'));
    });
    on('btn-import-json', 'click', () => $('file-json').click());
    on('file-json', 'change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      readTextFile(file, (text) => {
        try {
          const parsed = JSON.parse(text);
          const clean = E.sanitize(parsed);
          E.storage.save(clean);
          window.location.reload();
        } catch (err) { toast(T.t('toastJsonError')); }
        e.target.value = '';
      });
    });
    on('btn-export-png', 'click', () => {
      const url = mainChart && mainChart.toDataURL();
      if (!url) return;
      const a = document.createElement('a');
      a.href = url;
      a.download = 'kyoraku-replay-chart.png';
      document.body.appendChild(a); a.click(); a.remove();
      toast(T.t('toastExport'));
    });
    on('btn-clear-all', 'click', () => {
      if (!window.confirm('امسح كل الجلسات والبيانات؟ / Clear all local data?')) return;
      E.storage.clear();
      window.location.reload();
    });

    const tabs = document.querySelectorAll('.tab');
    for (const tab of tabs) {
      tab.addEventListener('click', () => {
        activeTab = tab.getAttribute('data-tab');
        for (const t of tabs) t.classList.toggle('active', t === tab);
        for (const p of document.querySelectorAll('.tab-panel')) {
          p.classList.toggle('hidden', p.getAttribute('data-panel') !== activeTab);
        }
        requestRender();
      });
    }

    on('btn-help', 'click', () => {
      const dlg = $('help-dialog');
      if (dlg && typeof dlg.showModal === 'function') dlg.showModal();
      else if (dlg) dlg.setAttribute('open', '');
    });
    on('btn-help-close', 'click', closeHelp);
    on('btn-help-ok', 'click', closeHelp);
    on('btn-lang', 'click', () => {
      const next = T.lang === 'ar' ? 'en' : 'ar';
      T.set(next);
      engine.ui.lang = next;
      T.apply(document);
      $('btn-lang').textContent = T.t('lang');
      persist();
      renderAll();
    });

    document.addEventListener('keydown', (e) => {
      const tag = (e.target && e.target.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
      else if (e.key === 'ArrowRight') { stopPlay(); engine.step(1); }
      else if (e.key === 'ArrowLeft') { stopPlay(); engine.step(-1); }
      else if (e.key === 'b' || e.key === 'B') openTrade('buy');
      else if (e.key === 's' || e.key === 'S') openTrade('sell');
      else if (e.key === 'Escape') { setPick(null); closeHelp(); }
    });
    window.addEventListener('resize', () => { if (mainChart) mainChart.resize(); if (htfChart) htfChart.resize(); });
  }

  function closeHelp() {
    const dlg = $('help-dialog');
    if (!dlg) return;
    if (typeof dlg.close === 'function') dlg.close();
    else dlg.removeAttribute('open');
  }

  function readTextFile(file, callback) {
    if (typeof FileReader === 'undefined') { toast(T.t('toastCsvError')); return; }
    const reader = new FileReader();
    reader.onload = () => callback(String(reader.result || ''));
    reader.onerror = () => toast(T.t('toastCsvError'));
    reader.readAsText(file);
  }

  function toggleHtfVisibility() {
    const visible = engine.ui.htf;
    $('htf-wrap').classList.toggle('hidden', !visible);
    if (visible && htfChart) setTimeout(() => htfChart.resize(), 0);
  }

  /* ---------------- replay loop ---------------- */

  function togglePlay() { playing ? stopPlay() : startPlay(); }
  function startPlay() {
    playing = true;
    accumulator = 0;
    $('btn-play').textContent = T.t('pause');
    $('btn-play').classList.add('playing');
  }
  function stopPlay() {
    if (!playing) return;
    playing = false;
    $('btn-play').textContent = T.t('play');
    $('btn-play').classList.remove('playing');
  }

  function loop(ts) {
    if (!lastFrame) lastFrame = ts;
    const dt = Math.min(120, ts - lastFrame);
    lastFrame = ts;
    if (playing && engine) {
      accumulator += dt;
      const interval = 620 / engine.ui.speed;
      let steps = 0;
      while (accumulator >= interval && steps < 25) {
        accumulator -= interval;
        steps += 1;
        if (!engine.step(1)) {
          stopPlay();
          toast(T.t('toastNoFuture'));
          break;
        }
      }
    }
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(loop);
  }

  /* ---------------- trading ---------------- */

  function defaultLevels(side) {
    const bar = engine.currentBar();
    if (!bar) return { sl: 0, tp: 0, entry: 0 };
    const dir = side === 'buy' ? 1 : -1;
    const entry = U.round(bar.c + dir * engine.halfSpread(), engine.symbol.decimals + 2);
    const sl = U.round(entry - dir * engine.cfg.slPips * engine.symbol.pip, engine.symbol.decimals + 2);
    const tp = U.round(entry + dir * Math.abs(entry - sl) * engine.cfg.rr, engine.symbol.decimals + 2);
    return { sl, tp, entry };
  }

  function fillCustomLevels() {
    if (!engine || !engine.ready) return;
    const lv = defaultLevels('buy');
    if (!$('chk-custom-levels').checked) return;
    $('input-sl-price').value = lv.sl;
    $('input-tp-price').value = lv.tp;
  }

  function activeLevels(side) {
    const lv = defaultLevels(side);
    if ($('chk-custom-levels').checked) {
      const sl = numValue('input-sl-price');
      const tp = numValue('input-tp-price');
      if (Number.isFinite(sl) && sl > 0) lv.sl = sl;
      if (Number.isFinite(tp) && tp > 0) lv.tp = tp;
      // mirror a custom stop/target to the other side, keeping the distance
      if (side === 'sell') {
        const buyLv = defaultLevels('buy');
        if (Number.isFinite(sl) && sl > 0) lv.sl = U.round(lv.entry + Math.abs(buyLv.entry - sl), engine.symbol.decimals + 2);
        if (Number.isFinite(tp) && tp > 0) lv.tp = U.round(lv.entry - Math.abs(tp - buyLv.entry), engine.symbol.decimals + 2);
      }
    }
    return lv;
  }

  function openTrade(side) {
    const lv = activeLevels(side);
    const opts = { slPrice: lv.sl, tpPrice: lv.tp };
    const tags = $('input-tags').value;
    const notes = $('input-notes').value;
    if (tags) opts.tags = tags.split(',').map((x) => x.trim()).filter(Boolean).slice(0, 8);
    if (notes) opts.notes = notes;
    const result = engine.openTrade(side, opts);
    if (!result.ok) toast(T.t(result.error === 'bad-levels' ? 'toastBadLevels' : 'toastCsvError'));
    else toast(T.t('toastTrade'));
  }

  function setPick(mode) {
    pickMode = mode;
    if (mainChart) mainChart.setPick(mode);
    if (htfChart) htfChart.setPick(null);
    $('btn-pick-sl').classList.toggle('active', mode === 'sl');
    $('btn-pick-tp').classList.toggle('active', mode === 'tp');
  }

  function handlePricePick(mode, price) {
    if (mode === 'sl') $('input-sl-price').value = price;
    else $('input-tp-price').value = price;
    setPick(null);
    requestRender();
  }

  /* ---------------- renderers ---------------- */

  function renderAll() {
    if (!engine || !engine.ready) return;
    renderStatus();
    renderCharts();
    renderOrderInfo();
    renderPositions();
    renderSessionSelects();
    if (activeTab === 'journal') renderJournal();
    if (activeTab === 'analytics') renderAnalytics();
    if (activeTab === 'propfirm') renderPropFirm();
    if (document.activeElement !== $('input-goto')) $('input-goto').value = utcInputValue(engine.s.replayTime);
  }

  function renderStatus() {
    $('stat-time').textContent = U.fmtTime(engine.s.replayTime) + ' UTC';
    $('stat-balance').textContent = U.fmtMoney(engine.s.balance);
    const eq = engine.equity();
    const eqEl = $('stat-equity');
    eqEl.textContent = U.fmtMoney(eq);
    eqEl.className = cls(eq - engine.s.initialBalance);
    const dd = engine.s.maxDrawdownPct || 0;
    $('stat-dd').textContent = U.fmtNum(dd * 100, 1) + '%';
    $('btn-play').textContent = playing ? T.t('pause') : T.t('play');
    updateSourceInfo();
  }

  function renderCharts() {
    const bars = engine.visibleBars();
    const built = I.build(bars, engine.ui.indicators);
    mainChart.opts.volume = $('ind-volume').checked;
    mainChart.opts.rsi = !!engine.ui.indicators.rsi;
    mainChart.opts.showTrades = $('chk-trades').checked;
    mainChart.setData({
      bars, overlays: built.overlays, rsi: built.rsi,
      trades: engine.s.trades, replayTime: engine.s.replayTime,
      decimals: engine.symbol.decimals, label: engine.symbol.label, tf: engine.s.tf
    });
    $('chart-label').textContent = engine.symbol.label + ' · ' + engine.s.tf + ' · ' +
      U.fmtTime(engine.s.replayTime) + ' UTC';
    if (engine.ui.htf && htfChart) {
      const htfAll = D.getBars(engine.symbol.id, D.TF_MS[engine.s.htf] ? engine.s.htf : '1h');
      const htfBars = engine.visibleBars(htfAll);
      const htfInd = I.build(htfBars, { sma20: true });
      htfChart.opts.rsi = false;
      htfChart.opts.showTrades = $('chk-trades').checked;
      htfChart.setData({
        bars: htfBars, overlays: htfInd.overlays, rsi: null,
        trades: engine.s.trades, replayTime: engine.s.replayTime,
        decimals: engine.symbol.decimals, label: engine.symbol.label + ' HTF', tf: engine.s.htf
      });
    }
  }

  function renderOrderInfo() {
    const lv = activeLevels('buy');
    const dist = Math.abs(lv.entry - lv.sl);
    const planned = Math.max(0.01, (engine.s.balance * engine.cfg.riskPct) / 100);
    const size = dist > 0 ? U.clamp(planned / (dist * engine.symbol.contract), 0.01, 1000) : 0;
    $('info-size').textContent = U.fmtNum(size, 4) + ' lot';
    $('info-risk').textContent = U.fmtMoney(planned);
    $('info-levels').textContent = U.fmtPrice(lv.sl, engine.symbol.decimals) + ' / ' + U.fmtPrice(lv.tp, engine.symbol.decimals);
    $('info-rr').textContent = dist > 0 ? '1 : ' + U.fmtNum(Math.abs(lv.tp - lv.entry) / dist, 2) : '--';
  }

  function renderPositions() {
    const box = $('positions-list');
    const open = engine.s.trades.filter((t) => t.status === 'open');
    if (!open.length) {
      const emptyHtml = '<div class="no-data-hint">' + T.t('noPositions') + '</div>';
      if (emptyHtml !== lastPositionsHtml) { box.innerHTML = emptyHtml; lastPositionsHtml = emptyHtml; }
      return;
    }
    const bar = engine.currentBar();
    const half = engine.halfSpread();
    let html = '';
    for (const tr of open.slice().reverse()) {
      const dir = tr.side === 'buy' ? 1 : -1;
      const mark = bar ? bar.c - dir * half : tr.entryPrice;
      const pnl = engine.pnlFor(tr, mark);
      const r = tr.riskAmount > 0 ? pnl / tr.riskAmount : 0;
      html += '<div class="position-card">' +
        '<div class="row"><span class="' + (tr.side === 'buy' ? 'side-buy' : 'side-sell') + '"><b>' +
        (tr.side === 'buy' ? 'LONG' : 'SHORT') + '</b> ' + tr.symbol + '</span><span>' + U.fmtNum(tr.size, 3) + ' lot</span></div>' +
        '<div class="row"><span>' + U.fmtPrice(tr.entryPrice, tr.decimals) + '</span><span class="' + cls(pnl) + '">' + U.fmtMoney(pnl) + ' (' + signed(r, 2) + 'R)</span></div>' +
        '<div class="row"><label>SL <input class="cell-tags" style="width:92px" data-sl="' + tr.id + '" type="number" step="any" value="' + U.fmtPrice(tr.sl, tr.decimals) + '"></label>' +
        '<label>TP <input class="cell-tags" style="width:92px" data-tp="' + tr.id + '" type="number" step="any" value="' + U.fmtPrice(tr.tp, tr.decimals) + '"></label></div>' +
        (tr.trailActive ? '<div class="row"><span class="trail-tag">↗ TRAIL ACTIVE · ' + U.fmtPrice(tr.sl, tr.decimals) + '</span></div>' : '') +
        (tr.partialCount ? '<div class="row"><span class="trail-tag">' + T.t('partialHint') + ' ' + tr.partialCount + ' · ' +
          U.fmtNum(tr.size, 4) + ' / ' + U.fmtNum(tr.originalSize, 4) + ' lot</span></div>' : '') +
        '<div class="partial-row">' +
        '<button data-partial="' + tr.id + '" data-pct="25">25%</button>' +
        '<button data-partial="' + tr.id + '" data-pct="50">50%</button>' +
        '<button data-partial="' + tr.id + '" data-pct="75">75%</button></div>' +
        '<button data-close="' + tr.id + '">' + T.t('close') + '</button></div>';
    }
    if (html !== lastPositionsHtml) { box.innerHTML = html; lastPositionsHtml = html; }
  }

  function renderSessionSelects() {
    const sessions = engine.allSessions();
    const signature = T.lang + '|' + engine.ui.sessionFilter + '|' +
      sessions.map((x) => x.id + ':' + x.session.trades.length).join(',');
    if (signature === lastSessionSignature) return;
    lastSessionSignature = signature;
    const arch = $('sel-archive');
    const prevArch = arch.value;
    arch.innerHTML = '';
    for (const item of sessions.slice(1)) {
      const opt = document.createElement('option');
      opt.value = item.id; opt.textContent = item.label;
      arch.appendChild(opt);
    }
    if (prevArch) arch.value = prevArch;
    if (!arch.children.length) {
      const opt = document.createElement('option');
      opt.value = ''; opt.textContent = '—';
      arch.appendChild(opt);
    }
    const filter = $('filter-session');
    const prev = engine.ui.sessionFilter;
    filter.innerHTML = '';
    for (const item of sessions) {
      const opt = document.createElement('option');
      opt.value = item.id;
      opt.textContent = item.id === 'active' ? T.t('thisSession') : item.label;
      filter.appendChild(opt);
    }
    const allOpt = document.createElement('option');
    allOpt.value = 'all'; allOpt.textContent = T.t('allSessions');
    filter.appendChild(allOpt);
    filter.value = prev;
  }

  function filteredTrades() {
    const side = $('filter-side').value;
    const result = $('filter-result').value;
    const text = ($('filter-text').value || '').trim().toLowerCase();
    return engine.selectedTrades().filter((t) => {
      if (side !== 'all' && t.side !== side) return false;
      if (result === 'win' && !(t.status === 'closed' && t.pnl > 0)) return false;
      if (result === 'loss' && !(t.status === 'closed' && t.pnl <= 0)) return false;
      if (text) {
        const hay = (t.notes + ' ' + (t.tags || []).join(' ') + ' ' + t.symbol).toLowerCase();
        if (hay.indexOf(text) < 0) return false;
      }
      return true;
    });
  }

  function renderJournal() {
    const body = $('journal-body');
    const trades = filteredTrades().slice().reverse();
    if (!trades.length) {
      const emptyHtml = '<tr><td colspan="10" class="no-data-hint">' + T.t('noPositions') + '</td></tr>';
      if (emptyHtml !== lastJournalHtml) { body.innerHTML = emptyHtml; lastJournalHtml = emptyHtml; }
      return;
    }
    let html = '';
    for (const tr of trades.slice(0, 500)) {
      const pnl = tr.status === 'closed' ? tr.pnl : null;
      html += '<tr>' +
        '<td>' + U.escapeHtml(tr.id) + '</td>' +
        '<td>' + U.escapeHtml(tr.symbol) + '</td>' +
        '<td class="' + (tr.side === 'buy' ? 'side-buy' : 'side-sell') + '">' + (tr.side === 'buy' ? 'Long' : 'Short') + '</td>' +
        '<td>' + U.fmtPrice(tr.entryPrice, tr.decimals) + '<br><small>' + U.fmtTime(tr.entryTime) + '</small></td>' +
        '<td>' + (tr.status === 'closed' ? U.fmtPrice(tr.exitPrice, tr.decimals) + '<br><small>' + U.fmtTime(tr.exitTime) + '</small>' : '—') + '</td>' +
        '<td class="' + (pnl == null ? '' : cls(pnl)) + '">' + (pnl == null ? T.t('openNow') : U.fmtMoney(pnl)) + '</td>' +
        '<td class="' + (pnl == null ? '' : cls(tr.r)) + '">' + (pnl == null ? '—' : signed(tr.r, 2) + 'R') + '</td>' +
        '<td>' + (tr.status === 'closed' ? reasonLabel(tr.exitReason) : '—') + '</td>' +
        '<td><input class="cell-tags" data-id="' + tr.id + '" value="' + U.escapeHtml((tr.tags || []).join(', ')) + '" placeholder="tags">' +
        '<input class="cell-input" data-id="' + tr.id + '" value="' + U.escapeHtml(tr.notes || '') + '" placeholder="notes"></td>' +
        '<td><button class="mini-btn danger" data-del="' + tr.id + '">✕</button></td></tr>';
    }
    if (html !== lastJournalHtml) { body.innerHTML = html; lastJournalHtml = html; }
  }

  function renderAnalytics() {
    const stats = A.compute(engine.selectedTrades(), engine.s.initialBalance);
    const empty = $('analytics-empty');
    const content = $('analytics-content');
    if (!stats.total) { empty.classList.remove('hidden'); content.classList.add('hidden'); return; }
    empty.classList.add('hidden');
    content.classList.remove('hidden');
    const pf = Number.isFinite(stats.profitFactor) ? U.fmtNum(stats.profitFactor, 2) : '∞';
    $('kpi-grid').innerHTML =
      kpi(T.t('netPnl'), U.fmtMoney(stats.net), cls(stats.net)) +
      kpi(T.t('winRate'), U.fmtNum(stats.winRate * 100, 1) + '%') +
      kpi(T.t('profitFactor'), pf) +
      kpi(T.t('avgR'), signed(stats.avgR, 2) + 'R', cls(stats.avgR)) +
      kpi(T.t('expectancy'), U.fmtMoney(stats.expectancy), cls(stats.expectancy)) +
      kpi(T.t('maxDDStat'), U.fmtNum(stats.maxDDPct * 100, 1) + '%', 'neg') +
      kpi(T.t('tradesCount'), String(stats.total)) +
      kpi(T.t('longShort'), String(stats.longs + ' / ' + stats.shorts));
    CH.lineChart($('canvas-equity'), stats.curve.map((p) => p.eq), {
      zero: engine.s.initialBalance,
      color: stats.net >= 0 ? CH.colors.up : CH.colors.down,
      leftLabel: U.fmtMoney(engine.s.initialBalance),
      rightLabel: U.fmtMoney(stats.finalEquity)
    });
    CH.histogram($('canvas-rhist'), stats.rs, { bins: 16, title: 'R multiple' });
    const hours = [];
    for (let h = 0; h < 24; h += 1) hours.push(String(h).padStart(2, '0'));
    CH.barChart($('canvas-hour'), stats.byHour, { labels: hours });
    CH.barChart($('canvas-weekday'), stats.byWeekday, { labels: T.t('dayNames') });
    renderCalendar(stats.byDay);
  }

  function renderCalendar(byDay) {
    const box = $('pnl-calendar');
    const keys = Object.keys(byDay).sort();
    if (!keys.length) { box.innerHTML = ''; return; }
    const months = {};
    for (const k of keys) months[k.slice(0, 7)] = true;
    const monthList = Object.keys(months).sort().slice(-6);
    let html = '';
    for (const month of monthList) {
      const [y, m] = month.split('-').map(Number);
      const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
      const firstDay = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
      let cells = '';
      for (let i = 0; i < firstDay; i += 1) cells += '<div class="cal-cell empty-day"></div>';
      for (let d = 1; d <= days; d += 1) {
        const key = month + '-' + String(d).padStart(2, '0');
        const pnl = byDay[key];
        const c = pnl == null ? '' : (pnl > 0 ? 'win' : (pnl < 0 ? 'loss' : ''));
        const title = pnl == null ? key : key + ': ' + U.fmtMoney(pnl);
        cells += '<div class="cal-cell ' + c + '" title="' + U.escapeHtml(title) + '">' + d + '</div>';
      }
      html += '<div class="cal-month"><h5>' + month + '</h5><div class="cal-grid">' + cells + '</div></div>';
    }
    box.innerHTML = html;
  }

  function runMonteCarlo() {
    const trades = U.clamp(Math.round(numValue('mc-trades') || 100), 1, 5000);
    const runs = U.clamp(Math.round(numValue('mc-runs') || 1000), 10, 5000);
    const mc = A.monteCarlo(engine.selectedTrades(), {
      trades, runs, initialBalance: engine.s.initialBalance,
      ddLimitPct: engine.prop.enabled ? engine.prop.totalPct : 10
    });
    if (!mc.ok) { toast(T.t('toastNeedTrades')); $('mc-results').innerHTML = ''; return; }
    $('mc-results').innerHTML =
      kpi(T.t('mcP5'), U.fmtMoney(mc.p5), cls(mc.p5 - mc.start)) +
      kpi(T.t('mcMedian'), U.fmtMoney(mc.p50), cls(mc.p50 - mc.start)) +
      kpi(T.t('mcP95'), U.fmtMoney(mc.p95), cls(mc.p95 - mc.start)) +
      kpi(T.t('mcProfitable'), U.fmtNum(mc.probProfit * 100, 1) + '%', 'pos') +
      kpi(T.t('mcBust'), U.fmtNum(mc.probBust * 100, 1) + '%', 'neg') +
      kpi(T.t('maxDDStat'), U.fmtNum(mc.medianMaxDD * 100, 1) + '%', 'neg');
    CH.histogram($('canvas-mc'), mc.finals, { bins: 24, title: U.fmtMoney(mc.min) + ' → ' + U.fmtMoney(mc.max) });
  }

  function renderPropFirm() {
    const box = $('prop-card');
    const s = engine.s;
    const p = engine.prop;
    if (!p.enabled) {
      box.innerHTML = '<p class="note">' + T.t('propEnable') + ' — ' + T.t('thisSession') + '</p>';
      return;
    }
    const pr = s.propProgress || {};
    const statusKey = s.propStatus === 'passed' ? 'propPassed' : (s.propStatus === 'failed' ? 'propFailed' : 'propActive');
    const pct = (a, b) => (b > 0 ? U.clamp((a / b) * 100, 0, 100) : 0);
    const bar = (label, value, max, warn) => {
      const pctValue = pct(value, max);
      const color = pctValue >= 90 ? 'bad' : (warn ? 'warn' : '');
      return '<div class="bar-row"><div class="bar-label"><span>' + U.escapeHtml(label) + '</span><span>' +
        U.fmtNum(value, 1) + ' / ' + U.fmtNum(max, 1) + '</span></div>' +
        '<div class="bar-track"><div class="bar-fill ' + color + '" style="width:' + U.fmtNum(pctValue, 1) + '%"></div></div></div>';
    };
    let html = '<div class="inline-form" style="align-items:center"><span>' + T.t('propStatus') + '</span>' +
      '<span class="prop-status ' + s.propStatus + '">' + T.t(statusKey) + '</span></div>';
    html += bar(T.t('propProgress'), Math.max(0, pr.profitPct || 0), pr.targetPct || 8, false);
    html += bar(T.t('tradingDays'), pr.tradingDays || 0, pr.minDays || 3, false);
    html += bar(T.t('dailyUse'), pr.dailyUse || 0, pr.dailyPct || 5, true);
    html += bar(T.t('totalUse'), pr.totalUse || 0, pr.totalPct || 10, true);
    html += '<h4 class="section-title">' + T.t('propViolations') + '</h4>';
    const violations = s.violations || [];
    if (!violations.length) html += '<p class="note">' + T.t('noViolations') + '</p>';
    else for (const v of violations) html += '<div class="violation">' + U.escapeHtml(v.day) + ' · ' + U.escapeHtml(v.message) + '</div>';
    box.innerHTML = html;
  }

  /* ---------------- exports ---------------- */

  function exportTradesCsv() {
    const rows = [['id', 'session', 'symbol', 'side', 'entry_time_utc', 'entry', 'exit_time_utc', 'exit', 'size', 'sl', 'tp', 'pnl', 'r', 'reason', 'tags', 'notes']];
    for (const t of filteredTrades()) {
      rows.push([
        t.id, t.sessionId, t.symbol, t.side, U.fmtTime(t.entryTime), t.entryPrice,
        t.status === 'closed' ? U.fmtTime(t.exitTime) : '', t.status === 'closed' ? t.exitPrice : '',
        t.size, t.sl, t.tp, t.status === 'closed' ? t.pnl : '', t.status === 'closed' ? t.r : '',
        t.exitReason || '', (t.tags || []).join('|'), (t.notes || '').replace(/[\r\n]+/g, ' ')
      ]);
    }
    const csv = rows.map((r) => r.map((cell) => {
      const s = String(cell == null ? '' : cell);
      return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    }).join(',')).join('\r\n');
    U.download('kyoraku-replay-trades.csv', csv, 'text/csv;charset=utf-8');
    toast(T.t('toastExport'));
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
  }
})(globalThis.RL = globalThis.RL || {});
