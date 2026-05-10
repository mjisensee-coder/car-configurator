import { CanvasTexture } from 'three';
import type { StickerId } from '@/types';

/**
 * Generates a `CanvasTexture` for the given sticker style.
 *
 * Used by both `<BodyDecal>` (placeholder car, flat-plane application) and
 * `<RealCar>` (real GLB, projected via DecalGeometry).
 */
export function buildStickerTexture(stickerId: StickerId): CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  if (stickerId === 'none') return null;

  const W = 1024;
  const H = 256;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.clearRect(0, 0, W, H);

  switch (stickerId) {
    case 'mtech': {
      const stripeY = H * 0.55;
      const h = 18;
      const colors = ['#1c69d4', '#7e1ed4', '#c8231e'];
      colors.forEach((c, i) => {
        ctx.fillStyle = c;
        ctx.fillRect(W * 0.1, stripeY + i * h, W * 0.8, h);
      });
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 36px Inter, system-ui, sans-serif';
      ctx.fillText('///M', W * 0.1, stripeY - 14);
      break;
    }
    case 'alpina': {
      ctx.fillStyle = '#0b3a82';
      ctx.fillRect(W * 0.05, H * 0.55, W * 0.9, 22);
      ctx.fillStyle = '#d4a657';
      ctx.fillRect(W * 0.05, H * 0.55 + 24, W * 0.9, 12);
      ctx.fillStyle = '#0b3a82';
      ctx.font = 'italic bold 56px Inter, system-ui, sans-serif';
      ctx.fillText('ALPINA', W * 0.06, H * 0.5);
      break;
    }
    case 'hartge': {
      ctx.fillStyle = '#0b0b0e';
      ctx.fillRect(W * 0.05, H * 0.6, W * 0.9, 18);
      ctx.fillStyle = '#0b0b0e';
      ctx.font = 'italic bold 64px Inter, system-ui, sans-serif';
      ctx.fillText('Hartge', W * 0.06, H * 0.55);
      break;
    }
    case 'is-it-stance': {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'italic bold 50px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Is It Stance Yet?', W / 2, H * 0.6);
      break;
    }
  }

  const tex = new CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}
