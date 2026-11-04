import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import React, { act } from 'react';
import { PronunciationRecorder } from '../src/components/PronunciationRecorder';
import { SpeakingLabView } from '../src/components/SpeakingLabView';
import { COURSE_MAP } from '../src/data';

const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url: 'https://dimalingo.vercel.app/' });
Object.assign(globalThis, { window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true });
Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true });
const { createRoot } = await import('react-dom/client');
const { Simulate } = await import('react-dom/test-utils');
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

// Keep the browser path for non-service failures and reject stale callbacks.
await act(async () => click('Tap and speak'));
const silent = FakeRecognition.instances[1];
await act(async () => { silent.onstart?.(); silent.onend?.(); });
assert(document.body.textContent?.includes('No speech was detected'));
assert.equal(evaluated.length, 1);
await act(async () => click('Tap and speak'));
const stale = FakeRecognition.instances[2];
const staleEnd = stale.onend;
await act(async () => render('New sentence'));
assert(stale.aborted);
await act(async () => staleEnd?.());
assert.equal(evaluated.length, 1, 'old sessions must not score a new phrase');
assert(!document.body.textContent?.includes('No speech was detected'));

// The screenshot's network failure moves the MAIN button to local mode; the
// model download still requires the user's next, explicitly labelled tap.
await act(async () => click('Tap and speak'));
const failed = FakeRecognition.instances[3];
const recognizerCount = FakeRecognition.instances.length;
await act(async () => failed.onerror?.({error:'network'}));
assert(failed.aborted);
assert(document.body.textContent?.includes('browser speech service could not connect'));
assert(document.body.textContent?.includes('Speak into mic and allow model download'));
assert.equal(FakeRecognition.instances.length, recognizerCount);
assert.equal(captureCalls, 0, 'the fallback must not capture or download without another tap');
await act(async () => render('Another sentence'));
assert(document.body.textContent?.includes('Speak into mic and allow model download'), 'fallback remains selected across phrase changes');

// Late local-microphone grants must be released on unmount.
let resolveStream: (value: any) => void = () => {};
let stopped = false;
(globalThis as any).Worker = class {};
(globalThis as any).MediaRecorder = class {};
Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: () => new Promise(resolve => { resolveStream = resolve; }) } });
await act(async () => click('Speak into mic'));
assert.equal(FakeRecognition.instances.length, recognizerCount, 'must not restart broken browser recognition');
await act(async () => root.unmount());
await act(async () => resolveStream({ getTracks: () => [{ stop: () => { stopped = true; } }] }));
assert(stopped, 'a late microphone grant must be released after unmount');

// Preference survives recorder remounts (each phrase uses a different key).
const persistedRoot = createRoot(document.getElementById('root')!);
await act(async () => persistedRoot.render(<PronunciationRecorder targetSentence="Hi" audioText="Hi" audioLang="en-US" uiLang="en" onEvaluated={() => {}} />));
assert(document.body.textContent?.includes('Speak into mic and allow model download'));
await act(async () => persistedRoot.unmount());
window.sessionStorage.clear();
const root2 = createRoot(document.getElementById('root')!);
await act(async () => root2.render(<SpeakingLabView activeCourse={COURSE_MAP.fr} uiLang="fr" onSelectCourse={() => {}} onStartSpeakingWorkout={() => {}} />));
assert(document.body.textContent?.includes('Enchanté'));
assert(document.body.textContent?.includes('Ravi de vous rencontrer'));
assert(!document.body.textContent?.includes('ɑ̃'), 'IPA must not appear in the speaking UI');
const group = document.querySelector('[aria-label="Langue de traduction"]')!;
await act(async () => Array.from(group.querySelectorAll('button')).find(b => b.textContent === 'العربية')!.click());
assert(document.body.textContent?.includes('تشرفت بمعرفتكم'));
assert.equal(group.querySelector('[aria-pressed="true"]')?.textContent, 'العربية');
await act(async () => root2.unmount());

