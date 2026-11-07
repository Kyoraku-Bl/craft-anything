// Compatibility path for browsers without WebAssembly SIMD. This is the
// pre-bundled Transformers.js v2 runtime, isolated from the newer ONNX runtime.
// Both runtimes use the same local, quantized Whisper model and never upload audio.
import { env, pipeline } from '@xenova/transformers/dist/transformers.min.js';
import wasmURL from '../../node_modules/@xenova/transformers/dist/ort-wasm.wasm?url';

env.allowLocalModels = true;
env.allowRemoteModels = false;
env.localModelPath = new URL('/models/', self.location.origin).href;
env.backends.onnx.wasm.numThreads = 1;
env.backends.onnx.wasm.simd = false;
env.backends.onnx.wasm.wasmPaths = { 'ort-wasm.wasm': wasmURL };

self.onmessage = async (event: MessageEvent<{ audio: Float32Array; language: string }>) => {
  let stage = 'loading';
  try {
    self.postMessage({ status: 'loading' });
    const load = () => pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny', {
      quantized: true,
      progress_callback: (progress: { status: string; progress?: number }) => {
        if (progress.status === 'progress' && typeof progress.progress === 'number')
          self.postMessage({ status: 'progress', progress: Math.round(progress.progress) });
      },
    });
    let transcriber;
    try { transcriber = await load(); }
    catch (error) {
      const reason = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
      if (!env.useBrowserCache || !/quota|cache(storage)?|storage.*(access|denied)/i.test(reason)) throw error;
      env.useBrowserCache = false;
      self.postMessage({ status: 'loading' });
      transcriber = await load();
    }
    stage = 'transcribing';
    self.postMessage({ status: 'transcribing' });
    const output = await transcriber(event.data.audio, { language: event.data.language, task: 'transcribe' });
    self.postMessage({ status: 'done', text: Array.isArray(output) ? output[0]?.text : output.text });
  } catch (error) {
    self.postMessage({ status: 'error', stage, message: error instanceof Error ? `${error.name}: ${error.message}` : String(error) });
  }
};
