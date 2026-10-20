import { describe, it, expect } from 'vitest';
import { FILTER_CSS_MAP, TRANSITION_CLASSES, DEFAULT_PHOTO_DURATION_MS } from '../post';

describe('Post Types & Constants', () => {
  it('defines the 6 Instagram-style wedding filter presets with valid CSS filter strings', () => {
    expect(Object.keys(FILTER_CSS_MAP)).toEqual([
      'original',
      'noiva-glow',
      'golden-hour',
      'pb-classico',
      'vintage-film',
      'alta-vibe',
    ]);
    expect(FILTER_CSS_MAP['original']).toBe('none');
    expect(FILTER_CSS_MAP['golden-hour']).toContain('sepia');
  });

  it('defines the 4 random slideshow transition classes and 5000ms default photo duration', () => {
    expect(TRANSITION_CLASSES).toEqual([
      'fade-scale',
      'cube-3d',
      'polaroid-drop',
      'blur-dissolve',
    ]);
    expect(DEFAULT_PHOTO_DURATION_MS).toBe(5000);
  });
});
