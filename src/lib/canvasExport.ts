import { FILTER_CSS_MAP, OverlayData } from '@/types/post';

const TARGET_WIDTH = 1080;
const TARGET_HEIGHT = 1920;

const TEXT_FONTS = {
  modern: 'bold 52px Inter, sans-serif',
  classic: 'bold 54px Georgia, serif',
  script: 'bold 60px cursive, serif',
} as const;

function getSourceSize(
  source: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement
): { width: number; height: number } {
  if (source instanceof HTMLVideoElement) {
    return { width: source.videoWidth, height: source.videoHeight };
  }
  if (source instanceof HTMLImageElement) {
    return {
      width: source.naturalWidth || source.width,
      height: source.naturalHeight || source.height,
    };
  }
  return { width: source.width, height: source.height };
}

export async function flattenPhotoToWebp(
  source: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
  overlay: OverlayData,
  mirrorHorizontal = false
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = TARGET_WIDTH;
  canvas.height = TARGET_HEIGHT;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Contexto 2D do Canvas indisponível');
  }

  // 1. Fundo escuro padrão
  ctx.fillStyle = '#0d0d11';
  ctx.fillRect(0, 0, TARGET_WIDTH, TARGET_HEIGHT);

  // 2. Mídia base com filtro, em modo cover (9:16)
  ctx.save();
  ctx.filter = FILTER_CSS_MAP[overlay.filter] || 'none';
  if (mirrorHorizontal) {
    ctx.translate(TARGET_WIDTH, 0);
    ctx.scale(-1, 1);
  }

  const { width: srcWidth, height: srcHeight } = getSourceSize(source);
  if (srcWidth > 0 && srcHeight > 0) {
    const scale = Math.max(TARGET_WIDTH / srcWidth, TARGET_HEIGHT / srcHeight);
    const drawW = srcWidth * scale;
    const drawH = srcHeight * scale;
    ctx.drawImage(
      source,
      (TARGET_WIDTH - drawW) / 2,
      (TARGET_HEIGHT - drawH) / 2,
      drawW,
      drawH
    );
  }
  ctx.restore();

  // 3. Elementos estáticos (textos e emojis); GIFs nunca chegam aqui
  for (const el of overlay.elements) {
    if (el.type === 'gif') continue;

    ctx.save();
    ctx.translate((el.x / 100) * TARGET_WIDTH, (el.y / 100) * TARGET_HEIGHT);
    ctx.rotate((el.rotation * Math.PI) / 180);
    ctx.scale(el.scale, el.scale);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (el.type === 'emoji') {
      ctx.font = '96px sans-serif';
      ctx.fillText(el.content, 0, 0);
    } else {
      ctx.font = TEXT_FONTS[el.fontFamily || 'modern'];
      const metrics = ctx.measureText(el.content);
      const boxW = metrics.width + 56;
      const boxH = 90;

      if (el.backgroundColor && el.backgroundColor !== 'transparent') {
        ctx.fillStyle = el.backgroundColor;
        ctx.beginPath();
        ctx.roundRect(-boxW / 2, -boxH / 2, boxW, boxH, 16);
        ctx.fill();
      }

      ctx.fillStyle = el.color || '#ffffff';
      ctx.fillText(el.content, 0, 0);
    }

    ctx.restore();
  }

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Falha ao gerar arquivo WebP no Canvas'));
      },
      'image/webp',
      0.86
    );
  });
}
