import { describe, it, expect } from 'vitest';
import {
  calculateQrPlacement,
  PRESET_TEMPLATES,
  getPresetById,
  calculatePdfFit,
  PrintFormat,
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

  it('calculates PDF fit maintaining exact aspect ratio without stretching or distortion', () => {
    // Caso 1: Imagem estilo Story do Canva (1080x1920) em página A4 (210x297mm)
    const fitA4Story = calculatePdfFit(1080, 1920, 'a4');
    expect(fitA4Story.pageWidthMm).toBe(210);
    expect(fitA4Story.pageHeightMm).toBe(297);
    expect(fitA4Story.renderHeightMm).toBe(297);
    expect(fitA4Story.renderWidthMm).toBeCloseTo(167.06, 1);
    expect(fitA4Story.offsetX).toBeCloseTo(21.47, 1);
    expect(fitA4Story.offsetY).toBe(0);

    // O aspect ratio renderizado deve ser IDÊNTICO ao da imagem original (zero esticamento)
    const originalAspect = 1080 / 1920;
    const renderedAspect = fitA4Story.renderWidthMm / fitA4Story.renderHeightMm;
    expect(renderedAspect).toBeCloseTo(originalAspect, 4);

    // Caso 2: Formato Mesa / Porta-Retrato (10x15cm)
    const fit10x15 = calculatePdfFit(1240, 1754, '10x15');
    expect(fit10x15.pageWidthMm).toBe(100);
    expect(fit10x15.pageHeightMm).toBe(150);
    expect(fit10x15.renderWidthMm / fit10x15.renderHeightMm).toBeCloseTo(1240 / 1754, 4);

    // Caso 3: Formato Proporção Original da Arte (sem margens brancas)
    const fitOriginal = calculatePdfFit(1080, 1920, 'original');
    expect(fitOriginal.offsetX).toBe(0);
    expect(fitOriginal.offsetY).toBe(0);
    expect(fitOriginal.renderWidthMm).toBe(fitOriginal.pageWidthMm);
    expect(fitOriginal.renderHeightMm).toBe(fitOriginal.pageHeightMm);
    expect(fitOriginal.pageWidthMm / fitOriginal.pageHeightMm).toBeCloseTo(1080 / 1920, 4);
  });
});
