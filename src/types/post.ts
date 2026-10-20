export type MediaType = 'photo' | 'video' | 'boomerang';

export type FilterPreset =
  | 'original'
  | 'noiva-glow'
  | 'golden-hour'
  | 'pb-classico'
  | 'vintage-film'
  | 'alta-vibe';

export type FontStyle = 'modern' | 'classic' | 'script';

export type TransitionType = 'fade-scale' | 'cube-3d' | 'polaroid-drop' | 'blur-dissolve';

export const DEFAULT_PHOTO_DURATION_MS = 5000;
export const MAX_VIDEO_DURATION_MS = 10000;

export const FILTER_CSS_MAP: Record<FilterPreset, string> = {
  'original': 'none',
  'noiva-glow': 'brightness(1.08) contrast(0.95) saturate(1.1)',
  'golden-hour': 'sepia(0.25) saturate(1.3) brightness(1.05)',
  'pb-classico': 'grayscale(1) contrast(1.15)',
  'vintage-film': 'contrast(0.9) brightness(1.05) sepia(0.18) hue-rotate(-5deg)',
  'alta-vibe': 'saturate(1.4) contrast(1.1)',
};

export const FILTER_LABELS: Record<FilterPreset, string> = {
  'original': 'Original',
  'noiva-glow': 'Noiva Glow',
  'golden-hour': 'Golden Hour',
  'pb-classico': 'P&B Clássico',
  'vintage-film': 'Vintage Film',
  'alta-vibe': 'Alta Vibe',
};

export const TRANSITION_CLASSES: TransitionType[] = [
  'fade-scale',
  'cube-3d',
  'polaroid-drop',
  'blur-dissolve',
];

export interface OverlayElement {
  id: string;
  type: 'text' | 'emoji' | 'gif';
  content: string; // Texto, caractere emoji, ou URL do GIF/Sticker
  x: number; // 0 a 100 (%)
  y: number; // 0 a 100 (%)
  scale: number;
  rotation: number;
  color?: string;
  backgroundColor?: string;
  fontFamily?: FontStyle;
}

export interface OverlayData {
  filter: FilterPreset;
  elements: OverlayElement[];
}

export interface Post {
  id: string;
  guest_name: string;
  media_url: string;
  media_type: MediaType;
  duration_ms: number;
  has_animated_overlay: boolean;
  overlay_data: OverlayData | null;
  visible: boolean;
  created_at: string;
}
