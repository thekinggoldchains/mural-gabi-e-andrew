import { MediaType, OverlayData } from '@/types/post';

export function clampPercent(val: number): number {
  if (Number.isNaN(val)) return 50;
  return Math.min(100, Math.max(0, Number(val.toFixed(2))));
}

export function pixelToPercent(px: number, containerSize: number): number {
  if (containerSize <= 0) return 50;
  return clampPercent((px / containerSize) * 100);
}

/**
 * Implementa a Abordagem A (Híbrida):
 * - Fotos com apenas filtro, texto e emoji são achatadas (flattened) no Canvas -> retorna false.
 * - Vídeos, Boomerangs ou Fotos que possuem GIF animado mantêm overlay_data em JSON -> retorna true.
 */
export function requiresJsonOverlay(
  mediaType: MediaType,
  overlay: OverlayData
): boolean {
  if (mediaType === 'video' || mediaType === 'boomerang') {
    return true;
  }
  return overlay.elements.some((el) => el.type === 'gif');
}
