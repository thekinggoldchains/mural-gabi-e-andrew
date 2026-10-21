import { describe, it, expect } from 'vitest';
import {
  calculateQrPlacement,
  PRESET_TEMPLATES,
  getPresetById,
} from '../qrTemplateComposer';

describe('QR Template Composer Utilities', () => {
  it('calculates centered QR placement correctly on a standard canvas', () => {
    const placement = calculateQrPlacement({
      canvasWidth: 1000,
      canvasHeight: 1500,
      scalePercent: 30, // 30% of canvas width = 300px
      xPercent: 50, // centered horizontally
      yPercent: 50, // centered vertically
    });

    expect(placement.size).toBe(300);
    // Center at 500 => x = 500 - 150 = 350
    expect(placement.x).toBe(350);
    // Center at 750 => y = 750 - 150 = 600
    expect(placement.y).toBe(600);
  });

  it('clamps placement coordinates and scale percent within valid safety boundaries', () => {
    const placementMin = calculateQrPlacement({
      canvasWidth: 800,
      canvasHeight: 1200,
      scalePercent: 5, // below min of 15%
      xPercent: -20, // out of bounds
      yPercent: 120, // out of bounds
    });

    // 15% of 800 = 120
    expect(placementMin.size).toBe(120);
    // Clamped xPercent to 0% => center at 0 => x = -60
    expect(placementMin.x).toBe(-60);

    const placementMax = calculateQrPlacement({
      canvasWidth: 800,
      canvasHeight: 1200,
      scalePercent: 95, // above max of 70%
      xPercent: 50,
      yPercent: 50,
    });

    // 70% of 800 = 560
    expect(placementMax.size).toBe(560);
  });

  it('provides the 3 required wedding preset templates with valid styling', () => {
    expect(PRESET_TEMPLATES).toHaveLength(3);
    const presetIds = PRESET_TEMPLATES.map((p) => p.id);
    expect(presetIds).toEqual(['minimalist', 'floral', 'rustic']);

    const floral = getPresetById('floral');
    expect(floral).toBeDefined();
    expect(floral?.name).toBe('Floral Dourado');
    expect(floral?.title).toContain('Gabi & Andrew');
  });
});
