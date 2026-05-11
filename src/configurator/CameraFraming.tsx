import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { Vector3, type PerspectiveCamera } from 'three';

/**
 * Adjusts the camera's radial distance so the car visually fills roughly
 * `FILL_FRACTION` of the canvas width, given the active vertical FOV
 * and the current canvas aspect ratio.
 *
 * Math:
 *   At distance d, the visible width at the camera focal plane is
 *     2 · d · tan(fov_v / 2) · aspect
 *   We want car_length / that = FILL_FRACTION, so:
 *     d = car_length / (2 · FILL_FRACTION · tan(fov_v / 2) · aspect)
 *
 * Behaviour:
 *   - Runs on mount + whenever the canvas size changes (responsive).
 *   - Re-runs when OrbitControls instance changes (env swap forces a
 *     fresh instance via the `key` prop in Scene.tsx).
 *   - Preserves the user's current azimuth + elevation — only scales the
 *     radial distance from `controls.target` to `camera.position`.
 *   - Clamped to the active environment's [minDistance, maxDistance], so
 *     tight rooms (Modern Showroom / LED Studio) can't pull back past
 *     their walls.
 *
 * Side effect: if the user has manually zoomed in/out and then the
 * window is resized, the framing will overwrite their zoom. That's
 * consistent with the spec ("recalculate on window resize") and matches
 * how most premium configurators behave on viewport change.
 */

/** Real-world BMW E30 length. Matches TARGET_LENGTH in RealCar.tsx. */
const CAR_LENGTH = 4.32;

/** Fraction of canvas width the car should occupy in the default view. */
const FILL_FRACTION = 0.6;

export function CameraFraming() {
  const size = useThree((s) => s.size);
  const camera = useThree((s) => s.camera);
  // `controls` is populated when an <OrbitControls makeDefault> is mounted.
  const controls = useThree((s) => s.controls);

  useEffect(() => {
    if (!controls || !('minDistance' in controls)) return;
    if (!('isPerspectiveCamera' in camera)) return;

    const c = controls as unknown as {
      minDistance: number;
      maxDistance: number;
      target: Vector3;
      update: () => void;
    };
    const persp = camera as PerspectiveCamera;

    const aspect = size.width / size.height;
    if (!isFinite(aspect) || aspect <= 0) return;

    const fovRadV = (persp.fov * Math.PI) / 180;
    const tanHFov = Math.tan(fovRadV / 2) * aspect;
    if (tanHFov <= 0) return;

    const ideal = CAR_LENGTH / (2 * FILL_FRACTION * tanHFov);
    const clamped = Math.max(c.minDistance, Math.min(c.maxDistance, ideal));

    // Preserve the current view angle — only adjust the radial distance.
    const dir = new Vector3().subVectors(camera.position, c.target);
    if (dir.lengthSq() === 0) {
      // Camera somehow co-located with target — fall back to a sensible
      // default direction (looking from the front-right).
      dir.set(0.65, 0.2, 0.75);
    }
    dir.normalize();
    camera.position.copy(c.target).addScaledVector(dir, clamped);
    c.update();
  }, [size.width, size.height, camera, controls]);

  return null;
}
