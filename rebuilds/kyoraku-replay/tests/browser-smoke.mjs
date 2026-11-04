/* Optional real-browser-ish smoke test (jsdom, not shipped as a dependency).
 * Starts from index.html served over HTTP, lets scripts (including dynamically
 * injected data/*.js) execute, and exercises the actual UI.
 *
 *   npm run serve                       # in another terminal
 *   npm i --no-save jsdom@26           # optional dev-only, ignored by git
 *   node tests/browser-smoke.mjs
 *
 * With no jsdom installed it prints a clear SKIP and exits 0, so the zero
 * dependency promise of the product is preserved.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

let JSDOM, VirtualConsole;
try {
  ({ JSDOM, VirtualConsole } = await import('jsdom'));
} catch {
  console.log('SKIP browser-smoke: jsdom not installed (optional). Install with: npm i --no-save jsdom@26');
  process.exit(0);
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = process.env.BASE_URL || 'http://127.0.0.1:4173';
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const errors = [];
const vc = new VirtualConsole();
vc.on('jsdomError', (e) => {
  const m = String(e && e.message || e);
  if (/getContext|canvas|Not implemented: HTMLDialogElement|Not implemented: window\.scroll|Not implemented: window\.prompt/.test(m)) return;
  errors.push('jsdomError: ' + m);
});
vc.on('error', (e) => errors.push('console.error: ' + e));

function fakeCtx() {
  const t = { measureText: () => ({ width: 30 }), createLinearGradient: () => ({ addColorStop() {} }),
    setTransform() {}, canvas: { width: 800, height: 400 } };
  return new Proxy(t, { get(o, k) { if (k in o) return o[k]; return () => {}; }, set(o, k, v) { o[k] = v; return true; } });
}

const dom = new JSDOM(html, {
  url: base + '/',
  runScripts: 'dangerously',
  resources: 'usable',
  pretendToBeVisual: true,
  virtualConsole: vc,
  beforeParse(win) {
    win.HTMLCanvasElement.prototype.getContext = () => fakeCtx();
    win.HTMLCanvasElement.prototype.toDataURL = () => 'data:image/png;base64,AA';
    win.ResizeObserver = class { observe() {} disconnect() {} };
    win.confirm = () => true;
    win.fetch = () => Promise.reject(new Error('network disabled in smoke'));
    if (win.URL) { win.URL.createObjectURL = () => 'blob:smoke'; win.URL.revokeObjectURL = () => {}; }
    win.addEventListener('error', (e) => errors.push('window error: ' + e.message));
  }
});
const win = dom.window;
const $ = (id) => win.document.getElementById(id);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const assert = (c, m) => { if (!c) throw new Error('ASSERT: ' + m); };
const fire = (id, type) => { const el = $(id); el.dispatchEvent(new win.Event(type, { bubbles: true })); };

await new Promise((resolve) => {
  if (win.document.readyState === 'complete') resolve();
  else win.addEventListener('load', resolve, { once: true });
  setTimeout(resolve, 8000);
});
await sleep(1400);

/* ---------- boot / English default / real data ---------- */
assert(win.RL && win.RL.data && win.RL.marketdata && win.RL.proCore && win.RL.pro && win.RL.app,
  'all browser modules executed from HTTP');
assert(win.document.title.includes('Kyoraku Replay'), 'brand title');
assert(win.document.documentElement.lang === 'en', 'English is the default language');
assert(win.document.documentElement.dir === 'ltr', 'LTR direction by default');
assert(win.RL.i18n.lang === 'en', 'i18n default language');
assert($('btn-lang-en').classList.contains('active'), 'EN switch is active');
assert($('stat-balance').textContent.includes('$'), 'boot rendered');
assert($('data-source').textContent.includes('REAL'), 'dynamic real-data script loaded');
assert($('market-meta').textContent.includes('MIT'), 'attribution shown');
assert($('sel-symbol').options.length >= 12, 'market select populated');
assert($('sel-live-asset').options.length >= 15, 'live catalog populated');
assert(win.RL.dataFiles && win.RL.dataFiles.NQ, 'data/NQ.js fetched dynamically');
assert($('btn-buy').textContent.includes('Buy'), 'English control labels');
assert(win.document.querySelector('.free-badge').textContent.includes('free'), 'free badge in English');

$('sel-symbol').value = 'NAS100USD';
fire('sel-symbol', 'change');
await sleep(1200);
assert($('data-source').textContent.includes('REAL'), 'switched to NAS100USD');
assert(win.RL.dataFiles.NAS100USD, 'data/NAS100USD.js fetched on demand');
assert(![...$('sel-tf').options].some((o) => o.value === '1m'), '5m base hides 1m');

/* ---------- core replay: trailing + partial close ---------- */
$('chk-trail').checked = true;
fire('chk-trail', 'change');
$('chk-autopartial').checked = true;
fire('chk-autopartial', 'change');
$('btn-buy').click();
await sleep(150);
assert($('positions-list').querySelector('[data-partial]'), 'partial buttons rendered');
$('positions-list').querySelector('[data-partial][data-pct="50"]').click();
await sleep(150);
assert($('journal-body').textContent.includes('Partial'), 'partial close journal row in English');
for (let i = 0; i < 25; i += 1) $('btn-next').click();
await sleep(200);

