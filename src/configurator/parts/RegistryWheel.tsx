import { Suspense, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import {
  ProceduralWheel,
  type ProceduralWheelSpec,
} from '../models/ProceduralWheel';
import type { RegistryEntry } from '@/services/catalogSyncService';

/**
 * Renders a registry-driven wheel at one anchor.
 *
 * Three modes:
 *   - "procedural": render <ProceduralWheel> from a stored wheelSpec.
 *   - "glb": lazy-load a GLB and render it (Tripo3D output).
 *   - "billboard": fallback — texture a small plane that faces the camera.
 *
 * Used by the configurator for any wheel whose ID resolves to a registry
 * entry rather than the static catalog. Falls back gracefully to the
 * standard <Wheel> if the registry doesn't load.
 */

interface RegistryWheelProps {
  entry: RegistryEntry;
  position: [number, number, number];
  isRight: boolean;
}

export function RegistryWheel({ entry, position, isRight }: RegistryWheelProps) {
  switch (entry.kind) {
    case 'procedural':
      return entry.wheelSpec ? (
        <ProceduralWheel position={position} isRight={isRight} spec={entry.wheelSpec} />
      ) : null;
    case 'glb':
      return entry.glbUrl ? (
        <Suspense fallback={null}>
          <GlbWheel
            url={entry.glbUrl}
            position={position}
            isRight={isRight}
            mount={entry.mount}
          />
        </Suspense>
      ) : null;
    case 'billboard':
      return entry.billboardImageUrl ? (
        <BillboardWheel
          url={entry.billboardImageUrl}
          position={position}
          isRight={isRight}
        />
      ) : null;
  }
}

function GlbWheel({
  url,
  position,
  isRight,
  mount,
}: {
  url: string;
  position: [number, number, number];
  isRight: boolean;
  mount?: RegistryEntry['mount'];
}) {
  const { scene } = useGLTF(url);
  const cloned = useMemo(() => scene.clone(true), [scene]);
  const scale = mount?.scale ?? 1;
  const offset = mount?.offset ?? [0, 0, 0];
  const rotation = mount?.rotation ?? [0, 0, 0];
  return (
    <group
      position={[position[0] + offset[0], position[1] + offset[1], position[2] + offset[2]]}
      rotation={[rotation[0], rotation[1] + (isRight ? -Math.PI / 2 : Math.PI / 2), rotation[2]]}
      scale={scale}
    >
      <primitive object={cloned} />
    </group>
  );
}

function BillboardWheel({
  url: _url,
  position,
  isRight: _isRight,
}: {
  url: string;
  position: [number, number, number];
  isRight: boolean;
}) {
  // Fallback used only when neither procedural nor GLB is available.
  // We render a placeholder cube so the wheel slot isn't empty; v2 swaps
  // this for a textured camera-facing plane via @react-three/drei's <Billboard>.
  return (
    <mesh position={position}>
      <boxGeometry args={[0.4, 0.4, 0.05]} />
      <meshStandardMaterial color="#222" />
    </mesh>
  );
}

/**
 * Resolve a wheel ID into a procedural spec by looking up the registry.
 * Returns undefined if the ID isn't in the registry.
 */
export function findRegistryEntry(
  id: string,
  registry: { entries: RegistryEntry[] } | null,
): RegistryEntry | undefined {
  return registry?.entries.find((e) => e.id === id);
}

export type { ProceduralWheelSpec };
