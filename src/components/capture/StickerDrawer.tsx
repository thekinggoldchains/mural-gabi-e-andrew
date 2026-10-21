'use client';

import React, { useState, useEffect } from 'react';
import {
  CURATED_WEDDING_GIFS,
  GifStickerItem,
  searchWeddingGifs,
  WEDDING_EMOJIS,
  WEDDING_STICKER_PHRASES,
} from '@/lib/giphy';
import styles from './StickerDrawer.module.scss';

interface StickerDrawerProps {
  onSelectEmoji: (emoji: string) => void;
  onSelectPhrase: (phrase: string) => void;
  onSelectGif: (gifUrl: string) => void;
  onClose: () => void;
}

const SEARCH_DEBOUNCE_MS = 350;

export const StickerDrawer: React.FC<StickerDrawerProps> = ({
  onSelectEmoji,
  onSelectPhrase,
  onSelectGif,
  onClose,
}) => {
  const [query, setQuery] = useState('');
  const [gifs, setGifs] = useState<GifStickerItem[]>(CURATED_WEDDING_GIFS);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      searchWeddingGifs(query).then((res) => {
        if (active) setGifs(res);
      });
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [query]);

  const pick = <T,>(fn: (v: T) => void, value: T) => {
    fn(value);
    onClose();
  };

  return (
    <div className={styles.drawerBackdrop} onClick={onClose}>
      <div className={styles.drawerSheet} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3>Stickers, Emojis & GIFs</h3>
          <button type="button" className={styles.closeBtn} onClick={onClose}>
            Fechar ✕
          </button>
        </div>

        <p className={styles.sectionTitle}>Stickers do Casamento</p>
        <div className={styles.phraseGrid}>
          {WEDDING_STICKER_PHRASES.map((phrase) => (
            <button key={phrase} type="button" className={styles.phraseBtn} onClick={() => pick(onSelectPhrase, phrase)}>
              {phrase}
            </button>
          ))}
        </div>

        <p className={styles.sectionTitle}>Emojis</p>
        <div className={styles.emojiGrid}>
          {WEDDING_EMOJIS.map((emoji) => (
            <button key={emoji} type="button" className={styles.emojiBtn} onClick={() => pick(onSelectEmoji, emoji)}>
              {emoji}
            </button>
          ))}
        </div>

        <p className={styles.sectionTitle}>GIFs Animados</p>
        <input
          type="search"
          className={styles.searchInput}
          placeholder="Buscar GIF (ex: festa, brinde, dança)..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className={styles.gifGrid}>
          {gifs.map((g) => (
            <button key={g.id} type="button" className={styles.gifCard} onClick={() => pick(onSelectGif, g.url)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={g.url} alt={g.title} loading="lazy" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
