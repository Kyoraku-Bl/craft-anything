import { build } from 'esbuild';
import { unlink } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
for (const [entry, external] of [['tests/fusha.test.ts', false], ['tests/pronunciation.test.tsx', true]]) {
  if (!external) {
    const result = await build({ entryPoints: [entry], bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'silent' });
    await import('data:text/javascript;base64,' + Buffer.from(result.outputFiles[0].text).toString('base64'));
  } else {
    const outfile = 'tests/.pronunciation-test-bundle.mjs';
    try {
      await build({ entryPoints: [entry], bundle: true, packages: 'external', platform: 'node', format: 'esm', outfile, logLevel: 'silent' });
      await import(pathToFileURL(`${process.cwd()}/${outfile}`).href);
    } finally { await unlink(outfile).catch(() => {}); }
  }
}
