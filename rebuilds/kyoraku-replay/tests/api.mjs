/* Tests for the optional Vercel relay, with a mocked upstream (no network). */
import assert from 'node:assert/strict';
import handler from '../api/ohlcv.js';

function makeRes() {
  return {
    statusCode: 0, headers: {}, body: null,
    status(code) { this.statusCode = code; return this; },
    setHeader(key, value) { this.headers[key] = value; },
    end(text) { this.body = text; return this; }
  };
}

function yahoo(bars) {
  const q = { open: [], high: [], low: [], close: [], volume: [] };
  for (const b of bars) {
    q.open.push(b.o); q.high.push(b.h); q.low.push(b.l); q.close.push(b.c); q.volume.push(b.v || 0);
  }
  return { chart: { result: [{ meta: { currency: 'USD', exchangeName: 'CME' },
    timestamp: bars.map((b) => b.t / 1000), indicators: { quote: [q] } }] }, error: null };
}

let passed = 0;
const ok = (msg) => { passed += 1; console.log('  ✓ ' + msg); };
const originalFetch = globalThis.fetch;

try {
  {
    const res = makeRes();
    await handler({ query: { symbol: 'https://evil.example/x', interval: '1d', range: '5d' } }, res);
    assert.equal(res.statusCode, 400);
    assert.equal(JSON.parse(res.body).error, 'invalid_request');
    assert.equal(res.headers['Cache-Control'], 'no-store');
    ok('invalid symbol is rejected with a whitelist (SSRF guard)');
  }

  {
    const bars = [
      { t: 1793246400000, o: 29793.5, h: 29794.25, l: 29111, c: 29562, v: 806178 },
      { t: 1793332800000, o: 29180, h: 29180, l: 28232.75, c: 28534, v: 1049656 },
      { t: 1793595600000, o: 28587.75, h: 28891.25, l: 28101.75, c: 28127.5, v: 1049656 },
      { t: 1793682000000, o: 28201, h: 28449.5, l: 28038.25, c: 28416, v: 643657 }
    ];
    globalThis.fetch = async () => ({ ok: true, json: async () => yahoo(bars) });
    const res = makeRes();
    await handler({ query: { symbol: 'NQ=F', interval: '1d', range: '5d' } }, res);
    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.equal(body.bars.length, 4, 'a short 5d/1d range still returns bars');
    assert.equal(body.symbol, 'NQ=F');
    assert.equal(body.bars[0].h, 29794.25);
    assert.ok(res.headers['Cache-Control'].includes('s-maxage=60'));
    assert.equal(res.headers['Access-Control-Allow-Origin'], '*');
    ok('short live range returns normalised bars and caches only successes');
  }

  {
    globalThis.fetch = async () => ({ ok: true, json: async () => yahoo([
      { t: 1000, o: 1, h: 2, l: 0.5, c: 1.5, v: 1 },
      { t: 2000, o: 1.5, h: 2.5, l: 1.4, c: 2, v: 2 }
    ]) });
    const res = makeRes();
    await handler({ query: { symbol: '^NDX', interval: '1d', range: '1d' } }, res);
    assert.equal(res.statusCode, 502);
    assert.equal(JSON.parse(res.body).error, 'upstream_too_few_bars');
    assert.equal(res.headers['Cache-Control'], 'no-store');
    ok('too few bars is a non-cached 502');
  }

  {
    globalThis.fetch = async () => ({ ok: false, status: 429 });
    const res = makeRes();
    await handler({ query: { symbol: '^NDX', interval: '1d', range: '1mo' } }, res);
    assert.equal(res.statusCode, 502);
    assert.equal(JSON.parse(res.body).error, 'upstream_http');
    assert.equal(res.headers['Cache-Control'], 'no-store');
    ok('upstream rate limit is a non-cached 502');
  }

  {
    globalThis.fetch = async () => { throw new Error('timeout'); };
    const res = makeRes();
    await handler({ query: { symbol: 'GC=F', interval: '1h', range: '1mo' } }, res);
    assert.equal(res.statusCode, 502);
    assert.equal(JSON.parse(res.body).error, 'upstream_unavailable');
    ok('upstream exception is handled, never throws');
  }

  console.log('\n' + passed + ' api tests passed ✅');
} finally {
  globalThis.fetch = originalFetch;
}
