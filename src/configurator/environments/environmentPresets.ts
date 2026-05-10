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
  showroom: {
    id: 'showroom',
    name: 'Pro Showroom',
    vibe: 'Polished concrete + light strips',
    thumbnailUrl: PX(9545550),
  },
  'city-night': {
    id: 'city-night',
    name: 'Night Display',
    vibe: 'Wet asphalt + dramatic spots',
    thumbnailUrl: PX(12359723),
  },
  'modern-showroom': {
    id: 'modern-showroom',
    name: 'Modern Showroom',
    vibe: 'Glass ceiling, polished interior',
    thumbnailUrl: PX(36608247),
  },
  'led-studio': {
    id: 'led-studio',
    name: 'LED Studio',
    vibe: 'Dark contrasty studio with LED strips',
    thumbnailUrl: PX(11110511),
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
