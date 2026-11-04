import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { PronunciationRecorder } from '../src/components/PronunciationRecorder';

const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url: 'https://dimalingo.vercel.app/' });
Object.assign(globalThis, { window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true });
Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true });
let captureCalls = 0;
Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: () => { captureCalls++; return Promise.reject(new DOMException('blocked', 'NotAllowedError')); } } });
class FakeRecognition {
  static instances: FakeRecognition[] = [];
  lang = ''; interimResults = false; continuous = true; maxAlternatives = 0;
  onstart: (() => void) | null = null;
  onresult: ((e: any) => void) | null = null;
  onerror: ((e: any) => void) | null = null;
  onend: (() => void) | null = null;
  aborted = false; stopped = false;
  constructor() { FakeRecognition.instances.push(this); }
  start() {}
  stop() { this.stopped = true; }
  abort() { this.aborted = true; }
}
(window as any).SpeechRecognition = FakeRecognition;
let evaluated: string[] = [];
const root = createRoot(document.getElementById('root')!);
const render = (target = 'Hello world') => root.render(<PronunciationRecorder targetSentence={target} audioText={target} audioLang="en-US" uiLang="en" onEvaluated={text => evaluated.push(text)} />);
const click = (text: string) => {
  const button = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes(text));
  assert(button, `button ${text} not found`);
  button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
};
await act(async () => render());
await act(async () => click('Tap and speak'));
const first = FakeRecognition.instances[0];
assert.equal(first.lang, 'en-US');
assert.equal(captureCalls, 0, 'recognition must not compete with getUserMedia');
assert(document.body.textContent?.includes('Requesting microphone access'));
await act(async () => first.onstart?.());
assert(document.body.textContent?.includes('Listening — speak clearly'));
await act(async () => click('Stop & analyze'));
assert(first.stopped);
assert.equal(evaluated.length, 0, 'stop must wait for final recognition result');
await act(async () => { first.onresult?.({results:[[{transcript:'Hello world'}]]}); first.onend?.(); });
assert.deepEqual(evaluated, ['Hello world']);
await act(async () => first.onend?.());
assert.equal(evaluated.length, 1, 'results must not be scored twice');

await act(async () => click('Tap and speak'));
const denied = FakeRecognition.instances[1];
await act(async () => denied.onerror?.({ error: 'not-allowed' }));
assert(document.body.textContent?.includes('Allow microphone'));
assert(denied.aborted);
await act(async () => click('Tap and speak'));
const silent = FakeRecognition.instances[2];
await act(async () => { silent.onstart?.(); silent.onend?.(); });
assert(document.body.textContent?.includes('No speech was detected'));
assert.equal(evaluated.length, 1);

await act(async () => click('Tap and speak'));
const stale = FakeRecognition.instances[3];
const staleEnd = stale.onend;
await act(async () => render('New sentence'));
assert(stale.aborted);
await act(async () => staleEnd?.());
assert.equal(evaluated.length, 1, 'old sessions must not score a new phrase');
assert(!document.body.textContent?.includes('No speech was detected'));

// An unsupported browser must not pretend it heard speech or score a denial.
delete (window as any).SpeechRecognition;
(globalThis as any).MediaRecorder = class {};
await act(async () => click('Tap and speak'));
assert.equal(captureCalls, 1);
assert(document.body.textContent?.includes('Speech recognition is unavailable'));
assert.equal(evaluated.length, 1);

let resolveStream: (value: any) => void = () => {};
let stopped = false;
Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: () => new Promise(resolve => { resolveStream = resolve; }) } });
await act(async () => click('Tap and speak'));
await act(async () => root.unmount());
await act(async () => resolveStream({ getTracks: () => [{ stop: () => { stopped = true; } }] }));
assert(stopped, 'a late microphone grant must be released after unmount');
dom.window.close();
console.log('Microphone recognition, stop, errors, retry, stale callbacks and unsupported-browser denial: OK');
