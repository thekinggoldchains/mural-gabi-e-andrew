'use client';

import React, { useState, useRef } from 'react';
import { Send, Smile, Type, X } from 'lucide-react';
import { FILTER_CSS_MAP, FILTER_LABELS, FilterPreset, OverlayData, OverlayElement } from '@/types/post';
import { CapturedMedia } from '@/hooks/useCamera';
import { requiresJsonOverlay } from '@/lib/overlayUtils';
import { flattenPhotoToWebp } from '@/lib/canvasExport';
import { createPostRecord, uploadWeddingMedia } from '@/lib/supabase/posts';
import { DraggableOverlay } from './DraggableOverlay';
import { StickerDrawer } from './StickerDrawer';
import styles from './StoryEditor.module.scss';

interface StoryEditorProps {
  media: CapturedMedia;
  guestName: string;
  onCancel: () => void;
  onSuccess: () => void;
}

const TEXT_COLORS = ['#ffffff', '#c9a25d', '#ff5978', '#38bdf8', '#4ade80', '#111111'];

type NewElement = Omit<OverlayElement, 'id' | 'x' | 'y' | 'scale' | 'rotation'>;

function videoExtension(blob: Blob): string {
  return blob.type.includes('mp4') ? 'mp4' : 'webm';
}

export const StoryEditor: React.FC<StoryEditorProps> = ({ media, guestName, onCancel, onSuccess }) => {
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [filter, setFilter] = useState<FilterPreset>('original');
  const [elements, setElements] = useState<OverlayElement[]>([]);
  const [isTypingText, setIsTypingText] = useState(false);
  const [draftText, setDraftText] = useState('');
  const [draftColor, setDraftColor] = useState('#ffffff');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const addElement = (partial: NewElement) => {
    setElements((prev) => [
      ...prev,
      {
        id: `el_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        x: 50,
        y: 45,
        scale: 1,
        rotation: 0,
        ...partial,
      },
    ]);
  };

  const handleConfirmText = () => {
    const content = draftText.trim();
    if (content) {
      addElement({
        type: 'text',
        content,
        color: draftColor,
        backgroundColor: draftColor === '#111111' ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.6)',
        fontFamily: 'modern',
      });
    }
    setDraftText('');
    setIsTypingText(false);
  };

  const handleUpdateElement = (id: string, patch: Partial<OverlayElement>) => {
    setElements((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const handleRemoveElement = (id: string) => {
    setElements((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSendToWall = async () => {
    setIsUploading(true);
    setUploadError(null);
    try {
      const overlayData: OverlayData = { filter, elements };
      const useJsonOverlay = requiresJsonOverlay(media.mediaType, overlayData);
      const isPhoto = media.mediaType === 'photo';

      let finalBlob: Blob = media.blob;
      let ext = isPhoto ? 'webp' : videoExtension(media.blob);

      // Abordagem híbrida: fotos sem GIF saem "achatadas" num único .webp
      if (isPhoto && !useJsonOverlay && imageRef.current) {
        finalBlob = await flattenPhotoToWebp(imageRef.current, overlayData, media.mirrored);
        ext = 'webp';
      }

      const publicUrl = await uploadWeddingMedia(finalBlob, guestName, ext);
      await createPostRecord({
        guestName,
        mediaUrl: publicUrl,
        mediaType: media.mediaType,
        durationMs: media.durationMs,
        hasAnimatedOverlay: useJsonOverlay,
        overlayData: useJsonOverlay ? overlayData : null,
      });

      onSuccess();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Erro ao enviar. Tente novamente!');
    } finally {
      setIsUploading(false);
    }
  };

  const mediaStyle = { filter: FILTER_CSS_MAP[filter] };

  return (
    <div className={styles.editorViewport}>
      <div className={styles.mediaStage}>
        {media.mediaType === 'photo' ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img ref={imageRef} src={media.previewUrl} alt="Preview da captura" className={styles.previewMedia} style={mediaStyle} />
        ) : (
          <video
            src={media.previewUrl}
            className={styles.previewMedia}
            style={{ ...mediaStyle, transform: media.mirrored ? 'scaleX(-1)' : undefined }}
            autoPlay
            loop
            muted
            playsInline
          />
        )}

        <DraggableOverlay elements={elements} onUpdateElement={handleUpdateElement} onRemoveElement={handleRemoveElement} />
      </div>

      <div className={styles.topToolbar}>
        <button type="button" className={styles.toolBtn} onClick={onCancel} disabled={isUploading}>
          <X size={18} />
          <span>Descartar</span>
        </button>

        <div className={styles.toolGroup}>
          <button type="button" className={styles.toolBtn} onClick={() => setIsTypingText(true)} aria-label="Texto Aa">
            <Type size={18} />
            <span>Aa</span>
          </button>
          <button type="button" className={styles.toolBtn} onClick={() => setIsDrawerOpen(true)} aria-label="Emojis e GIFs">
            <Smile size={18} />
            <span>Stickers</span>
          </button>
        </div>
      </div>

      {isTypingText && (
        <div className={styles.textModal}>
          <input
            type="text"
            className={styles.textInput}
            placeholder="Digite sua mensagem..."
            value={draftText}
            onChange={(e) => setDraftText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleConfirmText()}
            style={{ color: draftColor }}
            maxLength={60}
            autoFocus
          />
          <div className={styles.colorRow}>
            {TEXT_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className={`${styles.colorSwatch} ${draftColor === c ? styles.selected : ''}`}
                style={{ backgroundColor: c }}
                onClick={() => setDraftColor(c)}
                aria-label={`Cor ${c}`}
              />
            ))}
          </div>
          <button type="button" className={styles.toolBtn} onClick={handleConfirmText}>
            Concluir Texto
          </button>
        </div>
      )}

      {isDrawerOpen && (
        <StickerDrawer
          onSelectEmoji={(emoji) => addElement({ type: 'emoji', content: emoji })}
          onSelectPhrase={(phrase) =>
            addElement({ type: 'text', content: phrase, color: '#ffffff', backgroundColor: 'rgba(201, 162, 93, 0.85)' })
          }
          onSelectGif={(gifUrl) => addElement({ type: 'gif', content: gifUrl })}
          onClose={() => setIsDrawerOpen(false)}
        />
      )}

      <div className={styles.bottomArea}>
        {uploadError && <div className={styles.errorBanner}>{uploadError}</div>}
        {elements.length > 0 && <p className={styles.hint}>Arraste para mover • toque duplo para remover</p>}

        <div className={styles.filterStrip}>
          {(Object.keys(FILTER_LABELS) as FilterPreset[]).map((fKey) => (
            <button
              key={fKey}
              type="button"
              className={`${styles.filterPill} ${filter === fKey ? styles.activeFilter : ''}`}
              onClick={() => setFilter(fKey)}
              aria-pressed={filter === fKey}
            >
              {FILTER_LABELS[fKey]}
            </button>
          ))}
        </div>

        <button type="button" className={styles.sendBtn} onClick={handleSendToWall} disabled={isUploading}>
          <Send size={18} />
          <span>{isUploading ? 'Enviando para o Telão...' : 'Enviar para o Telão ✨'}</span>
        </button>
      </div>
    </div>
  );
};
