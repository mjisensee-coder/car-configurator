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
 *   - Bright dealer-floor lighting overall (not moody/dramatic).
 *
 * The Lightformers live as children of `<Environment background={false}>`
 * so they get baked into the IBL probe and the car body picks them up
 * as mirror-quality reflections — not just diffuse light. The visible
 * ceiling-strip geometry is a separate, matching set of emissive boxes
 * so the camera sees the same lights overhead.
 *
 * Lighting intent: BRIGHTLY-LIT dealer showroom floor. If you find
 * yourself wanting more shadow / mood, that's the Night Display
 * environment — keep this one bright.
 */

const ROOM_W = 30;
const ROOM_D = 20;
const ROOM_H = 8;
const STRIP_Z = [-4.5, -1.5, 1.5, 4.5];

export function ProShowroom() {
  return (
    <>
      <color attach="background" args={['#161620']} />

      {/* IBL: Lightformers baked into the env probe → car body picks them
          up as bright horizontal streaks across painted panels. */}
      <Environment frames={Infinity} resolution={256} background={false}>
        <CeilingStrips
          height={ROOM_H - 0.05}
          length={10}
          thickness={0.3}
          count={4}
          spread={12}
          color="#ffffff"
          intensity={8}
        />
        {/* Cool rim light behind the car for shoulder separation */}
        <Lightformer
          form="rect"
          position={[0, 3, -8]}
          scale={[6, 1.5, 1]}
          color="#cfe4ff"
          intensity={3}
        />
        {/* Side fill — softer, warmer */}
        <Lightformer
          form="ring"
          position={[6, 4, 4]}
          scale={4}
          color="#fff0d4"
          intensity={2.2}
        />
        {/* Opposite-side fill for symmetry on hero shots */}
        <Lightformer
          form="ring"
          position={[-6, 4, 4]}
          scale={4}
          color="#fff0d4"
          intensity={2.2}
        />
        {/* Soft overhead dome — fills shadow areas so the car doesn't
            crush to black on the underside. */}
        <Lightformer
          form="rect"
          position={[0, 7.5, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          scale={[20, 20, 1]}
          color="#ffffff"
          intensity={1.2}
        />
      </Environment>

      {/* Visible ceiling strips that match the IBL Lightformers */}
      <group>
        {STRIP_Z.map((z, i) => (
          <mesh key={i} position={[0, ROOM_H - 0.06, z]}>
            <boxGeometry args={[10, 0.08, 0.3]} />
            <meshStandardMaterial
              color="#ffffff"
              emissive="#ffffff"
              emissiveIntensity={5}
              toneMapped={false}
            />
          </mesh>
        ))}
      </group>

      {/* Walls + ceiling — slightly lighter charcoal so they reflect more
          of the bright lighting instead of crushing to black. */}
      <RoomShell
        width={ROOM_W}
        depth={ROOM_D}
        height={ROOM_H}
        wallColor="#23232a"
        ceilingColor="#1c1c22"
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
          color="#101015"
          metalness={0.5}
        />
      </mesh>

      {/* Tight contact shadow under the car */}
      <ContactShadows
        position={[0, 0.01, 0]}
        opacity={0.5}
        scale={14}
        blur={2.4}
        far={3}
        color="#000000"
      />

      {/* Brighter ambient so the dealer-floor feel comes through */}
      <ambientLight intensity={0.4} />

      {/* Key spotlight from above-front for crisp specular highlights */}
      <spotLight
        position={[0, 7, 5]}
        target-position={[0, 0.6, 0]}
        angle={0.6}
        penumbra={0.7}
        intensity={4.5}
        color="#ffffff"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0001}
      />
      {/* Fill spot from the opposite-front side so the body sides both
          get a bright wash — eliminates the side-on shadow drop-off. */}
      <spotLight
        position={[0, 7, -5]}
        target-position={[0, 0.6, 0]}
        angle={0.6}
        penumbra={0.8}
        intensity={3.0}
        color="#ffffff"
      />
      {/* Two side wash spots from each lateral direction */}
      <spotLight
        position={[7, 5, 0]}
        target-position={[0, 0.6, 0]}
        angle={0.7}
        penumbra={0.85}
        intensity={2.0}
        color="#ffffff"
      />
      <spotLight
        position={[-7, 5, 0]}
        target-position={[0, 0.6, 0]}
        angle={0.7}
        penumbra={0.85}
        intensity={2.0}
        color="#ffffff"
      />
    </>
  );
}
