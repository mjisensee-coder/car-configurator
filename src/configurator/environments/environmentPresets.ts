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
 * Floor mode determines how the ground plane is rendered.
 *   - "reflector": uses drei's <MeshReflectorMaterial> (real-time mirror
 *     reflections). Right for glossy floors — showroom, wet asphalt.
 *   - "standard": flat PBR material (rough surfaces — concrete, asphalt).
 */
export interface FloorSpec {
  mode: 'reflector' | 'standard';
  color: string;
  metalness: number;
  roughness: number;
  /** reflector mode only: 0-1 mix of mirror vs. base color. */
  mirrorMix?: number;
  /** reflector mode only: blur radius of the reflection. Lower = sharper. */
  blurAmount?: number;
}

export interface EnvironmentPreset {
  id: EnvironmentId;
  name: string;
  /** One-line vibe tag for the carousel UI. */
  vibe: string;
  hdriUrl: string;
  /** Tonemapped JPEG/PNG preview of the HDRI for the selector thumbnail. */
  thumbnailUrl: string;
  /** Optional fog tinting near-distance scene geometry (NOT the HDRI). */
  fog: { color: string; near: number; far: number } | null;
  ambientIntensity: number;
  lights: LightSpec[];
  floor: FloorSpec;
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
    fog: null,
    ambientIntensity: 0.18,
    lights: [
      {
        type: 'spot',
        position: [4, 7, 4],
        color: '#ffe7c8',
        intensity: 1.6,
        angle: 0.5,
        penumbra: 0.7,
        castShadow: true,
      },
      {
        type: 'spot',
        position: [-5, 5, -3],
        color: '#ffd9b3',
        intensity: 1.1,
        angle: 0.55,
        penumbra: 0.8,
      },
    ],
    floor: {
      mode: 'reflector',
      color: '#1c1c20',
      metalness: 0.4,
      roughness: 0.7,
      mirrorMix: 0.35,
      blurAmount: 220,
    },
    contactShadow: { opacity: 0.65, blur: 2.4, color: '#000000' },
  },
  showroom: {
    id: 'showroom',
    name: 'Clean Showroom',
    vibe: 'Bright softbox studio',
    hdriUrl: '/environments/studio_small_09_2k.hdr',
    thumbnailUrl: PH_PREVIEW('studio_small_09'),
    fog: null,
    ambientIntensity: 0.35,
    lights: [
      {
        type: 'directional',
        position: [4, 10, 6],
        color: '#ffffff',
        intensity: 1.2,
        castShadow: true,
      },
      {
        type: 'directional',
        position: [-6, 8, -4],
        color: '#eef3ff',
        intensity: 0.8,
      },
    ],
    floor: {
      mode: 'reflector',
      color: '#e7e7ec',
      metalness: 0.4,
      roughness: 0.4,
      mirrorMix: 0.7,
      blurAmount: 120,
    },
    contactShadow: { opacity: 0.45, blur: 2.6, color: '#0a0a14' },
  },
  'mountain-road': {
    id: 'mountain-road',
    name: 'Mountain Road',
    vibe: 'Drakensberg vista + asphalt',
    hdriUrl: '/environments/drakensberg_solitary_mountain_2k.hdr',
    thumbnailUrl: PH_PREVIEW('drakensberg_solitary_mountain'),
    fog: null,
    ambientIntensity: 0.25,
    lights: [
      {
        type: 'directional',
        position: [12, 14, 8],
        color: '#fff6dc',
        intensity: 2.0,
        castShadow: true,
      },
      {
        type: 'directional',
        position: [-8, 4, -6],
        color: '#a3c0e0',
        intensity: 0.5,
      },
    ],
    floor: {
      mode: 'standard',
      color: '#2a2c2f',
      metalness: 0.1,
      roughness: 0.95,
    },
    contactShadow: { opacity: 0.6, blur: 2.0, color: '#000000' },
  },
  'city-night': {
    id: 'city-night',
    name: 'City Night',
    vibe: 'Neon skyline, wet asphalt',
    hdriUrl: '/environments/shanghai_bund_2k.hdr',
    thumbnailUrl: PH_PREVIEW('shanghai_bund'),
    fog: { color: '#0a0a18', near: 14, far: 30 },
    ambientIntensity: 0.12,
    lights: [
      {
        type: 'spot',
        position: [5, 7, 4],
        color: '#7ddfff',
        intensity: 2.0,
        angle: 0.5,
        penumbra: 0.7,
        castShadow: true,
      },
      {
        type: 'spot',
        position: [-5, 6, -3],
        color: '#ff5db1',
        intensity: 1.5,
        angle: 0.55,
        penumbra: 0.75,
      },
      { type: 'point', position: [0, 0.4, 4], color: '#3aa0ff', intensity: 0.5 },
      { type: 'point', position: [0, 0.4, -4], color: '#ff3a8e', intensity: 0.5 },
    ],
    floor: {
      mode: 'reflector',
      color: '#070710',
      metalness: 1.0,
      roughness: 0.1,
      mirrorMix: 0.85,
      blurAmount: 60,
    },
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
