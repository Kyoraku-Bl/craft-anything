/* Node test harness: loads the browser scripts and checks the engine without a browser. */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const root = path.resolve(import.meta.dirname, '..');
vm.runInThisContext(fs.readFileSync(path.join(root, 'data', 'catalog.js'), 'utf8'), { filename: 'catalog.js' });
const files = ['util', 'data', 'indicators', 'analytics', 'engine', 'marketdata', 'chart', 'i18n', 'app'];
for (const name of files) {
  const file = path.join(root, 'js', name + '.js');
  vm.runInThisContext(fs.readFileSync(file, 'utf8'), { filename: name + '.js' });
}
const RL = globalThis.RL;
assert.ok(RL && RL.engine && RL.data && RL.analytics && RL.chart && RL.marketdata && RL.dataCatalog,
  'all modules loaded');

let passed = 0;
function test(name, fn) {
  fn();
  passed += 1;
  console.log('  ✓ ' + name);
}

console.log('Kyoraku Replay tests\n');

test('deterministic synthetic data is valid OHLCV with no weekends', () => {
  const a = RL.data.generateSeries('EURUSD', 2000);
  const b = RL.data.generateSeries('EURUSD', 2000);
  assert.equal(a.length, 2000);
  assert.deepEqual(a, b, 'same seed → same bars');
  for (const bar of a) {
    assert.ok(bar.h >= Math.max(bar.o, bar.c) - 1e-9);
    assert.ok(bar.l <= Math.min(bar.o, bar.c) + 1e-9);
    assert.ok(bar.l > 0 && bar.v >= 0);
    const day = new Date(bar.t).getUTCDay();
    assert.ok(day !== 0 && day !== 6);
  }
  for (let i = 1; i < a.length; i += 1) assert.ok(a[i].t > a[i - 1].t);
});

test('timeframe aggregation keeps OHLCV invariants', () => {
  const base = RL.data.generateSeries('XAUUSD', 1200);
  const five = RL.data.aggregate(base, RL.data.TF_MS['5m']);
  assert.ok(five.length > 0 && five.length < base.length);
  assert.equal(five[0].t, Math.floor(base[0].t / 300000) * 300000);
  for (const bar of five) {
    assert.ok(bar.h >= bar.o && bar.h >= bar.c);
    assert.ok(bar.l <= bar.o && bar.l <= bar.c);
  }
  assert.equal(RL.data.aggregate(base, 60000).length, base.length);
});

test('CSV import handles headers, positional rows, epochs and hostile input', () => {
  const withHeader = 'time,open,high,low,close,volume\n' +
    '2025-01-06 00:00,1.10,1.20,1.00,1.15,100\n' +
    '2025-01-06 00:01,1.15,1.25,1.10,1.18,120\n' +
    '2025-01-06 00:02,1.18,1.30,1.16,1.25,90\n' +
    'bad,row,here,x,y,z\n';
  const parsed = RL.data.parseCsv(withHeader);
  assert.equal(parsed.bars.length, 3);
  assert.equal(parsed.skipped, 1);
  assert.equal(parsed.bars[0].c, 1.15);
  assert.ok(parsed.bars[1].t > parsed.bars[0].t);

  const positional = '1700000000,1,2,0.5,1.5,10\n1700000060,1.5,2.5,1.4,2.0,11\n' +
    '1700000120,2,2.2,1.8,2.1,12\n1700000180,2.1,2.4,2,2.3,13\n';
  assert.equal(RL.data.parseCsv(positional).bars.length, 4);
  assert.equal(RL.data.parseTime('2024.11.14 15:30'), Date.UTC(2024, 10, 14, 15, 30));
  assert.equal(RL.data.parseTime('1700000000'), 1700000000000);
  assert.throws(() => RL.data.parseCsv(''));
  assert.throws(() => RL.data.parseCsv('garbage'));
});

