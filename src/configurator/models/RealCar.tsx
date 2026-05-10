import { useEffect, useMemo, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import {
  Box3,
  Euler,
  Mesh,
  MeshStandardMaterial,
  Vector3,
  type Object3D,
} from 'three';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { DecalGeometry } from 'three/examples/jsm/geometries/DecalGeometry.js';
import { Wheel } from '../parts/Wheel';
import { ExhaustTip } from '../parts/ExhaustTip';
import { buildStickerTexture } from '../parts/stickerTexture';
import { getPartById } from '@/services/partsService';
import type { CarConfig } from '@/types';

/**
 * Real BMW M3 E30 GLB integration.
 *
 * Model: "BMW M3 E30" by Artem P (https://sketchfab.com/temp0.crazy)
 * License: CC BY 4.0 — https://creativecommons.org/licenses/by/4.0/
 * Asset: /public/models/e30.glb — meshopt-compressed + WebP textures
 * (originally 27MB multi-file glTF, now a single 2.7MB GLB).
 *
 * Architecture:
 *   - Body, bumpers, lights, glass, badges → come from the GLB.
 *   - Wheels (4) → removed from the GLB; replaced with our procedural <Wheel>
 *     components anchored at the GLB's original wheel-hub positions, so the
 *     wheel-style swap UX still drives geometry (BBS RS / Ronal LSI / etc.).
 *   - Exhaust → removed from the GLB; replaced with our procedural <ExhaustTip>
 *     so style swaps work.
 *   - Side decals → applied via THREE.DecalGeometry projected onto the side
 *     body meshes (see <RealCarDecal>).
 *
 * Paint swap mutates the single `body` material's color in place. All body
 * panels share that material so one mutation recolors the whole car.
 *
 * IMPORTANT: we *remove* hidden subtrees rather than setting `visible=false`,
 * because Box3.setFromObject does not respect the visible flag and would
 * include the asphalt Plane / skybox Sphere in our auto-scale calculation.
 */

const MODEL_URL = '/models/e30.glb';

// Meshopt-compressed GLB. Drei's useGLTF auto-loads the meshopt decoder when
// the third argument is `true`. Compression took the asset from 27MB → 2.7MB.
useGLTF.preload(MODEL_URL, true, true);

/**
 * Names of subtrees to hide in the GLB. Each pattern matches the *parent*
 * group; everything underneath gets `visible = false`. Keeps the wheel arches
 * empty so our procedural wheels can sit there.
 *
 * `exhaust` is hidden so our <ExhaustTip> can swap by style.
 * `Plane` and `Sphere` are the asphalt/skybox helpers from the original
 * Sketchfab scene — we have our own scene lighting/floor.
 */
/**
 * Note the underscore-N variant (BrakeDisc_1, Brakedisc_2) — Blender appends
 * `_<digit>` for original meshes and `.001` for the duplicates. We need both.
 */
const HIDDEN_GROUPS =
  /^(wheel_rb|Rays_TE37|BrakeDisc_\d+|Brakedisc_\d+|tire_cap|caliper_rb|Bolts|Axle|suspention|exhaust|Plane|Sphere)(\.\d+)?$/;

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
  const { scene } = useGLTF(MODEL_URL, true, true);

  // Clone the scene so material mutations don't leak across the global drei cache.
  // SkeletonUtils.clone preserves the hierarchy and is safe even for non-skinned models.
  const cloned = useMemo(() => cloneSkeleton(scene), [scene]);

  // Walk the cloned scene once: collect the body material, capture wheel +
  // exhaust anchors, hide everything we want to replace.
  type Setup = {
    bodyMaterial: MeshStandardMaterial | null;
    bodyMeshes: Mesh[];
    scale: number;
    yLift: number;
    wheelAnchors: { x: number; z: number; name: string }[];
    exhaustPos: Vector3;
    bodyBox: Box3;
  };
  const setup: Setup = useMemo<Setup>(() => {
    let bodyMaterial: MeshStandardMaterial | null = null;
    const bodyMeshes: Mesh[] = [];
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
      // Also collect every body-material mesh — we need them later as decal
      // projection targets.
      const mesh = obj as Mesh;
      if (mesh.isMesh && mesh.material && !Array.isArray(mesh.material)) {
        const mat = mesh.material as MeshStandardMaterial;
        if (mat.name === 'body') {
          if (!bodyMaterial) {
            bodyMaterial = mat.clone();
            bodyMaterial.name = 'body';
          }
          mesh.material = bodyMaterial;
          bodyMeshes.push(mesh);
        }
      }
    });

    // Detach replaced subtrees AFTER capturing anchors + materials.
    // Important: we *remove* them, not just `visible = false`. Box3.setFromObject
    // does not respect the visible flag, so leaving the asphalt Plane and skybox
    // Sphere in the tree would massively skew our auto-scale calculation.
    const toRemove: Object3D[] = [];
    cloned.traverse((obj: Object3D) => {
      if (HIDDEN_GROUPS.test(obj.name)) {
        toRemove.push(obj);
      }
    });
    toRemove.forEach((obj) => obj.parent?.remove(obj));

    // Compute uniform scale from the bounding box of remaining (body-only) geometry.
    const box = new Box3().setFromObject(cloned);
    const size = box.getSize(new Vector3());
    // Car axis is whichever of X/Z is longer (after Sketchfab's root rotation, Z).
    const longAxis = Math.max(size.x, size.z);
    const scale = longAxis > 0 ? TARGET_LENGTH / longAxis : 1;

    // After scaling, where does the chassis bottom sit? We want it lifted to
    // CHASSIS_BASE_Y so the procedural wheels poke out below.
    const scaledMinY = box.min.y * scale;
    const yLift = CHASSIS_BASE_Y - scaledMinY;

    // Group anchors into front/rear pairs by Z, then enforce within-pair X
    // symmetry (defensive — if the model has any tiny per-wheel offset the
    // result is still mirror-symmetric, and visual jitter is impossible).
    rawWheelAnchors.sort((a, b) => a.z - b.z);
    const half = rawWheelAnchors.length / 2;
    const symmetrize = (group: typeof rawWheelAnchors) => {
      const meanAbsX =
        group.reduce((s, a) => s + Math.abs(a.x), 0) / group.length;
      const meanZ = group.reduce((s, a) => s + a.z, 0) / group.length;
      return group.map((a) => ({
        x: Math.sign(a.x) * meanAbsX,
        z: meanZ,
        name: a.name,
      }));
    };
    const symAnchors = [
      ...symmetrize(rawWheelAnchors.slice(0, half)),
      ...symmetrize(rawWheelAnchors.slice(half)),
    ];

    // Scale anchors to match the rest of the car.
    const wheelAnchors = symAnchors.map((a) => ({
      x: a.x * scale,
      z: a.z * scale,
      name: a.name,
    }));

    const exhaustPos = exhaustFound
      ? new Vector3(rawExhaustPos.x * scale, WHEEL_CENTER_Y * 0.7, rawExhaustPos.z * scale)
      : new Vector3(0.45, 0.22, -2.1);

    return {
      bodyMaterial,
      bodyMeshes,
      scale,
      yLift,
      wheelAnchors,
      exhaustPos,
      bodyBox: box,
    };
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

  // Project sticker decals onto each body panel using THREE.DecalGeometry.
  // The projection volume spans the car laterally so both sides receive the
  // decal. Decals are added directly to the cloned scene tree (so they share
  // the body's transforms) and disposed/removed when the sticker changes.
  const decalMeshesRef = useRef<Mesh[]>([]);
  useEffect(() => {
    // Always clean up previous decals first.
    decalMeshesRef.current.forEach((m) => {
      cloned.remove(m);
      m.geometry.dispose();
      (m.material as MeshStandardMaterial).dispose();
    });
    decalMeshesRef.current = [];

    if (config.stickerId === 'none') return;
    const tex = buildStickerTexture(config.stickerId);
    if (!tex || setup.bodyMeshes.length === 0) return;

    cloned.updateMatrixWorld(true);
    const box = setup.bodyBox;
    const sizeX = box.max.x - box.min.x;
    const sizeZ = box.max.z - box.min.z;

    // Projection center: roughly mid-height of the body, mid-length, on
    // the centerline. Lower 5cm so the stripe sits on the door panels rather
    // than the greenhouse.
    const center = new Vector3(
      (box.min.x + box.max.x) / 2,
      (box.min.y + box.max.y) / 2 - 0.1,
      (box.min.z + box.max.z) / 2,
    );
    // Default projection direction is along +Z. Rotating π/2 around Y
    // re-aims it along +X so the projection volume is wide along Z (car
    // length) and tall along Y, with depth penetrating the body laterally.
    const projEuler = new Euler(0, Math.PI / 2, 0);
    const projSize = new Vector3(sizeZ * 0.78, 0.2, sizeX * 1.4);

    for (const target of setup.bodyMeshes) {
      try {
        const decalGeom = new DecalGeometry(target, center, projEuler, projSize);
        // DecalGeometry returns an empty geometry if no triangles intersect.
        if (!decalGeom.attributes.position || decalGeom.attributes.position.count === 0) {
          decalGeom.dispose();
          continue;
        }
        const decalMat = new MeshStandardMaterial({
          map: tex,
          transparent: true,
          depthWrite: false,
          polygonOffset: true,
          polygonOffsetFactor: -4,
          polygonOffsetUnits: -4,
          metalness: 0.15,
          roughness: 0.65,
        });
        const decalMesh = new Mesh(decalGeom, decalMat);
        decalMesh.renderOrder = 10;
        cloned.add(decalMesh);
        decalMeshesRef.current.push(decalMesh);
      } catch {
        // Some primitive geometries lack the position/normal attributes
        // DecalGeometry needs — skip silently.
      }
    }

    return () => {
      decalMeshesRef.current.forEach((m) => {
        cloned.remove(m);
        m.geometry.dispose();
        (m.material as MeshStandardMaterial).dispose();
      });
      decalMeshesRef.current = [];
      tex.dispose();
    };
  }, [cloned, config.stickerId, setup.bodyMeshes, setup.bodyBox]);

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
