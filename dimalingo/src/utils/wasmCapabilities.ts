// Match ONNX Runtime's SIMD feature probe. Some iOS configurations disable
// SIMD even though WebAssembly itself works (for example Lockdown Mode).
export function supportsWasmSimd(): boolean {
  try {
    return typeof WebAssembly !== 'undefined' && WebAssembly.validate(new Uint8Array([
      0, 97, 115, 109, 1, 0, 0, 0, 1, 4, 1, 96, 0, 0, 3, 2, 1, 0,
      10, 30, 1, 28, 0, 65, 0, 253, 15, 253, 12, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 253, 186, 1, 26, 11,
    ]));
  } catch { return false; }
}
