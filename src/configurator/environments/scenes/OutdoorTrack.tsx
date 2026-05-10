import { Sky, ContactShadows, Environment, Lightformer } from '@react-three/drei';

/**
 * Outdoor Track — open-air parking / track-side environment.
 *
 * No walls, no ceiling. drei's <Sky> draws the dome with sun position
 * tuned to a late-afternoon golden-hour look. Strong directional sun +
 * soft sky fill. Distant box silhouettes along the horizon suggest
 * grandstands and barriers, breaking the flatness of the asphalt.
 *
 * The asphalt is a wide flat plane, matte standard material — dry
 * asphalt isn't reflective, so MeshReflectorMaterial would be wrong here.
 */

const SUN_POSITION: [number, number, number] = [-50, 20, -40];

export function OutdoorTrack() {
  return (
    <>
      {/* Sky dome with late-afternoon sun position */}
      <Sky
        sunPosition={SUN_POSITION}
        turbidity={4}
        rayleigh={2}
        mieCoefficient={0.005}
        mieDirectionalG={0.85}
        distance={450}
      />

      {/* IBL: a soft warm dome above + golden sun-side card so paint
          reflections don't read as a hard mirror against the open sky. */}
      <Environment frames={Infinity} resolution={256} background={false}>
        <Lightformer
          form="rect"
          position={[0, 12, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          scale={[40, 40, 1]}
          color="#fff5e0"
          intensity={1.5}
        />
        <Lightformer
          form="rect"
          position={[-15, 6, -10]}
          scale={[10, 6, 1]}
          color="#ffd09a"
          intensity={2.5}
        />
        <Lightformer
          form="rect"
          position={[15, 4, 10]}
          scale={[8, 4, 1]}
          color="#a3c0e0"
          intensity={0.8}
        />
      </Environment>

      {/* Grandstand silhouettes along the horizon — just enough to
          break the flatness of the open ground when orbiting. */}
      <Grandstands />

      {/* Asphalt — large, matte, no reflection */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color="#26262a" roughness={0.95} metalness={0.05} />
      </mesh>

      {/* Lane stripe under/around the car — subtle, suggests track-side */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[10, 0.001, 0]}>
        <planeGeometry args={[0.18, 30]} />
        <meshStandardMaterial color="#d0d0d4" roughness={0.7} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-10, 0.001, 0]}>
        <planeGeometry args={[0.18, 30]} />
        <meshStandardMaterial color="#d0d0d4" roughness={0.7} />
      </mesh>

      <ContactShadows
        position={[0, 0.01, 0]}
        opacity={0.55}
        scale={14}
        blur={1.8}
        far={3}
        color="#000000"
      />

      {/* Strong directional sun + soft ambient sky fill */}
      <ambientLight intensity={0.45} color="#a3c0e0" />
      <directionalLight
        position={SUN_POSITION}
        intensity={3.5}
        color="#fff5e0"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-15}
        shadow-camera-right={15}
        shadow-camera-top={15}
        shadow-camera-bottom={-15}
        shadow-camera-near={1}
        shadow-camera-far={120}
        shadow-bias={-0.0001}
      />
    </>
  );
}

/** Distant horizon silhouettes — grandstand-ish boxes for parallax. */
function Grandstands() {
  return (
    <group>
      {/* Left bank */}
      <mesh position={[-22, 1.6, -18]}>
        <boxGeometry args={[18, 3.2, 2]} />
        <meshStandardMaterial color="#1f1f24" roughness={0.9} />
      </mesh>
      <mesh position={[-22, 3, -18.6]}>
        <boxGeometry args={[16, 2, 0.3]} />
        <meshStandardMaterial color="#2a2a30" roughness={0.85} />
      </mesh>
      {/* Right bank */}
      <mesh position={[24, 1.4, -22]}>
        <boxGeometry args={[20, 2.8, 2]} />
        <meshStandardMaterial color="#1f1f24" roughness={0.9} />
      </mesh>
      {/* Far back — a couple of pylon shapes */}
      <mesh position={[8, 4, -45]}>
        <boxGeometry args={[1, 8, 1]} />
        <meshStandardMaterial color="#15151a" roughness={0.85} />
      </mesh>
      <mesh position={[-12, 5, -50]}>
        <boxGeometry args={[1.2, 10, 1.2]} />
        <meshStandardMaterial color="#15151a" roughness={0.85} />
      </mesh>
      {/* Trackside barriers near the camera-foreground */}
      <mesh position={[14, 0.5, 0]}>
        <boxGeometry args={[0.4, 1, 14]} />
        <meshStandardMaterial color="#cf4040" roughness={0.85} />
      </mesh>
      <mesh position={[14.6, 0.5, 0]}>
        <boxGeometry args={[0.4, 1, 14]} />
        <meshStandardMaterial color="#dde2e8" roughness={0.85} />
      </mesh>
    </group>
  );
}
