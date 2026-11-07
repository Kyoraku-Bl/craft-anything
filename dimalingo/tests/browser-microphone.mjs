// End-to-end speech test, using real Whisper weights, a real browser and a
// fake input device playing a known WAV file. Run with CHROMIUM_PATH and
// TEST_AUDIO_PATH pointing to Chromium and whisper's tests/jfk.wav.
import assert from 'node:assert/strict';
import { build, createServer, preview } from 'vite';
import { resolve } from 'node:path';
import { chromium } from 'playwright-core';
import { execFileSync } from 'node:child_process';

const { CHROMIUM_PATH, TEST_AUDIO_PATH } = process.env;
if (!CHROMIUM_PATH || !TEST_AUDIO_PATH) throw new Error('Set CHROMIUM_PATH and TEST_AUDIO_PATH (whisper tests/jfk.wav).');
execFileSync(process.execPath, ['scripts/prepare-speech-model.mjs'], { stdio: 'inherit' });
const production = process.env.TEST_PRODUCTION === '1';
const productionBuild = { outDir: resolve('node_modules/.cache/microphone-production'), emptyOutDir: true, rollupOptions: { input: resolve('tests/browser-microphone.html') } };
if (production) await build({ build: productionBuild });
const server = production
  ? await preview({ build: productionBuild, preview: { host: '127.0.0.1', port: 5178, strictPort: true } })
  : await createServer({ optimizeDeps: { include: ['react', 'react-dom/client', '@huggingface/transformers', 'onnxruntime-web', '@xenova/transformers/dist/transformers.min.js'] }, server: { host: '127.0.0.1', port: 5178, strictPort: true } });
let browser;
try {
  if (!production) await server.listen();
  browser = await chromium.launch({ executablePath: CHROMIUM_PATH, headless: true, args: [
    '--no-sandbox', '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream',
    `--use-file-for-fake-audio-capture=${TEST_AUDIO_PATH}`,
  ] });
  const context = await browser.newContext({ serviceWorkers: 'block' });
  // Force the no-SIMD selection without modifying microphone audio or the
  // runtime. The legacy runtime itself must load and execute non-SIMD WASM.
  if (process.env.TEST_NO_SIMD === '1') {
    await context.addInitScript(() => {
      const validate = WebAssembly.validate.bind(WebAssembly);
      WebAssembly.validate = (bytes) => {
        const view = bytes instanceof ArrayBuffer ? new Uint8Array(bytes) : new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength);
        return view.length === 50 && view[25] === 253 ? false : validate(bytes);
      };
    });
  }
  const external = [];
  const localRequests = [];
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.hostname !== '127.0.0.1') { external.push(url.href); return route.abort(); }
    localRequests.push(url.pathname);
    return route.continue();
  });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:5178/tests/browser-microphone.html');
  await page.getByRole('button', { name: 'Try local microphone and allow model download' }).click();
  await page.getByText('Recording: speak clearly', { exact: false }).waitFor({ timeout: 15000 });
  await page.waitForTimeout(6500);
  await page.getByRole('button', { name: 'Stop and transcribe' }).click();
  try { await page.waitForFunction(() => Boolean(document.body.dataset.result), null, { timeout: 120000 }); }
  catch (error) { console.error('Microphone UI:', await page.locator('body').innerText()); throw error; }
  const result = await page.locator('body').getAttribute('data-result');
  assert.match(result, /fellow|american/i);
  if (process.env.TEST_NO_SIMD === '1') assert.ok(localRequests.some(path => /ort-wasm(?:-[\w-]+)?\.wasm/.test(path) && !path.includes('simd')), 'non-SIMD WASM must be loaded');
  assert.deepEqual(external, [], 'local model must not make external network requests');
  console.log(`Browser microphone + real on-device Whisper model (${process.env.TEST_NO_SIMD === '1' ? 'non-SIMD' : 'SIMD'}):`, result);
} finally { await browser?.close(); if (production) await new Promise(resolveClose => server.httpServer.close(resolveClose)); else await server.close(); }
