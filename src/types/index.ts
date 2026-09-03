/**
 * Domain types for the car configurator.
 * These are the shapes shared across services, UI, and the 3D scene.
 */

export type PartCategory =
  | 'wheels'
  | 'paint'
  | 'exhaust'
  | 'suspension'
  | 'stickers';

export type Vendor = 'ECS Tuning' | 'Turner Motorsport' | 'IND Distribution';

/**
 * Wheel fitment spec. Present only on parts in the `wheels` category.
 *
 * These are the fields that decide whether a wheel physically bolts to the
 * car, so they are stored as columns in `wheel_fitment` (not buried in
 * `renderHint`) and are filterable through `/api/fitment/wheels`.
 */
export interface WheelFitment {
  /** Pitch circle diameter, e.g. '4x100' — the E30 pattern. */
  boltPattern: string;
  /** ET in millimetres. Positive means the mounting face sits outboard. */
  offsetMm: number;
  widthInches: number;
  diameterInches: number;
  /** Fitted tire, e.g. '205/45R16'. */
  tireSize: string;
  /** Hub bore in millimetres. The E30 hub is 57.1. */
  centerBoreMm?: number;
  stance?: 'square' | 'staggered';
  notes?: string;
}

/** Catalog query shape. Shared by the client store and the SQL layer. */
export interface PartFilter {
  category?: PartCategory;
  search?: string;
  maxPrice?: number;
}

export type SortKey = 'price-asc' | 'price-desc' | 'name';

/** Fitment query shape backing `/api/fitment/wheels`. */
export interface FitmentFilter {
  boltPattern?: string;
  diameterInches?: number;
  widthInches?: number;
  minOffsetMm?: number;
  maxOffsetMm?: number;
}

/** Counts per distinct value, for building filter UI that never dead-ends. */
export interface FitmentFacets {
  boltPattern: Array<{ value: string; count: number }>;
  diameterInches: Array<{ value: number; count: number }>;
  widthInches: Array<{ value: number; count: number }>;
  tireSize: Array<{ value: string; count: number }>;
}

export interface Part {
  id: string;
  category: PartCategory;
  name: string;
  brand: string;
  price: number;
  image: string;
  description: string;
  vendor: Vendor;
  affiliateUrl: string;
  /** Optional render hint consumed by the 3D scene (color hex, wheel style key, etc.) */
  renderHint?: Record<string, string | number>;
  /** Populated for `wheels` parts only — joined from `wheel_fitment`. */
  fitment?: WheelFitment;
}

export interface PaintOption {
  id: string;
  name: string;
  hex: string;
  metallic: boolean;
  price: number;
  affiliateUrl: string;
}

export type WheelStyle = 'bbs-rs' | 'ronal-lsi' | 'mtech-bottle';
export type ExhaustStyle = 'single-tip' | 'dual-tip' | 'megaphone';
export type StickerId = 'none' | 'mtech' | 'alpina' | 'hartge' | 'is-it-stance';

export type EnvironmentId =
  | 'showroom'
  | 'city-night'
  | 'modern-showroom'
  | 'led-studio';

/**
 * Legacy environment ids that have been retired. Old share links and
 * gallery builds may still carry these — they get sanitized to a valid
 * id by `decodeConfig` / `loadConfig`. Kept here only for the type-level
 * reference; never returned to consumers.
 */
export const LEGACY_ENV_REMAP: Record<string, EnvironmentId> = {
  'pro-garage': 'led-studio',
  'mountain-road': 'modern-showroom',
};

export interface CarConfig {
  paintId: string;
  wheelId: string;
  exhaustId: string;
  stickerId: StickerId;
  /** Ride height offset from default, in scene units. Negative = lowered. */
  rideHeight: number;
  /** Showroom environment for the 3D scene. */
  environmentId: EnvironmentId;
}

export interface CommunityBuild {
  id: string;
  name: string;
  creator: string;
  description: string;
  screenshot: string;
  config: CarConfig;
  totalCost: number;
  tags: string[];
}

export interface SelectedPartsSummary {
  paint: Part | undefined;
  wheels: Part | undefined;
  exhaust: Part | undefined;
  suspension: Part | undefined;
  sticker: Part | undefined;
  total: number;
}
