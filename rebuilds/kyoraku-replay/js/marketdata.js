/* Kyoraku Replay - real market data catalog + loaders.
   Bundled MIT data works offline; live Yahoo data is optional and explicit. */
(function (RL) {
  'use strict';
  const D = RL.data;
  const U = RL.util;

  /* Optional live feed. Same ids as the bundled files are refreshed in place;
     extra ids are live-only. Yahoo symbols are whitelisted server-side. */
  const LIVE = [
    { id: 'NQ', yahoo: 'NQ=F', label: 'NQ=F · CME', name: 'ناسداك 100 فيوتشرز (مباشر)', market: 'futures', pip: 0.25, contract: 20, decimals: 2 },
    { id: 'MNQ', yahoo: 'MNQ=F', label: 'MNQ=F · Micro', name: 'ميكرو ناسداك (مباشر)', market: 'futures', pip: 0.25, contract: 2, decimals: 2 },
    { id: 'ES', yahoo: 'ES=F', label: 'ES=F · CME', name: 'E-mini S&P 500 (مباشر)', market: 'futures', pip: 0.25, contract: 50, decimals: 2 },
    { id: 'MES', yahoo: 'MES=F', label: 'MES=F · Micro', name: 'ميكرو S&P 500 (مباشر)', market: 'futures', pip: 0.25, contract: 5, decimals: 2 },
    { id: 'YM', yahoo: 'YM=F', label: 'YM=F · CME', name: 'E-mini داو (مباشر)', market: 'futures', pip: 1, contract: 5, decimals: 2 },
    { id: 'NAS100USD', yahoo: '^NDX', label: '^NDX · مؤشر', name: 'مؤشر ناسداك 100 (مباشر)', market: 'index', pip: 0.1, contract: 1, decimals: 2 },
    { id: 'US30', yahoo: '^DJI', label: '^DJI · مؤشر', name: 'مؤشر داو جونز (مباشر)', market: 'index', pip: 1, contract: 1, decimals: 2 },
    { id: 'SPX500', yahoo: '^GSPC', label: '^GSPC · مؤشر', name: 'مؤشر S&P 500 (مباشر)', market: 'index', pip: 0.1, contract: 1, decimals: 2 },
    { id: 'GER30', yahoo: '^GDAXI', label: '^GDAXI · مؤشر', name: 'مؤشر داكس (مباشر)', market: 'index', pip: 0.1, contract: 1, decimals: 2 },
    { id: 'JPN225', yahoo: '^N225', label: '^N225 · مؤشر', name: 'مؤشر نيكاي (مباشر)', market: 'index', pip: 1, contract: 1, decimals: 2 },
    { id: 'VIX', yahoo: '^VIX', label: '^VIX', name: 'مؤشر التقلب (مباشر)', market: 'index', pip: 0.01, contract: 1, decimals: 2 },
    { id: 'EURUSD', yahoo: 'EURUSD=X', label: 'EUR/USD', name: 'يورو / دولار (مباشر)', market: 'forex', pip: 0.0001, contract: 100000, decimals: 5 },
    { id: 'GBPJPY', yahoo: 'GBPJPY=X', label: 'GBP/JPY', name: 'جنيه / ين (مباشر)', market: 'forex', pip: 0.01, contract: 1000, decimals: 3 },
    { id: 'USDJPY', yahoo: 'USDJPY=X', label: 'USD/JPY', name: 'دولار / ين (مباشر)', market: 'forex', pip: 0.01, contract: 1000, decimals: 3 },
    { id: 'XAUUSD', yahoo: 'GC=F', label: 'GC=F · ذهب', name: 'ذهب CME فيوتشرز (مباشر)', market: 'metal', pip: 0.1, contract: 100, decimals: 2 },
    { id: 'USOIL', yahoo: 'CL=F', label: 'CL=F · نفط', name: 'نفط WTI فيوتشرز (مباشر)', market: 'energy', pip: 0.01, contract: 1000, decimals: 2 },
    { id: 'BTCUSD', yahoo: 'BTC-USD', label: 'BTC/USD', name: 'بيتكوين (مباشر)', market: 'crypto', pip: 1, contract: 1, decimals: 2 },
    { id: 'ETHUSD', yahoo: 'ETH-USD', label: 'ETH/USD', name: 'إيثيريوم (مباشر)', market: 'crypto', pip: 0.01, contract: 1, decimals: 2 }
  ];

  const MARKET_LABEL = { futures: 'Futures', index: 'Indices', forex: 'Forex', metal: 'Metals', energy: 'Energy', crypto: 'Crypto', custom: 'CSV' };

  function catalog() {
    const c = RL.dataCatalog;
    return c && Array.isArray(c.assets) ? c.assets : [];
  }

  function bundled() { return catalog(); }
  function live() { return LIVE.slice(); }
  function liveFor(id) { return LIVE.find((x) => x.id === id) || null; }
  function bundledFor(id) { return catalog().find((x) => x.id === id) || null; }

  function symbolFields(meta, extra) {
    return {
      id: meta.id,
      label: meta.label || meta.id,
      name: meta.name || meta.id,
      market: meta.market || 'custom',
      pip: meta.pip,
      contract: meta.contract,
      decimals: meta.decimals,
      baseTf: meta.tf || extra.tf || '1m',
      source: meta.source || extra.source || 'Yahoo Finance (live)',
      license: meta.license || extra.license || 'runtime',
      bundled: meta.bundled === true,
      repo: meta.repo || ''
    };
  }

  function install(meta, bars, extra) {
    const fields = symbolFields(meta, extra || {});
    const sym = D.makeCustomSymbol(fields);
    D.registerCustom(sym, bars);
    return { symbol: sym, bars: bars.length, meta: fields };
  }

  /* Load a bundled MIT dataset. Dynamic <script> injection works from file://,
     offline, with zero network requests and no CORS. */
  function loadBundled(id) {
    return new Promise((resolve, reject) => {
      const entry = RL.dataFiles && RL.dataFiles[id];
      if (entry) {
        try { resolve(install(entry.meta, D.parseCsv(entry.csv).bars, { source: entry.meta.source })); }
        catch (e) { reject(e); }
        return;
      }
      if (typeof document === 'undefined') { reject(new Error('no DOM')); return; }
      const meta = bundledFor(id);
      if (!meta) { reject(new Error('unknown dataset: ' + id)); return; }
      const script = document.createElement('script');
      script.src = 'data/' + encodeURIComponent(id) + '.js';
      script.onload = () => {
        try {
          const loaded = RL.dataFiles && RL.dataFiles[id];
          if (!loaded) throw new Error('dataset missing');
          resolve(install(loaded.meta, D.parseCsv(loaded.csv).bars, { source: loaded.meta.source }));
        } catch (e) { reject(e); }
        script.remove();
      };
      script.onerror = () => { reject(new Error('تعذّر تحميل ملف البيانات / could not load data/' + id + '.js')); script.remove(); };
      document.head.appendChild(script);
    });
  }

  function yahooUrl(yahoo, interval, range) {
    return 'https://query1.finance.yahoo.com/v8/finance/chart/' +
      encodeURIComponent(yahoo) + '?interval=' + encodeURIComponent(interval) +
      '&range=' + encodeURIComponent(range) + '&includePrePost=false';
  }

  function normalizeYahoo(json) {
    // Our /api/ohlcv relay returns a compact { bars: [...] } payload; the
    // public CORS relay returns Yahoo's raw chart JSON. Accept both.
    if (json && Array.isArray(json.bars)) {
      const compact = json.bars.filter((b) => b && U.isNum(b.t) &&
        [b.o, b.h, b.l, b.c].every((x) => U.isNum(x) && x > 0));
      if (compact.length < 3) throw new Error('بيانات قليلة / not enough bars');
      compact.sort((a, b) => a.t - b.t);
      return compact.map((b) => ({ t: b.t, o: b.o, h: b.h, l: b.l, c: b.c, v: b.v || 0 }));
    }
    const r = json && json.chart && json.chart.result && json.chart.result[0];
    if (!r || !r.timestamp || !r.indicators || !r.indicators.quote || !r.indicators.quote[0]) {
      throw new Error('استجابة البيانات فارغة / empty data response');
    }
    const q = r.indicators.quote[0];
    const bars = [];
    for (let i = 0; i < r.timestamp.length; i += 1) {
      const o = q.open && q.open[i];
      const h = q.high && q.high[i];
      const l = q.low && q.low[i];
      const c = q.close && q.close[i];
      if (![o, h, l, c].every((x) => U.isNum(x) && x > 0)) continue;
      bars.push({ t: r.timestamp[i] * 1000, o, h: Math.max(o, c, h), l: Math.min(o, c, l), c, v: (q.volume && q.volume[i]) || 0 });
    }
    if (bars.length < 3) throw new Error('بيانات قليلة / not enough bars');
    bars.sort((a, b) => a.t - b.t);
    return bars;
  }

  function fetchWithTimeout(url, ms) {
    if (typeof fetch !== 'function') return Promise.reject(new Error('fetch unavailable'));
    let timer = null;
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const opts = controller ? { signal: controller.signal } : {};
    timer = setTimeout(() => { if (controller) controller.abort(); }, ms || 12000);
    return fetch(url, opts).then((res) => {
      clearTimeout(timer);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    }, (err) => { clearTimeout(timer); throw err; });
  }

  /* Optional live data. Never called at startup: the user clicks "load live".
     Order: same-origin /api/ohlcv (Vercel) → public CORS relay → clear error. */
  function loadLive(id, interval, range) {
    const asset = liveFor(id);
    if (!asset) return Promise.reject(new Error('unknown live symbol'));
    const iv = D.TF_MS[interval] ? interval : '5m';
    const rg = /^(1d|5d|1mo|3mo|6mo|1y|2y)$/.test(range || '') ? range : '1mo';
    const upstream = yahooUrl(asset.yahoo, iv, rg);
    const endpoints = [
      '/api/ohlcv?symbol=' + encodeURIComponent(asset.yahoo) + '&interval=' + iv + '&range=' + rg,
      'https://api.allorigins.win/raw?url=' + encodeURIComponent(upstream)
    ];
    let lastError = null;
    const attempt = (i) => {
      if (i >= endpoints.length) return Promise.reject(lastError || new Error('no endpoint'));
      return fetchWithTimeout(endpoints[i], 14000)
        .then((json) => {
          const bars = normalizeYahoo(json);
          return install({ id: asset.id, label: asset.label, name: asset.name, market: asset.market,
            pip: asset.pip, contract: asset.contract, decimals: asset.decimals, tf: iv },
          bars, { source: 'Yahoo Finance · ' + asset.yahoo, license: 'runtime', tf: iv });
        })
        .catch((err) => { lastError = err; return attempt(i + 1); });
    };
    return attempt(0);
  }

  function marketLabel(market) { return MARKET_LABEL[market] || market; }

  RL.marketdata = { LIVE, bundled, live, liveFor, bundledFor, loadBundled, loadLive, normalizeYahoo, marketLabel, install };
})(globalThis.RL = globalThis.RL || {});
