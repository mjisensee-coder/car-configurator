/**
 * Asset paths shared by the scenes.
 *
 * Only the baked environment maps live here now. The floor mask used to
 * be a KTX2 file alongside them; it is generated at runtime instead — see
 * floorMask.ts for why.
 */

/** Baked equirectangular IBL, one per environment. */
export const HDR_FILES = {
  showroom: '/hdr/studio.hdr',
  'city-night': '/hdr/city-night.hdr',
  'modern-showroom': '/hdr/modern-showroom.hdr',
} as const;
