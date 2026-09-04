import { useMemo } from 'react';
import {
  ClampToEdgeWrapping,
  DataTexture,
  LinearFilter,
  RGBAFormat,
  UnsignedByteType,
} from 'three';

/**
 * The radial mask that fades the reflective showroom floor out toward its
 * edges, so the plane reads as an endless studio floor rather than a
 * rectangle with visible corners.
 *
 * This used to ship as a KTX2 file. KTX2 exists to keep textures
 * compressed in video memory, and it earns that on a scene with many or
 * large textures. Here there was exactly one, and it was a gradient: the
 * file cost 56 KB and the Basis transcoder needed to unpack it another
 * 571 KB, to deliver something a few lines of arithmetic produce for
 * nothing. VRAM is identical either way. Generating it removes ~627 KB
 * from the download, a build-time encoder from the toolchain, and a
 * vendored WASM blob from the repo.
 *
 * If real textures arrive later — paint maps, part textures, photo-real
 * environments — KTX2 becomes worth reinstating. The encoder script is in
 * git history.
 */

export const FLOOR_MASK_SIZE = 512;

/** Opaque out to this radius, then a smoothstep to fully transparent. */
const SOLID_RADIUS = 0.35;
const FADE_RADIUS = 0.95;

/**
 * Alpha at one texel, 0–255. Pure so it can be checked without a GPU:
 * `radius` runs 0 at the centre to 1 at the middle of each edge.
 */
export function floorMaskAlphaAt(x: number, y: number, size: number): number {
  const dx = (x + 0.5) / size - 0.5;
  const dy = (y + 0.5) / size - 0.5;
  const radius = Math.hypot(dx, dy) * 2;

  if (radius <= SOLID_RADIUS) return 255;
  if (radius >= FADE_RADIUS) return 0;

  const t = (radius - SOLID_RADIUS) / (FADE_RADIUS - SOLID_RADIUS);
  return Math.round((1 - t * t * (3 - 2 * t)) * 255);
}

/**
 * RGBA bytes for the mask. Greyscale plus alpha: three samples `.g` for
 * both alphaMap and roughnessMap, so writing the value into every channel
 * keeps the same data usable in either slot.
 */
export function createFloorMaskData(size = FLOOR_MASK_SIZE): Uint8Array {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const value = floorMaskAlphaAt(x, y, size);
      const i = (y * size + x) * 4;
      data[i] = value;
      data[i + 1] = value;
      data[i + 2] = value;
      data[i + 3] = value;
    }
  }
  return data;
}

/**
 * A DataTexture rather than a canvas: no DOM, so the generator above stays
 * a pure function that runs in tests.
 */
export function createFloorMaskTexture(size = FLOOR_MASK_SIZE): DataTexture {
  const texture = new DataTexture(
    createFloorMaskData(size),
    size,
    size,
    RGBAFormat,
    UnsignedByteType,
  );
  // Clamped, not repeated: it is a single radial gradient covering the
  // whole plane, so tiling would stamp bright discs across the floor.
  texture.wrapS = ClampToEdgeWrapping;
  texture.wrapT = ClampToEdgeWrapping;
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

/** Built once per mount and disposed with the scene. */
export function useFloorMask(size = FLOOR_MASK_SIZE): DataTexture {
  return useMemo(() => createFloorMaskTexture(size), [size]);
}
