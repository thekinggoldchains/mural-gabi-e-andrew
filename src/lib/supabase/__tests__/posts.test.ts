import { describe, it, expect } from 'vitest';
import { buildStorageFileName, preparePostInsertPayload } from '../posts';

describe('Supabase Posts Service Helpers', () => {
  it('generates a sanitized unique file name for wedding media uploads', () => {
    const fileName = buildStorageFileName('Maria Clara!', 'webp', 1700000000000);
    expect(fileName).toMatch(/^1700000000000_maria_clara_[a-z0-9]+\.webp$/);
  });

  it('prepares post insert payload with 5000ms default for photos and clamps video duration to 10000ms', () => {
    const photoPayload = preparePostInsertPayload({
      guestName: '  João Pedro ',
      mediaUrl: 'https://example.com/photo.webp',
      mediaType: 'photo',
      hasAnimatedOverlay: false,
      overlayData: null,
    });

    expect(photoPayload.guest_name).toBe('João Pedro');
    expect(photoPayload.duration_ms).toBe(5000);
    expect(photoPayload.visible).toBe(true);

    const videoPayload = preparePostInsertPayload({
      guestName: 'Ana',
      mediaUrl: 'https://example.com/vid.mp4',
      mediaType: 'video',
      durationMs: 14500,
      hasAnimatedOverlay: true,
      overlayData: { filter: 'golden-hour', elements: [] },
    });

    expect(videoPayload.duration_ms).toBe(10000);
    expect(videoPayload.has_animated_overlay).toBe(true);
  });
});
