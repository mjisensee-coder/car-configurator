import type { EnvironmentId } from '@/types';

/**
 * Showroom environment presets.
 *
 * Each preset bundles an HDRI (for image-based lighting + reflections), a
 * floor material spec, an array of stage lights, and contact-shadow tuning.
 *
 * Adding a new environment:
 *   1. Drop the HDRI under /public/environments/.
 *   2. Append a preset below.
 *   3. Add the id to the EnvironmentId union in src/types.
 *   4. Pick a thumbnail color/swatch in EnvironmentSelector.
 */

export interface LightSpec {
  type: 'spot' | 'point' | 'directional';
  position: [number, number, number];
  color: string;
  intensity: number;
  /** spot: penumbra (0-1). point: distance falloff in scene units. */
  penumbra?: number;
  /** spot: cone half-angle in radians. */
  angle?: number;
  /** spot/directional only: target the origin. */
  castShadow?: boolean;
}

export interface EnvironmentPreset {
  id: EnvironmentId;
  name: string;
  /** One-line vibe tag for the carousel UI. */
  vibe: string;
  hdriUrl: string;
  /** Optional fog color for the scene background. */
  background: string;
  fog: { color: string; near: number; far: number } | null;
  ambientIntensity: number;
  lights: LightSpec[];
  ground: {
    /** Hex base color for the disc floor. */
    color: string;
    metalness: number;
    roughness: number;
    /** Whether to render a subtle wet/reflection sheen. */
    sheen: boolean;
  };
  contactShadow: {
    opacity: number;
    blur: number;
    color: string;
  };
  /** Hex thumbnail accent for the selector card. */
  thumbnail: string;
}

export const ENVIRONMENT_PRESETS: Record<EnvironmentId, EnvironmentPreset> = {
  'pro-garage': {
    id: 'pro-garage',
    name: 'Pro Garage',
    vibe: 'Warm workshop lighting',
    hdriUrl: '/environments/autoshop_01_1k.hdr',
    background: '#0a0a0c',
    fog: { color: '#101015', near: 12, far: 26 },
    ambientIntensity: 0.25,
    lights: [
      {
        type: 'spot',
        position: [6, 8, 4],
        color: '#ffffff',
        intensity: 2.2,
        angle: 0.45,
        penumbra: 0.6,
        castShadow: true,
      },
      {
        type: 'spot',
        position: [-6, 6, -4],
        color: '#ffd9b3',
        intensity: 1.6,
        angle: 0.5,
        penumbra: 0.7,
      },
      { type: 'point', position: [0, -0.6, 0], color: '#e63946', intensity: 0.4 },
    ],
    ground: { color: '#15151a', metalness: 0.85, roughness: 0.45, sheen: false },
    contactShadow: { opacity: 0.7, blur: 2.4, color: '#000000' },
    thumbnail: '#3a2418',
  },
  showroom: {
    id: 'showroom',
    name: 'Clean Showroom',
    vibe: 'Bright soft studio',
    hdriUrl: '/environments/studio_small_09_1k.hdr',
    background: '#1a1a20',
    fog: null,
    ambientIntensity: 0.55,
    lights: [
      {
        type: 'directional',
        position: [4, 10, 6],
        color: '#ffffff',
        intensity: 1.8,
        castShadow: true,
      },
      {
        type: 'directional',
        position: [-6, 8, -4],
        color: '#eef3ff',
        intensity: 1.2,
      },
      {
        type: 'spot',
        position: [0, 12, 0],
        color: '#ffffff',
        intensity: 1.4,
        angle: 0.7,
        penumbra: 0.9,
      },
    ],
    ground: { color: '#1f1f24', metalness: 0.95, roughness: 0.2, sheen: true },
    contactShadow: { opacity: 0.55, blur: 3, color: '#0a0a14' },
    thumbnail: '#dde2e8',
  },
  'mountain-road': {
    id: 'mountain-road',
    name: 'Mountain Road',
    vibe: 'Natural daylight + asphalt',
    hdriUrl: '/environments/kloofendal_48d_partly_cloudy_1k.hdr',
    background: '#0e1116',
    fog: { color: '#12161e', near: 18, far: 38 },
    ambientIntensity: 0.4,
    lights: [
      {
        type: 'directional',
        position: [10, 12, 6],
        color: '#fff5e0',
        intensity: 2.5,
        castShadow: true,
      },
      {
        type: 'directional',
        position: [-8, 4, -6],
        color: '#a3c0e0',
        intensity: 0.8,
      },
    ],
    ground: { color: '#1a1c1f', metalness: 0.3, roughness: 0.85, sheen: false },
    contactShadow: { opacity: 0.6, blur: 2.0, color: '#000000' },
    thumbnail: '#5a7a5c',
  },
  'city-night': {
    id: 'city-night',
    name: 'City Night',
    vibe: 'Wet asphalt + neon spots',
    hdriUrl: '/environments/shanghai_bund_1k.hdr',
    background: '#080812',
    fog: { color: '#0a0a18', near: 10, far: 24 },
    ambientIntensity: 0.18,
    lights: [
      {
        type: 'spot',
        position: [5, 7, 4],
        color: '#7ddfff',
        intensity: 2.4,
        angle: 0.5,
        penumbra: 0.7,
        castShadow: true,
      },
      {
        type: 'spot',
        position: [-5, 6, -3],
        color: '#ff5db1',
        intensity: 1.8,
        angle: 0.55,
        penumbra: 0.75,
      },
      { type: 'point', position: [0, 0.4, 4], color: '#3aa0ff', intensity: 0.6 },
      { type: 'point', position: [0, 0.4, -4], color: '#ff3a8e', intensity: 0.6 },
    ],
    ground: { color: '#070710', metalness: 1.0, roughness: 0.15, sheen: true },
    contactShadow: { opacity: 0.85, blur: 1.6, color: '#040414' },
    thumbnail: '#1a1d40',
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