test('indicators produce finite, bounded values', () => {
  const vals = [1, 2, 3, 4, 5, 4, 3, 2, 1, 2, 3, 4, 5, 6, 7, 6, 5, 4, 3, 2];
  const sma = RL.indicators.sma(vals, 3);
  assert.equal(sma[2], 2);
  assert.equal(sma[0], null);
  const r = RL.indicators.rsi(vals, 5);
  for (const v of r) if (v !== null) assert.ok(v >= 0 && v <= 100);
  const bars = RL.data.generateSeries('EURUSD', 100);
  const vw = RL.indicators.vwap(bars);
  assert.ok(vw.every((v) => Number.isFinite(v)));
  const bb = RL.indicators.bollinger(vals, 5, 2);
  assert.ok(bb.upper[4] >= bb.mid[4] && bb.lower[4] <= bb.mid[4]);
});

test('replay hides the future and steps exactly one bar', () => {
  const e = new RL.engine.ReplayEngine();
  assert.equal(e.loadMarket('EURUSD', '5m'), true);
  assert.ok(e.bars.length > 100);
  assert.ok(e.s.replayTime > e.bars[0].t && e.s.replayTime < e.bars[e.bars.length - 1].t);
  const visible = e.visibleBars();
  assert.equal(visible[visible.length - 1].t, e.s.replayTime);
  assert.ok(visible.length < e.bars.length, 'future candles are not visible');
  const before = e.s.replayTime;
  e.step(1);
  assert.ok(e.s.replayTime > before);
  assert.equal(e.visibleBars()[e.visibleBars().length - 1].t, e.s.replayTime);
  e.step(-1);
  assert.equal(e.s.replayTime, before);
});

test('risk-based sizing, SL/TP fills and balance recomputation', () => {
  const e = new RL.engine.ReplayEngine();
  e.loadMarket('EURUSD', '5m');
  e.cfg.spreadPips = 0;
  e.cfg.commissionPerLot = 0;
  e.cfg.slPips = 20;
  e.cfg.rr = 2;
  e.cfg.riskPct = 1;
  const bar = e.currentBar();
  const opened = e.openTrade('buy');
  assert.equal(opened.ok, true);
  const tr = opened.trade;
  assert.equal(tr.entryPrice, bar.c);
  assert.ok(Math.abs(tr.riskAmount - e.s.initialBalance * 0.01) < 0.001, 'risk is 1% of balance');
  assert.ok(Math.abs((tr.entryPrice - tr.sl) / e.symbol.pip - 20) < 1e-6);
  let guard = 0;
  while (tr.status === 'open' && guard < 3000) { e.step(1); guard += 1; }
  assert.equal(tr.status, 'closed', 'stop or target is hit as replay advances');
  assert.ok(Number.isFinite(tr.pnl) && Number.isFinite(tr.r));
  assert.ok(Math.abs(e.s.balance - (e.s.initialBalance + tr.pnl)) < 1e-6);
  assert.ok(['sl', 'tp', 'sl-gap', 'tp-gap'].indexOf(tr.exitReason) >= 0);
});

test('rewind removes later trades and restores the balance', () => {
  const e = new RL.engine.ReplayEngine();
  e.loadMarket('BTCUSD', '15m');
  const start = e.s.initialBalance;
  const opened = e.openTrade('sell');
  assert.equal(opened.ok, true);
  const entryTime = opened.trade.entryTime;
  for (let i = 0; i < 60; i += 1) e.step(1);
  const after = e.s.trades.length;
  e.rewindTo(entryTime - 1);
  assert.equal(e.s.trades.length, after - 1, 'trade opened after the rewind point is gone');
  assert.equal(e.s.balance, start, 'balance is restored');
  e.rewindTo(e.bars[0].t);
  assert.equal(e.s.trades.length, 0);
  assert.equal(e.s.balance, start);
});

test('bad levels and empty markets never crash the engine', () => {
  const e = new RL.engine.ReplayEngine();
  e.loadMarket('GBPJPY', '1h');
  const bad = e.openTrade('buy', { slPrice: 999999, tpPrice: 0.00001 });
  assert.equal(bad.ok, false);
  assert.equal(e.closeTrade('does-not-exist'), false);
  assert.equal(e.goTo(Number.NaN), false);
  assert.ok(Number.isFinite(e.equity()));
});

