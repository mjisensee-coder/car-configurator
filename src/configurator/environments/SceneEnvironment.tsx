import {
  Environment,
  ContactShadows,
  MeshReflectorMaterial,
} from '@react-three/drei';
import type { EnvironmentPreset, FloorSpec, LightSpec } from './environmentPresets';

/**
 * Scene environment block: HDRI panoramic background + image-based
 * lighting + supplemental stage lights + floor + contact shadows.
 *
 * The HDRI does triple duty: it's the panoramic background you see
 * around the car AND the image-based lighting source that drives
 * realistic reflections on the body paint AND the source the floor
 * mirrors back via MeshReflectorMaterial.
 *
 * Owned entirely by the active preset. Swap presets to swap the
 * scene's location without touching the car or controls.
 */

interface SceneEnvironmentProps {
  preset: EnvironmentPreset;
}

export function SceneEnvironment({ preset }: SceneEnvironmentProps) {
  return (
    <>
      {/* No solid <color> background — the HDRI is the background. */}

      {/* Fog tints the car/floor near-distance for atmospheric environments
          (city-night). It does NOT tint the HDRI background, which sits
          at infinity. */}
      {preset.fog && (
        <fog attach="fog" args={[preset.fog.color, preset.fog.near, preset.fog.far]} />
      )}

      <ambientLight intensity={preset.ambientIntensity} />
      {preset.lights.map((l, i) => (
        <PresetLight key={i} spec={l} />
      ))}

      {/* HDRI as panoramic background AND image-based lighting source. */}
      <Environment files={preset.hdriUrl} background blur={0} />

      {/* Floor: real reflections via MeshReflectorMaterial for glossy
          environments, flat PBR for matte ones (asphalt road). */}
      <Floor floor={preset.floor} />

      {/* Contact shadow under the car — grounds it visually regardless
          of floor mode. Sits a hair above the floor to avoid Z-fighting
          with the reflector material. */}
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

function Floor({ floor }: { floor: FloorSpec }) {
  // 60×60 plane is large enough that its edge sits well below the
  // horizon line of the HDRI for any allowed camera angle, so the
  // transition is invisible.
  const COMMON = (
    <planeGeometry args={[60, 60]} />
  );

  if (floor.mode === 'reflector') {
    return (
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        {COMMON}
        <MeshReflectorMaterial
          mirror={floor.mirrorMix ?? 0.5}
          blur={[floor.blurAmount ?? 200, floor.blurAmount ?? 200]}
          resolution={1024}
          mixBlur={1.4}
          mixStrength={3.5}
          minDepthThreshold={0.85}
          maxDepthThreshold={1}
          depthScale={1.2}
          color={floor.color}
          metalness={floor.metalness}
          roughness={floor.roughness}
        />
      </mesh>
    );
  }

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      {COMMON}
      <meshStandardMaterial
        color={floor.color}
        metalness={floor.metalness}
        roughness={floor.roughness}
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
