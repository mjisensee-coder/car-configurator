import { Lightformer } from '@react-three/drei';

/**
 * Shared building blocks for the procedural showroom scenes.
 *
 * A 3D room here is just: floor (rendered by each scene with its own
 * material) + four wall boxes + a ceiling box. The walls are rectangular
 * boxes facing inward — using `<boxGeometry>` instead of planes means we
 * automatically get back-face culling, so when the camera dollies past a
 * wall, the wall disappears and the camera sees the scene background.
 *
 * Lightformer ceiling strips are the visual signature of a car-show
 * environment. They're long thin emissive rectangles mounted overhead,
 * baked into the IBL probe via drei's `<Environment>` so the car body's
 * paint reflects them as horizontal streaks. This is THE element that
 * makes a real-time scene feel like a magazine shot.
 */

interface RoomShellProps {
  /** Inside dimensions: width (X), depth (Z), height (Y). */
  width: number;
  depth: number;
  height: number;
  /** Hex color for walls + ceiling. */
  wallColor: string;
  ceilingColor?: string;
  /** Wall thickness — visible from outside if camera dollies through. */
  thickness?: number;
}

/**
 * Inward-facing room shell — four walls + ceiling. Floor is left to the
 * caller (each scene picks its own material).
 */
export function RoomShell({
  width,
  depth,
  height,
  wallColor,
  ceilingColor = wallColor,
  thickness = 0.4,
}: RoomShellProps) {
  const halfW = width / 2;
  const halfD = depth / 2;

  return (
    <group>
      {/* Back wall (-Z) */}
      <mesh position={[0, height / 2, -halfD]} receiveShadow>
        <boxGeometry args={[width + thickness * 2, height, thickness]} />
        <meshStandardMaterial color={wallColor} roughness={0.8} metalness={0.1} />
      </mesh>
      {/* Front wall (+Z) */}
      <mesh position={[0, height / 2, halfD]} receiveShadow>
        <boxGeometry args={[width + thickness * 2, height, thickness]} />
        <meshStandardMaterial color={wallColor} roughness={0.8} metalness={0.1} />
      </mesh>
      {/* Left wall (-X) */}
      <mesh position={[-halfW, height / 2, 0]} receiveShadow>
        <boxGeometry args={[thickness, height, depth]} />
        <meshStandardMaterial color={wallColor} roughness={0.8} metalness={0.1} />
      </mesh>
      {/* Right wall (+X) */}
      <mesh position={[halfW, height / 2, 0]} receiveShadow>
        <boxGeometry args={[thickness, height, depth]} />
        <meshStandardMaterial color={wallColor} roughness={0.8} metalness={0.1} />
      </mesh>

      {/* Ceiling */}
      <mesh position={[0, height, 0]} receiveShadow>
        <boxGeometry args={[width + thickness * 2, thickness, depth + thickness * 2]} />
        <meshStandardMaterial color={ceilingColor} roughness={0.85} metalness={0.05} />
      </mesh>
    </group>
  );
}

/**
 * A row of horizontal Lightformer strips across the ceiling. These are
 * what produce the signature horizontal highlights on the car body.
 *
 * Place these as children of an `<Environment>` so they get baked into
 * the IBL probe — that's how the car paint actually picks them up as
 * mirror-quality reflections.
 */
interface CeilingStripsProps {
  /** Y position of the strips (just below the ceiling). */
  height: number;
  /** Length along X axis (how long each strip runs). */
  length: number;
  /** Strip thickness (Z) — slim. */
  thickness: number;
  /** Number of parallel strips, evenly spaced along Z. */
  count: number;
  /** Total Z spread of the rows. */
  spread: number;
  color: string;
  intensity: number;
}

export function CeilingStrips({
  height,
  length,
  thickness,
  count,
  spread,
  color,
  intensity,
}: CeilingStripsProps) {
  const items = Array.from({ length: count }, (_, i) => {
    const t = count === 1 ? 0.5 : i / (count - 1);
    const z = (t - 0.5) * spread;
    return { z, key: i };
  });
  return (
    <>
      {items.map(({ z, key }) => (
        <Lightformer
          key={key}
          form="rect"
          position={[0, height, z]}
          rotation={[-Math.PI / 2, 0, 0]}
          scale={[length, thickness, 1]}
          color={color}
          intensity={intensity}
          target={[0, 0, z]}
        />
      ))}
    </>
  );
}

/**
 * Random tool-cabinet silhouettes along one wall. Adds parallax depth
 * without needing detailed models — silhouettes do the work.
 */
interface ToolCabinetsProps {
  /** Wall plane to mount on: 'left' (-X), 'right' (+X), 'back' (-Z). */
  wall: 'left' | 'right' | 'back';
  /** Inside-room half-width (X) or half-depth (Z) the wall sits on. */
  wallOffset: number;
  /** Color of the cabinet boxes. */
  color: string;
  /** How many cabinets. */
  count?: number;
}

export function ToolCabinets({
  wall,
  wallOffset,
  color,
  count = 4,
}: ToolCabinetsProps) {
  return (
    <group>
      {Array.from({ length: count }).map((_, i) => {
        // Deterministic but-varied size per slot
        const slot = i / count;
        const w = 1.0 + ((i * 37) % 5) * 0.15;
        const h = 1.4 + ((i * 53) % 4) * 0.25;
        const d = 0.6 + ((i * 29) % 3) * 0.1;
        const tPos = (slot - 0.5 + 0.5 / count) * 8; // along the wall
        let pos: [number, number, number];
        if (wall === 'left') pos = [-wallOffset + d / 2 + 0.05, h / 2, tPos];
        else if (wall === 'right') pos = [wallOffset - d / 2 - 0.05, h / 2, tPos];
        else pos = [tPos, h / 2, -wallOffset + d / 2 + 0.05];

        return (
          <mesh key={i} position={pos} castShadow receiveShadow>
            <boxGeometry args={[w, h, d]} />
            <meshStandardMaterial color={color} roughness={0.7} metalness={0.2} />
          </mesh>
        );
      })}
    </group>
  );
}
