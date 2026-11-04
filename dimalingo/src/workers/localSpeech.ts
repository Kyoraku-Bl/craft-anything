// Whisper runs locally. Only model files are downloaded; audio is not uploaded.
import { env, pipeline } from '@huggingface/transformers';
import wasmURL from '../../node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.wasm?url';
import mjsURL from '../../node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.mjs?url';

env.allowLocalModels = false;
env.backends.onnx.wasm!.numThreads = 1;
env.backends.onnx.wasm!.wasmPaths = { wasm: wasmURL, mjs: mjsURL };

self.onmessage = async (event: MessageEvent<{ audio: Float32Array; language: string }>) => {
  try {
    self.postMessage({ status: 'loading' });
    const transcriber = await pipeline('automatic-speech-recognition', 'onnx-community/whisper-tiny', {
      dtype: 'q8', device: 'wasm',
      progress_callback: (progress: { status: string; progress?: number }) => {
        if (progress.status === 'progress' && typeof progress.progress === 'number')
          self.postMessage({ status: 'progress', progress: Math.round(progress.progress) });
      },
    });
    self.postMessage({ status: 'transcribing' });
    const output = await transcriber(event.data.audio, { language: event.data.language, task: 'transcribe' });
    self.postMessage({ status: 'done', text: Array.isArray(output) ? output[0]?.text : output.text });
  } catch (error) {
    self.postMessage({ status: 'error', message: error instanceof Error ? error.message : String(error) });
  }
};
