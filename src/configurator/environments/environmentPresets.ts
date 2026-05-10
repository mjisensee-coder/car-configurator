import type { EnvironmentId } from '@/types';

/**
 * Showroom environment presets.
 *
 * Each preset bundles an HDRI (which provides BOTH the panoramic
 * background AND image-based lighting), a floor spec, an array of
 * supplemental stage lights, and contact-shadow tuning.
 *
 * Adding a new environment:
 *   1. Drop the HDRI under /public/environments/ (2K is the sweet spot
 *      for visual quality vs. file size, ~6MB each).
 *   2. Append a preset below.
 *   3. Add the id to the EnvironmentId union in src/types.
 *
 * Asset attribution: all HDRIs and previews from Poly Haven (CC0).
 */

export interface LightSpec {
  type: 'spot' | 'point' | 'directional';
  position: [number, number, number];
  color: string;
  intensity: number;
  /** spot: penumbra (0-1). */
  penumbra?: number;
  /** spot: cone half-angle in radians. */
  angle?: number;
  /** spot/directional: cast shadows. */
  castShadow?: boolean;
}

/**
 * Floor reflection overlay — only used for glossy environments where we
 * want real-time car reflections in addition to the HDRI ground projection.
 *
 * The car sits on the ground-projected HDRI itself (drei's
 * `<Environment ground={...}>` re-projects the panorama's lower hemisphere
 * onto a virtual flat ground). The reflection overlay is an OPTIONAL second
 * layer painted on top of that — semi-transparent so the projected ground
 * still shows through, with a small radius so its edge can't reach the
 * HDRI horizon line.
 */
export interface ReflectionOverlay {
  /** 0-1 mix toward the mirror (higher = stronger car-in-floor reflection). */
  mirrorMix: number;
  /** Blur radius of the reflection. Lower = sharper. */
  blurAmount: number;
  /** Tint color for the reflection (multiplied with the mirror). */
  color: string;
  /** 0-1 opacity of the overlay layer. */
  opacity: number;
  /** Radius of the overlay disc — keep small so the edge stays under the car. */
  radius: number;
}

/**
 * Ground-projected HDRI parameters, fed to drei's `<Environment ground>`.
 * These values re-project the HDRI's lower half onto a flat virtual ground,
 * so the car visually sits ON the panorama floor instead of on a seam.
 *
 * Tuning per HDRI:
 *   - height: where the camera is above the projected ground (m). Should
 *             roughly match the eye-height of the original photographer.
 *   - radius: where the ground starts to curve back up into the sky.
 *             Larger = flatter ground extending further.
 *   - scale:  overall HDRI sphere scale. Larger = horizon further out.
 */
export interface GroundProjection {
  height: number;
  radius: number;
  scale: number;
}

export interface EnvironmentPreset {
  id: EnvironmentId;
  name: string;
  /** One-line vibe tag for the carousel UI. */
  vibe: string;
  hdriUrl: string;
  /** Tonemapped JPEG/PNG preview of the HDRI for the selector thumbnail. */
  thumbnailUrl: string;
  /** Ground-projection parameters tuned to this HDRI's perspective. */
  ground: GroundProjection;
  /** Optional reflection overlay for glossy environments. null = no overlay. */
  reflectionOverlay: ReflectionOverlay | null;
  /** Optional fog tinting near-distance scene geometry (NOT the HDRI). */
  fog: { color: string; near: number; far: number } | null;
  ambientIntensity: number;
  lights: LightSpec[];
  contactShadow: {
    opacity: number;
    blur: number;
    color: string;
  };
}

const PH_PREVIEW = (slug: string) =>
  `https://cdn.polyhaven.com/asset_img/primary/${slug}.png?height=200`;

