/**
 * Types for the Radiance (.hdr) writer. The implementation is plain JS so
 * the asset scripts run under bare `node`.
 */

/** Float RGB → shared-exponent RGBE bytes: [r, g, b, e]. */
export function floatToRgbe(
  r: number,
  g: number,
  b: number,
): [number, number, number, number];

/**
 * Encodes linear RGB radiance into a Radiance .hdr with new-style RLE
 * scanlines — the variant three's HDRLoader and three-stdlib's RGBELoader
 * both accept.
 *
 * @param rgb width * height * 3 linear radiance values
 */
export function encodeHdr(
  width: number,
  height: number,
  rgb: Float32Array,
): Buffer;
