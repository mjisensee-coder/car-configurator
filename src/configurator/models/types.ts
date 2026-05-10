import type { Object3D } from 'three';

/**
 * Model loader interface.
 *
 * Today we synthesize the car from Three.js primitives. Tomorrow you can
 * point this at a real BMW E30 GLB — the contract is the part map below.
 *
 * To swap implementations:
 *   1. Drop your e30.glb into /public/models/e30.glb
 *   2. Implement loadModel() with useGLTF and assign refs to the named meshes
 *      (body, wheels[0..3], exhaust, bumperFront, bumperRear, spoilerMount).
 *   3. Re-export it from `index.ts` as the default loader.
 *
 * Everything else in the configurator (part swap logic, sidebar, scene)
 * keeps working without modification.
 */

export interface CarPartMap {
  /** The painted body shell. Material color is mutated for paint swaps. */
  body: Object3D;
  /** Four wheels in order: FL, FR, RL, RR. */
  wheels: [Object3D, Object3D, Object3D, Object3D];
  /** Exhaust tip mesh — replaced wholesale on style swap. */
  exhaust: Object3D;
  /** Front and rear bumpers — for M-Tech II swap-in (future). */
  bumpers: { front: Object3D; rear: Object3D };
  /** Anchor for an optional rear spoiler. */
  spoilerMount: Object3D;
}

export interface ModelLoadResult {
  /** Root Object3D added to the scene. */
  root: Object3D;
  /** Named handles to swappable parts. */
  parts: CarPartMap;
}

export interface ModelLoader {
  /**
   * Load a car model. `url` is honored by GLB-backed loaders, ignored by the
   * placeholder (which builds geometry procedurally).
   */
  loadModel(url: string): ModelLoadResult;
}
