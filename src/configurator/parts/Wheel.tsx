import { getPartById } from '@/services/partsService';

interface WheelProps {
  position: [number, number, number];
  wheelId: string;
  isRight: boolean;
}

/**
 * Renders one wheel in the configured style. The "style" hint on the part
 * record drives which geometry is used; price/affiliate live on the same
 * record so the sidebar and summary stay aligned.
 */
export function Wheel({ position, wheelId, isRight }: WheelProps) {
  const part = getPartById(wheelId);
  const style = (part?.renderHint?.style as string) ?? 'bbs-rs';
  const spokes = (part?.renderHint?.spokes as number) ?? 5;

  const TIRE_RADIUS = 0.34;
  const TIRE_WIDTH = 0.22;
  const RIM_RADIUS = TIRE_RADIUS * 0.74;

  return (
    <group
      position={position}
      rotation={[0, isRight ? -Math.PI / 2 : Math.PI / 2, 0]}
    >
      {/* Tire */}
      <mesh castShadow rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[TIRE_RADIUS, TIRE_RADIUS, TIRE_WIDTH, 32]} />
        <meshStandardMaterial color="#0c0c0e" roughness={0.85} metalness={0.1} />
      </mesh>

      {/* Tire sidewall pattern (subtle) */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}>
        <torusGeometry args={[TIRE_RADIUS * 0.95, 0.02, 6, 32]} />
        <meshStandardMaterial color="#16161a" roughness={0.9} />
      </mesh>

      {/* Rim face — varies by style */}
      {style === 'bbs-rs' && <BbsRsFace radius={RIM_RADIUS} spokes={Math.max(8, spokes)} />}
      {style === 'ronal-lsi' && <RonalLsiFace radius={RIM_RADIUS} />}
      {style === 'mtech-bottle' && <MtechBottleFace radius={RIM_RADIUS} />}

      {/* Center cap */}
      <mesh position={[0, 0, TIRE_WIDTH / 2 + 0.005]} rotation={[0, 0, 0]}>
        <cylinderGeometry args={[0.045, 0.045, 0.02, 16]} />
        <meshStandardMaterial color="#0a4d8a" metalness={0.6} roughness={0.4} />
      </mesh>
    </group>
  );
}

/**
 * Mesh-style face with polished gold spokes & polished lip — BBS RS aesthetic.
 */
function BbsRsFace({ radius, spokes }: { radius: number; spokes: number }) {
  const arr = Array.from({ length: spokes });
  return (
    <group position={[0, 0, 0.115]}>
      {/* Polished outer lip */}
      <mesh>
        <torusGeometry args={[radius * 1.05, 0.025, 12, 32]} />
        <meshStandardMaterial color="#dde2e8" metalness={1} roughness={0.05} />
      </mesh>
      {/* Gold mesh face */}
      <mesh>
        <cylinderGeometry args={[radius, radius, 0.04, 32]} />
        <meshStandardMaterial color="#d4a657" metalness={0.85} roughness={0.25} />
      </mesh>
      {/* Mesh spokes */}
      {arr.map((_, i) => {
        const angle = (i / spokes) * Math.PI * 2;
        return (
          <mesh
            key={`bbs-spoke-${i}`}
            rotation={[0, 0, angle]}
            position={[0, 0, 0.005]}
          >
            <boxGeometry args={[radius * 1.85, 0.025, 0.05]} />
            <meshStandardMaterial color="#b88c43" metalness={0.9} roughness={0.2} />
          </mesh>
        );
      })}
    </group>
  );
}

/**
 * 5-spoke star — Ronal LSI inspired.
 */
function RonalLsiFace({ radius }: { radius: number }) {
  return (
    <group position={[0, 0, 0.115]}>
      <mesh>
        <torusGeometry args={[radius * 1.05, 0.025, 12, 32]} />
        <meshStandardMaterial color="#dde2e8" metalness={1} roughness={0.08} />
      </mesh>
      <mesh>
        <cylinderGeometry args={[radius, radius, 0.04, 32]} />
        <meshStandardMaterial color="#aab2bc" metalness={0.85} roughness={0.2} />
      </mesh>
      {Array.from({ length: 5 }).map((_, i) => {
        const angle = (i / 5) * Math.PI * 2;
        return (
          <mesh
            key={`ronal-${i}`}
            rotation={[0, 0, angle]}
            position={[0, 0, 0.005]}
          >
            <boxGeometry args={[radius * 1.85, 0.06, 0.05]} />
            <meshStandardMaterial color="#c8ccd1" metalness={0.95} roughness={0.1} />
          </mesh>
        );
      })}
    </group>
  );
}

/**
 * Bowl-style multi-spoke — M-Tech bottlecap inspired.
 */
function MtechBottleFace({ radius }: { radius: number }) {
  return (
    <group position={[0, 0, 0.115]}>
      <mesh>
        <torusGeometry args={[radius * 1.05, 0.025, 12, 32]} />
        <meshStandardMaterial color="#aab2bc" metalness={0.95} roughness={0.15} />
      </mesh>
      <mesh>
        <cylinderGeometry args={[radius, radius, 0.04, 32]} />
        <meshStandardMaterial color="#c8ccd1" metalness={0.85} roughness={0.2} />
      </mesh>
      {Array.from({ length: 12 }).map((_, i) => {
        const angle = (i / 12) * Math.PI * 2;
        return (
          <mesh
            key={`mtech-${i}`}
            rotation={[0, 0, angle]}
            position={[
              Math.cos(angle) * radius * 0.6,
              Math.sin(angle) * radius * 0.6,
              0.01,
            ]}
          >
            <cylinderGeometry args={[0.018, 0.018, 0.04, 8]} />
            <meshStandardMaterial color="#0a0a0c" metalness={0.6} roughness={0.4} />
          </mesh>
        );
      })}
    </group>
  );
}
