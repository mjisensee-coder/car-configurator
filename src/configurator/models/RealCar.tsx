import { useEffect, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import {
  Box3,
  MeshStandardMaterial,
  Vector3,
  type Mesh,
  type Object3D,
} from 'three';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { Wheel } from '../parts/Wheel';
import { ExhaustTip } from '../parts/ExhaustTip';
import { getPartById } from '@/services/partsService';
import type { CarConfig } from '@/types';

/**
 * Real BMW M3 E30 GLB integration.
 *
 * Model: "BMW M3 E30" by Artem P (https://sketchfab.com/temp0.crazy)
 * License: CC BY 4.0 — https://creativecommons.org/licenses/by/4.0/
 *
 * Architecture:
 *   - Body, bumpers, lights, glass, badges → come from the GLB.
 *   - Wheels (4) → hidden in the GLB; replaced with our procedural <Wheel>
 *     components anchored at the GLB's original wheel-hub positions, so the
 *     wheel-style swap UX still drives geometry (BBS RS / Ronal LSI / etc.).
 *   - Exhaust → hidden in the GLB; replaced with our procedural <ExhaustTip>
 *     so style swaps work.
 *   - Side decals (BodyDecal) are NOT applied on the real model — flat planes
 *     don't conform to the curved body. This is a v2 task (use DecalGeometry
 *     against the side panels' meshes).
 *
 * Paint swap mutates the single `body` material's color in place. All 24 body
 * panels share that material so a single mutation recolors the whole car.
 */

const MODEL_URL = '/models/e30/scene.gltf';

useGLTF.preload(MODEL_URL);

/**
 * Names of subtrees to hide in the GLB. Each pattern matches the *parent*
 * group; everything underneath gets `visible = false`. Keeps the wheel arches
 * empty so our procedural wheels can sit there.
 *
 * `exhaust` is hidden so our <ExhaustTip> can swap by style.
 * `Plane` and `Sphere` are the asphalt/skybox helpers from the original
 * Sketchfab scene — we have our own scene lighting/floor.
 */
const HIDDEN_GROUPS =
  /^(wheel_rb|Rays_TE37|BrakeDisc|Brakedisc|tire_cap|caliper_rb|Bolts|Axle|suspention|exhaust|Plane|Sphere)(\.\d+)?$/;

/** Pattern matching the four wheel-hub anchor nodes (used to position our procedural wheels). */
const WHEEL_ANCHOR = /^wheel_rb(\.\d+)?$/;

/** Target body length in scene units (real E30 is 4.32m; we render at 1 unit ≈ 1m). */
const TARGET_LENGTH = 4.32;

/** Lift the chassis off the ground by this much before applying ride-height. Tuned by eye. */
const CHASSIS_BASE_Y = 0.20;

/** Y of procedural wheel centers (matches Wheel.tsx tire radius). */
const WHEEL_CENTER_Y = 0.34;

interface RealCarProps {
  config: CarConfig;
}

export function RealCar({ config }: RealCarProps) {
  const { scene } = useGLTF(MODEL_URL);

  // Clone the scene so material mutations don't leak across the global drei cache.
  // SkeletonUtils.clone preserves the hierarchy and is safe even for non-skinned models.
  const cloned = useMemo(() => cloneSkeleton(scene), [scene]);

  // Walk the cloned scene once: collect the body material, capture wheel +
  // exhaust anchors, hide everything we want to replace.
  type Setup = {
    bodyMaterial: MeshStandardMaterial | null;
    scale: number;
    yLift: number;
    wheelAnchors: { x: number; z: number; name: string }[];
    exhaustPos: Vector3;
  };
  const setup: Setup = useMemo<Setup>(() => {
    let bodyMaterial: MeshStandardMaterial | null = null;
    const rawWheelAnchors: { x: number; z: number; name: string }[] = [];
    const rawExhaustPos = new Vector3(0, 0, 0);
    let exhaustFound = false;

    cloned.updateMatrixWorld(true);
    cloned.traverse((obj: Object3D) => {
      // Capture wheel anchors (in cloned-local world space) BEFORE hiding.
      if (WHEEL_ANCHOR.test(obj.name)) {
        const p = new Vector3();
        obj.getWorldPosition(p);
        rawWheelAnchors.push({ x: p.x, z: p.z, name: obj.name });
      }

      if (obj.name === 'exhaust') {
        const p = new Vector3();
        obj.getWorldPosition(p);
        rawExhaustPos.copy(p);
        exhaustFound = true;
      }

      // Find the shared "body" material on the first body mesh we encounter,
      // then clone it so paint mutations don't bleed into the cached source.
      const mesh = obj as Mesh;
      if (mesh.isMesh && mesh.material && !Array.isArray(mesh.material)) {
        const mat = mesh.material as MeshStandardMaterial;
        if (mat.name === 'body') {
          if (!bodyMaterial) {
            bodyMaterial = mat.clone();
            bodyMaterial.name = 'body';
          }
          // Reassign every body-paneled mesh to the same cloned material.
          mesh.material = bodyMaterial;
        }
      }
    });

    // Hide replaced subtrees AFTER capturing anchors + materials.
    cloned.traverse((obj: Object3D) => {
      if (HIDDEN_GROUPS.test(obj.name)) {
        obj.visible = false;
      }
    });

    // Compute uniform scale from the bounding box of *visible* geometry.
    const box = new Box3().setFromObject(cloned);
    const size = box.getSize(new Vector3());
    // Car axis is whichever of X/Z is longer (after Sketchfab's root rotation, Z).
    const longAxis = Math.max(size.x, size.z);
    const scale = longAxis > 0 ? TARGET_LENGTH / longAxis : 1;

    // After scaling, where does the chassis bottom sit? We want it lifted to
    // CHASSIS_BASE_Y so the procedural wheels poke out below.
    const scaledMinY = box.min.y * scale;
    const yLift = CHASSIS_BASE_Y - scaledMinY;

    // Sort anchors deterministically: by X (-x left, +x right), then Z (+z front, -z rear).
    rawWheelAnchors.sort((a, b) =>
      a.x === b.x ? b.z - a.z : a.x - b.x,
    );

    // Scale anchors to match the rest of the car.
    const wheelAnchors = rawWheelAnchors.map((a) => ({
      x: a.x * scale,
      z: a.z * scale,
      name: a.name,
    }));

    const exhaustPos = exhaustFound
      ? new Vector3(rawExhaustPos.x * scale, WHEEL_CENTER_Y * 0.7, rawExhaustPos.z * scale)
      : new Vector3(0.45, 0.22, -2.1);

    return { bodyMaterial, scale, yLift, wheelAnchors, exhaustPos };
  }, [cloned]);

  // Apply paint color whenever the selection changes.
  useEffect(() => {
    if (!setup.bodyMaterial) return;
    const part = getPartById(config.paintId);
    const hex = (part?.renderHint?.hex as string) ?? '#f1f3f4';
    const metallic = ((part?.renderHint?.metallic as number) ?? 0) > 0;
    setup.bodyMaterial.color.set(hex);
    setup.bodyMaterial.metalness = metallic ? 0.85 : 0.45;
    setup.bodyMaterial.roughness = metallic ? 0.28 : 0.4;
    setup.bodyMaterial.needsUpdate = true;
  }, [config.paintId, setup.bodyMaterial]);

  const bodyY = setup.yLift + config.rideHeight;

  return (
    <>
      {/* Body — the GLB at our normalized scale and ride-height-driven Y */}
      <group position={[0, bodyY, 0]} scale={setup.scale}>
        <primitive object={cloned} />
      </group>

      {/* Procedural wheels at the captured GLB anchor X/Z, fixed at ground-clearing Y */}
      {setup.wheelAnchors.map((a, i) => (
        <Wheel
          key={`wheel-${i}-${config.wheelId}`}
          position={[a.x, WHEEL_CENTER_Y, a.z]}
          wheelId={config.wheelId}
          isRight={a.x > 0}
        />
      ))}

      {/* Procedural exhaust tip behind the rear bumper */}
      <ExhaustTip
        position={[
          setup.exhaustPos.x !== 0 ? setup.exhaustPos.x : 0.45,
          0.22 + config.rideHeight * 0.5,
          setup.exhaustPos.z,
        ]}
        exhaustId={config.exhaustId}
      />
    </>
  );
}
