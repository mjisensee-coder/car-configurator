import { Environment, ContactShadows } from '@react-three/drei';
import type { EnvironmentPreset, LightSpec } from './environmentPresets';

/**
 * Scene environment block: HDRI + lights + floor + contact shadows.
 *
 * Owned entirely by the active preset. Swap presets to swap the scene's
 * mood without touching the car or controls.
 */

interface SceneEnvironmentProps {
  preset: EnvironmentPreset;
}

export function SceneEnvironment({ preset }: SceneEnvironmentProps) {
  return (
    <>
      <color attach="background" args={[preset.background]} />
      {preset.fog && (
        <fog attach="fog" args={[preset.fog.color, preset.fog.near, preset.fog.far]} />
      )}

      <ambientLight intensity={preset.ambientIntensity} />
      {preset.lights.map((l, i) => (
        <PresetLight key={i} spec={l} />
      ))}

      <Environment files={preset.hdriUrl} background={false} />

      {/* Floor disc with optional sheen overlay for wet/glossy environments. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[14, 64]} />
        <meshStandardMaterial
          color={preset.ground.color}
          metalness={preset.ground.metalness}
          roughness={preset.ground.roughness}
        />
      </mesh>
      {preset.ground.sheen && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.0008, 0]}>
          <circleGeometry args={[14, 64]} />
          <meshPhysicalMaterial
            color={preset.ground.color}
            metalness={1}
            roughness={0.05}
            transparent
            opacity={0.35}
            clearcoat={1}
            clearcoatRoughness={0.05}
          />
        </mesh>
      )}
      {/* Subtle accent ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]}>
        <ringGeometry args={[3.4, 3.42, 64]} />
        <meshBasicMaterial color="#26262f" transparent opacity={0.4} />
      </mesh>

      <ContactShadows
        position={[0, 0.001, 0]}
        opacity={preset.contactShadow.opacity}
        scale={20}
        blur={preset.contactShadow.blur}
        far={4}
        color={preset.contactShadow.color}
      />
    </>
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