const root3 = createRoot(document.getElementById('root')!);
(window as any).SpeechRecognition = FakeRecognition;
await act(async () => root3.render(<PronunciationRecorder targetSentence="سلام" audioText="سلام" audioLang="ar-SA" speechLang="ar-MA" uiLang="en" onEvaluated={() => {}} />));
await act(async () => click('Tap and speak'));
assert.equal(FakeRecognition.instances.at(-1)?.lang, 'ar-MA', 'recognition must use the course recognition locale, independently of the audio locale');
await act(async () => root3.unmount());

// iOS Home Screen: no direct recognition needed for keyboard dictation.
Object.defineProperty(navigator, 'userAgent', { configurable: true, value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit' });
Object.defineProperty(navigator, 'standalone', { configurable: true, value: true });
const root4 = createRoot(document.getElementById('root')!);
let dictated: Array<{text: string; score: number}> = [];
const renderIOS = (target: string) => root4.render(<PronunciationRecorder targetSentence={target} audioText={target} audioLang="fr-FR" uiLang="fr" onEvaluated={(text, result) => dictated.push({text, score: result.score})} />);
const beforeInstances = FakeRecognition.instances.length;
await act(async () => renderIOS('Bonjour'));
assert(document.body.textContent?.includes('Dictée avec le clavier iPhone'));
assert(document.body.textContent?.includes('compare uniquement le texte'));
assert.equal(FakeRecognition.instances.length, beforeInstances);
const box = document.querySelector('textarea')!;
assert.equal(box.lang, 'fr-FR');
await act(async () => click('Ouvrir le clavier'));
assert.equal(document.activeElement, box);
assert((Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('Vérifier le texte')) as HTMLButtonElement).disabled);
await act(async () => Simulate.change(box, { target: { value: 'Bonjour' } }));
assert.equal(dictated.length, 0, 'dictation text must not be evaluated before confirmation');
await act(async () => click('Vérifier le texte'));
assert.deepEqual(dictated, [{text:'Bonjour', score:100}]);
assert(document.body.textContent?.includes('Correspondance du texte :'));
await act(async () => renderIOS('Merci'));
assert.equal((document.querySelector('textarea') as HTMLTextAreaElement).value, '', 'dictation text must reset for a new phrase');
await act(async () => root4.unmount());

// Local microphone flow in an iPhone Home Screen WebClip. Model and browser
// APIs are mocked: these tests do not establish real-device model performance.
class FakeRecorder {
  static last: FakeRecorder;
  state = 'inactive'; mimeType = 'audio/mp4';
  ondataavailable: ((event: any) => void) | null = null;
  onstop: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(_stream: any) { FakeRecorder.last = this; }
  start() { this.state = 'recording'; }
  stop() { this.state = 'inactive'; this.ondataavailable?.({ data: new Blob(['audio']) }); this.onstop?.(); }
}
class FakeWorker {
  static last: FakeWorker;
  onmessage: ((event: any) => void) | null = null; onerror: (() => void) | null = null;
  posted: any; terminated = false;
  constructor() { FakeWorker.last = this; }
  postMessage(message: any) { this.posted = message; }
  terminate() { this.terminated = true; }
}
(globalThis as any).Worker = FakeWorker;
(globalThis as any).MediaRecorder = FakeRecorder;
(globalThis as any).AudioContext = class {
  async decodeAudioData() { return { sampleRate: 16000, getChannelData: () => new Float32Array(8000).fill(0.1) }; }
  async close() {}
};
let stoppedTracks = 0;
Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: async () => ({getTracks: () => [{stop: () => stoppedTracks++}]}) } });
const localRoot = createRoot(document.getElementById('root')!);
const recognized: string[] = [];
const localRender = (target: string) => localRoot.render(<PronunciationRecorder targetSentence={target} audioText={target} audioLang="fr-FR" uiLang="en" onEvaluated={text => recognized.push(text)} />);
await act(async () => localRender('Bonjour'));
await act(async () => click('Speak into mic'));
assert(document.body.textContent?.includes('Recording: speak clearly'));
assert.equal(FakeRecognition.instances.length, beforeInstances, 'WebClip should use local recording, not SpeechRecognition');
await act(async () => click('Stop and transcribe'));
assert.equal(stoppedTracks, 1);
assert.equal(FakeWorker.last.posted.language, 'fr');
assert.equal(FakeWorker.last.posted.audio.length, 8000);
await act(async () => FakeWorker.last.onmessage?.({data:{status:'transcribing'}}));
assert(document.body.textContent?.includes('Transcribing on your device'));
await act(async () => FakeWorker.last.onmessage?.({data:{status:'done', text:'Bonjour'}}));
assert.deepEqual(recognized, ['Bonjour']);
assert(document.body.textContent?.includes('Recognized text match: 100%'));
assert(FakeWorker.last.terminated);
await act(async () => click('Speak into mic'));
await act(async () => click('Stop and transcribe'));
const oldWorker = FakeWorker.last;
await act(async () => localRender('Merci'));
assert(oldWorker.terminated);
await act(async () => oldWorker.onmessage?.({data:{status:'done',text:'Bonjour'}}));
assert.deepEqual(recognized, ['Bonjour'], 'stale local results must not be scored');
await act(async () => click('Speak into mic'));
await act(async () => click('Stop and transcribe'));
await act(async () => FakeWorker.last.onmessage?.({data:{status:'error'}}));
assert(document.body.textContent?.includes('Could not download or run local recognition'));
assert.equal(recognized.length, 1);
await act(async () => localRoot.unmount());