test('statistics and Monte Carlo are consistent', () => {
  const trades = [];
  for (let i = 0; i < 12; i += 1) {
    const pnl = i % 3 === 0 ? -50 : 100;
    trades.push({
      id: 'T' + i, status: 'closed', side: i % 2 ? 'sell' : 'buy',
      entryTime: Date.UTC(2025, 0, 6, 0, i), exitTime: Date.UTC(2025, 0, 6, 1, i),
      pnl, r: pnl / 50, symbol: 'EURUSD'
    });
  }
  const st = RL.analytics.compute(trades, 10000);
  assert.equal(st.total, 12);
  assert.equal(st.wins, 8);
  assert.equal(st.net, 8 * 100 - 4 * 50);
  assert.ok(Math.abs(st.winRate - 8 / 12) < 1e-9);
  assert.ok(st.maxDD >= 50);
  assert.equal(st.curve.length, 13);
  const mc = RL.analytics.monteCarlo(trades, { trades: 50, runs: 300, initialBalance: 10000 });
  assert.equal(mc.ok, true);
  assert.ok(mc.p5 <= mc.p50 && mc.p50 <= mc.p95);
  assert.ok(mc.probProfit >= 0 && mc.probProfit <= 1);
  const few = RL.analytics.monteCarlo(trades.slice(0, 3), { trades: 10, runs: 20 });
  assert.equal(few.ok, false);
});

test('prop-firm rules flag a drawdown breach', () => {
  const e = new RL.engine.ReplayEngine();
  e.loadMarket('EURUSD', '5m');
  e.prop.enabled = true;
  e.prop.totalPct = 10;
  e.prop.dailyPct = 5;
  e.prop.targetPct = 8;
  e.prop.minDays = 1;
  e.s.trades.push({
    id: 'T-loss', status: 'closed', side: 'buy', symbol: 'EURUSD',
    entryTime: e.s.replayTime - 60000, exitTime: e.s.replayTime,
    entryPrice: 1.1, exitPrice: 0.9, size: 1, contract: 100000, pip: 0.0001,
    decimals: 5, riskAmount: 100, commission: 0, sl: 1.09, tp: 1.12,
    pnl: -1500, r: -1, exitReason: 'sl', beApplied: false, notes: '', tags: []
  });
  e.recompute();
  assert.equal(e.s.propStatus, 'failed');
  assert.ok(e.s.violations.length >= 1);
  e.prop.enabled = false;
  e.recompute();
  assert.equal(e.s.propStatus, 'active');
});

test('session archive, save/restore and hostile state sanitizing', () => {
  const e = new RL.engine.ReplayEngine();
  e.loadMarket('EURUSD', '5m');
  e.openTrade('buy');
  const saved = e.saveSession('test session');
  assert.equal(saved.trades.length, 1);
  assert.equal(e.state.archive.length, 1);
  assert.equal(e.s.trades.length, 0);
  e.openArchived(saved.id);
  assert.equal(e.s.trades.length, 1);
  assert.equal(e.state.archive.length, 0);

  const hostile = RL.engine.sanitize({
    session: { initialBalance: 'oops', trades: [null, { side: 'weird' }, 'nope'] },
    settings: { riskPct: -999, rr: 'x' },
    ui: { indicators: { sma20: 'yes' }, lang: 'xx' },
    archive: 'not-an-array', customDatasets: [{ symbol: null, bars: null }]
  });
  assert.equal(hostile.session.initialBalance, 10000);
  assert.equal(hostile.session.trades.length, 0);
  assert.equal(hostile.settings.riskPct, 0.01);
  assert.equal(hostile.settings.rr, 2);
  assert.equal(hostile.ui.indicators.sma20, true);
  assert.equal(hostile.ui.lang, 'ar');
  assert.deepEqual(hostile.archive, []);
  assert.deepEqual(hostile.customDatasets, []);
});

