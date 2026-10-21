'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { GUEST_NAME_STORAGE_KEY, GuestWelcomeModal } from '@/components/capture/GuestWelcomeModal';
import { CameraView } from '@/components/capture/CameraView';
import { StoryEditor } from '@/components/capture/StoryEditor';
import { CapturedMedia } from '@/hooks/useCamera';
import styles from './page.module.scss';

const TOAST_DURATION_MS = 4000;

export default function GuestCapturePage() {
  const [guestName, setGuestName] = useState('');
  const [showNameModal, setShowNameModal] = useState(false);
  const [capturedMedia, setCapturedMedia] = useState<CapturedMedia | null>(null);
  const [sentToast, setSentToast] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(GUEST_NAME_STORAGE_KEY);
    if (saved) setGuestName(saved);
    else setShowNameModal(true);
  }, []);

  const discardMedia = useCallback(() => {
    setCapturedMedia((current) => {
      if (current) URL.revokeObjectURL(current.previewUrl);
      return null;
    });
  }, []);

  const handleSuccess = () => {
    discardMedia();
    setSentToast(true);
    window.setTimeout(() => setSentToast(false), TOAST_DURATION_MS);
  };

  const displayName = guestName || 'Convidado';

  return (
    <main>
      {showNameModal && (
        <GuestWelcomeModal
          initialName={guestName}
          onConfirm={(name) => {
            setGuestName(name);
            setShowNameModal(false);
          }}
        />
      )}

      {sentToast && <div className={styles.toast}>✨ Enviado! Olhe para o telão da festa!</div>}

      {capturedMedia ? (
        <StoryEditor media={capturedMedia} guestName={displayName} onCancel={discardMedia} onSuccess={handleSuccess} />
      ) : (
        <CameraView guestName={displayName} onChangeName={() => setShowNameModal(true)} onCapture={setCapturedMedia} />
      )}
    </main>
  );
}
