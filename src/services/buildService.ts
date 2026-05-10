import type { CarConfig, Part, SelectedPartsSummary } from '@/types';
import { getPartById } from './partsService';

/**
 * Resolves a CarConfig into the actual selected Part records and computes totals.
 * Anything price-related or sharing-related lives here so the UI is presentational.
 */

export const DEFAULT_CONFIG: CarConfig = {
  paintId: 'paint-alpine-white',
  wheelId: 'wheels-bbs-rs',
  exhaustId: 'exhaust-supersprint-single',
  stickerId: 'mtech',
  rideHeight: -0.1,
  environmentId: 'showroom',
};

export function resolveConfig(config: CarConfig): SelectedPartsSummary {
  const paint = getPartById(config.paintId);
  const wheels = getPartById(config.wheelId);
  const exhaust = getPartById(config.exhaustId);
  const sticker = getPartById(`stickers-${config.stickerId}`);
  const suspension = getDefaultSuspensionForRideHeight(config.rideHeight);
  const total =
    (paint?.price ?? 0) +
    (wheels?.price ?? 0) +
    (exhaust?.price ?? 0) +
    (sticker?.price ?? 0) +
    (suspension?.price ?? 0);
  return { paint, wheels, exhaust, suspension, sticker, total };
}

/**
 * The suspension category is presented to the user as a slider (ride height),
 * but each ride-height range maps onto a real product so we can quote a price
 * and an affiliate link. Lower drop = more aggressive (and pricier) hardware.
 */
export function getDefaultSuspensionForRideHeight(rideHeight: number): Part | undefined {
  if (rideHeight <= -0.2) return getPartById('suspension-kw-v3');
  if (rideHeight <= -0.12) return getPartById('suspension-bilstein-b16');
  if (rideHeight <= -0.06) return getPartById('suspension-ground-control');
  return getPartById('suspension-h-and-r-sport');
}

/**
 * Encodes a CarConfig into a base64 URL fragment so users can share their build.
 * Consumers should call decodeConfig() on the receiving end.
 */
export function encodeConfig(config: CarConfig): string {
  const json = JSON.stringify(config);
  return btoa(json);
}

export function decodeConfig(encoded: string): CarConfig | null {
  try {
    const parsed = JSON.parse(atob(encoded)) as Partial<CarConfig>;
    if (
      typeof parsed.paintId === 'string' &&
      typeof parsed.wheelId === 'string' &&
      typeof parsed.exhaustId === 'string' &&
      typeof parsed.stickerId === 'string' &&
      typeof parsed.rideHeight === 'number'
    ) {
      // environmentId was added later; tolerate older share links by
      // falling back to the default.
      return {
        ...parsed,
        environmentId: parsed.environmentId ?? DEFAULT_CONFIG.environmentId,
      } as CarConfig;
    }
    return null;
  } catch {
    return null;
  }
}

export function buildShareUrl(config: CarConfig): string {
  const encoded = encodeConfig(config);
  return `${window.location.origin}/configure?build=${encoded}`;
}
