'use client';

import { useEffect, useRef } from 'react';
import { Post } from '@/types/post';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

interface RealtimeCallbacks {
  onInsert?: (post: Post) => void;
  onUpdate?: (post: Post) => void;
  onDelete?: (id: string) => void;
}

/**
 * Assina INSERT/UPDATE/DELETE da tabela `posts`. Os callbacks ficam num ref,
 * então o canal é criado uma única vez, mesmo que o componente re-renderize.
 */
export function useRealtimePosts(callbacks: RealtimeCallbacks) {
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    const channel = supabase
      .channel(`wedding-posts-${Math.random().toString(36).slice(2, 8)}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, (payload) => {
        callbacksRef.current.onInsert?.(payload.new as Post);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'posts' }, (payload) => {
        callbacksRef.current.onUpdate?.(payload.new as Post);
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'posts' }, (payload) => {
        const old = payload.old as Partial<Post>;
        if (old?.id) callbacksRef.current.onDelete?.(String(old.id));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
}
