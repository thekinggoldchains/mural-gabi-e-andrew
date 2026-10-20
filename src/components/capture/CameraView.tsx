'use client';

import React, { useRef } from 'react';
import { Image as ImageIcon, RefreshCw, User } from 'lucide-react';
import { DEFAULT_PHOTO_DURATION_MS, MAX_VIDEO_DURATION_MS, MediaType } from '@/types/post';
import { CapturedMedia, useCamera } from '@/hooks/useCamera';
import styles from './CameraView.module.scss';

interface CameraViewProps {
  guestName: string;
  onChangeName: () => void;
  onCapture: (media: CapturedMedia) => void;
}

const MODE_LABELS: Record<MediaType, string> = {
  photo: 'Foto',
  boomerang: 'Boomerang',
  video: 'Vídeo 10s',
};

const RING_RADIUS = 41;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export const CameraView: React.FC<CameraViewProps> = ({ guestName, onChangeName, onCapture }) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const {
    videoRef,
    facingMode,
    mode,
    setMode,
    isRecording,
    progress,
    cameraError,
    toggleFacingMode,
    capturePhoto,
    startVideoOrBoomerang,
    stopRecordingEarly,
  } = useCamera(onCapture);

  const handleShutterClick = () => {
    if (mode === 'photo') capturePhoto();
    else if (isRecording) stopRecordingEarly();
    else startVideoOrBoomerang();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const isVideo = file.type.startsWith('video/');
    onCapture({
      blob: file,
      previewUrl: URL.createObjectURL(file),
      mediaType: isVideo ? 'video' : 'photo',
      durationMs: isVideo ? MAX_VIDEO_DURATION_MS : DEFAULT_PHOTO_DURATION_MS,
      mirrored: false,
    });
  };

  const openGallery = () => fileInputRef.current?.click();

  return (
    <div className={styles.viewport}>
      <video
        ref={videoRef}
        className={`${styles.videoFeed} ${facingMode === 'user' ? styles.mirrored : ''}`}
        autoPlay
        muted
        playsInline
      />

      <div className={styles.topBar}>
        <button type="button" className={styles.guestBadge} onClick={onChangeName} title="Trocar seu nome">
          <User size={15} />
          <span>{guestName}</span>
        </button>
      </div>

      {cameraError && (
        <div className={styles.errorOverlay}>
          <p>{cameraError}</p>
          <button type="button" className={styles.guestBadge} onClick={openGallery}>
            Escolher Foto ou Vídeo do Celular
          </button>
        </div>
      )}

      <div className={styles.bottomBar}>
        <div className={styles.modeSelector}>
          {(Object.keys(MODE_LABELS) as MediaType[]).map((m) => (
            <button
              key={m}
              type="button"
              className={`${styles.modeBtn} ${mode === m ? styles.active : ''}`}
              onClick={() => setMode(m)}
              disabled={isRecording}
            >
              {MODE_LABELS[m]}
            </button>
          ))}
        </div>

        <div className={styles.controlsRow}>
          <button type="button" className={styles.iconBtn} onClick={openGallery} aria-label="Abrir galeria">
            <ImageIcon size={22} />
          </button>

          <div className={styles.shutterWrap}>
            {isRecording && (
              <svg className={styles.progressRing} viewBox="0 0 86 86">
                <circle
                  cx="43"
                  cy="43"
                  r={RING_RADIUS}
                  strokeDasharray={RING_CIRCUMFERENCE}
                  strokeDashoffset={RING_CIRCUMFERENCE * (1 - progress / 100)}
                />
              </svg>
            )}
            <button
              type="button"
              className={`${styles.shutterBtn} ${isRecording ? styles.recording : ''}`}
              onClick={handleShutterClick}
              aria-label="Disparar câmera"
              disabled={Boolean(cameraError)}
            >
              <div className={styles.shutterInner} />
            </button>
          </div>

          <button type="button" className={styles.iconBtn} onClick={toggleFacingMode} aria-label="Virar câmera">
            <RefreshCw size={20} />
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          className={styles.hiddenFileInput}
          onChange={handleFileUpload}
        />
      </div>
    </div>
  );
};
