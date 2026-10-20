import { describe, it, expect } from 'vitest';
import { clampPercent, pixelToPercent, requiresJsonOverlay } from '../overlayUtils';
import { OverlayData } from '@/types/post';

describe('overlayUtils', () => {
  it('converts pixel coordinates to 0-100 percentages and clamps boundaries', () => {
    expect(pixelToPercent(180, 360)).toBe(50);
    expect(pixelToPercent(-20, 360)).toBe(0);
    expect(pixelToPercent(500, 360)).toBe(100);
    expect(clampPercent(105)).toBe(100);
    expect(clampPercent(-5)).toBe(0);
  });

  it('determines hybrid rendering strategy: static photos flatten, GIFs and videos use JSON overlay', () => {
    const staticOverlay: OverlayData = {
      filter: 'noiva-glow',
      elements: [
        { id: '1', type: 'text', content: 'Felicidades!', x: 50, y: 50, scale: 1, rotation: 0 },
        { id: '2', type: 'emoji', content: '🥂', x: 20, y: 20, scale: 1, rotation: 0 },
      ],
    };

    const gifOverlay: OverlayData = {
      filter: 'original',
      elements: [
        { id: '3', type: 'gif', content: 'https://media.giphy.com/test.gif', x: 40, y: 40, scale: 1, rotation: 0 },
      ],
    };

    expect(requiresJsonOverlay('photo', staticOverlay)).toBe(false);
    expect(requiresJsonOverlay('photo', gifOverlay)).toBe(true);
    expect(requiresJsonOverlay('video', staticOverlay)).toBe(true);
    expect(requiresJsonOverlay('boomerang', staticOverlay)).toBe(true);
  });
});
