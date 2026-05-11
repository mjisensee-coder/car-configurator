import { useMemo } from 'react';
import { type Color } from 'three';

/**
 * Parametric wheel generator.
 *
 * Drop-in replacement for the procedural <Wheel> component. Built so that
 * Gemini-driven wheel-style parameters can drive its appearance directly:
 * the AI returns { spokeCount, spokeStyle, color, finish } and the
 * configurator passes those straight through.
 *
 * Coordinate frame: spokes lie in the X-Y plane, rim disc faces +Z. The
 * caller's wheel-group Y-rotation will then orient the wheel correctly
 * for left/right placement.
 */

export type SpokeStyle =
  | 'thin-spoke'
  | 'thick-spoke'
  | 'split-spoke'
  | 'mesh'
  | 'multi-spoke'
  | 'dish'
  | 'turbine';

export type WheelFinish = 'chrome' | 'matte' | 'gloss' | 'gold' | 'bronze';

export interface ProceduralWheelSpec {
  /** Approximate diameter in inches; informational. We render at the standard tire radius. */
  diameterInches: number;
  /** Wheel face style. Drives spoke geometry. */
  spokeStyle: SpokeStyle;
  /** Number of spokes. Clamped to a sensible range per style. */
  spokeCount: number;
  /** Hex color of the rim face. */
  color: string;
  /** Finish hint — drives metalness/roughness. */
  finish: WheelFinish;
}

export interface ProceduralWheelProps {
  position: [number, number, number];
  isRight: boolean;
  spec: ProceduralWheelSpec;
}

const TIRE_RADIUS = 0.34;
const TIRE_WIDTH = 0.22;
const RIM_RADIUS = TIRE_RADIUS * 0.74;

export function ProceduralWheel({ position, isRight, spec }: ProceduralWheelProps) {
  const finish = useMemo(() => finishProps(spec.finish), [spec.finish]);
  const spokeCount = clampSpokeCount(spec.spokeStyle, spec.spokeCount);

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

      {/* Tire sidewall pattern */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}>
        <torusGeometry args={[TIRE_RADIUS * 0.95, 0.02, 6, 32]} />
        <meshStandardMaterial color="#16161a" roughness={0.9} />
      </mesh>

      {/* Inner barrel — a slightly recessed cylinder behind the rim face.
          Gives a hint of "depth" when the wheel is viewed at any angle. */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.05]}>
        <cylinderGeometry args={[RIM_RADIUS * 0.92, RIM_RADIUS * 0.92, 0.14, 32]} />
        <meshStandardMaterial color="#1a1a1f" roughness={0.7} metalness={0.6} />
      </mesh>

      {/* Rim face */}
      <group position={[0, 0, 0.115]}>
        {/* Stepped outer lip — three rings of decreasing radius for the
            classic BBS-RS "split lip" look. Always present (even on dish
            and turbine styles) since real alloy wheels have lip depth. */}
        <mesh position={[0, 0, 0.005]}>
          <torusGeometry args={[RIM_RADIUS * 1.06, 0.022, 12, 48]} />
          <meshStandardMaterial color={accentLip(spec.finish)} metalness={1} roughness={0.04} />
        </mesh>
        <mesh position={[0, 0, -0.012]}>
          <torusGeometry args={[RIM_RADIUS * 1.04, 0.018, 12, 48]} />
          <meshStandardMaterial color={accentLip(spec.finish)} metalness={1} roughness={0.08} />
        </mesh>
        <mesh position={[0, 0, -0.028]}>
          <torusGeometry args={[RIM_RADIUS * 1.02, 0.014, 12, 48]} />
          <meshStandardMaterial color="#777a82" metalness={0.85} roughness={0.18} />
        </mesh>

        {/* Back-plate disc (filled rim color) */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[RIM_RADIUS, RIM_RADIUS, 0.04, 32]} />
          <meshStandardMaterial
            color={spec.color as Color | string}
            metalness={finish.metalness}
            roughness={finish.roughness}
          />
        </mesh>

        {/* Spoke pattern */}
        <Spokes
          style={spec.spokeStyle}
          count={spokeCount}
          radius={RIM_RADIUS}
          color={spec.color}
          finish={finish}
        />

        {/* Five lug bolts arranged around the center cap (5x100 / 5x120
            convention — standard for the BMW chassis we render). */}
        {Array.from({ length: 5 }).map((_, i) => {
          const angle = (i / 5) * Math.PI * 2;
          const r = 0.075;
          return (
            <mesh
              key={`lug-${i}`}
              position={[Math.cos(angle) * r, Math.sin(angle) * r, 0.018]}
              rotation={[Math.PI / 2, 0, 0]}
            >
              <cylinderGeometry args={[0.011, 0.011, 0.012, 8]} />
              <meshStandardMaterial color="#15161a" metalness={0.7} roughness={0.45} />
            </mesh>
          );
        })}

        {/* Center cap with embossed-ring detail */}
        <mesh position={[0, 0, 0.022]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.048, 0.048, 0.012, 24]} />
          <meshStandardMaterial color="#0a4d8a" metalness={0.7} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0, 0.029]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.05, 0.005, 8, 24]} />
          <meshStandardMaterial color="#dde2e8" metalness={1} roughness={0.1} />
        </mesh>
      </group>
    </group>
  );
}

