'use client';

import React, { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { DEFAULT_PHOTO_DURATION_MS, MAX_VIDEO_DURATION_MS, Post } from '@/types/post';
import { useSlideshowQueue } from '@/hooks/useSlideshowQueue';
import { useRealtimePosts } from '@/hooks/useRealtimePosts';
import { fetchPosts } from '@/lib/supabase/posts';
import { StoryRenderer } from '@/components/shared/StoryRenderer';
import styles from './SlideshowStage.module.scss';

function slideDuration(post: Post): number {
  if (post.media_type !== 'video') return DEFAULT_PHOTO_DURATION_MS;
  return Math.min(post.duration_ms || DEFAULT_PHOTO_DURATION_MS, MAX_VIDEO_DURATION_MS);
}

/** Pré-carrega a mídia para a próxima troca não "piscar". */
function preload(post: Post) {
  if (post.media_type === 'photo') {
    const img = new Image();
    img.src = post.media_url;
  }
}

export const SlideshowStage: React.FC = () => {
  const [captureUrl, setCaptureUrl] = useState('');
  const {
    currentPost,
    isPrioritySlide,
    transition,
    slideKey,
    loadPosts,
    enqueueRealtimePost,
    removeOrHidePost,
    nextSlide,
  } = useSlideshowQueue();

  useEffect(() => {
    setCaptureUrl(window.location.origin);
    fetchPosts({ includeHidden: false })
      .then((posts) => {
        // fetchPosts vem do mais novo pro mais antigo; o telão cicla em ordem cronológica
        const chronological = [...posts].reverse();
        chronological.forEach(preload);
        loadPosts(chronological);
      })
      .catch(() => loadPosts([]));
  }, [loadPosts]);

  useRealtimePosts({
    onInsert: (post) => {
      preload(post);
      enqueueRealtimePost(post);
    },
    onUpdate: (post) => (post.visible ? enqueueRealtimePost(post) : removeOrHidePost(post.id)),
    onDelete: removeOrHidePost,
  });

  // Um timer por slide: reinicia só quando o slide troca (slideKey), não quando chegam posts novos
  useEffect(() => {
    if (!currentPost) return;
    const timer = window.setTimeout(nextSlide, slideDuration(currentPost));
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slideKey, nextSlide]);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen?.();
  };

  return (
    <div className={styles.wallViewport}>
      {currentPost?.media_type === 'photo' && (
        <div className={styles.ambientBg} style={{ backgroundImage: `url(${currentPost.media_url})` }} />
      )}

      <div className={styles.stageLayout}>
        {currentPost ? (
          <div key={slideKey} className={`${styles.storyCard} transition-${transition}`}>
            <div className={styles.progressHeader}>
              <div className={styles.progressBarTrack}>
                <div
                  className={styles.progressBarFill}
                  style={{ animationDuration: `${slideDuration(currentPost)}ms` }}
                />
              </div>
              <div className={styles.authorRow}>
                <span className={styles.authorName}>📸 {currentPost.guest_name}</span>
                {isPrioritySlide && <span className={styles.priorityBadge}>✨ Acabou de enviar!</span>}
              </div>
            </div>

            <StoryRenderer post={currentPost} autoPlay muted loop={currentPost.media_type === 'boomerang'} />
          </div>
        ) : (
          <div className={styles.emptyState}>
            <h1>Mural Ao Vivo do Casamento ✨</h1>
            <p>Aponte a câmera do seu celular para o QR Code ao lado e envie a primeira selfie da noite!</p>
          </div>
        )}

        <aside className={styles.sidePanel}>
          <h2>Apareça no Telão!</h2>
          <p>Escaneie o QR Code, tire sua selfie e decore seu story:</p>
          <div className={styles.qrBox}>{captureUrl && <QRCodeSVG value={captureUrl} size={190} />}</div>
          <p>Sem precisar baixar aplicativo ❤️</p>
        </aside>
      </div>

      <button type="button" className={styles.fullscreenBtn} onClick={toggleFullscreen}>
        ⛶ Tela cheia
      </button>
    </div>
  );
};