export const ENVIRONMENT_PRESETS: Record<EnvironmentId, EnvironmentPreset> = {
  'pro-garage': {
    id: 'pro-garage',
    name: 'Pro Garage',
    vibe: 'Real workshop, daylight + warm metal',
    hdriUrl: '/environments/machine_shop_02_2k.hdr',
    thumbnailUrl: PH_PREVIEW('machine_shop_02'),
    // Indoor scene — photographer's eye height ~1.7m, walls close-by, so
    // smaller scale keeps the workshop walls/ceiling at a believable distance.
    ground: { height: 8, radius: 80, scale: 100 },
    reflectionOverlay: {
      mirrorMix: 0.4,
      blurAmount: 200,
      color: '#1c1c20',
      opacity: 0.4,
      radius: 8,
    },
    fog: null,
    ambientIntensity: 0.18,
    lights: [
      {
        type: 'spot',
        position: [4, 7, 4],
        color: '#ffe7c8',
        intensity: 1.4,
        angle: 0.5,
        penumbra: 0.7,
        castShadow: true,
      },
      {
        type: 'spot',
        position: [-5, 5, -3],
        color: '#ffd9b3',
        intensity: 0.9,
        angle: 0.55,
        penumbra: 0.8,
      },
    ],
    contactShadow: { opacity: 0.7, blur: 2.4, color: '#000000' },
  },
  showroom: {
    id: 'showroom',
    name: 'Clean Showroom',
    vibe: 'Bright softbox studio',
    hdriUrl: '/environments/studio_small_09_2k.hdr',
    thumbnailUrl: PH_PREVIEW('studio_small_09'),
    // Studio cyc is close-by — keep ground projection tight.
    ground: { height: 6, radius: 60, scale: 80 },
    reflectionOverlay: {
      mirrorMix: 0.6,
      blurAmount: 100,
      color: '#e7e7ec',
      opacity: 0.5,
      radius: 7,
    },
    fog: null,
    ambientIntensity: 0.3,
    lights: [
      {
        type: 'directional',
        position: [4, 10, 6],
        color: '#ffffff',
        intensity: 1.0,
        castShadow: true,
      },
      {
        type: 'directional',
        position: [-6, 8, -4],
        color: '#eef3ff',
        intensity: 0.6,
      },
    ],
    contactShadow: { opacity: 0.45, blur: 2.6, color: '#0a0a14' },
  },
  'mountain-road': {
    id: 'mountain-road',
    name: 'Mountain Road',
    vibe: 'Drakensberg vista + asphalt',
    hdriUrl: '/environments/drakensberg_solitary_mountain_2k.hdr',
    thumbnailUrl: PH_PREVIEW('drakensberg_solitary_mountain'),
    // Outdoor wide-open — bigger ground radius and scale so the mountains
    // sit at a believable distance.
    ground: { height: 20, radius: 250, scale: 1000 },
    reflectionOverlay: null,
    fog: null,
    ambientIntensity: 0.2,
    lights: [
      {
        type: 'directional',
        position: [12, 14, 8],
        color: '#fff6dc',
        intensity: 1.8,
        castShadow: true,
      },
      {
        type: 'directional',
        position: [-8, 4, -6],
        color: '#a3c0e0',
        intensity: 0.4,
      },
    ],
    contactShadow: { opacity: 0.6, blur: 2.0, color: '#000000' },
  },
  'city-night': {
    id: 'city-night',
    name: 'City Night',
    vibe: 'Neon skyline, wet asphalt',
    hdriUrl: '/environments/shanghai_bund_2k.hdr',
    thumbnailUrl: PH_PREVIEW('shanghai_bund'),
    // Riverside esplanade — buildings are far across the river.
    ground: { height: 15, radius: 200, scale: 800 },
    reflectionOverlay: {
      mirrorMix: 0.85,
      blurAmount: 50,
      color: '#070710',
      opacity: 0.6,
      radius: 9,
    },
    fog: { color: '#0a0a18', near: 18, far: 35 },
    ambientIntensity: 0.12,
    lights: [
      {
        type: 'spot',
        position: [5, 7, 4],
        color: '#7ddfff',
        intensity: 1.8,
        angle: 0.5,
        penumbra: 0.7,
        castShadow: true,
      },
      {
        type: 'spot',
        position: [-5, 6, -3],
        color: '#ff5db1',
        intensity: 1.3,
        angle: 0.55,
        penumbra: 0.75,
      },
      { type: 'point', position: [0, 0.4, 4], color: '#3aa0ff', intensity: 0.5 },
      { type: 'point', position: [0, 0.4, -4], color: '#ff3a8e', intensity: 0.5 },
    ],
    contactShadow: { opacity: 0.85, blur: 1.6, color: '#040414' },
  },
};

export const ENVIRONMENT_LIST: EnvironmentPreset[] = [
  ENVIRONMENT_PRESETS['pro-garage'],
  ENVIRONMENT_PRESETS.showroom,
  ENVIRONMENT_PRESETS['mountain-road'],
  ENVIRONMENT_PRESETS['city-night'],
];

export function getEnvironmentPreset(id: EnvironmentId): EnvironmentPreset {
  return ENVIRONMENT_PRESETS[id] ?? ENVIRONMENT_PRESETS['pro-garage'];
}
