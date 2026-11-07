export type LocalSpeechFailure = 'DOWNLOAD' | 'MEMORY' | 'RUNTIME' | 'CACHE' | 'TRANSCRIBE' | 'LOAD' | 'WORKER' | 'TIMEOUT';

// Report a short error code separately from the transcript. Never put audio or
// recognized speech in diagnostics. The error text is kept on-device only.
export function classifyLocalSpeechError(stage: string, detail: string): LocalSpeechFailure {
  if (/out of memory|allocation|memory access|memory limit/i.test(detail)) return 'MEMORY';
  if (/quota|cache(storage)?|storage.*(access|denied)/i.test(detail)) return 'CACHE';
  if (/no available backend|webassembly|wasm|simd|compileerror|backend.*initiali[sz]/i.test(detail)) return 'RUNTIME';
  if (stage === 'transcribing') return 'TRANSCRIBE';
  if (/fetch|network|could not locate|http|status code|404|403|failed to load|unexpected token/i.test(detail)) return 'DOWNLOAD';
  return 'LOAD';
}
export function safeSpeechErrorDetail(value: unknown): string {
  return typeof value === 'string' ? value.replace(/https?:\/\/\S+/g, '[url]').replace(/[\r\n]+/g, ' ').slice(0, 200) : '';
}