// Installed profile URL must select local recognition even if the WebClip does
// not expose standalone/display-mode (and even if the UA has been reduced).
Object.defineProperty(navigator, 'userAgent', { configurable: true, value: 'Mozilla/5.0' });
Object.defineProperty(navigator, 'standalone', { configurable: true, value: false });
window.history.replaceState({}, '', '/?standalone=ios');
const profileRoot = createRoot(document.getElementById('root')!);
await act(async () => profileRoot.render(<PronunciationRecorder targetSentence="Bonjour" audioText="Bonjour" audioLang="fr-FR" uiLang="en" onEvaluated={() => {}} />));
await act(async () => click('Speak into mic'));
assert(document.body.textContent?.includes('Recording: speak clearly'));
await act(async () => profileRoot.unmount());
assert.equal(FakeRecorder.last.state, 'inactive');
window.history.replaceState({}, '', '/');
Object.defineProperty(navigator, 'userAgent', { configurable: true, value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit' });

// iPhone Safari itself also defaults to the local mic, not Web Speech.
Object.defineProperty(navigator, 'standalone', { configurable: true, value: false });
window.sessionStorage.clear();
const root5 = createRoot(document.getElementById('root')!);
await act(async () => root5.render(<PronunciationRecorder targetSentence="Bonjour" audioText="Bonjour" audioLang="fr-FR" uiLang="fr" onEvaluated={() => {}} />));
const iosCount = FakeRecognition.instances.length;
assert(document.body.textContent?.includes('Parler au micro et accepter le téléchargement'));
await act(async () => click('Parler au micro et accepter le téléchargement'));
assert(document.body.textContent?.includes('Enregistrement : parlez clairement'));
assert.equal(FakeRecognition.instances.length, iosCount);
await act(async () => root5.unmount());

// No Web Speech on a non-iPhone: offer the local path, not a fake score.
Object.defineProperty(navigator, 'userAgent', { configurable: true, value: 'Mozilla/5.0' });
window.sessionStorage.clear();
delete (window as any).SpeechRecognition;
const noSpeechRoot = createRoot(document.getElementById('root')!);
await act(async () => noSpeechRoot.render(<PronunciationRecorder targetSentence="Hello" audioText="Hello" audioLang="en-US" uiLang="en" onEvaluated={() => { throw Error('must not score'); }} />));
await act(async () => click('Tap and speak'));
assert(document.body.textContent?.includes('Browser speech recognition is unavailable'));
assert(document.body.textContent?.includes('Speak into mic and allow model download'));
await act(async () => noSpeechRoot.unmount());
dom.window.close();
console.log('Microphone recognition, stop, errors, retry, stale callbacks and unsupported-browser denial: OK');
