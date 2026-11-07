# Local speech model

`prepare-speech-model.mjs` copies the pinned `sts-whisper-tiny` npm package's
multilingual Whisper Tiny files into the generated `public/models/` directory.
The ONNX files' SHA-256 hashes are checked against the Xenova/whisper-tiny
upstream release. The model derives from OpenAI Whisper and is Apache-2.0:
https://huggingface.co/openai/whisper-tiny and
https://huggingface.co/Xenova/whisper-tiny. These generated files are not
committed. The service worker intentionally leaves model caching to
Transformers.js. Browser storage and downloads may still be limited or evicted.

Run the real browser microphone/model smoke test with a local Chromium and the
WAV file `tests/jfk.wav` from https://github.com/openai/whisper (not bundled):

```sh
CHROMIUM_PATH=/path/to/chromium TEST_AUDIO_PATH=/path/to/jfk.wav npm run test:microphone
```

It feeds the WAV to Chromium's fake microphone, runs the actual model and
asserts that no model requests leave the local site. This is not an Android or
iPhone hardware test.

The app selects a separate, pinned Transformers.js 2.17.2 / ONNX Runtime 1.14
compatibility worker without SIMD when the ONNX SIMD capability probe fails.
Its WASM binary is self-hosted and the same model is used. This older runtime
can be substantially slower. It has inherited npm audit advisories through its
legacy protobuf dependency; it is isolated in the worker and only loads our
pinned model, not arbitrary user-supplied models. Never use it for untrusted
model files.

Test the production-built compatibility path with real weights and fake audio:

```sh
TEST_PRODUCTION=1 TEST_NO_SIMD=1 CHROMIUM_PATH=/path/to/chromium TEST_AUDIO_PATH=/path/to/jfk.wav npm run test:microphone
```

The test forces the feature probe to report no SIMD and verifies that the
non-SIMD WASM actually loads and transcribes. It does not emulate an iPhone.
Use `TEST_PRODUCTION=1` without `TEST_NO_SIMD` to test the regular runtime.
