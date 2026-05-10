import type { EnvironmentId } from '@/types';

/**
 * Showroom environment metadata.
 *
 * Each environment is now a procedural 3D scene built from drei
 * components — boxes for walls/ceiling/buildings, Lightformers for the
 * signature horizontal light streaks reflected in car paint, and
 * MeshReflectorMaterial for floors. No HDRIs.
 *
 * The actual rendering lives in the per-scene components (see
 * `./scenes/`), routed by `<SceneEnvironment id={...}>`. This file
 * carries only the user-facing metadata.
 *
 * Adding an environment:
 *   1. Add the id to EnvironmentId in src/types.
 *   2. Build a scene component in ./scenes/<Name>.tsx.
 *   3. Wire it into SceneEnvironment.tsx's router.
 *   4. Append the metadata entry below.
 */

export interface EnvironmentPreset {
  id: EnvironmentId;
  name: string;
  /** One-line vibe tag for the carousel UI. */
  vibe: string;
  /** Thumbnail shown in the bottom selector. */
  thumbnailUrl: string;
}

const PX = (id: number) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=400&q=80`;

export const ENVIRONMENT_PRESETS: Record<EnvironmentId, EnvironmentPreset> = {
  // The user-visible label maps onto the existing id `showroom`.
  showroom: {
    id: 'showroom',
    name: 'Pro Showroom',
    vibe: 'Polished concrete + light strips',
    thumbnailUrl: PX(9545550),
  },
  // The id `pro-garage` predates this rewrite and now renders the workshop.
  'pro-garage': {
    id: 'pro-garage',
    name: 'Workshop Garage',
    vibe: 'Concrete, tools, fluorescents',
    thumbnailUrl: PX(19272394),
  },
  // The id `mountain-road` predates this rewrite and now renders the track.
  'mountain-road': {
    id: 'mountain-road',
    name: 'Outdoor Track',
    vibe: 'Late-afternoon sun + asphalt',
    thumbnailUrl: PX(19565328),
  },
  'city-night': {
    id: 'city-night',
    name: 'Night Display',
    vibe: 'Wet asphalt + dramatic spots',
    thumbnailUrl: PX(12359723),
  },
};

/** Display order in the selector — Pro Showroom (the default) goes first. */
export const ENVIRONMENT_LIST: EnvironmentPreset[] = [
  ENVIRONMENT_PRESETS.showroom,
  ENVIRONMENT_PRESETS['pro-garage'],
  ENVIRONMENT_PRESETS['mountain-road'],
  ENVIRONMENT_PRESETS['city-night'],
];

export function getEnvironmentPreset(id: EnvironmentId): EnvironmentPreset {
  return ENVIRONMENT_PRESETS[id] ?? ENVIRONMENT_PRESETS.showroom;
}
