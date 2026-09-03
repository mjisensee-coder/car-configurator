/**
 * Parses every generated asset with the same loaders the browser uses, so a
 * broken encoder is caught at build time rather than as a blank environment
 * in the scene.
 *
 * Run: npm run assets:verify
 */
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FloatType } from 'three';
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js';
import { read as readKtx2 } from 'ktx-parse';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let failures = 0;

const fail = (msg) => {
  console.error(`  ✗ ${msg}`);
  failures += 1;
};

const toArrayBuffer = (buf) =>
  buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);

console.log('\nHDR environment maps');
// HDRLoader defaults to HalfFloatType, whose `data` is a Uint16Array of
// half-float bit patterns — reading those as plain numbers reports garbage.
// Ask for full floats so the radiance values below are the real ones.
const hdrLoader = new HDRLoader().setDataType(FloatType);
for (const name of ['studio', 'modern-showroom', 'led-studio', 'city-night']) {
  const file = path.join(root, 'public/hdr', `${name}.hdr`);
  try {
    const texture = hdrLoader.parse(toArrayBuffer(await readFile(file)));
    const data = texture.data;
    let peak = 0;
    let sum = 0;
    for (let i = 0; i < data.length; i += 4) {
      const v = Math.max(data[i], data[i + 1], data[i + 2]);
      if (v > peak) peak = v;
      sum += v;
    }
    const pixels = data.length / 4;
    console.log(
      `  ✓ ${name.padEnd(17)} ${texture.width}×${texture.height}  peak ${peak.toFixed(1)}  mean ${(sum / pixels).toFixed(3)}`,
    );
    if (texture.width !== 1024 || texture.height !== 512) {
      fail(`${name}: unexpected dimensions`);
    }
    // A map with no values above 1.0 has no light sources in it and would
    // light the car like a grey box.
    if (peak <= 1) fail(`${name}: no high-dynamic-range light sources`);
  } catch (err) {
    fail(`${name}: parse failed — ${err.message}`);
  }
}

console.log('\nKTX2 textures');
for (const name of ['floor-alpha']) {
  const file = path.join(root, 'public/textures', `${name}.ktx2`);
  try {
    const container = readKtx2(new Uint8Array(await readFile(file)));
    const bytes = (await stat(file)).size;
    console.log(
      `  ✓ ${name.padEnd(17)} ${container.pixelWidth}×${container.pixelHeight}  vkFormat ${container.vkFormat}  levels ${container.levels.length}  ${(bytes / 1024).toFixed(0)} KB`,
    );
  } catch (err) {
    fail(`${name}: ${err.message}`);
  }
}

console.log('\nBasis transcoder');
for (const file of ['basis_transcoder.js', 'basis_transcoder.wasm']) {
  try {
    const { size } = await stat(path.join(root, 'public/basis', file));
    console.log(`  ✓ ${file.padEnd(22)} ${(size / 1024).toFixed(0)} KB`);
  } catch {
    fail(`public/basis/${file} missing — run npm run assets:basis`);
  }
}

console.log(failures === 0 ? '\nall assets valid\n' : `\n${failures} problem(s)\n`);
process.exit(failures === 0 ? 0 : 1);
