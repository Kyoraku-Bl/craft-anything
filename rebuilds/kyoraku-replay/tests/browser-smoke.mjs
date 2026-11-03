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
  if (/getContext|Not implemented: HTMLDialogElement|Not implemented: window\.scroll/.test(m)) return;
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
    win.addEventListener('error', (e) => errors.push('window error: ' + e.message));
  }
});
const win = dom.window;
const $ = (id) => win.document.getElementById(id);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const assert = (c, m) => { if (!c) throw new Error('ASSERT: ' + m); };

await new Promise((resolve) => {
  if (win.document.readyState === 'complete') resolve();
  else win.addEventListener('load', resolve, { once: true });
  setTimeout(resolve, 8000);
});
await sleep(1200);

assert(win.RL && win.RL.data && win.RL.marketdata, 'all browser modules executed from HTTP');
assert(win.document.title.includes('Kyoraku Replay'), 'brand title');
assert($('stat-balance').textContent.includes('$'), 'boot rendered');
assert($('data-source').textContent.includes('REAL'), 'dynamic real-data script loaded');
assert($('market-meta').textContent.includes('MIT'), 'attribution shown');
assert($('sel-symbol').options.length >= 12, 'market select populated');
assert($('sel-live-asset').options.length >= 15, 'live catalog populated');
assert(win.RL.dataFiles && win.RL.dataFiles.NQ, 'data/NQ.js fetched dynamically');

$('sel-symbol').value = 'NAS100USD';
$('sel-symbol').dispatchEvent(new win.Event('change'));
await sleep(1200);
assert($('data-source').textContent.includes('REAL'), 'switched to NAS100USD');
assert(win.RL.dataFiles.NAS100USD, 'data/NAS100USD.js fetched on demand');
assert(![...$('sel-tf').options].some((o) => o.value === '1m'), '5m base hides 1m');

$('chk-trail').checked = true;
$('chk-trail').dispatchEvent(new win.Event('change'));
$('chk-autopartial').checked = true;
$('chk-autopartial').dispatchEvent(new win.Event('change'));
$('btn-buy').click();
await sleep(150);
assert($('positions-list').querySelector('[data-partial]'), 'partial buttons rendered');
$('positions-list').querySelector('[data-partial][data-pct="50"]').click();
await sleep(150);
assert($('journal-body').textContent.includes('جزئي'), 'partial close journal row');
for (let i = 0; i < 25; i += 1) $('btn-next').click();
await sleep(200);

for (const tab of ['analytics', 'montecarlo', 'propfirm', 'data', 'journal']) {
  win.document.querySelector('.tab[data-tab="' + tab + '"]').click();
  await sleep(80);
}
$('btn-lang').click();
await sleep(80);
assert($('btn-lang').textContent === 'العربية', 'language toggle');
assert(win.localStorage.getItem('kyoraku-replay:state:v2'), 'v2 state persisted');

if (errors.length) throw new Error('Runtime errors:\n' + errors.join('\n'));
console.log('BROWSER SMOKE OK — dynamic data load, trailing, partial, tabs, persistence, 0 runtime errors');
win.close();
process.exit(0);
