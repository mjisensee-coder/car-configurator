/**
 * Asset paths and loader configuration shared by the scenes.
 *
 * The Basis transcoder is served from our own origin (see
 * scripts/copy-basis-transcoder.mjs). drei's useKTX2 otherwise defaults to
 * fetching it from a public CDN, which puts a third-party request on the
 * critical path of the first textured frame and decouples the transcoder
 * version from the three version we build against.
 */
export const BASIS_TRANSCODER_PATH = '/basis/';

/** Baked equirectangular IBL, one per environment. */
export const HDR_FILES = {
  showroom: '/hdr/studio.hdr',
  'city-night': '/hdr/city-night.hdr',
  'modern-showroom': '/hdr/modern-showroom.hdr',
} as const;

/** Radial mask that fades the reflective floor out toward its edges. */
export const FLOOR_MASK = '/textures/floor-alpha.ktx2';
