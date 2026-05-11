import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
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
import { RegistryWheel } from '../parts/RegistryWheel';
import { buildStickerTexture } from '../parts/stickerTexture';
import { getPartById } from '@/services/partsService';
import {
  getApprovedRegistryEntries,
  subscribe as subscribeRegistry,
} from '@/services/catalogSyncService';
import { DEFAULT_CONFIG } from '@/services/buildService';
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

/**
 * v3 of the optimized GLB.
 *
 *   v1 — `gltf-transform optimize` defaults: ran the `palette` pass,
 *        which renamed every single-color material to `PaletteMaterial*`.
 *        Broke paint (no material named `body`) + emissives.
 *
 *   v2 — Re-compressed with `--palette false`. Material names preserved,
 *        but the default pipeline still ran `flatten` + `join`, which
 *        collapsed 257 nodes to 41 and merged the wheel/exhaust/light
 *        parent groups into single primitives. HIDDEN_GROUPS regex
 *        stopped matching anything → GLB exhaust + wheels visible
 *        ("floating exhaust pipe" reported by user).
 *
 *   v3 — Custom minimal pipeline: only `webp` (texture format) +
 *        `resize` (1024px) + `meshopt` (geometry compression). No
 *        dedup, instance, palette, flatten, or join — full hierarchy
 *        preserved. Same 2.7MB output. Filename bumped v2→v3 to bust
 *        the browser cache (/models/* has Cache-Control: immutable).
 */
const MODEL_URL = '/models/e30_v3.glb';

// Meshopt-compressed GLB. Drei's useGLTF auto-loads the meshopt decoder when
// the third argument is `true`.
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
 *
 * `exhaust` is NOT in this set — the GLB's real exhaust is part of the car
 * and should be visible by default. We toggle its visibility from a
 * useEffect below when the user selects a non-default exhaust style.
 */
const HIDDEN_GROUPS =
  /^(wheel_rb|Rays_TE37|BrakeDisc_\d+|Brakedisc_\d+|tire_cap|caliper_rb|Bolts|Axle|suspention|Plane|Sphere)(\.\d+)?$/;

/** Pattern matching the four wheel-hub anchor nodes (used to position our procedural wheels). */
const WHEEL_ANCHOR = /^wheel_rb(\.\d+)?$/;

/**
 * Materials we recolor to look "lit". Each entry gives the emissive
 * color + intensity. We *clone* the source material on first hit and
 * reassign every mesh that referenced the original — so we mutate
 * one cloned material per light-type, not the cached source.
 *
 * Material names come from the source GLB (Artem P's E30, verified via
 * gltf-transform inspect). Edit per-environment by adjusting the
 * emissiveIntensity values; toneMapped=false makes the emissive read
 * as a real light even under bright IBL.
 */
const EMISSIVE_LIGHT_MATERIALS: Record<
  string,
  { color: string; intensity: number }
> = {
  // Front
  light_inner: { color: '#fffae0', intensity: 3.0 },             // headlight bulbs / reflectors
  orange_glass_light_front: { color: '#ffaa44', intensity: 0.5 }, // amber turn signals (front)
  // Rear
  red_light_glass: { color: '#ff1818', intensity: 2.0 },         // tail glass (main red)
  emission_back: { color: '#ff3030', intensity: 1.3 },           // tail filament behind glass
  glass_light_back: { color: '#fff5d0', intensity: 0.6 },        // reverse / clear tail elements
  orange_glass_light_back: { color: '#ff8a30', intensity: 0.7 }, // amber turn signals (rear)
  // Plate
  emission_number: { color: '#fff5d0', intensity: 0.5 },         // license-plate lamp
};

/** Anchor nodes whose world positions become real PointLight/SpotLight origins. */
const LIGHT_ANCHOR_NAMES = [
  'front_light_l',
  'front_light_r',
  'back_light_body',
] as const;
type LightAnchorName = (typeof LIGHT_ANCHOR_NAMES)[number];

/**
 * Target body length in scene units.
 *
 * Real BMW E30 is 4.32m. We deliberately render at ~5.18m (20% upscale)
 * so the car carries more visual presence on screen. The camera-framing
 * math in CameraFraming.tsx still uses the real-world length (4.32m), so
 * the framing distance puts a 5.18m model in front of the camera that
 * occupies ~84% of canvas width rather than the 70% the framing formula
 * was calibrated for — net effect is a noticeably larger hero shot
 * without re-tuning every preset.
 */
