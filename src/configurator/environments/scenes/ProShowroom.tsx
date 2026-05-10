import {
  Environment,
  Lightformer,
  MeshReflectorMaterial,
  ContactShadows,
} from '@react-three/drei';
import { CeilingStrips, RoomShell } from './shared';

/**
 * Pro Showroom — the default environment.
 *
 * Sleek automotive showroom built from primitives:
 *   - Polished concrete floor with high-quality real-time reflections.
 *   - 30×20×8m rectangular room with charcoal walls.
 *   - 4 long horizontal Lightformer strips across the ceiling — the
 *     SIGNATURE element that paints horizontal highlights onto the car
 *     body the way a real car-show floor does.
 *   - Cool blue rim Lightformer behind the car for depth.
 *   - Tight contact shadows under the car.
 *
 * The Lightformers live as children of `<Environment background={false}>`
 * so they get baked into the IBL probe and the car body picks them up
 * as mirror-quality reflections — not just diffuse light. The visible
 * ceiling-strip geometry is a separate, matching set of emissive boxes
 * so the camera sees the same lights overhead.
 */

const ROOM_W = 30;
const ROOM_D = 20;
const ROOM_H = 8;
const STRIP_Z = [-4.5, -1.5, 1.5, 4.5];

export function ProShowroom() {
  return (
    <>
      <color attach="background" args={['#0e0e12']} />

      {/* IBL: Lightformers baked into the env probe → car body picks them
          up as bright horizontal streaks across painted panels. */}
      <Environment frames={Infinity} resolution={256} background={false}>
        <CeilingStrips
          height={ROOM_H - 0.05}
          length={10}
          thickness={0.3}
          count={4}
          spread={12}
          color="#fff5e0"
          intensity={3}
        />
        {/* Cool rim light behind the car for shoulder separation */}
        <Lightformer
          form="rect"
          position={[0, 3, -8]}
          scale={[6, 1.5, 1]}
          color="#3a8eff"
          intensity={1.2}
        />
        {/* Side fill — softer, warmer */}
        <Lightformer
          form="ring"
          position={[6, 4, 4]}
          scale={4}
          color="#fff0d4"
          intensity={0.8}
        />
      </Environment>

      {/* Visible ceiling strips that match the IBL Lightformers */}
      <group>
        {STRIP_Z.map((z, i) => (
          <mesh key={i} position={[0, ROOM_H - 0.06, z]}>
            <boxGeometry args={[10, 0.08, 0.3]} />
            <meshStandardMaterial
              color="#fff5e0"
              emissive="#fff5e0"
              emissiveIntensity={2.5}
              toneMapped={false}
            />
          </mesh>
        ))}
      </group>

      {/* Walls + ceiling */}
      <RoomShell
        width={ROOM_W}
        depth={ROOM_D}
        height={ROOM_H}
        wallColor="#1a1a1d"
        ceilingColor="#15151a"
      />

      {/* Polished concrete reflective floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[ROOM_W * 1.2, ROOM_D * 1.2]} />
        <MeshReflectorMaterial
          mirror={0.75}
          blur={[400, 100]}
          resolution={1024}
          mixBlur={1}
          mixStrength={0.6}
          roughness={0.4}
          depthScale={1.2}
          minDepthThreshold={0.85}
          maxDepthThreshold={1}
          color="#0c0c10"
          metalness={0.5}
        />
      </mesh>

      {/* Tight contact shadow under the car */}
      <ContactShadows
        position={[0, 0.01, 0]}
        opacity={0.55}
        scale={14}
        blur={2.4}
        far={3}
        color="#000000"
      />

      <ambientLight intensity={0.1} />

      {/* Key spotlight from above-front for crisp specular highlights */}
      <spotLight
        position={[0, 7, 5]}
        target-position={[0, 0.6, 0]}
        angle={0.55}
        penumbra={0.7}
        intensity={2.2}
        color="#ffffff"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0001}
      />
    </>
  );
}
