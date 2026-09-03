import { useEffect } from 'react';
import { ClampToEdgeWrapping, LinearFilter, type Texture } from 'three';
import { useKTX2 } from '@react-three/drei';
import { BASIS_TRANSCODER_PATH, FLOOR_MASK } from './assets';

/**
 * Loads the floor falloff mask as a KTX2 texture.
 *
 * Clamped rather than repeated: the mask is a single radial gradient
 * covering the whole floor plane, so a repeat wrap would tile visible
 * bright discs across it.
 */
export function useFloorMask(): Texture {
  const texture = useKTX2(FLOOR_MASK, BASIS_TRANSCODER_PATH) as Texture;

  useEffect(() => {
    texture.wrapS = ClampToEdgeWrapping;
    texture.wrapT = ClampToEdgeWrapping;
    texture.minFilter = LinearFilter;
    texture.magFilter = LinearFilter;
    // The file ships a single mip level; asking three to sample a mip
    // chain that is not there renders the floor black.
    texture.generateMipmaps = false;
    texture.needsUpdate = true;
  }, [texture]);

  return texture;
}

useFloorMask.preload = () => useKTX2.preload(FLOOR_MASK, BASIS_TRANSCODER_PATH);