for (const tab of ['analytics', 'montecarlo', 'propfirm', 'data', 'journal']) {
  win.document.querySelector('.tab[data-tab="' + tab + '"]').click();
  await sleep(60);
}

/* ---------- pro workspace ---------- */
assert(win.RL.proCore.load().lang === 'en', 'pro state defaults to English');

// Custom timeframe
$('input-custom-tf').value = '7';
$('btn-add-tf').click();
await sleep(120);
assert(win.RL.data.TF_MS['7m'] === 420000, 'custom 7m timeframe registered');
assert([... $('sel-tf').options].some((o) => o.value === '7m'), 'custom TF appears in selector');

// Multi-chart layout + pro indicator panes
$('sel-layout').value = 'triple';
fire('sel-layout', 'change');
await sleep(120);
assert(!$('third-wrap').classList.contains('hidden'), 'third chart visible in triple layout');
$('ind-macd').checked = true;
fire('ind-macd', 'change');
await sleep(80);
assert(!$('pro-pane-wrap').classList.contains('hidden'), 'MACD pro pane visible');
assert(win.RL.proCore.load().layout === 'triple', 'layout persisted');

// Strategy + strategy analytics
$('input-strategy-name').value = 'Opening drive';
$('btn-add-strategy').click();
await sleep(80);
assert($('strategy-list').textContent.includes('Opening drive'), 'strategy created');
assert([... $('sel-trade-strategy').options].some((o) => o.textContent === 'Opening drive'), 'strategy in selector');
win.document.querySelector('.tab[data-tab="strategies"]').click();
await sleep(80);
assert($('strategy-table-wrap').textContent.length > 0, 'strategy analytics rendered');

// Insights + R:R simulator
win.document.querySelector('.tab[data-tab="insights"]').click();
await sleep(80);
assert($('insights-content').textContent.length > 0, 'insights panel rendered');
win.document.querySelector('.tab[data-tab="rrsim"]').click();
$('btn-run-rr').click();
await sleep(80);
assert($('rr-results').textContent.includes('Original') || $('rr-detail').textContent.length > 0, 'RR simulator rendered');

// Local economic events
$('input-event-time').value = '2026-04-06T12:30';
$('input-event-title').value = 'NFP';
$('btn-add-event').click();
await sleep(80);
assert($('events-list').textContent.includes('NFP'), 'local event added');
assert(win.RL.proCore.load().events.length >= 1, 'event persisted');

// Limit working order + cancel
assert($('sel-order-type').value === 'market', 'market order is default');
$('sel-order-type').value = 'limit';
fire('sel-order-type', 'change');
const bar = win.RL.app.engine.currentBar();
$('input-order-price').value = String(Math.max(0.01, bar.c - 10));
$('btn-buy').click();
await sleep(120);
assert($('pending-list').textContent.includes('Waiting'), 'working limit order placed');
assert(win.RL.proCore.load().pending.length >= 1, 'pending order persisted');
$('btn-cancel-pending').click();
await sleep(80);
assert(win.RL.proCore.load().pending.length === 0, 'pending orders cancelled');

// Trade review dialog / screenshots / checklist
const detail = $('journal-body').querySelector('[data-detail]');
assert(detail, 'journal detail button rendered');
detail.click();
await sleep(100);
assert(/review/i.test($('trade-dialog-title').textContent), 'trade review dialog populated');
assert($('trade-checklist').querySelector('[data-check]'), 'pre-trade checklist rendered');
$('btn-shot-inline') && $('btn-shot-inline').click();

// Accent + shortcuts dialog
win.document.querySelector('.accent-dot[data-accent-value="cyan"]').click();
await sleep(60);
assert(win.document.documentElement.dataset.accent === 'cyan', 'accent switch persisted');
$('btn-shortcuts').click();
await sleep(60);
assert($('shortcuts-dialog'), 'shortcuts dialog exists');

/* ---------- bilingual switch + persistence ---------- */
$('btn-lang-ar').click();
await sleep(120);
assert(win.RL.i18n.lang === 'ar', 'Arabic switch works');
assert(win.document.documentElement.dir === 'rtl', 'RTL direction in Arabic');
assert($('btn-lang-ar').classList.contains('active'), 'AR switch is active');
assert($('btn-buy').textContent.includes('شراء'), 'Arabic control labels');
$('btn-lang-en').click();
await sleep(120);
assert(win.RL.i18n.lang === 'en', 'back to English');
assert(win.document.documentElement.dir === 'ltr', 'back to LTR');
assert(win.localStorage.getItem('kyoraku-replay:state:v2'), 'v2 state persisted');
assert(win.localStorage.getItem('kyoraku-replay:pro:v1'), 'pro state persisted');
const saved = JSON.parse(win.localStorage.getItem('kyoraku-replay:state:v2'));
assert(saved.ui.lang === 'en', 'English preference stored');

if (errors.length) throw new Error('Runtime errors:\n' + errors.join('\n'));
console.log('BROWSER SMOKE OK — English default, EN/AR, real data, trailing/partial, layouts, custom TF, pro indicators, strategies, insights, RR, events, working orders, review, accents, persistence, 0 runtime errors');
win.close();
process.exit(0);
