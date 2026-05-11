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
 * LED Studio — "Studio V1 For Car" by Velocity Motion (Sketchfab, CC BY 4.0).
 * https://sketchfab.com/3d-models/studio-v1-for-car-9c45d19a7d434e2ca1640d6d2146e895
 *
 * Ultra-low-poly studio (~360 vertices) with emissive LED-strip
 * materials baked in. Native scale = real-world meters (bbox 28m × 3m
 * × 28m, floor at y=0). Mount as-is — the car at world origin sits
 * naturally on the studio floor.
 *
 * The 12MB file weight is texture data, not geometry.
 */

const MODEL_URL = '/environments/studio_v1_for_car.glb';

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

      {/* Lighting: keep the LED-strip drama (colored accents) as the
          visual signature, but raise overall light enough that the car
          body is clearly visible. Was way too dark — ambient 0.06 made
          the car read as a silhouette. */}
      <ambientLight intensity={0.35} />

      {/* Bright key from above-front */}
      <spotLight
        position={[0, 6, 4]}
        target-position={[0, 0.6, 0]}
        angle={0.55}
        penumbra={0.7}
        intensity={5.5}
        color="#ffffff"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0001}
      />
      {/* Fill from the opposite-front side to lift the shadow side of the body */}
      <spotLight
        position={[0, 5, -3]}
        target-position={[0, 0.6, 0]}
        angle={0.7}
        penumbra={0.85}
        intensity={3}
        color="#ffffff"
      />
      {/* Cool accent rim from the right */}
      <spotLight
        position={[6, 4, 0]}
        target-position={[0, 0.6, 0]}
        angle={0.65}
        penumbra={0.85}
        intensity={2.5}
        color="#aac4e8"
      />
      {/* Warm accent rim from the left */}
      <spotLight
        position={[-6, 4, 0]}
        target-position={[0, 0.6, 0]}
        angle={0.65}
        penumbra={0.85}
        intensity={2.5}
        color="#ffd6a3"
      />
    </>
  );
}

function LedStudioGLB({ url }: { url: string }) {
  const cloned = useClonedSceneFromUrl(url);
  return <primitive object={cloned} />;
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
