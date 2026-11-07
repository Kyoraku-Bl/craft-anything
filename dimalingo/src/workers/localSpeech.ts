// Whisper runs locally. Only model files are downloaded; audio is not uploaded.
import { env, pipeline } from '@huggingface/transformers';
import wasmURL from '../../node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.wasm?url';
import mjsURL from '../../node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.mjs?url';

env.allowLocalModels = true;
env.allowRemoteModels = false;
env.localModelPath = new URL('/models/', self.location.origin).href;
env.backends.onnx.wasm!.numThreads = 1;
env.backends.onnx.wasm!.wasmPaths = { wasm: wasmURL, mjs: mjsURL };

self.onmessage = async (event: MessageEvent<{ audio: Float32Array; language: string }>) => {
  let stage = 'loading';
  try {
    self.postMessage({ status: 'loading' });
    const load = () => pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny', {
      dtype: 'q8', device: 'wasm',
      progress_callback: (progress: { status: string; progress?: number }) => {
        if (progress.status === 'progress' && typeof progress.progress === 'number')
          self.postMessage({ status: 'progress', progress: Math.round(progress.progress) });
      },
    });
    let transcriber;
    try { transcriber = await load(); }
    catch (error) {
      // Some browsers expose CacheStorage but reject writes (private mode,
      // storage quota). Retry without the cache; model files may be re-fetched.
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