test('i18n switches language without losing keys', () => {
  RL.i18n.set('ar');
  assert.equal(typeof RL.i18n.t('play'), 'string');
  assert.equal(RL.i18n.t('dayNames').length, 7);
  RL.i18n.set('en');
  assert.notEqual(RL.i18n.t('play'), RL.i18n.t('pause'));
  assert.equal(RL.i18n.t('dayNames').length, 7);
  RL.i18n.set('ar');
});


/* ---------------- v2: real data, trailing stop, partial close ---------- */

function flatBars(id, count) {
  const bars = [];
  const t0 = Date.UTC(2026, 0, 5, 0, 0);
  for (let i = 0; i < count; i += 1) {
    bars.push({ t: t0 + i * 60000, o: 100, h: 100.001, l: 99.999, c: 100, v: 10 });
  }
  const sym = RL.data.makeCustomSymbol({
    id, label: id, pip: 0.01, contract: 1, decimals: 2, baseTf: '1m', market: 'custom'
  });
  RL.data.registerCustom(sym, bars);
  return sym;
}

function testEngine(id, overrides) {
  const e = new RL.engine.ReplayEngine();
  e.loadMarket(id, '1m');
  Object.assign(e.cfg, {
    spreadPips: 0, commissionPerLot: 0, slPips: 10, rr: 2, riskPct: 1,
    autoBE: false, trailEnabled: false, autoPartial: false
  }, overrides || {});
  return e;
}

test('bundled real datasets exist, parse and keep OHLCV invariants', () => {
  const ids = RL.dataCatalog.assets.map((a) => a.id);
  assert.ok(ids.includes('NQ') && ids.includes('NAS100USD') && ids.includes('SPX500'),
    'NQ futures + NAS100USD spot + indices are bundled');
  assert.equal(ids.length, 10);
  for (const id of ids) {
    const file = path.join(root, 'data', id + '.js');
    assert.ok(fs.existsSync(file), id + '.js exists');
    vm.runInThisContext(fs.readFileSync(file, 'utf8'), { filename: id + '.js' });
    const entry = RL.dataFiles[id];
    assert.ok(entry && entry.meta && entry.meta.license === 'MIT', id + ' is MIT-licensed');
    assert.ok(entry.meta.source === 'GetData Finance (MIT)', id + ' attribution present');
    const parsed = RL.data.parseCsv(entry.csv);
    assert.equal(parsed.bars.length, entry.meta.bars, id + ' bar count matches manifest');
    assert.ok(parsed.bars.length >= 100, id + ' has usable history');
    for (let i = 0; i < parsed.bars.length; i += 1) {
      const b = parsed.bars[i];
      assert.ok(b.h >= b.o - 1e-9 && b.h >= b.c - 1e-9 && b.l <= b.o + 1e-9 && b.l <= b.c + 1e-9,
        id + ' OHLC invariant at ' + i);
      assert.ok(b.l > 0 && b.o > 0 && b.c > 0, id + ' positive prices');
      if (i) assert.ok(b.t > parsed.bars[i - 1].t, id + ' strictly ascending time');
    }
  }
  assert.ok(RL.marketdata.bundled().length === 10);
  assert.ok(RL.marketdata.live().some((a) => a.yahoo === 'NQ=F'), 'live NQ=F catalogued');
});

test('base resolution snaps smaller timeframes instead of inventing bars', () => {
  const sym = RL.data.makeCustomSymbol({ id: 'TFTEST', pip: 0.01, contract: 1, decimals: 2, baseTf: '15m' });
  assert.equal(RL.data.effectiveTf(sym, '1m'), '15m');
  assert.equal(RL.data.effectiveTf(sym, '5m'), '15m');
  assert.equal(RL.data.effectiveTf(sym, '1h'), '1h');
  const allowed = RL.data.allowedTimeframes(sym);
  assert.ok(!allowed.includes('1m') && !allowed.includes('5m') && allowed.includes('15m'));
  const one = RL.data.makeCustomSymbol({ id: 'TFONE', pip: 0.01, contract: 1, decimals: 2, baseTf: '1m' });
  assert.equal(RL.data.effectiveTf(one, '1m'), '1m');
  assert.equal(RL.data.allowedTimeframes(one).length, RL.data.TF_LIST.length);
});

