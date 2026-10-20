'use client';

import React from 'react';
import { FILTER_CSS_MAP, Post } from '@/types/post';
import styles from './StoryRenderer.module.scss';

interface StoryRendererProps {
  post: Post;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
  onEnded?: () => void;
  className?: string;
}

export const StoryRenderer: React.FC<StoryRendererProps> = ({
  post,
  autoPlay = true,
  muted = true,
  loop = true,
  onEnded,
  className,
}) => {
  const overlay = post.has_animated_overlay ? post.overlay_data : null;
  const filterCss = overlay ? FILTER_CSS_MAP[overlay.filter] || 'none' : 'none';
  const isVideo = post.media_type === 'video' || post.media_type === 'boomerang';

  return (
    <div className={`${styles.storyContainer} ${className || ''}`}>
      {isVideo ? (
        <video
          src={post.media_url}
          className={styles.mediaElement}
          style={{ filter: filterCss }}
          autoPlay={autoPlay}
          muted={muted}
          loop={loop}
          playsInline
          onEnded={onEnded}
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.media_url}
          alt={`Foto enviada por ${post.guest_name}`}
          className={styles.mediaElement}
          style={{ filter: filterCss }}
        />
      )}

      {overlay && (
        <div className={styles.overlayLayer}>
          {overlay.elements.map((el) => (
            <div
              key={el.id}
              className={styles.overlayItem}
              style={{
                left: `${el.x}%`,
                top: `${el.y}%`,
                transform: `translate(-50%, -50%) scale(${el.scale}) rotate(${el.rotation}deg)`,
              }}
            >
              {el.type === 'text' && (
                <div
                  className={`${styles.textBadge} ${styles[el.fontFamily || 'modern']}`}
                  style={{
                    color: el.color || '#ffffff',
                    backgroundColor: el.backgroundColor || 'rgba(0,0,0,0.55)',
                  }}
                >
                  {el.content}
                </div>
              )}
              {el.type === 'emoji' && <div className={styles.emojiItem}>{el.content}</div>}
              {el.type === 'gif' && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={el.content} alt="Sticker animado" className={styles.gifItem} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
