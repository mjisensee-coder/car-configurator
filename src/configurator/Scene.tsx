import { Canvas } from '@react-three/fiber';
import {
  OrbitControls,
  Environment,
  ContactShadows,
  Html,
} from '@react-three/drei';
import { Suspense } from 'react';
import { RealCar } from './models/RealCar';
// PlaceholderCar is retained as a documented fallback. Swap the import below
// to fall back to it (e.g. while iterating offline without the GLB).
// import { PlaceholderCar } from './models/PlaceholderCar';
import { useConfigurator } from './ConfiguratorContext';

interface SceneProps {
  /** Forwarded to the Canvas — used by html2canvas screenshots. */
  canvasId?: string;
}

/**
 * The 3D garage scene. Owns camera, lighting, and floor; the car itself is
 * a child that reads from ConfiguratorContext.
 *
 * Tuning notes:
 * - Two key spotlights + warm fill = "showroom" feel.
 * - ContactShadows give the car weight without expensive PCSS.
 * - Reflective floor uses a dark base + specular highlights from the lights.
 */
export function Scene({ canvasId }: SceneProps) {
  const { config } = useConfigurator();

  return (
    <Canvas
      id={canvasId}
      shadows
      gl={{ preserveDrawingBuffer: true, antialias: true }}
      camera={{ position: [5.5, 2.4, 6.5], fov: 38 }}
      dpr={[1, 2]}
    >
      <color attach="background" args={['#0a0a0c']} />
      <fog attach="fog" args={['#0a0a0c', 12, 26]} />

      {/* === Lighting === */}
      <ambientLight intensity={0.25} />

      {/* Key spot from front-right */}
      <spotLight
        position={[6, 8, 4]}
        angle={0.45}
        penumbra={0.6}
        intensity={2.2}
        color="#ffffff"
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      {/* Rim spot from rear-left */}
      <spotLight
        position={[-6, 6, -4]}
        angle={0.5}
        penumbra={0.7}
        intensity={1.6}
        color="#ffd9b3"
      />
      {/* Underglow accent */}
      <pointLight position={[0, -0.6, 0]} intensity={0.4} color="#e63946" />

      {/* === Environment for reflections === */}
      <Environment preset="warehouse" background={false} />

      {/* === The car === */}
      <Suspense
        fallback={
          <Html center>
            <div className="text-garage-200 text-sm">Loading model…</div>
          </Html>
        }
      >
        <RealCar config={config} />
      </Suspense>

      {/* === Floor === */}
      <ContactShadows
        position={[0, 0.001, 0]}
        opacity={0.7}
        scale={20}
        blur={2.4}
        far={4}
      />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[14, 64]} />
        <meshStandardMaterial
          color="#0c0c10"
          metalness={0.9}
          roughness={0.4}
        />
      </mesh>

      {/* Subtle ring highlights on the floor */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.002, 0]}
      >
        <ringGeometry args={[3.4, 3.42, 64]} />
        <meshBasicMaterial color="#26262f" transparent opacity={0.6} />
      </mesh>

      {/* === Camera controls === */}
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