test('live payload normalisation accepts relay JSON and raw Yahoo JSON', () => {
  const compact = { bars: [{ t: 1000, o: 1, h: 2, l: 0.5, c: 1.5, v: 10 },
    { t: 2000, o: 1.5, h: 2.5, l: 1.4, c: 2, v: 11 },
    { t: 3000, o: 2, h: 3, l: 1.9, c: 2.5, v: 12 },
    { t: 4000, o: 2.5, h: 3.5, l: 2.4, c: 3, v: 13 },
    { t: 5000, o: 3, h: 4, l: 2.9, c: 3.5, v: 14 },
    { t: 6000, o: 3.5, h: 4.5, l: 3.4, c: 4, v: 15 },
    { t: 7000, o: 4, h: 5, l: 3.9, c: 4.5, v: 16 },
    { t: 8000, o: 4.5, h: 5.5, l: 4.4, c: 5, v: 17 },
    { t: 9000, o: 5, h: 6, l: 4.9, c: 5.5, v: 18 },
    { t: 10000, o: 5.5, h: 6.5, l: 5.4, c: 6, v: 19 }] };
  assert.equal(RL.marketdata.normalizeYahoo(compact).length, 10);
  const raw = {
    chart: {
      result: [{
        timestamp: [1700000000, 1700000060, 1700000120, 1700000180, 1700000240,
          1700000300, 1700000360, 1700000420, 1700000480, 1700000540],
        indicators: {
          quote: [{
            open: [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5],
            high: [2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5],
            low: [0.5, 1.4, 1.9, 2.4, 2.9, 3.4, 3.9, 4.4, 4.9, 5.4],
            close: [1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6],
            volume: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
          }]
        }
      }]
    }
  };
  const bars = RL.marketdata.normalizeYahoo(raw);
  assert.equal(bars.length, 10);
  assert.equal(bars[0].t, 1700000000000);
  assert.equal(bars[9].c, 6);
  assert.throws(() => RL.marketdata.normalizeYahoo({ chart: { result: null } }));
});

test('trailing stop tightens after R and never moves backwards', () => {
  flatBars('TRAILTEST', 120);
  const e = testEngine('TRAILTEST', { trailEnabled: true, trailStartR: 1, trailDistPips: 30, rr: 100 });
  const tr = e.openTrade('buy').trade;
  const initialSL = tr.sl;
  const riskDist = e.riskDistance(tr);
  assert.ok(riskDist > 0);
  // high = +5R, trail distance = 3R → stop tightens to +2R
  e.processBar({ t: tr.entryTime + 60000, o: tr.entryPrice, h: tr.entryPrice + 5 * riskDist,
    l: tr.entryPrice - 0.01, c: tr.entryPrice + 2 * riskDist, v: 10 });
  assert.equal(tr.trailActive, true, 'trailing activates at 1R');
  assert.ok(tr.sl > initialSL, 'stop tightened in the favourable direction');
  const tightened = tr.sl;
  // shallow pullback that stays above the tightened stop
  e.processBar({ t: tr.entryTime + 120000, o: tightened + 0.01,
    h: tr.entryPrice + 3 * riskDist, l: tightened + 0.001,
    c: tr.entryPrice + 2.5 * riskDist, v: 10 });
  assert.equal(tr.status, 'open');
  assert.equal(tr.sl, tightened, 'stop never loosens on a pullback');
  e.cfg.trailEnabled = false;
  const before = tr.sl;
  e.processBar({ t: tr.entryTime + 180000, o: tightened + 0.01,
    h: tr.entryPrice + 6 * riskDist, l: tightened + 0.001,
    c: tr.entryPrice + 4 * riskDist, v: 10 });
  assert.equal(tr.status, 'open');
  assert.equal(tr.sl, before, 'disabled trailing leaves the stop alone');
});

