import { Canvas } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import { Suspense } from 'react';
import { RealCar } from './models/RealCar';
// PlaceholderCar is retained as a documented fallback. Swap the import below
// to fall back to it (e.g. while iterating offline without the GLB).
// import { PlaceholderCar } from './models/PlaceholderCar';
import { useConfigurator } from './ConfiguratorContext';
import { SceneEnvironment } from './environments/SceneEnvironment';
import { getEnvironmentPreset } from './environments/environmentPresets';

interface SceneProps {
  /** Forwarded to the Canvas — used by html2canvas screenshots. */
  canvasId?: string;
}

/**
 * The 3D scene shell — Canvas, camera, orbit controls. The environment
 * block (room geometry, lights, floor, contact shadows) is driven by the
 * active environment id; the car is a sibling that reads the config.
 *
 * Orbit constraints are PER-ENVIRONMENT — the GLB-backed showrooms are
 * tight 28×3×28m rooms whose ceilings and walls must contain the camera,
 * while the procedural Pro Showroom and Night Display can afford looser
 * tilt and dolly limits. Constraints live next to the rest of the
 * environment metadata (see `camera` in environmentPresets.ts).
 *
 * `key` on `<OrbitControls>` forces a fresh control instance whenever
 * the environment swaps. Without it, the previously-clamped camera
 * position can carry over and feel "stuck" briefly until the user
 * touches the controls.
 */
export function Scene({ canvasId }: SceneProps) {
  const { config } = useConfigurator();
  const preset = getEnvironmentPreset(config.environmentId);
  const cam = preset.camera;

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
        key={preset.id}
        makeDefault
        enableDamping
        dampingFactor={0.1}
        minDistance={cam.minDistance}
        maxDistance={cam.maxDistance}
        minPolarAngle={cam.minPolarAngle}
        maxPolarAngle={cam.maxPolarAngle}
        target={cam.target}
      />
    </Canvas>
  );
}
