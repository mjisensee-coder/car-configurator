import type { EnvironmentId } from '@/types';
import { ProShowroom } from './scenes/ProShowroom';
import { NightDisplay } from './scenes/NightDisplay';
import { ModernShowroom } from './scenes/ModernShowroom';

/**
 * Router that picks the right scene component for the active
 * environment id. Two flavours:
 *
 *   Procedural (built from primitives + Lightformers):
 *     - showroom    → ProShowroom (default)
 *     - city-night  → NightDisplay
 *
 *   GLB-backed (Sketchfab assets, manually downloaded into /public):
 *     - modern-showroom → "Car-Showroom 2" by Polsaris (CC BY 4.0)
 *
 * Adding a new environment: ship a scene component, register it here,
 * append metadata in environmentPresets.ts.
 */

interface SceneEnvironmentProps {
  id: EnvironmentId;
}

export function SceneEnvironment({ id }: SceneEnvironmentProps) {
  switch (id) {
    case 'showroom':
      return <ProShowroom />;
    case 'city-night':
      return <NightDisplay />;
    case 'modern-showroom':
      return <ModernShowroom />;
    default:
      return <ProShowroom />;
  }
}
