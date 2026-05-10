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
 * The 3D garage scene. The environment block (HDRI, lights, floor, contact
 * shadows) is fully driven by the active EnvironmentPreset, so swapping
 * presets swaps the scene's mood without touching the car or controls.
 */
export function Scene({ canvasId }: SceneProps) {
  const { config } = useConfigurator();
  const preset = getEnvironmentPreset(config.environmentId);

  return (
    <Canvas
      id={canvasId}
      shadows
      gl={{ preserveDrawingBuffer: true, antialias: true }}
      camera={{ position: [5.5, 2.4, 6.5], fov: 38 }}
      dpr={[1, 2]}
    >
      <Suspense
        fallback={
          <Html center>
            <div className="text-garage-200 text-sm">Loading studio…</div>
          </Html>
        }
      >
        <SceneEnvironment preset={preset} />
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
        minPolarAngle={Math.PI / 6}
        maxPolarAngle={Math.PI / 2.05}
        target={[0, 0.7, 0]}
      />
    </Canvas>
  );
}
