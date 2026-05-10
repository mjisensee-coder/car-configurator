import {
  Stars,
  ContactShadows,
  Environment,
  Lightformer,
  MeshReflectorMaterial,
} from '@react-three/drei';

/**
 * Night Display — dramatic night presentation.
 *
 * Wet-asphalt floor with sharp neon reflections of the surrounding
 * spotlights. Tall thin emissive towers in the distance suggest
 * skyline. drei's <Stars> draws a star-dome above. Three colored
 * spotlights — cool key, cyan accent, warm rim — sculpt the car. Subtle
 * fog fades distant geometry into darkness.
 */

export function NightDisplay() {
  return (
    <>
      <color attach="background" args={['#04040a']} />
      <fog attach="fog" args={['#06060c', 14, 36]} />

      <Stars
        radius={120}
        depth={50}
        count={3000}
        factor={4}
        saturation={0}
        fade
        speed={0.3}
      />

      {/* IBL: dramatic colored Lightformers baked into the env probe so
          the car body picks up cyan/magenta streaks. */}
      <Environment frames={Infinity} resolution={256} background={false}>
        <Lightformer
          form="rect"
          position={[5, 6, 4]}
          scale={[6, 1.5, 1]}
          color="#7ddfff"
          intensity={4}
        />
        <Lightformer
          form="rect"
          position={[-5, 6, -3]}
          scale={[6, 1.5, 1]}
          color="#ff5db1"
          intensity={3.5}
        />
        <Lightformer
          form="rect"
          position={[0, 7, -8]}
          scale={[10, 0.8, 1]}
          color="#ffd6a3"
          intensity={1.5}
        />
      </Environment>

      {/* Distant skyline — tall thin emissive towers */}
      <CityBuildings />

      {/* Wet asphalt — high reflectivity, sharper than showroom because
          a wet road acts more like a partial mirror under streetlights. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[80, 80]} />
        <MeshReflectorMaterial
          mirror={0.9}
          blur={[200, 80]}
          resolution={1024}
          mixBlur={1}
          mixStrength={0.8}
          roughness={0.18}
          depthScale={1.2}
          minDepthThreshold={0.85}
          maxDepthThreshold={1}
          color="#040408"
          metalness={0.7}
        />
      </mesh>

      <ContactShadows
        position={[0, 0.01, 0]}
        opacity={0.85}
        scale={14}
        blur={1.6}
        far={3}
        color="#040414"
      />

      {/* Very low ambient — drama comes from the spots */}
      <ambientLight intensity={0.05} />

      {/* Cool white key from above-front */}
      <spotLight
        position={[3, 6, 5]}
        target-position={[0, 0.6, 0]}
        angle={0.45}
        penumbra={0.7}
        intensity={3.5}
        color="#ffffff"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0001}
      />
      {/* Cyan accent from the side */}
      <spotLight
        position={[-6, 4, 0]}
        target-position={[0, 0.6, 0]}
        angle={0.55}
        penumbra={0.8}
        intensity={2.5}
        color="#5acaff"
      />
      {/* Warm amber rim from behind */}
      <spotLight
        position={[0, 4, -6]}
        target-position={[0, 0.6, 0]}
        angle={0.6}
        penumbra={0.85}
        intensity={2}
        color="#ffaa55"
      />

      {/* Two emissive ground accent points (under the floor — visible only
          as a faint horizon glow because of the wet-asphalt reflection) */}
      <pointLight position={[0, 0.4, 6]} color="#3aa0ff" intensity={0.6} distance={10} />
      <pointLight position={[0, 0.4, -6]} color="#ff3a8e" intensity={0.6} distance={10} />
    </>
  );
}

/**
 * Distant city silhouettes — tall thin boxes with emissive vertical
 * edges suggesting lit-up architecture.
 */
function CityBuildings() {
  // Deterministic placement around the scene — far enough to read as
  // distant skyline, with subtle emissive accents.
  const buildings: { x: number; z: number; w: number; h: number; emissive: string }[] = [
    { x: -18, z: -22, w: 3, h: 14, emissive: '#3aa0ff' },
    { x: -10, z: -28, w: 2.4, h: 10, emissive: '#ff3a8e' },
    { x: 4, z: -30, w: 2.8, h: 16, emissive: '#5acaff' },
    { x: 14, z: -24, w: 2.2, h: 9, emissive: '#ffaa55' },
    { x: 22, z: -20, w: 3.2, h: 12, emissive: '#ff3a8e' },
    { x: -22, z: 18, w: 2.6, h: 11, emissive: '#3aa0ff' },
    { x: 16, z: 22, w: 2.4, h: 9, emissive: '#ff3a8e' },
  ];

  return (
    <group>
      {buildings.map((b, i) => (
        <group key={i} position={[b.x, b.h / 2, b.z]}>
          {/* Building mass — dark */}
          <mesh>
            <boxGeometry args={[b.w, b.h, b.w]} />
            <meshStandardMaterial color="#0a0a14" roughness={0.85} metalness={0.2} />
          </mesh>
          {/* Vertical edge accent — emissive thin strip running up the
              front-facing corner. Adds the "lit-up city" feel. */}
          <mesh position={[b.w / 2 - 0.05, 0, b.w / 2 - 0.05]}>
            <boxGeometry args={[0.06, b.h * 0.92, 0.06]} />
            <meshStandardMaterial
              color={b.emissive}
              emissive={b.emissive}
              emissiveIntensity={2}
              toneMapped={false}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}
