/**
 * Bakes an equirectangular HDR environment map for each showroom.
 *
 * Why generate rather than download: the scenes were lit by drei
 * <Lightformer> children inside <Environment frames={Infinity}>, which
 * re-renders the cubemap probe every single frame. Baking the same room
 * into a static .hdr moves that cost to build time — the probe is uploaded
 * once — while keeping the reflections the strips produce on the paint,
 * which are the whole reason the scenes look like a showroom.
 *
 * Each map is ray-traced analytically: for every texel, cast a ray from
 * the probe position into a box room and shade whatever face it hits. That
 * keeps the HDR consistent with the visible geometry in the scene, so the
 * reflected strips line up with the emissive strips the camera can see.
 *
 * Run: npm run assets:hdr
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { encodeHdr } from './lib/hdr.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'public', 'hdr');

const WIDTH = 1024;
const HEIGHT = 512;

/** Probe sits at roughly the car's mid-height, like the real reflection. */
const PROBE = [0, 0.8, 0];

/** Hex → a hue tint normalised so its brightest channel is 1. */
const hex = (value) => {
  const rgb = [
    ((value >> 16) & 255) / 255,
    ((value >> 8) & 255) / 255,
    (value & 255) / 255,
  ];
  const peak = Math.max(...rgb) || 1;
  return rgb.map((c) => c / peak);
};

/**
 * Room descriptions.
 *
 * Surfaces are described by a hue `tint` (normalised so its brightest
 * channel is 1) and an absolute `level` in linear radiance, rather than by
 * a colour multiplied by an ambient factor. That distinction matters: the
 * surfaces of a room are most of the solid angle around the car, so they —
 * not the strips — decide how bright the body reads. Describing them as
 * "dark grey × 0.35 ambient" produced a room that measured almost black.
 *
 * `strips` are emissive ceiling rectangles in metres; `accents` are
 * free-floating coloured area lights described by direction and radius.
 */
const PRESETS = {
  studio: {
    // Mirrors ProShowroom: 30 × 20 × 8 m, four ceiling strips. The brief
    // for this scene is a BRIGHTLY-LIT dealer floor, so the ceiling reads
    // as a large soft source and the walls bounce plenty back.
    room: { width: 30, depth: 20, height: 8 },
    wall: { tint: hex(0x23232a), level: 0.42 },
    ceiling: { tint: hex(0xdfe2ea), level: 1.25 },
    floor: { tint: hex(0x101015), level: 0.14 },
    strips: [-4.5, -1.5, 1.5, 4.5].map((z) => ({
      z,
      length: 10,
      thickness: 0.4,
      intensity: 14,
      color: [1, 1, 1],
    })),
    accents: [
      { dir: [0, 0.35, -1], radius: 0.5, color: [0.81, 0.89, 1], intensity: 2.4 },
      { dir: [0.8, 0.5, 0.6], radius: 0.42, color: [1, 0.94, 0.83], intensity: 1.8 },
      { dir: [-0.8, 0.5, 0.6], radius: 0.42, color: [1, 0.94, 0.83], intensity: 1.8 },
    ],
  },
  'modern-showroom': {
    // Polsaris GLB room: 28.6 × 28.6 × 3.2 m with a glass ceiling — a
    // broad even wash rather than discrete strips.
    room: { width: 28.6, depth: 28.6, height: 3.2 },
    wall: { tint: hex(0x2b2b33), level: 0.55 },
    ceiling: { tint: hex(0xf0f2f5), level: 2.4 },
    floor: { tint: hex(0x15151a), level: 0.22 },
    strips: [-6, -2, 2, 6].map((z) => ({
      z,
      length: 16,
      thickness: 0.9,
      intensity: 5,
      color: [1, 0.99, 0.96],
    })),
    accents: [],
  },
  'led-studio': {
    // Velocity Motion GLB: 28.3 × 28.3 × 3.0 m. Dark and contrasty on
    // purpose — the strips and the two colour accents do all the work.
    room: { width: 28.3, depth: 28.3, height: 3.0 },
    wall: { tint: hex(0x111116), level: 0.09 },
    ceiling: { tint: hex(0x0c0c10), level: 0.06 },
    floor: { tint: hex(0x08080b), level: 0.05 },
    strips: [-3.2, 3.2].map((z) => ({
      z,
      length: 12,
      thickness: 0.35,
      intensity: 18,
      color: [1, 1, 1],
    })),
    accents: [
      { dir: [-1, 0.25, -0.35], radius: 0.5, color: [0.24, 0.5, 1], intensity: 5 },
      { dir: [1, 0.25, -0.35], radius: 0.5, color: [1, 0.22, 0.3], intensity: 5 },
      { dir: [0, 0.9, 0], radius: 0.8, color: [0.85, 0.9, 1], intensity: 0.8 },
    ],
  },
  'city-night': {
    // NightDisplay is an open scene: no ceiling, distant coloured glow.
    room: { width: 60, depth: 60, height: 26 },
    wall: { tint: hex(0x0a0a10), level: 0.07 },
    ceiling: { tint: hex(0x05050a), level: 0.03 },
    floor: { tint: hex(0x070709), level: 0.04 },
    strips: [],
    accents: [
      { dir: [-0.9, 0.18, -0.4], radius: 0.55, color: [1, 0.18, 0.28], intensity: 7 },
      { dir: [0.9, 0.2, -0.3], radius: 0.55, color: [0.2, 0.45, 1], intensity: 6 },
      { dir: [0.1, 0.75, 0.2], radius: 0.7, color: [0.7, 0.8, 1], intensity: 1.6 },
      { dir: [0.2, 0.05, 1], radius: 0.35, color: [1, 0.7, 0.35], intensity: 3 },
    ],
  },
};

