'use client';

import React, { useState } from 'react';
import styles from './GuestWelcomeModal.module.scss';

export const GUEST_NAME_STORAGE_KEY = 'gabi_guest_name';

interface GuestWelcomeModalProps {
  initialName?: string;
  onConfirm: (name: string) => void;
}

export const GuestWelcomeModal: React.FC<GuestWelcomeModalProps> = ({
  initialName = '',
  onConfirm,
}) => {
  const [name, setName] = useState(initialName);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    window.localStorage.setItem(GUEST_NAME_STORAGE_KEY, trimmed);
    onConfirm(trimmed);
  };

  return (
    <div className={styles.backdrop}>
      <form className={styles.card} onSubmit={handleSubmit}>
        <span className={styles.badge}>✨ Mural Ao Vivo</span>
        <h1 className={styles.title}>Bem-vindo à Festa!</h1>
        <p className={styles.subtitle}>
          Como você quer aparecer no telão quando enviar suas fotos e stories?
        </p>
        <input
          type="text"
          className={styles.input}
          placeholder="Ex: Tia Márcia, Primo Leo..."
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={32}
          autoFocus
        />
        <button type="submit" className={styles.submitBtn} disabled={!name.trim()}>
          Abrir Câmera 📸
        </button>
      </form>
    </div>
  );
};
