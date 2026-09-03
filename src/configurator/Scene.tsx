'use client';

import { useCallback, useMemo } from 'react';
import { Canvas, type GLProps } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import { Suspense } from 'react';
import { RealCar } from './models/RealCar';
// PlaceholderCar is retained as a documented fallback. Swap the import below
// to fall back to it (e.g. while iterating offline without the GLB).
// import { PlaceholderCar } from './models/PlaceholderCar';
import { useConfigurator } from './ConfiguratorContext';
import { SceneEnvironment } from './environments/SceneEnvironment';
import { getEnvironmentPreset } from './environments/environmentPresets';
import { CameraFraming } from './CameraFraming';
import { useRenderer } from './renderer/RendererContext';
import { createWebGPURenderer, type GLFactoryProps } from './renderer/backend';

/**
 * preserveDrawingBuffer keeps the framebuffer readable after present,
 * which is what html2canvas needs to capture build screenshots. Hoisted to
 * module scope so its identity never changes between renders.
 */
const WEBGL_PARAMS = { preserveDrawingBuffer: true, antialias: true } as const;

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
  const { backend, reportFallback } = useRenderer();
  const preset = getEnvironmentPreset(config.environmentId);
  const cam = preset.camera;

  // React Three Fiber 9 accepts a promise-returning `gl` factory, which is
  // what lets the WebGPU adapter handshake finish before the first frame.
  const webgpuFactory = useCallback(
    (props: GLFactoryProps) => createWebGPURenderer(props, reportFallback),
    [reportFallback],
  ) as GLProps;

  // Memoised on purpose: R3F reconfigures the root whenever the `gl` prop
  // changes identity, so handing it a fresh object literal on every render
  // makes the canvas tear itself down and rebuild mid-mount.
  const glProp = useMemo<GLProps>(
    () => (backend === 'webgpu' ? webgpuFactory : WEBGL_PARAMS),
    [backend, webgpuFactory],
  );

  return (
    <Canvas
      // A renderer cannot be swapped in place — remount the canvas when the
      // backend changes so R3F builds a fresh store around the new one.
      key={backend}
      id={canvasId}
      shadows
      gl={glProp}
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
        minAzimuthAngle={cam.minAzimuthAngle ?? -Infinity}
        maxAzimuthAngle={cam.maxAzimuthAngle ?? Infinity}
        target={cam.target}
      />

      {/* Frames the car to fill ~60% of canvas width on mount + resize.
          Respects OrbitControls' min/maxDistance for tight GLB rooms. */}
      <CameraFraming />
    </Canvas>
  );
}
