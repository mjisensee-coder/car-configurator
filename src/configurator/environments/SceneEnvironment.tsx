import type { EnvironmentId } from '@/types';
import { ProShowroom } from './scenes/ProShowroom';
import { WorkshopGarage } from './scenes/WorkshopGarage';
import { OutdoorTrack } from './scenes/OutdoorTrack';
import { NightDisplay } from './scenes/NightDisplay';

/**
 * Router that picks the right procedural scene component for the
 * active environment id.
 *
 * Each scene owns its own walls, ceiling, floor, lighting rig, and
 * Lightformer-driven IBL — there is no shared "environment data".
 * Adding a new environment is: ship a new scene component, add the id
 * to types, register here, append metadata in environmentPresets.ts.
 *
 * The legacy ids (pro-garage, mountain-road, city-night) are preserved
 * so older share links + gallery builds continue to work, but they now
 * map to the new procedural scenes (Workshop, Outdoor Track, Night).
 */

interface SceneEnvironmentProps {
  id: EnvironmentId;
}

export function SceneEnvironment({ id }: SceneEnvironmentProps) {
  switch (id) {
    case 'showroom':
      return <ProShowroom />;
    case 'pro-garage':
      return <WorkshopGarage />;
    case 'mountain-road':
      return <OutdoorTrack />;
    case 'city-night':
      return <NightDisplay />;
    default:
      return <ProShowroom />;
  }
}
