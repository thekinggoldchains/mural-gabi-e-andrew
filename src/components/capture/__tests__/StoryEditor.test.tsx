import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { StoryEditor } from '../StoryEditor';
import { CapturedMedia } from '@/hooks/useCamera';

describe('StoryEditor', () => {
  const mockMedia: CapturedMedia = {
    blob: new Blob(['fake'], { type: 'image/webp' }),
    previewUrl: 'blob:https://example.com/fake-photo',
    mediaType: 'photo',
    durationMs: 5000,
    mirrored: false,
  };

  it('allows switching filters, adding text overlay, and adding wedding emojis', () => {
    render(<StoryEditor media={mockMedia} guestName="Lucas" onCancel={vi.fn()} onSuccess={vi.fn()} />);

    const goldenFilterBtn = screen.getByRole('button', { name: /Golden Hour/i });
    fireEvent.click(goldenFilterBtn);
    expect(goldenFilterBtn.getAttribute('aria-pressed')).toBe('true');

    fireEvent.click(screen.getByRole('button', { name: /Texto Aa/i }));
    fireEvent.change(screen.getByPlaceholderText(/Digite sua mensagem/i), {
      target: { value: 'Viva os noivos!' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Concluir Texto/i }));
    expect(screen.getByText('Viva os noivos!')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Emojis e GIFs/i }));
    fireEvent.click(screen.getByRole('button', { name: '🥂' }));
    expect(screen.getByText('🥂')).toBeTruthy();
  });
});
