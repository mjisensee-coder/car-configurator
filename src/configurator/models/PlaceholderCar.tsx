import { useMemo } from 'react';
import { type Color } from 'three';
import { Wheel } from '../parts/Wheel';
import { ExhaustTip } from '../parts/ExhaustTip';
import { BodyDecal } from '../parts/BodyDecal';
import type { CarConfig } from '@/types';
import { getPartById } from '@/services/partsService';

/**
 * Placeholder BMW E30 built from Three.js primitives.
 *
 * The shape is deliberately recognizable but not photographic — the goal is
 * to demonstrate the part-swap architecture. Drop a real GLB into this slot
 * by replacing the JSX with a useGLTF()-backed component that exposes the
 * same swap points: body color, wheels[0..3], exhaust, decals.
 *
 * Coordinate convention: car points down +Z, +X is the right side, +Y is up.
 * The wheelbase is centered at the origin; the body floats above by `bodyY`.
 */

interface PlaceholderCarProps {
  config: CarConfig;
}

const BODY_LENGTH = 4.4;
const BODY_WIDTH = 1.62;
const BODY_HEIGHT = 1.32;
const WHEELBASE = 2.55;
const TRACK = 1.4;

export function PlaceholderCar({ config }: PlaceholderCarProps) {
  const paint = getPartById(config.paintId);
  const paintColor: string = (paint?.renderHint?.hex as string) ?? '#f1f3f4';
  const metallic = ((paint?.renderHint?.metallic as number) ?? 0) > 0;

  const bodyY = useMemo(() => 0.55 + config.rideHeight, [config.rideHeight]);
  const wheelY = 0.34;

  const wheelPositions: [number, number, number][] = [
    [-TRACK / 2, wheelY, WHEELBASE / 2],
    [TRACK / 2, wheelY, WHEELBASE / 2],
    [-TRACK / 2, wheelY, -WHEELBASE / 2],
    [TRACK / 2, wheelY, -WHEELBASE / 2],
  ];

  return (
    <group>
      {/* === Body === */}
      <group position={[0, bodyY, 0]}>
        {/* Lower body (sill-to-belt) */}
        <mesh castShadow receiveShadow position={[0, 0, 0]}>
          <boxGeometry args={[BODY_WIDTH, BODY_HEIGHT * 0.55, BODY_LENGTH]} />
          <meshPhysicalMaterial
            color={paintColor as Color | string}
            metalness={metallic ? 0.85 : 0.4}
            roughness={metallic ? 0.25 : 0.4}
            clearcoat={1}
            clearcoatRoughness={0.05}
          />
        </mesh>

        {/* Greenhouse (cabin) */}
        <mesh
          castShadow
          receiveShadow
          position={[0, BODY_HEIGHT * 0.45, -0.05]}
        >
          <boxGeometry
            args={[BODY_WIDTH * 0.92, BODY_HEIGHT * 0.5, BODY_LENGTH * 0.55]}
          />
          <meshPhysicalMaterial
            color={paintColor as Color | string}
            metalness={metallic ? 0.85 : 0.4}
            roughness={metallic ? 0.25 : 0.4}
            clearcoat={1}
            clearcoatRoughness={0.05}
          />
        </mesh>

        {/* Front windshield */}
        <mesh position={[0, BODY_HEIGHT * 0.45, BODY_LENGTH * 0.18]}>
          <boxGeometry args={[BODY_WIDTH * 0.86, BODY_HEIGHT * 0.45, 0.06]} />
          <meshPhysicalMaterial
            color="#0c1418"
            metalness={0.2}
            roughness={0.05}
            transmission={0.9}
            transparent
            opacity={0.6}
          />
        </mesh>
        {/* Rear windshield */}
        <mesh position={[0, BODY_HEIGHT * 0.45, -BODY_LENGTH * 0.28]}>
          <boxGeometry args={[BODY_WIDTH * 0.86, BODY_HEIGHT * 0.4, 0.06]} />
          <meshPhysicalMaterial
            color="#0c1418"
            metalness={0.2}
            roughness={0.05}
            transmission={0.85}
            transparent
            opacity={0.6}
          />
        </mesh>
        {/* Side windows L */}
        <mesh position={[-BODY_WIDTH / 2 + 0.005, BODY_HEIGHT * 0.45, -0.05]}>
          <boxGeometry args={[0.02, BODY_HEIGHT * 0.36, BODY_LENGTH * 0.5]} />
          <meshPhysicalMaterial
            color="#0c1418"
            metalness={0.2}
            roughness={0.05}
            transmission={0.85}
            transparent
            opacity={0.55}
          />
        </mesh>
        {/* Side windows R */}
        <mesh position={[BODY_WIDTH / 2 - 0.005, BODY_HEIGHT * 0.45, -0.05]}>
          <boxGeometry args={[0.02, BODY_HEIGHT * 0.36, BODY_LENGTH * 0.5]} />
          <meshPhysicalMaterial
            color="#0c1418"
            metalness={0.2}
            roughness={0.05}
            transmission={0.85}
            transparent
            opacity={0.55}
          />
        </mesh>

        {/* Hood line */}
        <mesh position={[0, 0.05, BODY_LENGTH * 0.32]}>
          <boxGeometry args={[BODY_WIDTH * 0.98, 0.02, BODY_LENGTH * 0.36]} />
          <meshStandardMaterial color="#0c0c0e" metalness={0.6} roughness={0.4} />
        </mesh>

        {/* Front bumper */}
        <mesh
          castShadow
          receiveShadow
          position={[0, -BODY_HEIGHT * 0.25, BODY_LENGTH * 0.5 - 0.02]}
        >
          <boxGeometry args={[BODY_WIDTH * 1.02, 0.18, 0.18]} />
          <meshStandardMaterial color="#0c0c0e" metalness={0.5} roughness={0.5} />
        </mesh>
        {/* Rear bumper */}
        <mesh
          castShadow
          receiveShadow
          position={[0, -BODY_HEIGHT * 0.25, -BODY_LENGTH * 0.5 + 0.02]}
        >
          <boxGeometry args={[BODY_WIDTH * 1.02, 0.18, 0.18]} />
          <meshStandardMaterial color="#0c0c0e" metalness={0.5} roughness={0.5} />
        </mesh>

        {/* Headlights — twin round (E30 signature) */}
        {[-0.32, -0.12, 0.12, 0.32].map((x, i) => (
          <mesh
            key={`hl-${i}`}
            position={[x, 0.05, BODY_LENGTH * 0.5 + 0.005]}
            rotation={[0, Math.PI / 2, 0]}
          >
            <cylinderGeometry args={[0.085, 0.085, 0.04, 24]} />
            <meshStandardMaterial
              color="#fff5d6"
              emissive="#fff5d6"
              emissiveIntensity={0.6}
              metalness={0.4}
              roughness={0.05}
            />
          </mesh>
        ))}

        {/* BMW kidney grilles */}
        {[-0.085, 0.085].map((x, i) => (
          <mesh
            key={`grille-${i}`}
            position={[x, 0.06, BODY_LENGTH * 0.5 + 0.005]}
          >
            <boxGeometry args={[0.13, 0.18, 0.02]} />
            <meshStandardMaterial color="#0c0c0e" metalness={0.7} roughness={0.4} />
          </mesh>
        ))}

        {/* Tail lights */}
        {[-0.5, 0.5].map((x, i) => (
          <mesh
            key={`tl-${i}`}
            position={[x, 0.05, -BODY_LENGTH * 0.5 - 0.005]}
          >
            <boxGeometry args={[0.45, 0.16, 0.02]} />
            <meshStandardMaterial
              color="#c8231e"
              emissive="#c8231e"
              emissiveIntensity={0.4}
              metalness={0.4}
              roughness={0.2}
            />
          </mesh>
        ))}

        {/* Side mirrors */}
        {[-1, 1].map((s) => (
          <mesh
            key={`mirror-${s}`}
            position={[(s * BODY_WIDTH) / 2 + s * 0.06, BODY_HEIGHT * 0.35, BODY_LENGTH * 0.18]}
          >
            <boxGeometry args={[0.08, 0.08, 0.12]} />
            <meshStandardMaterial color={paintColor} metalness={metallic ? 0.85 : 0.4} roughness={0.3} />
          </mesh>
        ))}

        {/* Decal overlay */}
        <BodyDecal
          stickerId={config.stickerId}
          bodyWidth={BODY_WIDTH}
          bodyHeight={BODY_HEIGHT}
          bodyLength={BODY_LENGTH}
        />
      </group>

      {/* === Wheels === */}
      {wheelPositions.map((pos, i) => (
        <Wheel
          key={`wheel-${i}-${config.wheelId}`}
          position={pos}
          wheelId={config.wheelId}
          isRight={i % 2 === 1}
        />
      ))}

      {/* === Exhaust === */}
      <ExhaustTip
        position={[0.45, 0.22 + config.rideHeight * 0.5, -BODY_LENGTH / 2 - 0.05]}
        exhaustId={config.exhaustId}
      />
    </group>
  );
}