test('partial close books an independent row and rewind restores the size', () => {
  flatBars('PARTIALTEST', 120);
  const e = testEngine('PARTIALTEST');
  const tr = e.openTrade('buy').trade;
  const size0 = tr.size;
  for (let i = 0; i < 5; i += 1) e.step(1);
  assert.equal(tr.status, 'open');
  const at = e.s.replayTime;
  const child = e.partialClose(tr.id, 0.5);
  assert.ok(child && child.isPartial && child.parentId === tr.id && child.status === 'closed');
  assert.ok(Math.abs(child.size - size0 / 2) < 1e-6);
  assert.ok(Math.abs(tr.size + child.size - size0) < 1e-6);
  assert.equal(RL.analytics.closedTrades(e.s.trades).length, 1);
  assert.ok(Math.abs(e.s.balance - (e.s.initialBalance + child.pnl)) < 1e-6);
  e.rewindTo(at - 60000);
  assert.equal(e.s.trades.length, 1, 'the partial row is removed');
  assert.equal(e.s.trades[0].status, 'open');
  assert.ok(Math.abs(e.s.trades[0].size - size0) < 1e-6, 'size is restored');
  assert.equal(e.s.balance, e.s.initialBalance);
  e.rewindTo(e.bars[0].t);
  assert.equal(e.s.trades.length, 0);
});

test('automatic partial close triggers at the configured R', () => {
  flatBars('AUTOPARTIAL', 120);
  const e = testEngine('AUTOPARTIAL', { autoPartial: true, partialAtR: 1, partialPct: 50 });
  const tr = e.openTrade('buy').trade;
  const size0 = tr.size;
  const riskDist = e.riskDistance(tr);
  e.processBar({ t: tr.entryTime + 60000, o: tr.entryPrice, h: tr.entryPrice + 1.5 * riskDist,
    l: tr.entryPrice - 0.01, c: tr.entryPrice + riskDist, v: 10 });
  const child = e.s.trades.find((x) => x.isPartial);
  assert.ok(child && child.exitReason === 'auto-partial');
  assert.ok(Math.abs(child.size - size0 * 0.5) < 1e-6);
  assert.equal(tr.partialApplied, true);
  assert.equal(tr.status, 'open');
  e.processBar({ t: tr.entryTime + 120000, o: tr.entryPrice, h: tr.entryPrice + 1.8 * riskDist,
    l: tr.entryPrice - 0.01, c: tr.entryPrice, v: 10 });
  assert.equal(e.s.trades.filter((x) => x.isPartial).length, 1, 'auto partial fires only once');
});

test('v2 storage key migrates a v1 session safely', () => {
  const store = {};
  const previous = globalThis.localStorage;
  globalThis.localStorage = {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; }
  };
  try {
    store['replay-lab:state:v1'] = JSON.stringify({
      session: { initialBalance: 12345, trades: [] }, settings: { riskPct: 2 }
    });
    const loaded = RL.engine.storage.load();
    assert.equal(loaded.session.initialBalance, 12345);
    assert.equal(loaded.settings.riskPct, 2);
    assert.equal(loaded.settings.trailEnabled, false, 'new settings get defaults');
    RL.engine.storage.save(loaded);
    assert.ok(store['kyoraku-replay:state:v2'], 'writes the v2 key');
    RL.engine.storage.clear();
    assert.equal(store['kyoraku-replay:state:v2'], undefined);
    assert.equal(store['replay-lab:state:v1'], undefined);
  } finally {
    if (previous === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = previous;
  }
});

test('brand strings and i18n keys are complete in both languages', () => {
  const keys = ['appName', 'appSub', 'tagline', 'trailEnable', 'autoPartial', 'helpRealTitle',
    'legalTitle', 'liveData', 'reasonPartial', 'reasonAutoPartial', 'toastRealOk'];
  for (const lang of ['ar', 'en']) {
    RL.i18n.set(lang);
    for (const k of keys) assert.ok(RL.i18n.t(k) && RL.i18n.t(k) !== k, lang + ':' + k);
    assert.equal(RL.i18n.t('appName'), 'Kyoraku Replay');
    assert.equal(RL.i18n.t('appSub'), 'KYORAKU REPLAY');
  }
  RL.i18n.set('ar');
});

console.log('\n' + passed + ' tests passed ✅');
