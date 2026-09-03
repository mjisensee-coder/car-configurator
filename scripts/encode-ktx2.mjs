/**
 * Produces the KTX2 textures the scenes load through drei's useKTX2.
 *
 * Today there is one: `floor-alpha`, a radial mask that fades the
 * reflective showroom floor out toward its edges so the plane reads as an
 * endless studio floor instead of a rectangle with visible corners.
 *
 * Two encoding paths:
 *
 *   1. If KTX-Software's `toktx` is on PATH, the texture is encoded as
 *      UASTC — GPU-compressed, transcoded at load time by the Basis
 *      transcoder in public/basis/, and a quarter of the VRAM.
 *   2. Otherwise it falls back to an uncompressed KTX2
 *      (VK_FORMAT_R8G8B8A8_UNORM), which three's KTX2Loader reads directly
 *      through its raw-format path.
 *
 * Both produce a file the app loads identically, so the pipeline works on
 * a clean machine and gets better when the encoder is installed. Install
 * it with `brew install ktx` (or grab KTX-Software from Khronos) and
 * re-run to get the compressed variant.
 *
 * Run: npm run assets:ktx2
 */
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync, zstdCompressSync } from 'node:zlib';
import {
  createDefaultContainer,
  write as writeKtx2,
  KHR_DF_MODEL_RGBSDA,
  KHR_DF_PRIMARIES_BT709,
  KHR_DF_TRANSFER_LINEAR,
  KHR_SUPERCOMPRESSION_ZSTD,
  VK_FORMAT_R8G8B8A8_UNORM,
} from 'ktx-parse';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'public', 'textures');

const TEXTURES = {
  'floor-alpha': {
    size: 512,
    /**
     * Radial falloff. Opaque out to `solid`, then a smoothstep to fully
     * transparent at the edge of the disc.
     */
    generate(x, y, size) {
      const cx = (x + 0.5) / size - 0.5;
      const cy = (y + 0.5) / size - 0.5;
      const radius = Math.hypot(cx, cy) * 2; // 0 at centre, 1 at edge mid-side
      const solid = 0.35;
      const fade = 0.95;
      let alpha;
      if (radius <= solid) alpha = 1;
      else if (radius >= fade) alpha = 0;
      else {
        const t = (radius - solid) / (fade - solid);
        alpha = 1 - t * t * (3 - 2 * t); // smoothstep
      }
      const value = Math.round(alpha * 255);
      // Greyscale + alpha: three reads .g for alphaMap and .g for
      // roughnessMap, so the same file works either way.
      return [value, value, value, value];
    },
  },
};

/** Minimal PNG writer — the intermediate `toktx` needs as input. */
function encodePng(width, height, rgba) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0; // filter type 0
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const chunk = (type, data) => {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body) >>> 0);
    return Buffer.concat([length, body, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

let crcTable;
function crc32(buf) {
  if (!crcTable) {
    crcTable = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crcTable[n] = c;
    }
  }
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xff];
  }
  return crc ^ -1;
}

function hasToktx() {
  try {
    execFileSync('toktx', ['--version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

await mkdir(outDir, { recursive: true });
const compressed = hasToktx();

for (const [name, spec] of Object.entries(TEXTURES)) {
  const { size } = spec;
  const rgba = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = spec.generate(x, y, size);
      const i = (y * size + x) * 4;
      rgba[i] = r;
      rgba[i + 1] = g;
      rgba[i + 2] = b;
      rgba[i + 3] = a;
    }
  }

  const target = path.join(outDir, `${name}.ktx2`);

  if (compressed) {
    const pngPath = path.join(outDir, `${name}.png`);
    await writeFile(pngPath, encodePng(size, size, rgba));
    execFileSync('toktx', [
      '--t2',
      '--uastc',
      '--uastc_quality',
      '2',
      '--zcmp',
      '18',
      '--genmipmap',
      target,
      pngPath,
    ]);
    await unlink(pngPath);
    const bytes = (await readFile(target)).length;
    console.log(
      `  public/textures/${name}.ktx2  ${size}×${size}  UASTC  ${(bytes / 1024).toFixed(0)} KB`,
    );
  } else {
    const container = createDefaultContainer();
    container.vkFormat = VK_FORMAT_R8G8B8A8_UNORM;
    container.typeSize = 1;
    container.pixelWidth = size;
    container.pixelHeight = size;
    // RGBA rather than a single red channel: three samples `.g` for both
    // alphaMap and roughnessMap, so a RedFormat texture would read as zero
    // in either slot.
    //
    // ZSTD supercompression keeps the download small (a smooth gradient
    // compresses to a fraction of a percent). three's KTX2Loader inflates
    // it with its bundled ZSTD decoder. It does not reduce VRAM — only a
    // real UASTC/ETC1S encode does that, which is what the toktx path
    // above produces.
    container.supercompressionScheme = KHR_SUPERCOMPRESSION_ZSTD;
    container.levelCount = 1;
    container.levels = [
      {
        levelData: new Uint8Array(zstdCompressSync(rgba)),
        uncompressedByteLength: rgba.length,
      },
    ];
    // Describe the four 8-bit UNORM channels so the file is a valid KTX2
    // and not just a blob three happens to accept. The mask is authored in
    // linear space — it drives alpha/roughness, not colour.
    const dfd = container.dataFormatDescriptor[0];
    dfd.colorModel = KHR_DF_MODEL_RGBSDA;
    dfd.colorPrimaries = KHR_DF_PRIMARIES_BT709;
    dfd.transferFunction = KHR_DF_TRANSFER_LINEAR;
    dfd.texelBlockDimension = [0, 0, 0, 0];
    dfd.bytesPlane = [4, 0, 0, 0, 0, 0, 0, 0];
    dfd.samples = [0, 1, 2, 3].map((i) => ({
      bitOffset: i * 8,
      bitLength: 7,
      channelType: i,
      samplePosition: [0, 0, 0, 0],
      sampleLower: 0,
      sampleUpper: 255,
    }));

    await writeFile(target, Buffer.from(writeKtx2(container)));
    const bytes = (await readFile(target)).length;
    console.log(
      `  public/textures/${name}.ktx2  ${size}×${size}  RGBA8 + zstd  ${(bytes / 1024).toFixed(1)} KB` +
        `  (${(rgba.length / 1024 / 1024).toFixed(1)} MB in VRAM)`,
    );
  }
}

if (!compressed) {
  console.log(
    '\n  note: `toktx` not found — wrote a zstd-supercompressed RGBA8 KTX2.\n' +
      '        Small over the wire, but still uncompressed on the GPU.\n' +
      '        Install KTX-Software (brew install ktx) and re-run to get a\n' +
      '        UASTC file that stays compressed in VRAM.',
  );
}