const TARGET_LENGTH = 5.18;

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
    /** Reference to the GLB's exhaust node — toggled visible/hidden when the
     *  user picks a non-default exhaust style. */
    exhaustNode: Object3D | null;
    bodyBox: Box3;
    /** World positions of the headlight / taillight anchor groups, in cloned-local space. */
    lightAnchors: Partial<Record<LightAnchorName, Vector3>>;
  };
  const setup: Setup = useMemo<Setup>(() => {
    let bodyMaterial: MeshStandardMaterial | null = null;
    const bodyMeshes: Mesh[] = [];
    const rawWheelAnchors: { x: number; z: number; name: string }[] = [];
    const rawExhaustPos = new Vector3(0, 0, 0);
    let exhaustFound = false;
    let exhaustNode: Object3D | null = null;
    const emissiveMatCache = new Map<string, MeshStandardMaterial>();
    const lightAnchors: Partial<Record<LightAnchorName, Vector3>> = {};

    cloned.updateMatrixWorld(true);
    cloned.traverse((obj: Object3D) => {
      // Capture wheel anchors (in cloned-local world space) BEFORE hiding.
      if (WHEEL_ANCHOR.test(obj.name)) {
        const p = new Vector3();
        obj.getWorldPosition(p);
        rawWheelAnchors.push({ x: p.x, z: p.z, name: obj.name });
      }

      if (obj.name === 'exhaust') {
        // The 'exhaust' node itself has no transform — its child geometry
        // carries absolute positions. getWorldPosition would return
        // (~0, ~0, ~0). Compute the world-space bounding box of the
        // actual exhaust geometry instead.
        //
        // For Z (longitudinal) we want the REAR-MOST extent (max.z, since
        // the car's rear is at +Z in scene coords) — that's the tailpipe
        // outlet. Using the bbox CENTER would land mid-car, because the
        // exhaust pipe runs the whole length from engine to bumper.
        //
        // For X (lateral) we use the center — close enough for the side
        // the tip should exit on.
        const bbox = new Box3().setFromObject(obj);
        if (!bbox.isEmpty()) {
          const center = bbox.getCenter(new Vector3());
          rawExhaustPos.set(center.x, center.y, bbox.max.z);
          exhaustFound = true;
        }
        exhaustNode = obj;
      }

      // Capture headlight / taillight anchor positions (also pre-hiding).
      if ((LIGHT_ANCHOR_NAMES as readonly string[]).includes(obj.name)) {
        const p = new Vector3();
        obj.getWorldPosition(p);
        lightAnchors[obj.name as LightAnchorName] = p;
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
        } else if (EMISSIVE_LIGHT_MATERIALS[mat.name]) {
          // Make the headlight / taillight materials look "lit".
          // Clone the material once per material name, then reassign every
          // mesh that referenced it. We never mutate the source material.
          let lit = emissiveMatCache.get(mat.name);
          if (!lit) {
            const cfg = EMISSIVE_LIGHT_MATERIALS[mat.name];
            lit = mat.clone();
            lit.name = mat.name;
            lit.emissive.set(cfg.color);
            lit.emissiveIntensity = cfg.intensity;
            // Without this the emissive gets crushed by ACES tone mapping
            // and reads as dull, not "on".
            lit.toneMapped = false;
            emissiveMatCache.set(mat.name, lit);
          }
          mesh.material = lit;
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

    // Exhaust position: scale ALL three axes uniformly (was previously
    // hardcoded to y=0.238 / 0.22, which floated below the bumper after
    // we upscaled the car to 5.18m). Y here is in cloned-local space; the
    // JSX adds bodyY at render time so the exhaust tracks ride-height.
    const exhaustPos = exhaustFound
      ? new Vector3(
          rawExhaustPos.x * scale,
          rawExhaustPos.y * scale,
          rawExhaustPos.z * scale,
        )
      : new Vector3(0.45, 0.18, -2.1);

    return {
      bodyMaterial,
      bodyMeshes,
      scale,
      yLift,
      wheelAnchors,
      exhaustPos,
      exhaustNode,
      bodyBox: box,
      lightAnchors,
    };
  }, [cloned]);

  // Computed once per render — derived state used by both effects below
  // and by the JSX further down. Declared early so effects can reference it.
  const bodyY = setup.yLift + config.rideHeight;

  // Default exhaust = show the GLB's real exhaust geometry.
  // Non-default = hide the GLB exhaust and let the procedural <ExhaustTip>
  // take its place at the bumper exit.
  const usingCustomExhaust = config.exhaustId !== DEFAULT_CONFIG.exhaustId;

  useEffect(() => {
    if (!setup.exhaustNode) return;
    setup.exhaustNode.visible = !usingCustomExhaust;
  }, [usingCustomExhaust, setup.exhaustNode]);

  // Apply paint color whenever the selection changes.
  //
  // DEFENSIVE: we mutate via BOTH paths — the cached `setup.bodyMaterial`
  // reference AND each body mesh's current `.material` field. The two are
  // supposed to point at the same MeshStandardMaterial, but if anything
  // later in the scene-build chain has replaced a mesh's material (e.g.
  // a re-traverse mutating during a remount), the cached ref goes stale
  // and the visible mesh stops responding to paint clicks. Hitting both
  // paths is cheap (max ~25 body meshes) and guarantees the visible
  // material gets the new color.
  useEffect(() => {
    const part = getPartById(config.paintId);
    const hex = (part?.renderHint?.hex as string) ?? '#f1f3f4';
    const metallic = ((part?.renderHint?.metallic as number) ?? 0) > 0;

    const apply = (mat: MeshStandardMaterial) => {
      mat.color.set(hex);
      mat.metalness = metallic ? 0.85 : 0.45;
      mat.roughness = metallic ? 0.28 : 0.4;
    };
    if (setup.bodyMaterial) apply(setup.bodyMaterial);
    for (const m of setup.bodyMeshes) {
      const mat = m.material as MeshStandardMaterial | undefined;
      if (mat && mat.color) apply(mat);
    }
  }, [config.paintId, setup.bodyMaterial, setup.bodyMeshes]);

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

  // Translate captured anchor positions (cloned-local) into scene-world
  // coords by applying the same scale + Y-lift the body itself uses.
  // (bodyY was declared near the top of the component for effect deps.)
  const toWorld = (v: Vector3 | undefined): [number, number, number] | null => {
    if (!v) return null;
    return [v.x * setup.scale, v.y * setup.scale + bodyY, v.z * setup.scale];
  };
  const headlightL = toWorld(setup.lightAnchors.front_light_l);
  const headlightR = toWorld(setup.lightAnchors.front_light_r);
  const taillight = toWorld(setup.lightAnchors.back_light_body);

  return (
    <>
      {/* Body — the GLB at our normalized scale and ride-height-driven Y */}
      <group position={[0, bodyY, 0]} scale={setup.scale}>
        <primitive object={cloned} />
      </group>

      {/* Headlight cones — subtle warm spotlights aimed forward (-Z) so the
          car looks like its lights are on. Distance falloff so they fade
          before reaching anything obnoxious. */}
      {headlightL && (
        <spotLight
          position={headlightL}
          target-position={[headlightL[0], headlightL[1] - 0.1, headlightL[2] - 5]}
          angle={0.5}
          penumbra={0.85}
          intensity={1.4}
          distance={9}
          color="#fffae0"
        />
      )}
      {headlightR && (
        <spotLight
          position={headlightR}
          target-position={[headlightR[0], headlightR[1] - 0.1, headlightR[2] - 5]}
          angle={0.5}
          penumbra={0.85}
          intensity={1.4}
          distance={9}
          color="#fffae0"
        />
      )}

      {/* Taillight glow — single small red point light near the rear panel.
          Acts as an ambient red wash on the rear quarter, complementing
          the emissive tail-glass material. */}
      {taillight && (
        <pointLight
          position={[taillight[0], taillight[1], taillight[2] + 0.05]}
          color="#ff2020"
          intensity={0.7}
          distance={2.5}
        />
      )}

      {/* Wheels — resolves to either a registry entry (AI-generated) or
          the catalog Wheel based on the current wheelId. */}
      {setup.wheelAnchors.map((a, i) => (
        <ResolvedWheel
          key={`wheel-${i}-${config.wheelId}`}
          position={[a.x, WHEEL_CENTER_Y, a.z]}
          wheelId={config.wheelId}
          isRight={a.x > 0}
        />
      ))}

      {/* Procedural exhaust tip — only when the user picks a non-default
          exhaust style. Position:
            X / Z come from the GLB's captured exhaust anchor (already
            scaled to scene coords), which the model creator placed at
            the bumper exit — so the lateral and longitudinal positions
            are reliable.
            Y is a fixed real-world tailpipe height tracking ride-height.
            The GLB's exhaust-node Y was unreliable because the model's
            mesh origin for that node sits at chassis level, not at the
            exit, which made the previous formula float the tip below
            the floor on lowered cars.
          0.28m matches a real E30 exhaust outlet at stock height; +1×
          rideHeight makes the tip drop with the body when slammed. */}
      {usingCustomExhaust && (
        <ExhaustTip
          position={[
            setup.exhaustPos.x !== 0 ? setup.exhaustPos.x : 0.45,
            0.28 + config.rideHeight,
            setup.exhaustPos.z,
          ]}
          exhaustId={config.exhaustId}
        />
      )}
    </>
  );
}

/**
 * Wheel resolver — picks RegistryWheel for AI-generated entries and the
 * catalog-driven <Wheel> otherwise. Subscribes to the catalog-sync store
 * so an admin approval mid-session is reflected live.
 */
function ResolvedWheel({
  position,
  isRight,
  wheelId,
}: {
  position: [number, number, number];
  isRight: boolean;
  wheelId: string;
}) {
  const approved = useSyncExternalStore(
    (cb) => subscribeRegistry(cb),
    () => getApprovedRegistryEntries(),
    () => getApprovedRegistryEntries(),
  );
  const entry = approved.find((e) => e.id === wheelId);
  if (entry) {
    return <RegistryWheel entry={entry} position={position} isRight={isRight} />;
  }
  return <Wheel position={position} isRight={isRight} wheelId={wheelId} />;
}
