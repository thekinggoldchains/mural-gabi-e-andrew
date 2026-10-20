'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { DEFAULT_PHOTO_DURATION_MS, MAX_VIDEO_DURATION_MS, MediaType } from '@/types/post';

export interface CapturedMedia {
  blob: Blob;
  previewUrl: string;
  mediaType: MediaType;
  durationMs: number;
  mirrored: boolean;
}

const BOOMERANG_CAPTURE_MS = 1600;

function pickRecorderMimeType(): string {
  const candidates = ['video/webm;codecs=vp9', 'video/webm', 'video/mp4'];
  return candidates.find((t) => MediaRecorder.isTypeSupported(t)) ?? '';
}

export function useCamera(onCapture: (media: CapturedMedia) => void) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);

  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [mode, setMode] = useState<MediaType>('photo');
  const [isRecording, setIsRecording] = useState(false);
  const [progress, setProgress] = useState(0);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    let cancelled = false;
    stopStream();
    setCameraError(null);

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError(
        'Seu navegador não liberou a câmera. Você pode tirar foto ou escolher da galeria no botão abaixo!'
      );
      return;
    }

    navigator.mediaDevices
      .getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch(() => {
        if (!cancelled) {
          setCameraError(
            'Não foi possível acessar a câmera diretamente. Você pode tirar foto ou escolher da galeria no botão abaixo!'
          );
        }
      });

    return () => {
      cancelled = true;
      stopStream();
    };
  }, [facingMode, stopStream]);

  const toggleFacingMode = useCallback(() => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  }, []);

  const capturePhoto = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // A câmera frontal é espelhada já aqui, para a foto ficar igual ao preview
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        onCapture({
          blob,
          previewUrl: URL.createObjectURL(blob),
          mediaType: 'photo',
          durationMs: DEFAULT_PHOTO_DURATION_MS,
          mirrored: false,
        });
      },
      'image/webp',
      0.9
    );
  }, [facingMode, onCapture]);

  const startVideoOrBoomerang = useCallback(() => {
    const stream = streamRef.current;
    if (!stream || isRecording || mode === 'photo') return;

    const recordingMode = mode;
    const maxDuration = recordingMode === 'boomerang' ? BOOMERANG_CAPTURE_MS : MAX_VIDEO_DURATION_MS;
    const chunks: BlobPart[] = [];
    const mimeType = pickRecorderMimeType();
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    recorderRef.current = recorder;
    const startTime = Date.now();
    setIsRecording(true);
    setProgress(0);

    const interval = window.setInterval(() => {
      const elapsed = Date.now() - startTime;
      setProgress(Math.min(100, (elapsed / maxDuration) * 100));
      if (elapsed >= maxDuration && recorder.state === 'recording') recorder.stop();
    }, 60);

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstop = () => {
      window.clearInterval(interval);
      setIsRecording(false);
      setProgress(0);
      const durationMs =
        recordingMode === 'boomerang'
          ? DEFAULT_PHOTO_DURATION_MS
          : Math.min(MAX_VIDEO_DURATION_MS, Math.max(2500, Date.now() - startTime));
      const blob = new Blob(chunks, { type: recorder.mimeType || 'video/webm' });
      onCapture({
        blob,
        previewUrl: URL.createObjectURL(blob),
        mediaType: recordingMode,
        durationMs,
        mirrored: facingMode === 'user',
      });
    };

    recorder.start();
  }, [facingMode, isRecording, mode, onCapture]);

  const stopRecordingEarly = useCallback(() => {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
  }, []);

  return {
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
  };
}