const normalize = (v) => {
  const len = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / len, v[1] / len, v[2] / len];
};

/**
 * Nearest intersection of a ray from `origin` with the inside of an
 * axis-aligned box spanning x/z about the centre and y from 0 to height.
 * Returns the hit point and which face was hit.
 */
function intersectRoom(origin, dir, room) {
  const halfW = room.width / 2;
  const halfD = room.depth / 2;
  let best = Infinity;
  let face = 'wall';

  const consider = (t, name) => {
    if (t > 1e-4 && t < best) {
      best = t;
      face = name;
    }
  };

  if (dir[1] > 1e-6) consider((room.height - origin[1]) / dir[1], 'ceiling');
  if (dir[1] < -1e-6) consider((0 - origin[1]) / dir[1], 'floor');
  if (dir[0] > 1e-6) consider((halfW - origin[0]) / dir[0], 'wall');
  if (dir[0] < -1e-6) consider((-halfW - origin[0]) / dir[0], 'wall');
  if (dir[2] > 1e-6) consider((halfD - origin[2]) / dir[2], 'wall');
  if (dir[2] < -1e-6) consider((-halfD - origin[2]) / dir[2], 'wall');

  return {
    face,
    point: [
      origin[0] + dir[0] * best,
      origin[1] + dir[1] * best,
      origin[2] + dir[2] * best,
    ],
  };
}

function shade(dir, preset) {
  const { room } = preset;
  const hit = intersectRoom(PROBE, dir, room);
  let rgb;

  if (hit.face === 'ceiling') {
    rgb = preset.ceiling.tint.map((c) => c * preset.ceiling.level);
    // Emissive strips run along X at a fixed Z.
    for (const strip of preset.strips) {
      const insideLength = Math.abs(hit.point[0]) <= strip.length / 2;
      const distance = Math.abs(hit.point[2] - strip.z);
      if (insideLength && distance <= strip.thickness / 2) {
        rgb = strip.color.map((c) => c * strip.intensity);
        break;
      }
      // A soft shoulder just outside the strip keeps the reflection from
      // aliasing into a hard-edged line on curved panels.
      if (insideLength && distance <= strip.thickness) {
        const falloff =
          1 - (distance - strip.thickness / 2) / (strip.thickness / 2);
        rgb = rgb.map(
          (c, i) => c + strip.color[i] * strip.intensity * falloff * 0.35,
        );
      }
    }
  } else if (hit.face === 'floor') {
    rgb = preset.floor.tint.map((c) => c * preset.floor.level);
  } else {
    // Walls catch more of the ceiling light the higher up they are.
    const heightRatio = Math.max(0, Math.min(1, hit.point[1] / room.height));
    const wash = 0.45 + 0.55 * heightRatio;
    rgb = preset.wall.tint.map((c) => c * preset.wall.level * wash);
  }

  // Free-floating accent lights, added as smooth angular blobs.
  for (const accent of preset.accents) {
    const a = normalize(accent.dir);
    const cosine = dir[0] * a[0] + dir[1] * a[1] + dir[2] * a[2];
    const angle = Math.acos(Math.max(-1, Math.min(1, cosine)));
    if (angle < accent.radius) {
      const falloff = Math.pow(1 - angle / accent.radius, 2);
      rgb = rgb.map((c, i) => c + accent.color[i] * accent.intensity * falloff);
    }
  }

  return rgb;
}

await mkdir(outDir, { recursive: true });

for (const [name, preset] of Object.entries(PRESETS)) {
  const data = new Float32Array(WIDTH * HEIGHT * 3);

  for (let y = 0; y < HEIGHT; y++) {
    // v = 0 at the zenith, matching the equirectangular convention three
    // uses when it maps the texture onto the environment sphere.
    const theta = ((y + 0.5) / HEIGHT) * Math.PI;
    const sinTheta = Math.sin(theta);
    const cosTheta = Math.cos(theta);

    for (let x = 0; x < WIDTH; x++) {
      const phi = ((x + 0.5) / WIDTH - 0.5) * 2 * Math.PI;
      const dir = [
        sinTheta * Math.sin(phi),
        cosTheta,
        sinTheta * Math.cos(phi),
      ];
      const rgb = shade(dir, preset);
      const i = (y * WIDTH + x) * 3;
      data[i] = rgb[0];
      data[i + 1] = rgb[1];
      data[i + 2] = rgb[2];
    }
  }

  const buffer = encodeHdr(WIDTH, HEIGHT, data);
  const file = path.join(outDir, `${name}.hdr`);
  await writeFile(file, buffer);
  console.log(
    `  public/hdr/${name}.hdr  ${WIDTH}×${HEIGHT}  ${(buffer.length / 1024).toFixed(0)} KB`,
  );
}

console.log(`generated ${Object.keys(PRESETS).length} environment maps`);
