import {
  Environment,
  Lightformer,
  ContactShadows,
  MeshReflectorMaterial,
} from '@react-three/drei';
import { Box3, Vector3 } from 'three';
import { useMemo } from 'react';
import {
  SketchfabSceneFallback,
  useClonedSceneFromUrl,
} from './SketchfabSceneFallback';

/**
 * LED Studio — "Studio V1 For Car" by Velocity Motion (Sketchfab, CC BY 4.0).
 * https://sketchfab.com/3d-models/studio-v1-for-car-9c45d19a7d434e2ca1640d6d2146e895
 *
 * Ultra-light 178-face dark studio with built-in LED lighting strips. Drop
 * the GLB at `public/environments/led-studio.glb` to enable.
 *
 * Falls back to a minimal procedural dark room with our own LED-strip
 * suggestions so the car still has a coherent backdrop.
 */

const MODEL_URL = '/environments/led-studio.glb';

export function LedStudio() {
  return (
    <>
      <color attach="background" args={['#0a0a0e']} />

      {/* Cool-white IBL keeps body specular crisp regardless of GLB state. */}
      <Environment frames={Infinity} resolution={256} background={false}>
        <Lightformer
          form="rect"
          position={[0, 5, 4]}
          rotation={[-Math.PI / 2, 0, 0]}
          scale={[8, 0.4, 1]}
          color="#ffffff"
          intensity={4}
        />
        <Lightformer
          form="rect"
          position={[0, 5, -4]}
          rotation={[-Math.PI / 2, 0, 0]}
          scale={[8, 0.4, 1]}
          color="#ffffff"
          intensity={4}
        />
        <Lightformer
          form="rect"
          position={[5, 4, 0]}
          rotation={[0, -Math.PI / 2, 0]}
          scale={[0.4, 1.5, 8]}
          color="#aac4e8"
          intensity={2}
        />
        <Lightformer
          form="rect"
          position={[-5, 4, 0]}
          rotation={[0, Math.PI / 2, 0]}
          scale={[0.4, 1.5, 8]}
          color="#ffd6a3"
          intensity={2}
        />
      </Environment>

      <SketchfabSceneFallback
        url={MODEL_URL}
        modelName='"Studio V1 For Car" by Velocity Motion'
        authorName="Velocity Motion"
        authorUrl="https://sketchfab.com/velocity.motion"
        sourceUrl="https://sketchfab.com/3d-models/studio-v1-for-car-9c45d19a7d434e2ca1640d6d2146e895"
        procedural={<MinimalLedStudioFallback />}
      >
        {(url) => <LedStudioGLB url={url} />}
      </SketchfabSceneFallback>

      <ContactShadows
        position={[0, 0.01, 0]}
        opacity={0.7}
        scale={12}
        blur={2}
        far={3}
        color="#000000"
      />

      <ambientLight intensity={0.06} />
      {/* Single hard key light — LED studio is contrasty. */}
      <spotLight
        position={[0, 6, 3]}
        target-position={[0, 0.6, 0]}
        angle={0.5}
        penumbra={0.7}
        intensity={3}
        color="#ffffff"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0001}
      />
    </>
  );
}

function LedStudioGLB({ url }: { url: string }) {
  const cloned = useClonedSceneFromUrl(url);

  // Studio V1 is 178 faces — small, simple, likely already car-sized.
  // Auto-scale to a 14m footprint so the car fills the studio nicely.
  const { scale, yLift } = useMemo(() => {
    cloned.updateMatrixWorld(true);
    const box = new Box3().setFromObject(cloned);
    const size = box.getSize(new Vector3());
    const longAxis = Math.max(size.x, size.z);
    const TARGET_FOOTPRINT = 14;
    const s = longAxis > 0 ? TARGET_FOOTPRINT / longAxis : 1;
    const minYAfterScale = box.min.y * s;
    return { scale: s, yLift: -minYAfterScale };
  }, [cloned]);

  return (
    <group position={[0, yLift, 0]} scale={scale}>
      <primitive object={cloned} />
    </group>
  );
}

function MinimalLedStudioFallback() {
  return (
    <>
      {/* Glossy black floor — wet/lacquered LED-studio feel */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[30, 30]} />
        <MeshReflectorMaterial
          mirror={0.85}
          blur={[200, 80]}
          resolution={512}
          mixBlur={1}
          mixStrength={0.7}
          roughness={0.18}
          color="#040408"
          metalness={0.7}
        />
      </mesh>

      {/* LED strip suggestions floating around the car */}
      {[
        { x: 6, z: 0, w: 0.06, h: 1.4, d: 6, color: '#aac4e8' },
        { x: -6, z: 0, w: 0.06, h: 1.4, d: 6, color: '#ffd6a3' },
        { x: 0, z: 6, w: 6, h: 1.4, d: 0.06, color: '#ffffff' },
        { x: 0, z: -6, w: 6, h: 1.4, d: 0.06, color: '#ffffff' },
      ].map((s, i) => (
        <mesh key={i} position={[s.x, 1.5, s.z]}>
          <boxGeometry args={[s.w, s.h, s.d]} />
          <meshStandardMaterial
            color={s.color}
            emissive={s.color}
            emissiveIntensity={2}
            toneMapped={false}
          />
        </mesh>
      ))}

      {/* Implied dark walls beyond — single dark band suggesting room edges. */}
      <mesh position={[0, 4, 0]}>
        <boxGeometry args={[18, 0.3, 18]} />
        <meshStandardMaterial color="#0c0c10" roughness={0.85} side={2} />
      </mesh>
    </>
  );
}
