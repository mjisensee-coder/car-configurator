/**
 * Copies the Basis Universal transcoder out of the installed three package
 * into public/basis/.
 *
 * Why vendor it instead of using drei's default CDN path: drei's useKTX2
 * defaults to fetching the transcoder from a jsDelivr URL, which adds a
 * third-party request on the critical path of the first textured frame and
 * pins the app to a transcoder build that does not track our three version.
 * Serving /basis/ ourselves keeps the transcoder and three in lockstep and
 * lets the immutable cache header in next.config.mjs apply to it.
 *
 * Run: npm run assets:basis   (also runs as part of `npm run assets`)
 */
import { copyFile, mkdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dest = path.join(root, 'public', 'basis');

// three's package.json is not in its `exports` map, so resolve a file we
// know is exported and walk up from there.
const transcoderEntry = require.resolve(
  'three/examples/jsm/libs/basis/basis_transcoder.js',
);
const source = path.dirname(transcoderEntry);
const threeRoot = path.resolve(source, '..', '..', '..', '..');

await mkdir(dest, { recursive: true });

for (const file of ['basis_transcoder.js', 'basis_transcoder.wasm']) {
  const from = path.join(source, file);
  const to = path.join(dest, file);
  await copyFile(from, to);
  const { size } = await stat(to);
  console.log(`  public/basis/${file}  ${(size / 1024).toFixed(0)} KB`);
}

const { version } = JSON.parse(
  await readFile(path.join(threeRoot, 'package.json'), 'utf8'),
);
console.log(`basis transcoder vendored from three@${version}`);
