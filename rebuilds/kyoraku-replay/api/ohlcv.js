/* Kyoraku Replay — optional same-origin market-data relay (Vercel serverless).
   No key, no storage, no redistribution: the browser cannot call Yahoo directly
   because the chart endpoint sends no CORS headers. This function only forwards
   a whitelisted symbol and returns a normalised OHLCV array at runtime.

   For a commercial product, replace this with your own licensed data feed.
   See docs/DATA.md. */
const YAHOO_SYMBOLS = new Set([
  'NQ=F', 'MNQ=F', 'ES=F', 'MES=F', 'YM=F', 'RTY=F', 'GC=F', 'SI=F', 'CL=F',
  '^NDX', '^GSPC', '^DJI', '^VIX', '^GDAXI', '^N225', '^FTSE', '^RUT',
  'EURUSD=X', 'GBPJPY=X', 'USDJPY=X', 'GBPUSD=X', 'AUDUSD=X', 'USDCAD=X',
  'BTC-USD', 'ETH-USD'
]);
const INTERVALS = new Set(['1m', '2m', '5m', '15m', '30m', '1h', '1d', '1wk']);
const RANGES = new Set(['1d', '5d', '1mo', '3mo', '6mo', '1y', '2y', '5y', 'ytd']);

function send(res, status, payload) {
  res.status(status);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.end(JSON.stringify(payload));
}

export default async function handler(req, res) {
  const q = req.query || {};
  const symbol = String(q.symbol || '');
  const interval = String(q.interval || '5m');
  const range = String(q.range || '1mo');

  if (!YAHOO_SYMBOLS.has(symbol) || !INTERVALS.has(interval) || !RANGES.has(range)) {
    send(res, 400, { error: 'invalid_request', allowedSymbols: [...YAHOO_SYMBOLS] });
    return;
  }

  const upstream = 'https://query1.finance.yahoo.com/v8/finance/chart/' +
    encodeURIComponent(symbol) + '?interval=' + encodeURIComponent(interval) +
    '&range=' + encodeURIComponent(range) + '&includePrePost=false';

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 9000);
    let response;
    try {
      response = await fetch(upstream, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; KyorakuReplay/1.0)',
          'Accept': 'application/json'
        }
      });
    } finally { clearTimeout(timer); }

    if (!response.ok) {
      send(res, 502, { error: 'upstream_http', status: response.status });
      return;
    }
    const json = await response.json();
    const result = json && json.chart && json.chart.result && json.chart.result[0];
    if (!result || !result.timestamp) {
      send(res, 502, { error: 'upstream_no_data', detail: (json.chart && json.chart.error) || null });
      return;
    }
    const quote = result.indicators && result.indicators.quote && result.indicators.quote[0];
    if (!quote) { send(res, 502, { error: 'upstream_no_quote' }); return; }

    const bars = [];
    for (let i = 0; i < result.timestamp.length; i += 1) {
      const o = quote.open && quote.open[i];
      const h = quote.high && quote.high[i];
      const l = quote.low && quote.low[i];
      const c = quote.close && quote.close[i];
      if (![o, h, l, c].every((x) => typeof x === 'number' && Number.isFinite(x) && x > 0)) continue;
      bars.push({
        t: result.timestamp[i] * 1000,
        o, h: Math.max(o, c, h), l: Math.min(o, c, l), c,
        v: (quote.volume && quote.volume[i]) || 0
      });
    }
    if (bars.length < 5) { send(res, 502, { error: 'upstream_too_few_bars' }); return; }
    send(res, 200, {
      symbol, interval, range, source: 'Yahoo Finance chart API',
      currency: result.meta && result.meta.currency,
      exchange: result.meta && result.meta.exchangeName,
      bars
    });
  } catch (err) {
    send(res, 502, { error: 'upstream_unavailable', detail: String(err && err.message || err) });
  }
}
