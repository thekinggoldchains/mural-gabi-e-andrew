'use client';

import React, { useRef } from 'react';
import { OverlayElement } from '@/types/post';
import { pixelToPercent } from '@/lib/overlayUtils';
import styles from './StoryEditor.module.scss';

interface DraggableOverlayProps {
  elements: OverlayElement[];
  onUpdateElement: (id: string, patch: Partial<OverlayElement>) => void;
  onRemoveElement: (id: string) => void;
}

export const DraggableOverlay: React.FC<DraggableOverlayProps> = ({
  elements,
  onUpdateElement,
  onRemoveElement,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const activeIdRef = useRef<string | null>(null);

  const handlePointerDown = (e: React.PointerEvent, id: string) => {
    e.stopPropagation();
    activeIdRef.current = id;
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent, id: string) => {
    if (activeIdRef.current !== id || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    onUpdateElement(id, {
      x: pixelToPercent(e.clientX - rect.left, rect.width),
      y: pixelToPercent(e.clientY - rect.top, rect.height),
    });
  };

  const handlePointerUp = (e: React.PointerEvent, id: string) => {
    if (activeIdRef.current !== id) return;
    activeIdRef.current = null;
    (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
  };

  return (
    <div ref={containerRef} className={styles.interactiveOverlay}>
      {elements.map((el) => (
        <div
          key={el.id}
          className={styles.draggableItem}
          style={{
            left: `${el.x}%`,
            top: `${el.y}%`,
            transform: `translate(-50%, -50%) scale(${el.scale}) rotate(${el.rotation}deg)`,
          }}
          onPointerDown={(e) => handlePointerDown(e, el.id)}
          onPointerMove={(e) => handlePointerMove(e, el.id)}
          onPointerUp={(e) => handlePointerUp(e, el.id)}
          onDoubleClick={() => onRemoveElement(el.id)}
          title="Arraste para mover • Toque duplo para remover"
        >
          {el.type === 'text' && (
            <div
              className={styles.textSticker}
              style={{
                color: el.color || '#ffffff',
                backgroundColor: el.backgroundColor || 'rgba(0,0,0,0.6)',
              }}
            >
              {el.content}
            </div>
          )}
          {el.type === 'emoji' && <div className={styles.emojiSticker}>{el.content}</div>}
          {el.type === 'gif' && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={el.content} alt="GIF Sticker" className={styles.gifSticker} draggable={false} />
          )}
        </div>
      ))}
    </div>
  );
};
