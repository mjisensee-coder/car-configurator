import { Canvas } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import { Suspense } from 'react';
import { RealCar } from './models/RealCar';
// PlaceholderCar is retained as a documented fallback. Swap the import below
// to fall back to it (e.g. while iterating offline without the GLB).
// import { PlaceholderCar } from './models/PlaceholderCar';
import { useConfigurator } from './ConfiguratorContext';
import { SceneEnvironment } from './environments/SceneEnvironment';

interface SceneProps {
  /** Forwarded to the Canvas — used by html2canvas screenshots. */
  canvasId?: string;
}

/**
 * The 3D scene shell — Canvas, camera, orbit controls. The environment
 * block (room geometry, lights, floor, contact shadows) is driven by the
 * active environment id; the car is a sibling that reads the config.
 *
 * Polar-angle constraints keep the camera from rising above the room
 * ceilings of indoor environments — looking down past the horizon would
 * expose the gap between geometry and background. The most-restrictive
 * setting (~57° below straight up) covers all 4 environments.
 */
export function Scene({ canvasId }: SceneProps) {
  const { config } = useConfigurator();

  return (
    <Canvas
      id={canvasId}
      shadows
      gl={{ preserveDrawingBuffer: true, antialias: true }}
      camera={{ position: [5.5, 1.7, 6.5], fov: 38 }}
      dpr={[1, 2]}
    >
      <Suspense
        fallback={
          <Html center>
            <div className="text-garage-200 text-sm">Loading studio…</div>
          </Html>
        }
      >
        <SceneEnvironment id={config.environmentId} />
      </Suspense>

      <Suspense
        fallback={
          <Html center>
            <div className="text-garage-200 text-sm">Loading model…</div>
          </Html>
        }
      >
        <RealCar config={config} />
      </Suspense>

      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.1}
        minDistance={4}
        maxDistance={14}
        minPolarAngle={1.0}
        maxPolarAngle={Math.PI / 2.15}
        target={[0, 0.6, 0]}
      />
    </Canvas>
  );
}
