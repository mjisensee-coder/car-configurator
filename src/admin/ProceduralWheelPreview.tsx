import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import { ProceduralWheel, type ProceduralWheelSpec } from '@/configurator/models/ProceduralWheel';

/**
 * Standalone preview of a generated ProceduralWheel — used by the admin
 * detail panel to show what the AI-driven wheel-spec actually produces.
 */
export function ProceduralWheelPreview({ spec }: { spec: ProceduralWheelSpec }) {
  return (
    <Canvas
      shadows
      camera={{ position: [0, 0.4, 1.6], fov: 32 }}
      gl={{ antialias: true }}
      dpr={[1, 2]}
    >
      <color attach="background" args={['#0d0d12']} />
      <ambientLight intensity={0.4} />
      <spotLight
        position={[2, 3, 2]}
        angle={0.5}
        penumbra={0.7}
        intensity={2}
        color="#ffffff"
      />
      <spotLight position={[-2, 2, -2]} angle={0.6} penumbra={0.8} intensity={1.4} color="#ffd9b3" />
      <Environment preset="warehouse" />
      <ProceduralWheel position={[0, 0, 0]} isRight={false} spec={spec} />
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.1}
        minDistance={0.8}
        maxDistance={3}
        target={[0, 0, 0]}
      />
    </Canvas>
  );
}
