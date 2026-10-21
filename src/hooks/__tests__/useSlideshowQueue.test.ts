import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { pickRandomTransition, useSlideshowQueue } from '../useSlideshowQueue';
import { Post } from '@/types/post';

const makePost = (id: string, guest = 'Convidado'): Post => ({
  id,
  guest_name: guest,
  media_url: `https://example.com/${id}.webp`,
  media_type: 'photo',
  duration_ms: 5000,
  has_animated_overlay: false,
  overlay_data: null,
  visible: true,
  created_at: new Date().toISOString(),
});

describe('useSlideshowQueue', () => {
  it('prioritizes newly arrived Realtime posts ahead of historical cycling and removes hidden posts immediately', () => {
    const { result } = renderHook(() => useSlideshowQueue([makePost('p1'), makePost('p2')]));

    expect(result.current.currentPost?.id).toBe('p1');
    expect(result.current.isPrioritySlide).toBe(false);

    act(() => result.current.enqueueRealtimePost(makePost('p3', 'Carla')));
    // Chegar post novo NÃO troca o slide atual
    expect(result.current.currentPost?.id).toBe('p1');

    act(() => result.current.nextSlide());
    expect(result.current.currentPost?.id).toBe('p3');
    expect(result.current.isPrioritySlide).toBe(true);

    // Ocultado no dashboard enquanto está no telão: pula na hora e retoma o histórico
    act(() => result.current.removeOrHidePost('p3'));
    expect(result.current.currentPost?.id).toBe('p2');
    expect(result.current.isPrioritySlide).toBe(false);
  });

  it('cycles the history in order and wraps around', () => {
    const { result } = renderHook(() => useSlideshowQueue([makePost('a'), makePost('b')]));
    act(() => result.current.nextSlide());
    expect(result.current.currentPost?.id).toBe('b');
    act(() => result.current.nextSlide());
    expect(result.current.currentPost?.id).toBe('a');
  });

  it('removing the current history slide shows the following one, and an empty wall shows nothing', () => {
    const { result } = renderHook(() => useSlideshowQueue([makePost('a'), makePost('b'), makePost('c')]));
    act(() => result.current.removeOrHidePost('a'));
    expect(result.current.currentPost?.id).toBe('b');

    act(() => {
      result.current.removeOrHidePost('b');
      result.current.removeOrHidePost('c');
    });
    expect(result.current.currentPost).toBeNull();
  });

  it('shows the first post immediately when the wall starts empty, and loads posts fetched later', () => {
    const { result } = renderHook(() => useSlideshowQueue([]));
    expect(result.current.currentPost).toBeNull();

    act(() => result.current.loadPosts([makePost('x'), makePost('y')]));
    expect(result.current.currentPost?.id).toBe('x');
    expect(result.current.totalVisibleCount).toBe(2);
  });

  it('picks a random transition from the 4 predefined transitions without repeating the previous one', () => {
    for (let i = 0; i < 15; i++) {
      expect(pickRandomTransition('cube-3d')).not.toBe('cube-3d');
    }
  });
});
