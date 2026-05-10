import {
  Environment,
  ContactShadows,
  MeshReflectorMaterial,
} from '@react-three/drei';
import type {
  EnvironmentPreset,
  LightSpec,
  ReflectionOverlay,
} from './environmentPresets';

/**
 * Scene environment block: HDRI panoramic background WITH ground
 * projection + image-based lighting + supplemental stage lights +
 * optional reflection overlay + contact shadows.
 *
 * The HDRI does quadruple duty:
 *   1. Panoramic background you see around the car.
 *   2. Image-based lighting source for body-paint reflections.
 *   3. Source for the ground-projected floor (drei's `<Environment ground>`
 *      re-projects the lower hemisphere onto a virtual flat surface so the
 *      car looks like it's sitting on the panorama floor — no seam).
 *   4. Source mirrored by the optional reflection overlay.
 *
 * No visible "floor plane" exists anymore. The HDRI ground IS the floor.
 */

interface SceneEnvironmentProps {
  preset: EnvironmentPreset;
}

export function SceneEnvironment({ preset }: SceneEnvironmentProps) {
  return (
    <>
      {/* Fog tints near-distance scene-local geometry (car, contact shadow,
          reflection overlay). It does NOT tint the HDRI background, which
          sits at infinity. Used sparingly — only city-night for atmosphere. */}
      {preset.fog && (
        <fog attach="fog" args={[preset.fog.color, preset.fog.near, preset.fog.far]} />
      )}

      <ambientLight intensity={preset.ambientIntensity} />
      {preset.lights.map((l, i) => (
        <PresetLight key={i} spec={l} />
      ))}

      {/* HDRI: background + IBL + GROUND PROJECTION. */}
      <Environment
        files={preset.hdriUrl}
        background
        ground={preset.ground}
      />

      {/* Optional reflection overlay — adds real-time car-in-floor
          reflections on top of the projected ground, for environments
          where the floor would naturally be glossy (showroom, wet asphalt,
          painted concrete). Kept small enough that its disc edge stays
          well under the car silhouette and doesn't break the seamless
          HDRI ground. */}
      {preset.reflectionOverlay && (
        <ReflectionDisc overlay={preset.reflectionOverlay} />
      )}

      {/* Contact shadow grounds the car visually regardless of floor mode. */}
      <ContactShadows
        position={[0, 0.005, 0]}
        opacity={preset.contactShadow.opacity}
        scale={20}
        blur={preset.contactShadow.blur}
        far={4}
        color={preset.contactShadow.color}
      />
    </>
  );
}

function ReflectionDisc({ overlay }: { overlay: ReflectionOverlay }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]}>
      <circleGeometry args={[overlay.radius, 64]} />
      <MeshReflectorMaterial
        mirror={overlay.mirrorMix}
        blur={[overlay.blurAmount, overlay.blurAmount]}
        resolution={1024}
        mixBlur={1.4}
        mixStrength={3.0}
        minDepthThreshold={0.85}
        maxDepthThreshold={1}
        depthScale={1.2}
        color={overlay.color}
        metalness={0.6}
        roughness={0.35}
        transparent
        opacity={overlay.opacity}
      />
    </mesh>
  );
}

function PresetLight({ spec }: { spec: LightSpec }) {
  switch (spec.type) {
    case 'spot':
      return (
        <spotLight
          position={spec.position}
          angle={spec.angle ?? 0.5}
          penumbra={spec.penumbra ?? 0.7}
          intensity={spec.intensity}
          color={spec.color}
          castShadow={spec.castShadow}
          shadow-mapSize={[1024, 1024]}
        />
      );
    case 'point':
      return (
        <pointLight
          position={spec.position}
          color={spec.color}
          intensity={spec.intensity}
        />
      );
    case 'directional':
      return (
        <directionalLight
          position={spec.position}
          color={spec.color}
          intensity={spec.intensity}
          castShadow={spec.castShadow}
          shadow-mapSize={[1024, 1024]}
        />
      );
  }
}
