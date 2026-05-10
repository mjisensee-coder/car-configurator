import { useMemo } from 'react';
import type { StickerId } from '@/types';
import { buildStickerTexture } from './stickerTexture';

interface BodyDecalProps {
  stickerId: StickerId;
  bodyWidth: number;
  bodyHeight: number;
  bodyLength: number;
}

/**
 * Side-stripe decal applied as a textured plane on each side of the car.
 *
 * To swap to a real DecalGeometry against a GLB body mesh, change the
 * placement here to use THREE.DecalGeometry with the body mesh as target;
 * the `stickerId` -> texture mapping below stays the same.
 */
export function BodyDecal({
  stickerId,
  bodyWidth,
  bodyHeight,
  bodyLength,
}: BodyDecalProps) {
  const texture = useMemo(() => buildStickerTexture(stickerId), [stickerId]);
  if (!texture || stickerId === 'none') return null;

  return (
    <>
      {[-1, 1].map((side) => (
        <mesh
          key={`decal-${side}`}
          position={[(side * bodyWidth) / 2 + side * 0.012, -bodyHeight * 0.05, 0]}
          rotation={[0, side === 1 ? -Math.PI / 2 : Math.PI / 2, 0]}
        >
          <planeGeometry args={[bodyLength * 0.85, bodyHeight * 0.45]} />
          <meshStandardMaterial
            map={texture}
            transparent
            roughness={0.45}
            metalness={0.1}
            depthWrite={false}
          />
        </mesh>
      ))}
    </>
  );
}

