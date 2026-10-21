'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import {
  FileText,
  Download,
  QrCode,
  Upload,
  Move,
  AlignCenter,
  Check,
} from 'lucide-react';
import {
  PRESET_TEMPLATES,
  PresetTemplate,
  getPresetById,
  calculateQrPlacement,
  drawPresetToCanvas,
  drawQrOnCanvas,
  exportCanvasToPdf,
  downloadCanvasAsPng,
} from '@/lib/canvas/qrTemplateComposer';
import styles from './QrTemplateCustomizer.module.scss';

interface QrTemplateCustomizerProps {
  captureUrl: string;
}

export const QrTemplateCustomizer: React.FC<QrTemplateCustomizerProps> = ({
  captureUrl,
}) => {
  const [selectedPresetId, setSelectedPresetId] = useState<string>('floral');
  const [customImage, setCustomImage] = useState<HTMLImageElement | null>(null);
  const [scalePercent, setScalePercent] = useState<number>(32);
  const [xPercent, setXPercent] = useState<number>(50);
  const [yPercent, setYPercent] = useState<number>(55);
  const [withCardBackdrop, setWithCardBackdrop] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const qrCanvasRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Renderiza a composição no Canvas
  const renderComposition = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Busca o elemento canvas do QR Code gerado pelo QRCodeCanvas
    const qrCanvasElement = qrCanvasRef.current?.querySelector('canvas');
    if (!qrCanvasElement) return;

    // Dimensões de alta resolução (A4 proporção 1 : 1.414)
    let width = 1240;
    let height = 1754;

    if (selectedPresetId === 'custom' && customImage) {
      width = customImage.naturalWidth || 1240;
      height = customImage.naturalHeight || 1754;
    }

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    ctx.clearRect(0, 0, width, height);

    // 1. Desenha o fundo
    if (selectedPresetId === 'custom' && customImage) {
      ctx.drawImage(customImage, 0, 0, width, height);
    } else {
      const preset = getPresetById(selectedPresetId) || PRESET_TEMPLATES[0];
      drawPresetToCanvas(ctx, width, height, preset);
    }

    // 2. Calcula posição e desenha o QR Code
    const placement = calculateQrPlacement({
      canvasWidth: width,
      canvasHeight: height,
      scalePercent,
      xPercent,
      yPercent,
    });

    drawQrOnCanvas(ctx, qrCanvasElement, placement, withCardBackdrop);
  }, [selectedPresetId, customImage, scalePercent, xPercent, yPercent, withCardBackdrop]);

  useEffect(() => {
    // Renderiza assim que o QR Code e o componente montarem
    const timer = setTimeout(() => {
      renderComposition();
    }, 50);
    return () => clearTimeout(timer);
  }, [renderComposition]);

  // Upload de imagem personalizada
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        setCustomImage(img);
        setSelectedPresetId('custom');
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Interação de Arrastar com Mouse / Toque no Canvas
  const updatePositionFromPointer = (
    clientX: number,
    clientY: number,
    target: HTMLElement
  ) => {
    const rect = target.getBoundingClientRect();
    const x = Math.min(Math.max(((clientX - rect.left) / rect.width) * 100, 10), 90);
    const y = Math.min(Math.max(((clientY - rect.top) / rect.height) * 100, 10), 90);
    setXPercent(Math.round(x));
    setYPercent(Math.round(y));
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    updatePositionFromPointer(e.clientX, e.clientY, e.currentTarget);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    updatePositionFromPointer(e.clientX, e.clientY, e.currentTarget);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignora se não estiver capturado
    }
  };

  // Exportações
  const handleExportPdf = async () => {
    if (!canvasRef.current || isExporting) return;
    setIsExporting(true);
    try {
      await exportCanvasToPdf(canvasRef.current, 'Mural_Casamento_Gabi_Andrew_A4.pdf');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPng = () => {
    if (!canvasRef.current || isExporting) return;
    downloadCanvasAsPng(canvasRef.current, 'Mural_Casamento_Gabi_Andrew.png');
  };

  const handleExportQrOnly = () => {
    const qrCanvas = qrCanvasRef.current?.querySelector('canvas');
    if (!qrCanvas) return;
    downloadCanvasAsPng(qrCanvas, 'QRCode_Casamento_Gabi_Andrew.png');
  };

  return (
    <div className={styles.container}>
      {/* Container invisível para geração do QR Code vetorial offscreen */}
      <div ref={qrCanvasRef} className={styles.hiddenQrContainer}>
        <QRCodeCanvas value={captureUrl} size={1024} level="H" includeMargin />
      </div>

      {/* Coluna Esquerda: Preview Interativo */}
      <div className={styles.previewColumn}>
        <div
          className={styles.canvasWrapper}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          title="Clique ou arraste para reposicionar o QR Code"
        >
          <canvas ref={canvasRef} />
        </div>
        <span className={styles.dragHint}>
          <Move size={14} /> Toque ou arraste sobre o card para reposicionar o QR Code
        </span>
      </div>

      {/* Coluna Direita: Controles */}
      <div className={styles.controlsColumn}>
        <div className={styles.sectionHeader}>
          <h3>Template do QR Code da Festa</h3>
          <p>
            Escolha um modelo elegante ou envie sua arte do Canva para imprimir e espalhar pelas mesas:
          </p>
        </div>

        {/* 1. Escolha do Template */}
        <div className={styles.controlGroup}>
          <label>Modelo de Fundo</label>
          <div className={styles.presetsRow}>
            {PRESET_TEMPLATES.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className={`${styles.presetBtn} ${
                  selectedPresetId === preset.id ? styles.active : ''
                }`}
                onClick={() => setSelectedPresetId(preset.id)}
              >
                <span>{preset.name}</span>
                <span>{preset.tagline}</span>
              </button>
            ))}

            <button
              type="button"
              className={`${styles.presetBtn} ${
                selectedPresetId === 'custom' ? styles.active : ''
              }`}
              onClick={() => {
                if (!customImage) {
                  fileInputRef.current?.click();
                } else {
                  setSelectedPresetId('custom');
                }
              }}
            >
              <span>{customImage ? 'Minha Arte (Carregada)' : 'Carregar Minha Arte'}</span>
              <span>Canva, PNG ou JPG</span>
            </button>
          </div>

          <label
            className={styles.uploadBtn}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={16} />
            <span>{customImage ? 'Trocar Imagem do Canva' : 'Fazer Upload de Arte do Canva'}</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
            />
          </label>
        </div>

        {/* 2. Ajuste de Tamanho e Posição */}
        <div className={styles.controlGroup}>
          <label>
            Tamanho do QR Code <span>{scalePercent}%</span>
          </label>
          <div className={styles.sliderRow}>
            <input
              type="range"
              min={15}
              max={65}
              value={scalePercent}
              onChange={(e) => setScalePercent(Number(e.target.value))}
            />
          </div>
        </div>

        <div className={styles.controlGroup}>
          <label>
            Posição Vertical (Altura) <span>{yPercent}%</span>
          </label>
          <div className={styles.sliderRow}>
            <input
              type="range"
              min={15}
              max={85}
              value={yPercent}
              onChange={(e) => setYPercent(Number(e.target.value))}
            />
          </div>
        </div>

        <div className={styles.quickActions}>
          <button
            type="button"
            className={styles.centerBtn}
            onClick={() => setXPercent(50)}
          >
            <AlignCenter size={14} /> Centralizar Horizontalmente
          </button>

          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={withCardBackdrop}
              onChange={(e) => setWithCardBackdrop(e.target.checked)}
            />
            Moldura branca de apoio
          </label>
        </div>

        {/* 3. Ações de Download */}
        <div className={styles.exportSection}>
          <button
            type="button"
            className={styles.primaryPdfBtn}
            onClick={handleExportPdf}
            disabled={isExporting}
          >
            <FileText size={18} />
            <span>
              {isExporting ? 'Gerando PDF...' : 'Baixar PDF para Impressão (A4)'}
            </span>
          </button>

          <div className={styles.secondaryRow}>
            <button
              type="button"
              className={styles.secondaryBtn}
              onClick={handleExportPng}
              disabled={isExporting}
            >
              <Download size={16} />
              <span>Baixar PNG (300 DPI)</span>
            </button>

            <button
              type="button"
              className={styles.secondaryBtn}
              onClick={handleExportQrOnly}
              title="Baixar apenas o código QR sem fundo"
            >
              <QrCode size={16} />
              <span>Apenas QR Code</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
