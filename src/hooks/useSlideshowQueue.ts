'use client';

import { useCallback, useReducer } from 'react';
import { Post, TRANSITION_CLASSES, TransitionType } from '@/types/post';

export function pickRandomTransition(previous?: TransitionType): TransitionType {
  const candidates = previous ? TRANSITION_CLASSES.filter((t) => t !== previous) : TRANSITION_CLASSES;
  return candidates[Math.floor(Math.random() * candidates.length)] ?? 'fade-scale';
}

export interface SlideshowState {
  history: Post[];
  priority: Post[];
  historyIndex: number;
  current: Post | null;
  isPriority: boolean;
  transition: TransitionType;
  /** Incrementa a cada troca de slide; usado como key para reiniciar animação/timer. */
  slideKey: number;
}

type Action =
  | { type: 'load'; posts: Post[] }
  | { type: 'enqueue'; post: Post }
  | { type: 'next' }
  | { type: 'remove'; id: string };

export const initialSlideshowState: SlideshowState = {
  history: [],
  priority: [],
  historyIndex: 0,
  current: null,
  isPriority: false,
  transition: 'fade-scale',
  slideKey: 0,
};

/** Avança: primeiro esvazia a fila prioritária, depois volta ao ciclo do histórico. */
function advance(state: SlideshowState): SlideshowState {
  const transition = pickRandomTransition(state.transition);
  const slideKey = state.slideKey + 1;

  if (state.priority.length > 0) {
    const [next, ...rest] = state.priority;
    return { ...state, priority: rest, current: next, isPriority: true, transition, slideKey };
  }

  if (state.history.length === 0) {
    return { ...state, current: null, isPriority: false, transition, slideKey };
  }

  // Depois de um slide prioritário, retoma o histórico de onde parou
  const nextIndex = state.isPriority ? state.historyIndex : state.historyIndex + 1;
  const historyIndex = nextIndex % state.history.length;
  return {
    ...state,
    historyIndex,
    current: state.history[historyIndex],
    isPriority: false,
    transition,
    slideKey,
  };
}

export function slideshowReducer(state: SlideshowState, action: Action): SlideshowState {
  switch (action.type) {
    case 'load': {
      const known = new Set(state.history.map((p) => p.id));
      const history = [...state.history, ...action.posts.filter((p) => p.visible && !known.has(p.id))];
      if (state.current || history.length === 0) return { ...state, history };
      return { ...state, history, historyIndex: 0, current: history[0], slideKey: state.slideKey + 1 };
    }

    case 'enqueue': {
      const { post } = action;
      if (!post.visible || state.history.some((p) => p.id === post.id)) return state;
      const history = [...state.history, post];
      if (!state.current) {
        return {
          ...state,
          history,
          historyIndex: history.length - 1,
          current: post,
          isPriority: true,
          slideKey: state.slideKey + 1,
        };
      }
      return { ...state, history, priority: [...state.priority, post] };
    }

    case 'next':
      return advance(state);

    case 'remove': {
      const removedFromHistoryIndex = state.history.findIndex((p) => p.id === action.id);
      const history = state.history.filter((p) => p.id !== action.id);
      const priority = state.priority.filter((p) => p.id !== action.id);

      let historyIndex = state.historyIndex;
      if (removedFromHistoryIndex !== -1 && removedFromHistoryIndex < historyIndex) {
        historyIndex -= 1;
      }

      const next = { ...state, history, priority, historyIndex };
      if (state.current?.id !== action.id) return next;

      // Item atual foi ocultado/excluído: pula imediatamente para o próximo.
      // Se era um slide prioritário, o próximo do histórico deve avançar normalmente a partir do último visto.
      // Se era um slide do histórico, e foi removido na posição do cursor, o próximo elemento já desceu para historyIndex.
      const adjustedHistoryIndex = state.isPriority
        ? historyIndex
        : removedFromHistoryIndex === historyIndex
        ? historyIndex - 1
        : historyIndex;

      return advance({
        ...next,
        isPriority: false, // para que advance() incremente historyIndex para o próximo se não houver mais priority
        historyIndex: adjustedHistoryIndex,
      });
    }
  }
}

export function useSlideshowQueue(initialPosts: Post[] = []) {
  const [state, dispatch] = useReducer(slideshowReducer, initialPosts, (posts) =>
    slideshowReducer(initialSlideshowState, { type: 'load', posts })
  );

  const loadPosts = useCallback((posts: Post[]) => dispatch({ type: 'load', posts }), []);
  const enqueueRealtimePost = useCallback((post: Post) => dispatch({ type: 'enqueue', post }), []);
  const removeOrHidePost = useCallback((id: string) => dispatch({ type: 'remove', id }), []);
  const nextSlide = useCallback(() => dispatch({ type: 'next' }), []);

  return {
    currentPost: state.current,
    isPrioritySlide: state.isPriority,
    transition: state.transition,
    slideKey: state.slideKey,
    totalVisibleCount: state.history.length,
    loadPosts,
    enqueueRealtimePost,
    removeOrHidePost,
    nextSlide,
  };
}
