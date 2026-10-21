import { jsPDF } from 'jspdf';

export interface QrPlacementOptions {
  canvasWidth: number;
  canvasHeight: number;
  scalePercent: number; // 15 to 70
  xPercent: number; // 0 to 100 (50 = centro horizontal)
  yPercent: number; // 0 to 100 (50 = centro vertical)
}

export interface QrRect {
  x: number;
  y: number;
  size: number;
}

export interface PresetTemplate {
  id: 'minimalist' | 'floral' | 'rustic';
  name: string;
  tagline: string;
  title: string;
  subtitle: string;
  instruction: string;
  bgGradient: [string, string];
  accentColor: string;
  textColor: string;
  mutedColor: string;
  borderColor: string;
}

export const PRESET_TEMPLATES: PresetTemplate[] = [
  {
    id: 'minimalist',
    name: 'Minimalista Clássico',
    tagline: 'Mural de Fotos ao Vivo',
    title: 'Gabi & Andrew',
    subtitle: '21 de Outubro de 2026',
    instruction: 'Aponte a câmera do seu celular para postar seus Stories e aparecer no Telão da festa!',
    bgGradient: ['#ffffff', '#faf7f2'],
    accentColor: '#c9a25d',
    textColor: '#1f1d1a',
    mutedColor: '#757068',
    borderColor: '#e8dcce',
  },
  {
    id: 'floral',
    name: 'Floral Dourado',
    tagline: 'Celebração do Amor',
    title: 'Gabi & Andrew',
    subtitle: 'Nossa História, Nossos Momentos',
    instruction: 'Tire fotos e grave vídeos! Suas lembranças serão projetadas no telão da pista de dança.',
    bgGradient: ['#fdfbf7', '#f4ede2'],
    accentColor: '#b88938',
    textColor: '#24201a',
    mutedColor: '#6e675b',
    borderColor: '#c9a25d',
  },
  {
    id: 'rustic',
    name: 'Rústico Chic',
    tagline: 'Mural Interativo dos Convidados',
    title: 'Gabi & Andrew',
    subtitle: 'Obrigado por celebrar com a gente!',
    instruction: 'Escaneie o QR Code, tire sua selfie ou faça um boomerang e faça parte do mural da festa!',
    bgGradient: ['#f8f4ee', '#ebdccb'],
    accentColor: '#8c6b3e',
    textColor: '#29231c',
    mutedColor: '#6b5e50',
    borderColor: '#a88d67',
  },
];

export function getPresetById(id: string): PresetTemplate | undefined {
  return PRESET_TEMPLATES.find((p) => p.id === id);
}

export function calculateQrPlacement(options: QrPlacementOptions): QrRect {
  const clampedScale = Math.min(Math.max(options.scalePercent, 15), 70);
  const clampedX = Math.min(Math.max(options.xPercent, 0), 100);
  const clampedY = Math.min(Math.max(options.yPercent, 0), 100);

  const size = Math.round((options.canvasWidth * clampedScale) / 100);
  const centerX = (options.canvasWidth * clampedX) / 100;
  const centerY = (options.canvasHeight * clampedY) / 100;

  const x = Math.round(centerX - size / 2);
  const y = Math.round(centerY - size / 2);

  return { x, y, size };
}

/**
 * Desenha o fundo artístico do preset em um canvas HTML5
 */
