import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import {
  EquirectangularReflectionMapping,
  PMREMGenerator,
  type Texture,
} from 'three';
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js';

/**
 * Applies a baked equirectangular HDR as the scene's image-based light.
 *
 * Why not drei's <Environment files=...>: that component resolves the file
 * through useLoader, so the whole scene subtree — including every light in
 * it — stays suspended until the map is ready, and any hiccup in that
 * suspense path leaves the studio stuck on its loading fallback with an
 * unlit car. Here the map is loaded in an effect and attached when it
 * arrives, so the scene renders immediately and simply gains its
 * reflections a moment later.
 *
 * The environment is pre-filtered with PMREMGenerator, which is what makes
 * a rough material sample a blurred version of the map rather than a
 * mirror of it.
 */
export function BakedEnvironment({
  file,
  background = false,
  intensity = 1,
}: {
  file: string;
  /** Also draw the map behind the scene, not just light with it. */
  background?: boolean;
  /** Scales the IBL contribution without re-baking the file. */
  intensity?: number;
}) {
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);

  useEffect(() => {
    let cancelled = false;
    let generated: Texture | null = null;

    const pmrem = new PMREMGenerator(gl);
    // Compiling the equirect shader up front keeps the first frame after
    // load from stalling on shader compilation.
    pmrem.compileEquirectangularShader();

    new HDRLoader().load(
      file,
      (texture) => {
        if (cancelled) {
          texture.dispose();
          pmrem.dispose();
          return;
        }
        texture.mapping = EquirectangularReflectionMapping;
        generated = pmrem.fromEquirectangular(texture).texture;
        scene.environment = generated;
        scene.environmentIntensity = intensity;
        if (background) {
          scene.background = generated;
          scene.backgroundIntensity = intensity;
        }
        // The source equirect is no longer needed once it is pre-filtered.
        texture.dispose();
        pmrem.dispose();
      },
      undefined,
      (err) => {
        console.error(`[BakedEnvironment] failed to load ${file}`, err);
        pmrem.dispose();
      },
    );

    return () => {
      cancelled = true;
      if (scene.environment === generated) scene.environment = null;
      if (background && scene.background === generated) scene.background = null;
      generated?.dispose();
    };
  }, [file, background, intensity, gl, scene]);

  return null;
}
