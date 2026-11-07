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
