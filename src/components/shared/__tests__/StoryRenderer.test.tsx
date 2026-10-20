import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { StoryRenderer } from '../StoryRenderer';
import { Post } from '@/types/post';

describe('StoryRenderer', () => {
  it('renders media and mounts JSON overlay elements when has_animated_overlay is true', () => {
    const mockPost: Post = {
      id: 'post-1',
      guest_name: 'Camila',
      media_url: 'https://example.com/video.mp4',
      media_type: 'video',
      duration_ms: 6000,
      has_animated_overlay: true,
      visible: true,
      created_at: new Date().toISOString(),
      overlay_data: {
        filter: 'golden-hour',
        elements: [
          {
            id: 'el-text',
            type: 'text',
            content: 'Viva a Gabi!',
            x: 50,
            y: 75,
            scale: 1,
            rotation: 0,
            color: '#ffffff',
          },
          {
            id: 'el-gif',
            type: 'gif',
            content: 'https://media.giphy.com/party.gif',
            x: 30,
            y: 30,
            scale: 1.2,
            rotation: 10,
          },
        ],
      },
    };

    render(<StoryRenderer post={mockPost} />);
    expect(screen.getByText('Viva a Gabi!')).toBeTruthy();
    expect(screen.getByAltText('Sticker animado')).toBeTruthy();
  });
});
