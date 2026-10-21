'use client';

import React from 'react';
import { Download, Eye, EyeOff, Trash2 } from 'lucide-react';
import { Post } from '@/types/post';
import { StoryRenderer } from '@/components/shared/StoryRenderer';
import { formatArchiveEntryName } from '@/lib/zipDownload';
import styles from './MediaCard.module.scss';

interface MediaCardProps {
  post: Post;
  index: number;
  onToggleVisible: (post: Post) => void;
  onDelete: (postId: string) => void;
}

export const MediaCard: React.FC<MediaCardProps> = ({
  post,
  index,
  onToggleVisible,
  onDelete,
}) => {
  const timeFormatted = new Date(post.created_at).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const handleIndividualDownload = async () => {
    try {
      const res = await fetch(post.media_url);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = formatArchiveEntryName(post, index);
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      window.open(post.media_url, '_blank');
    }
  };

  return (
    <article className={styles.card}>
      <div className={styles.previewWrapper}>
        <StoryRenderer post={post} autoPlay={false} muted loop />
      </div>

      <div className={styles.cardFooter}>
        <div className={styles.metaInfo}>
          <strong>{post.guest_name}</strong>
          <span>{timeFormatted}</span>
        </div>

        <div className={styles.actionsRow}>
          <button
            type="button"
            className={styles.actionBtn}
            onClick={handleIndividualDownload}
            title="Salvar arquivo"
          >
            <Download size={15} />
            <span>Salvar</span>
          </button>

          <button
            type="button"
            className={styles.actionBtn}
            onClick={() => onToggleVisible(post)}
            title={post.visible ? 'Ocultar do telão' : 'Mostrar no telão'}
          >
            {post.visible ? <EyeOff size={15} /> : <Eye size={15} />}
            <span>{post.visible ? 'Ocultar' : 'Mostrar'}</span>
          </button>

          <button
            type="button"
            className={`${styles.actionBtn} ${styles.dangerBtn}`}
            onClick={() => onDelete(post.id)}
            title="Excluir permanentemente"
            aria-label="Excluir"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>
    </article>
  );
};
