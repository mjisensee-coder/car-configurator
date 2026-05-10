import {
  Environment,
  Lightformer,
  MeshReflectorMaterial,
  ContactShadows,
} from '@react-three/drei';
import { CeilingStrips, RoomShell, ToolCabinets } from './shared';

/**
 * Workshop Garage — a working garage / mechanic's bay.
 *
 * Painted concrete floor (lightly reflective — not a showroom mirror),
 * lighter grey walls suggesting bare concrete or painted block,
 * fluorescent ceiling strips (cooler, narrower than showroom),
 * tool-cabinet silhouettes along one wall, and a closed roller-door
 * rectangle on the back wall. A warm work-lamp on one side.
 */

const ROOM_W = 22;
const ROOM_D = 16;
const ROOM_H = 5;

export function WorkshopGarage() {
  return (
    <>
      <color attach="background" args={['#1c1c1f']} />

      {/* IBL: cooler fluorescent strips baked into the env probe */}
      <Environment frames={Infinity} resolution={256} background={false}>
        <CeilingStrips
          height={ROOM_H - 0.05}
          length={6}
          thickness={0.18}
          count={3}
          spread={8}
          color="#e8f0ff"
          intensity={4}
        />
        {/* Warm work-lamp from the side as a contrasting fill */}
        <Lightformer
          form="rect"
          position={[6, 2.5, 0]}
          rotation={[0, -Math.PI / 2, 0]}
          scale={[2, 1.5, 1]}
          color="#ffb070"
          intensity={1.6}
        />
      </Environment>

      {/* Visible fluorescent tubes overhead */}
      <group>
        {[-2.8, 0, 2.8].map((z, i) => (
          <mesh key={i} position={[0, ROOM_H - 0.06, z]}>
            <boxGeometry args={[6, 0.06, 0.18]} />
            <meshStandardMaterial
              color="#e8f0ff"
              emissive="#e8f0ff"
              emissiveIntensity={3}
              toneMapped={false}
            />
          </mesh>
        ))}
      </group>

      {/* Walls + ceiling — painted block */}
      <RoomShell
        width={ROOM_W}
        depth={ROOM_D}
        height={ROOM_H}
        wallColor="#3a3a3e"
        ceilingColor="#2a2a2e"
      />

      {/* Closed roller-door on the back wall */}
      <mesh
        position={[0, 1.7, -ROOM_D / 2 + 0.21]}
        receiveShadow
      >
        <boxGeometry args={[5.5, 3.4, 0.05]} />
        <meshStandardMaterial color="#52525a" roughness={0.6} metalness={0.4} />
      </mesh>
      {/* Door panel ribs */}
      <group position={[0, 0, -ROOM_D / 2 + 0.215]}>
        {Array.from({ length: 8 }).map((_, i) => {
          const y = 0.2 + i * 0.4;
          return (
            <mesh key={i} position={[0, y, 0]}>
              <boxGeometry args={[5.4, 0.04, 0.02]} />
              <meshStandardMaterial color="#2c2c34" roughness={0.6} metalness={0.5} />
            </mesh>
          );
        })}
      </group>

      {/* Tool cabinets along the right wall */}
      <ToolCabinets
        wall="right"
        wallOffset={ROOM_W / 2 - 0.2}
        color="#444448"
        count={4}
      />

      {/* Workbench against the left wall */}
      <mesh position={[-ROOM_W / 2 + 0.7, 0.5, 2.5]} castShadow receiveShadow>
        <boxGeometry args={[1.2, 1, 3]} />
        <meshStandardMaterial color="#5a5a5e" roughness={0.7} metalness={0.2} />
      </mesh>
      <mesh position={[-ROOM_W / 2 + 0.7, 1.05, 2.5]} castShadow>
        <boxGeometry args={[1.2, 0.05, 3]} />
        <meshStandardMaterial color="#3a2820" roughness={0.65} metalness={0.05} />
      </mesh>

      {/* Painted concrete floor — slight sheen, not mirror */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[ROOM_W * 1.4, ROOM_D * 1.4]} />
        <MeshReflectorMaterial
          mirror={0.15}
          blur={[300, 100]}
          resolution={512}
          mixBlur={1.5}
          mixStrength={1.5}
          roughness={0.85}
          depthScale={0.5}
          color="#48484c"
          metalness={0.1}
        />
      </mesh>

      <ContactShadows
        position={[0, 0.01, 0]}
        opacity={0.7}
        scale={14}
        blur={2.6}
        far={3}
        color="#000000"
      />

      <ambientLight intensity={0.18} />

      {/* Warm work-lamp point light on the right side */}
      <pointLight position={[5.5, 2, 1]} color="#ffaa66" intensity={1.5} distance={12} />

      {/* Key spot from above for clean shadows */}
      <spotLight
        position={[0, 4.5, 3]}
        target-position={[0, 0.6, 0]}
        angle={0.6}
        penumbra={0.8}
        intensity={1.4}
        color="#ffffff"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0001}
      />
    </>
  );
}
