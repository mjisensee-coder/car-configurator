import {
  Environment,
  Lightformer,
  ContactShadows,
  MeshReflectorMaterial,
} from '@react-three/drei';
import {
  SketchfabSceneFallback,
  useClonedSceneFromUrl,
} from './SketchfabSceneFallback';

/**
 * Modern Showroom — "Car-Showroom 2" by Polsaris (Sketchfab, CC BY 4.0).
 * https://sketchfab.com/3d-models/car-showroom-2-e7a3497e8a7c487e906b2d8814b018f0
 *
 * 44K-face glass-ceiling showroom interior. Native scale = real-world
 * meters (bounding box 28.6m × 3.2m × 28.6m, floor at y≈0), so we mount
 * as-is. The car at world origin (4.32m long) sits naturally at the
 * showroom's geometric center.
 *
 * Until the GLB is in place, falls back to a minimal procedural room.
 */

const MODEL_URL = '/environments/car-showroom_2.glb';

export function ModernShowroom() {
  return (
    <>
      <color attach="background" args={['#1a1a20']} />

      {/* Soft IBL — keeps the car body shaded properly even before the
          showroom GLB lights it. */}
      <Environment frames={Infinity} resolution={256} background={false}>
        <Lightformer
          form="rect"
          position={[0, 6, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          scale={[12, 12, 1]}
          color="#ffffff"
          intensity={1.8}
        />
        <Lightformer
          form="rect"
          position={[0, 4, -8]}
          scale={[8, 2, 1]}
          color="#aac4e8"
          intensity={1}
        />
      </Environment>

      <SketchfabSceneFallback
        url={MODEL_URL}
        modelName='"Car-Showroom 2" by Polsaris'
        authorName="Polsaris"
        authorUrl="https://sketchfab.com/polsaris"
        sourceUrl="https://sketchfab.com/3d-models/car-showroom-2-e7a3497e8a7c487e906b2d8814b018f0"
        procedural={<MinimalShowroomFallback />}
      >
        {(url) => <ShowroomGLB url={url} />}
      </SketchfabSceneFallback>

      <ContactShadows
        position={[0, 0.01, 0]}
        opacity={0.5}
        scale={14}
        blur={2.4}
        far={3}
        color="#000000"
      />

      <ambientLight intensity={0.2} />
      <spotLight
        position={[0, 7, 5]}
        target-position={[0, 0.6, 0]}
        angle={0.55}
        penumbra={0.7}
        intensity={2.0}
        color="#ffffff"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0001}
      />
    </>
  );
}

/**
 * Renders the loaded showroom GLB at native scale. Polsaris's model is
 * already in meters with the floor at y=0; no transform needed.
 */
function ShowroomGLB({ url }: { url: string }) {
  const cloned = useClonedSceneFromUrl(url);
  return <primitive object={cloned} />;
}

/**
 * Procedural fallback shown until the GLB is dropped in place. Just a
 * dark reflective floor + four walls so the car doesn't float in a void.
 */
function MinimalShowroomFallback() {
  return (
    <>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[40, 40]} />
        <MeshReflectorMaterial
          mirror={0.6}
          blur={[300, 100]}
          resolution={512}
          mixBlur={1}
          mixStrength={0.6}
          roughness={0.5}
          color="#0c0c10"
          metalness={0.5}
        />
      </mesh>
      {/* Four matte walls at 20m offset */}
      {[
        { pos: [0, 4, -15] as [number, number, number], size: [40, 8, 0.4] as [number, number, number] },
        { pos: [0, 4, 15] as [number, number, number], size: [40, 8, 0.4] as [number, number, number] },
        { pos: [-15, 4, 0] as [number, number, number], size: [0.4, 8, 30] as [number, number, number] },
        { pos: [15, 4, 0] as [number, number, number], size: [0.4, 8, 30] as [number, number, number] },
      ].map((w, i) => (
        <mesh key={i} position={w.pos}>
          <boxGeometry args={w.size} />
          <meshStandardMaterial color="#1f1f24" roughness={0.85} />
        </mesh>
      ))}
    </>
  );
}
