// End-to-end speech test, using real Whisper weights, a real browser and a
// fake input device playing a known WAV file. Run with CHROMIUM_PATH and
// TEST_AUDIO_PATH pointing to Chromium and whisper's tests/jfk.wav.
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { chromium } from 'playwright-core';
import { execFileSync } from 'node:child_process';

const { CHROMIUM_PATH, TEST_AUDIO_PATH } = process.env;
if (!CHROMIUM_PATH || !TEST_AUDIO_PATH) throw new Error('Set CHROMIUM_PATH and TEST_AUDIO_PATH (whisper tests/jfk.wav).');
execFileSync(process.execPath, ['scripts/prepare-speech-model.mjs'], { stdio: 'inherit' });
const server = await createServer({ optimizeDeps: { include: ['react', 'react-dom/client', '@huggingface/transformers', 'onnxruntime-web'] }, server: { host: '127.0.0.1', port: 5178, strictPort: true } });
let browser;
try {
  await server.listen();
  browser = await chromium.launch({ executablePath: CHROMIUM_PATH, headless: true, args: [
    '--no-sandbox', '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream',
    `--use-file-for-fake-audio-capture=${TEST_AUDIO_PATH}`,
  ] });
  const context = await browser.newContext({ serviceWorkers: 'block' });
  const external = [];
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.hostname !== '127.0.0.1') { external.push(url.href); return route.abort(); }
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
  assert.deepEqual(external, [], 'local model must not make external network requests');
  console.log('Browser microphone + real on-device Whisper model:', result);
} finally { await browser?.close(); await server.close(); }
