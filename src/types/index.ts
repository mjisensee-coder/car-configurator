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

export interface CarConfig {
  paintId: string;
  wheelId: string;
  exhaustId: string;
  stickerId: StickerId;
  /** Ride height offset from default, in scene units. Negative = lowered. */
  rideHeight: number;
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