// =====================================================================
// Spoke renderers
// =====================================================================

function Spokes({
  style,
  count,
  radius,
  color,
  finish,
}: {
  style: SpokeStyle;
  count: number;
  radius: number;
  color: string;
  finish: { metalness: number; roughness: number };
}) {
  const items = Array.from({ length: count });
  const material = (
    <meshStandardMaterial
      color={color as Color | string}
      metalness={finish.metalness}
      roughness={finish.roughness}
    />
  );

  switch (style) {
    case 'thin-spoke':
      return (
        <>
          {items.map((_, i) => {
            const angle = (i / count) * Math.PI * 2;
            return (
              <mesh
                key={i}
                rotation={[0, 0, angle]}
                position={[0, 0, 0.005]}
              >
                <boxGeometry args={[radius * 1.85, 0.025, 0.05]} />
                {material}
              </mesh>
            );
          })}
        </>
      );

    case 'thick-spoke':
      return (
        <>
          {items.map((_, i) => {
            const angle = (i / count) * Math.PI * 2;
            return (
              <mesh
                key={i}
                rotation={[0, 0, angle]}
                position={[0, 0, 0.005]}
              >
                <boxGeometry args={[radius * 1.85, 0.075, 0.06]} />
                {material}
              </mesh>
            );
          })}
        </>
      );

    case 'split-spoke':
      return (
        <>
          {items.map((_, i) => {
            const angle = (i / count) * Math.PI * 2;
            return (
              <group key={i} rotation={[0, 0, angle]} position={[0, 0, 0.005]}>
                <mesh position={[radius * 0.45, 0.022, 0]} rotation={[0, 0, 0.07]}>
                  <boxGeometry args={[radius * 1.7, 0.022, 0.05]} />
                  {material}
                </mesh>
                <mesh position={[radius * 0.45, -0.022, 0]} rotation={[0, 0, -0.07]}>
                  <boxGeometry args={[radius * 1.7, 0.022, 0.05]} />
                  {material}
                </mesh>
              </group>
            );
          })}
        </>
      );

    case 'mesh':
      // BBS-style mesh: many thin crossing spokes.
      return (
        <>
          {items.map((_, i) => {
            const angle = (i / count) * Math.PI * 2;
            return (
              <mesh
                key={i}
                rotation={[0, 0, angle]}
                position={[0, 0, 0.005]}
              >
                <boxGeometry args={[radius * 1.85, 0.022, 0.05]} />
                {material}
              </mesh>
            );
          })}
        </>
      );

    case 'multi-spoke':
      return (
        <>
          {items.map((_, i) => {
            const angle = (i / count) * Math.PI * 2;
            return (
              <mesh
                key={i}
                rotation={[0, 0, angle]}
                position={[0, 0, 0.005]}
              >
                <boxGeometry args={[radius * 1.85, 0.04, 0.055]} />
                {material}
              </mesh>
            );
          })}
        </>
      );

    case 'dish':
      // Solid dish with shallow groove rings.
      return (
        <>
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.012]}>
            <cylinderGeometry args={[radius * 0.95, radius * 0.7, 0.03, 32]} />
            {material}
          </mesh>
          <mesh>
            <torusGeometry args={[radius * 0.55, 0.012, 8, 32]} />
            <meshStandardMaterial color="#0a0a0c" metalness={0.4} roughness={0.6} />
          </mesh>
        </>
      );

    case 'turbine':
      // Curved turbine blades. Approximate with rotated wedges.
      return (
        <>
          {items.map((_, i) => {
            const angle = (i / count) * Math.PI * 2;
            return (
              <mesh
                key={i}
                rotation={[0, 0, angle]}
                position={[radius * 0.4, 0, 0.005]}
              >
                <boxGeometry args={[radius * 1.05, 0.06, 0.06]} />
                {material}
              </mesh>
            );
          })}
        </>
      );
  }
}

// =====================================================================
// Helpers
// =====================================================================

function clampSpokeCount(style: SpokeStyle, count: number): number {
  // Per-style sane defaults. AI can be wrong about counts.
  const ranges: Record<SpokeStyle, [number, number]> = {
    'thin-spoke': [4, 8],
    'thick-spoke': [4, 6],
    'split-spoke': [4, 6],
    mesh: [10, 20],
    'multi-spoke': [8, 12],
    dish: [1, 1],
    turbine: [5, 9],
  };
  const [min, max] = ranges[style];
  if (!Number.isFinite(count)) return Math.round((min + max) / 2);
  return Math.max(min, Math.min(max, Math.round(count)));
}

function finishProps(finish: WheelFinish): { metalness: number; roughness: number } {
  switch (finish) {
    case 'chrome':
      return { metalness: 1, roughness: 0.05 };
    case 'gold':
      return { metalness: 0.95, roughness: 0.18 };
    case 'bronze':
      return { metalness: 0.9, roughness: 0.25 };
    case 'gloss':
      return { metalness: 0.85, roughness: 0.2 };
    case 'matte':
      return { metalness: 0.3, roughness: 0.7 };
    default:
      return { metalness: 0.85, roughness: 0.25 };
  }
}

function accentLip(finish: WheelFinish): string {
  if (finish === 'gold' || finish === 'bronze') return '#dde2e8';
  if (finish === 'chrome') return '#f0f3f7';
  return '#c8ccd1';
}
