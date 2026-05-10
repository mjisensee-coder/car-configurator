import { getPartById } from '@/services/partsService';

interface ExhaustTipProps {
  position: [number, number, number];
  exhaustId: string;
}

/**
 * Renders an exhaust tip behind the rear bumper. Style is driven by the
 * `style` render hint on the part record. Swap-in a real exhaust mesh
 * later by replacing the JSX branches.
 */
export function ExhaustTip({ position, exhaustId }: ExhaustTipProps) {
  const part = getPartById(exhaustId);
  const style = (part?.renderHint?.style as string) ?? 'single-tip';
  const tipDiameter = (part?.renderHint?.tipDiameter as number) ?? 0.06;

  if (style === 'dual-tip') {
    return (
      <group position={position}>
        {[-0.12, 0.12].map((dx, i) => (
          <mesh
            key={`exhaust-dual-${i}`}
            position={[dx, 0, 0]}
            rotation={[Math.PI / 2, 0, 0]}
            castShadow
          >
            <cylinderGeometry args={[tipDiameter, tipDiameter * 0.92, 0.18, 16]} />
            <meshStandardMaterial color="#dde2e8" metalness={1} roughness={0.15} />
          </mesh>
        ))}
      </group>
    );
  }

  if (style === 'megaphone') {
    return (
      <group position={position}>
        <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[tipDiameter * 1.4, tipDiameter * 0.6, 0.28, 24]} />
          <meshStandardMaterial color="#bcc0c6" metalness={0.95} roughness={0.25} />
        </mesh>
      </group>
    );
  }

  // single-tip default
  return (
    <group position={position}>
      <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[tipDiameter, tipDiameter * 0.92, 0.22, 16]} />
        <meshStandardMaterial color="#dde2e8" metalness={1} roughness={0.15} />
      </mesh>
    </group>
  );
}
