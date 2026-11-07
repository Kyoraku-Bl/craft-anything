// The npm package contains the Apache-2.0 Whisper Tiny ONNX export. Verify the
// upstream Xenova model hashes, then copy only the files required by the app.
// Generated model files are ignored by Git and regenerated for each build.
import { copyFile, mkdir, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

const source = 'node_modules/sts-whisper-tiny/models/Xenova/whisper-tiny';
const dest = 'public/models/Xenova/whisper-tiny';
const files = [
  'config.json', 'generation_config.json', 'preprocessor_config.json',
  'tokenizer.json', 'tokenizer_config.json',
  'onnx/encoder_model_quantized.onnx', 'onnx/decoder_model_merged_quantized.onnx',
];
const hashes = {
  'onnx/encoder_model_quantized.onnx': 'fd9d995b9dcb0520f0dbf6cf68651af639fc385f594d9d876e69ca2802dc438e',
  'onnx/decoder_model_merged_quantized.onnx': '6c0c125986b007d2e3734bec84c18bda0152071b90b87fadac6d7764499927a0',
};
for (const file of files) {
  if (hashes[file]) {
    const digest = createHash('sha256').update(await readFile(join(source, file))).digest('hex');
    if (digest !== hashes[file]) throw new Error(`Unexpected model checksum: ${file}`);
  }
  const out = join(dest, file);
  await mkdir(join(out, '..'), { recursive: true });
  await copyFile(join(source, file), out);
}