export function drawPresetToCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  preset: PresetTemplate
) {
  // 1. Fundo Gradiente
  const grad = ctx.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0, preset.bgGradient[0]);
  grad.addColorStop(1, preset.bgGradient[1]);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // 2. Moldura Decorativa
  const padding = Math.round(width * 0.05);
  ctx.strokeStyle = preset.borderColor;
  ctx.lineWidth = Math.max(2, Math.round(width * 0.003));
  ctx.strokeRect(padding, padding, width - padding * 2, height - padding * 2);

  // Moldura interna fina
  const innerPad = padding + Math.round(width * 0.015);
  ctx.strokeStyle = preset.accentColor;
  ctx.lineWidth = Math.max(1, Math.round(width * 0.0015));
  ctx.strokeRect(innerPad, innerPad, width - innerPad * 2, height - innerPad * 2);

  // 3. Tipografia Elegante
  ctx.textAlign = 'center';

  // Tagline superior
  ctx.font = `600 ${Math.round(width * 0.024)}px 'Inter', sans-serif`;
  ctx.fillStyle = preset.accentColor;
  ctx.letterSpacing = '3px';
  ctx.fillText(preset.tagline.toUpperCase(), width / 2, padding + Math.round(height * 0.06));

  // Título dos noivos (Estilo Playfair / Serifado)
  ctx.font = `bold ${Math.round(width * 0.065)}px 'Playfair Display', Georgia, serif`;
  ctx.fillStyle = preset.textColor;
  ctx.letterSpacing = '0px';
  ctx.fillText(preset.title, width / 2, padding + Math.round(height * 0.13));

  // Subtítulo
  ctx.font = `italic ${Math.round(width * 0.026)}px 'Playfair Display', Georgia, serif`;
  ctx.fillStyle = preset.mutedColor;
  ctx.fillText(preset.subtitle, width / 2, padding + Math.round(height * 0.17));

  // Divisor dourado elegante
  const dividerW = Math.round(width * 0.25);
  const divY = padding + Math.round(height * 0.19);
  ctx.strokeStyle = preset.accentColor;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(width / 2 - dividerW / 2, divY);
  ctx.lineTo(width / 2 + dividerW / 2, divY);
  ctx.stroke();

  // Instrução inferior para os convidados
  ctx.font = `500 ${Math.round(width * 0.026)}px 'Inter', sans-serif`;
  ctx.fillStyle = preset.textColor;
  const bottomY = height - padding - Math.round(height * 0.06);
  ctx.fillText(preset.instruction, width / 2, bottomY);
}

/**
 * Desenha o QR Code sobre o canvas com cartão de apoio branco arredondado e sombra
 */
export function drawQrOnCanvas(
  ctx: CanvasRenderingContext2D,
  qrImage: CanvasImageSource,
  placement: QrRect,
  withCardBackdrop = true
) {
  const { x, y, size } = placement;

  if (withCardBackdrop) {
    const cardPadding = Math.round(size * 0.08);
    const cardX = x - cardPadding;
    const cardY = y - cardPadding;
    const cardSize = size + cardPadding * 2;
    const radius = Math.round(cardSize * 0.06);

    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.12)';
    ctx.shadowBlur = Math.round(size * 0.06);
    ctx.shadowOffsetY = Math.round(size * 0.03);

    // Desenha caixa arredondada branca
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardSize, cardSize, radius);
    ctx.fill();

    // Borda sutil
    ctx.strokeStyle = 'rgba(201, 162, 93, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }

  // Desenha o QR Code propriamente dito
  ctx.drawImage(qrImage, x, y, size, size);
}

/**
 * Exporta o canvas montado como PDF de Alta Resolução padrão A4 para impressão
 */
export async function exportCanvasToPdf(
  canvas: HTMLCanvasElement,
  filename = 'QR_Code_Casamento_Gabi_Andrew.pdf'
): Promise<void> {
  const imgData = canvas.toDataURL('image/png', 1.0);
  const isLandscape = canvas.width > canvas.height;

  const pdf = new jsPDF({
    orientation: isLandscape ? 'landscape' : 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();

  pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
  pdf.save(filename);
}

/**
 * Faz download do canvas diretamente como imagem PNG de alta definição
 */
export function downloadCanvasAsPng(
  canvas: HTMLCanvasElement,
  filename = 'QR_Code_Casamento_Gabi_Andrew.png'
): void {
  const url = canvas.toDataURL('image/png', 1.0);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
