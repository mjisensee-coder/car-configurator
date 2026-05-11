import type { EnvironmentId } from '@/types';

/**
 * Environment metadata.
 *
 * Two procedural scenes built from drei primitives + Lightformers, plus
 * two GLB-backed scenes loaded from Sketchfab (manual download — their
 * API requires auth). Each scene component owns its own geometry, lights,
 * and IBL probe; this file is metadata only.
 *
 * GLB attribution lives in:
 *   - the scene component header
 *   - the in-scene fallback card (if the asset isn't downloaded yet)
 *   - the global Footer.tsx
 */

/**
 * OrbitControls tuning per environment. Tight rooms (the GLB-backed
 * showrooms) need narrower limits to keep the camera inside; open
 * environments (procedural showroom, night display) can be looser.
 *
 * Conventions:
 *   minDistance/maxDistance  — radius from `target` in scene units (m).
 *   minPolarAngle            — top tilt limit (radians from +Y).
 *                              π/2 is the horizon, smaller = looking down.
 *   maxPolarAngle            — bottom tilt limit. π/2 means "never below
 *                              target height" — clamps the camera above
 *                              the floor.
 *   target                   — orbit center. Set near the car's mid-y so
 *                              the car stays centered when tilting.
 */
export interface CameraConstraints {
  minDistance: number;
  maxDistance: number;
  minPolarAngle: number;
  maxPolarAngle: number;
  /**
   * Horizontal-orbit limits (radians). Optional — only set for GLB rooms
   * with an "open" side (e.g. cyclorama studios) where rotating past the
   * walls would reveal the void. Symmetric ranges work best; left both
   * unset to allow full 360°.
   */
  minAzimuthAngle?: number;
  maxAzimuthAngle?: number;
  target: [number, number, number];
}

export interface EnvironmentPreset {
  id: EnvironmentId;
  name: string;
  /** One-line vibe tag for the carousel UI. */
  vibe: string;
  /** Thumbnail shown in the bottom selector. */
  thumbnailUrl: string;
  /** Per-environment OrbitControls limits. */
  camera: CameraConstraints;
}

const PX = (id: number) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=400&q=80`;

export const ENVIRONMENT_PRESETS: Record<EnvironmentId, EnvironmentPreset> = {
  showroom: {
    id: 'showroom',
    name: 'Pro Showroom',
    vibe: 'Polished concrete + light strips',
    thumbnailUrl: PX(9545550),
    // 30×20×8m procedural room. Plenty of headroom for tilt + dolly.
    camera: {
      minDistance: 4,
      maxDistance: 14,
      minPolarAngle: 1.0,
      maxPolarAngle: Math.PI / 2.15,
      target: [0, 0.6, 0],
    },
  },
  'city-night': {
    id: 'city-night',
    name: 'Night Display',
    vibe: 'Wet asphalt + dramatic spots',
    thumbnailUrl: PX(12359723),
    // Open scene — distant skyline boxes are 20m+ out, no ceiling.
    camera: {
      minDistance: 4,
      maxDistance: 18,
      minPolarAngle: 0.8,
      maxPolarAngle: Math.PI / 2.15,
      target: [0, 0.6, 0],
    },
  },
  'modern-showroom': {
    id: 'modern-showroom',
    name: 'Modern Showroom',
    vibe: 'Glass ceiling, polished interior',
    thumbnailUrl: PX(36608247),
    // Polsaris GLB: 28.6×3.2×28.6m room. Ceiling at ~3.2m, walls ±14.3m.
    // Camera must stay inside the box at all times.
    //   minPolar 1.27 (~73°)  → at D=8: y = 8·cos(1.27)+0.6 ≈ 2.96m (under ceiling)
    //   maxPolar π/2          → camera never drops below target y (0.6)
    //   maxDistance 8         → camera xz ≤ 8m, well inside ±14.3m walls
    camera: {
      minDistance: 3.5,
      maxDistance: 8,
      minPolarAngle: 1.27,
      maxPolarAngle: Math.PI / 2,
      target: [0, 0.6, 0],
    },
  },
  'led-studio': {
    id: 'led-studio',
    name: 'LED Studio',
    vibe: 'Dark contrasty studio with LED strips',
    thumbnailUrl: PX(11110511),
    // Velocity Motion GLB: 28.3×3×28.3m, Z asymmetric (back 10.8m, front 17.5m).
    // Slightly tighter than the Polsaris room because the ceiling is 3.0m.
    //
    // Azimuth: the model is a 4-quad cyclorama (1 wall mesh, 8 triangles)
    // with one face open. Limiting horizontal orbit to ±75° from the
    // default-facing direction (camera at +Z) keeps the camera in the
    // closed-walls hemisphere so the user can't rotate past the open side
    // and see the void beyond.
    camera: {
      minDistance: 3.5,
      maxDistance: 7.5,
      minPolarAngle: 1.3,
      maxPolarAngle: Math.PI / 2,
      minAzimuthAngle: -Math.PI / 2.4,
      maxAzimuthAngle: Math.PI / 2.4,
      target: [0, 0.6, 0],
    },
  },
};

/** Display order in the selector. */
export const ENVIRONMENT_LIST: EnvironmentPreset[] = [
  ENVIRONMENT_PRESETS.showroom,
  ENVIRONMENT_PRESETS['modern-showroom'],
  ENVIRONMENT_PRESETS['led-studio'],
  ENVIRONMENT_PRESETS['city-night'],
];

export function getEnvironmentPreset(id: EnvironmentId): EnvironmentPreset {
  return ENVIRONMENT_PRESETS[id] ?? ENVIRONMENT_PRESETS.showroom;
}
