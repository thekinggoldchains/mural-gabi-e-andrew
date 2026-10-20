# GabiFotoMural Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir o **GabiFotoMural**, uma plataforma web interativa para casamento composta por captura/edição estilo Instagram Stories para convidados (`/`), telão ao vivo com transições aleatórias e fila prioritária em tempo real (`/telao`), e dashboard administrativo com menu lateral e download em `.zip` para a noiva (`/dashboard`).

**Architecture:** Aplicação Next.js (App Router + TypeScript) estilizada exclusivamente com SASS/SCSS Modules (zero Tailwind) integrada ao Supabase (Storage para mídias, PostgreSQL para metadados e Realtime para sincronização instantânea entre celulares, telão e dashboard). Utiliza renderização híbrida: fotos estáticas são achatadas (*flattened*) em `.webp` via HTML5 Canvas no cliente, enquanto vídeos curtos, boomerangs e fotos com GIFs animados salvam metadados posicionais (`0–100%`) em JSON (`overlay_data`) e são reproduzidos de forma idêntica pelo componente `<StoryRenderer />`.

**Architecture Diagram:**

```mermaid
graph TD
    subgraph "Rota Convidado (/)"
        Welcome[GuestWelcomeModal] --> Cam[CameraView + useCamera]
        Cam --> Editor[StoryEditor + StickerDrawer]
        Editor --> Export[canvasExport / overlayUtils]
    end

    subgraph "Camada Compartilhada & Supabase"
        Export --> SupaClient[Supabase Browser Client]
        SupaClient --> Storage[(Bucket: wedding-media)]
        SupaClient --> DB[(Table: posts)]
        DB --> Realtime[useRealtimePosts]
        Renderer[StoryRenderer]
    end

    subgraph "Rota Telão (/telao)"
        Realtime --> Queue[useSlideshowQueue]
        Queue --> Stage[SlideshowStage + Transitions SCSS]
        Stage --> Renderer
    end

    subgraph "Rota Dashboard (/dashboard)"
        Auth[API /api/auth + Cookie] --> DashPage[Dashboard + Sidebar]
        Realtime --> DashPage
        DashPage --> ModAPI[API /api/posts/[id]]
        DashPage --> Zip[zipDownload JSZip]
    end
```

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript, SASS (`sass`), Supabase (`@supabase/supabase-js`), JSZip (`jszip`), QRCode (`qrcode.react`), Lucide Icons (`lucide-react`), Vitest + Testing Library (`vitest`, `@testing-library/react`, `jsdom`).

**Spec:** [2026-10-21-gabi-foto-mural-design.md](file:///c:/Projetos/GabiFotoMural/docs/superpowers/specs/2026-10-21-gabi-foto-mural-design.md)

## Global Constraints

- **PROIBIDO usar Tailwind CSS**: Toda a estilização deve ser feita com SASS/SCSS Modules (`*.module.scss`) e variáveis globais em `src/styles/`.
- **Coordenadas Relativas**: Posições `x` e `y` de textos, emojis e GIFs em `overlay_data` devem ser salvas em porcentagem (`0` a `100`) relativas ao container `9:16`.
- **Tempos do Telão**: Fotos e Boomerangs têm duração padrão de `5000ms` (5 segundos); vídeos respeitam sua duração até o limite de `10000ms` (10 segundos).
- **Fila Prioritária**: Novas mídias recebidas via Realtime (`INSERT`) entram na fila prioritária (`priorityQueue`) do telão para exibição imediata após o término do slide atual.
- **Idioma da Interface**: Toda a UI voltada aos convidados e à noiva deve estar em Português (PT-BR).

---

### Task 1: Inicialização do Projeto Next.js, Vitest, SASS Base e Tipos Core

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `vitest.config.ts`
- Create: `src/types/post.ts`
- Create: `src/styles/_variables.scss`
- Create: `src/styles/_mixins.scss`
- Create: `src/styles/_transitions.scss`
- Create: `src/styles/globals.scss`
- Create: `src/app/layout.tsx`
- Test: `src/types/__tests__/post.test.ts`

**Interfaces:**
- Consumes: Nenhuma (tarefa fundacional).
- Produces:
  - `MediaType = 'photo' | 'video' | 'boomerang'`
  - `FilterPreset = 'original' | 'noiva-glow' | 'golden-hour' | 'pb-classico' | 'vintage-film' | 'alta-vibe'`
  - `OverlayElement`, `OverlayData`, `Post`, `FILTER_CSS_MAP`, `TRANSITION_CLASSES` em `src/types/post.ts`

- [ ] **Step 1: Inicializar repositório Git e criar `package.json`, `tsconfig.json`, `next.config.ts` e `vitest.config.ts`**

Create `package.json`:
```json
{
  "name": "gabi-foto-mural",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.49.1",
    "jszip": "^3.10.1",
    "lucide-react": "^0.475.0",
    "next": "^15.1.7",
    "qrcode.react": "^4.2.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.2.0",
    "@types/node": "^22.13.4",
    "@types/react": "^19.0.8",
    "@types/react-dom": "^19.0.3",
    "@vitejs/plugin-react": "^4.3.4",
    "jsdom": "^26.0.0",
    "sass": "^1.85.0",
    "typescript": "^5.7.3",
    "vitest": "^3.0.6"
  }
}
```

Create `tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

Create `next.config.ts`:
```typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' }
    ]
  }
};

export default nextConfig;
```

Create `vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

- [ ] **Step 2: Instalar dependências e escrever o teste falhando para `src/types/post.ts`**

Run: `npm install`

Create `src/types/__tests__/post.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { FILTER_CSS_MAP, TRANSITION_CLASSES, DEFAULT_PHOTO_DURATION_MS } from '../post';

describe('Post Types & Constants', () => {
  it('defines the 6 Instagram-style wedding filter presets with valid CSS filter strings', () => {
    expect(Object.keys(FILTER_CSS_MAP)).toEqual([
      'original',
      'noiva-glow',
      'golden-hour',
      'pb-classico',
      'vintage-film',
      'alta-vibe',
    ]);
    expect(FILTER_CSS_MAP['original']).toBe('none');
    expect(FILTER_CSS_MAP['golden-hour']).toContain('sepia');
  });

  it('defines the 4 random slideshow transition classes and 5000ms default photo duration', () => {
    expect(TRANSITION_CLASSES).toEqual([
      'fade-scale',
      'cube-3d',
      'polaroid-drop',
      'blur-dissolve',
    ]);
    expect(DEFAULT_PHOTO_DURATION_MS).toBe(5000);
  });
});
```

- [ ] **Step 3: Rodar o teste para confirmar que falha**

Run: `npx vitest run src/types/__tests__/post.test.ts`
Expected: FAIL (`Cannot find module '../post'`)

- [ ] **Step 4: Implementar `src/types/post.ts`, arquivos base SASS/SCSS e `src/app/layout.tsx`**

Create `src/types/post.ts`:
```typescript
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
```

Create `src/styles/_variables.scss`:
```scss
$color-bg-dark: #0d0d11;
$color-bg-light: #faf8f5;
$color-surface-light: #ffffff;
$color-champagne: #f3ece2;
$color-gold: #c9a25d;
$color-gold-hover: #b38b45;
$color-text-primary: #1f1d1a;
$color-text-muted: #6e6a63;
$color-danger: #d94646;
$color-success: #2e9b68;

$font-sans: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
$font-serif: 'Playfair Display', Georgia, serif;
$font-script: 'Dancing Script', cursive, serif;

$radius-sm: 8px;
$radius-md: 14px;
$radius-lg: 24px;
$radius-full: 9999px;

$z-overlay: 20;
$z-drawer: 40;
$z-modal: 60;
```

Create `src/styles/_mixins.scss`:
```scss
@use 'variables' as *;

@mixin flex-center {
  display: flex;
  align-items: center;
  justify-content: center;
}

@mixin glass-panel($opacity: 0.55) {
  background: rgba(15, 15, 20, $opacity);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.14);
}

@mixin story-aspect-box {
  aspect-ratio: 9 / 16;
  position: relative;
  overflow: hidden;
}

@mixin desktop {
  @media (min-width: 768px) {
    @content;
  }
}
```

Create `src/styles/_transitions.scss`:
```scss
@keyframes fadeScaleIn {
  0% {
    opacity: 0;
    transform: scale(1.06);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes cube3dIn {
  0% {
    opacity: 0;
    transform: perspective(1200px) rotateY(75deg) scale(0.92);
  }
  100% {
    opacity: 1;
    transform: perspective(1200px) rotateY(0deg) scale(1);
  }
}

@keyframes polaroidDropIn {
  0% {
    opacity: 0;
    transform: translateY(-45px) rotate(-3deg) scale(0.96);
  }
  100% {
    opacity: 1;
    transform: translateY(0) rotate(0deg) scale(1);
  }
}

@keyframes blurDissolveIn {
  0% {
    opacity: 0;
    filter: blur(22px);
    transform: scale(1.03);
  }
  100% {
    opacity: 1;
    filter: blur(0px);
    transform: scale(1);
  }
}

.transition-fade-scale {
  animation: fadeScaleIn 0.65s cubic-bezier(0.22, 1, 0.36, 1) forwards;
}

.transition-cube-3d {
  animation: cube3dIn 0.75s cubic-bezier(0.22, 1, 0.36, 1) forwards;
}

.transition-polaroid-drop {
  animation: polaroidDropIn 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

.transition-blur-dissolve {
  animation: blurDissolveIn 0.75s ease-out forwards;
}
```

Create `src/styles/globals.scss`:
```scss
@use 'variables' as *;
@use 'transitions';

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html,
body {
  font-family: $font-sans;
  background-color: $color-bg-light;
  color: $color-text-primary;
  -webkit-font-smoothing: antialiased;
}

button {
  font-family: inherit;
  cursor: pointer;
}
```

Create `src/app/layout.tsx`:
```tsx
import type { Metadata } from 'next';
import '@/styles/globals.scss';

export const metadata: Metadata = {
  title: 'Mural de Fotos & Stories do Casamento',
  description: 'Tire sua selfie e apareça no telão da festa!',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 5: Rodar o teste e fazer commit**

Run: `npx vitest run src/types/__tests__/post.test.ts`
Expected: PASS

```bash
git init
git add .
git commit -m "feat: initialize Next.js with SCSS modules, Vitest, and core Post types"
```

---

### Task 2: Infraestrutura Supabase (Schema SQL, Clientes Browser/Admin e Helpers de Upload/Post)

**Files:**
- Create: `supabase/schema.sql`
- Create: `.env.example`
- Create: `src/lib/supabase/client.ts`
- Create: `src/lib/supabase/admin.ts`
- Create: `src/lib/supabase/posts.ts`
- Test: `src/lib/supabase/__tests__/posts.test.ts`

**Interfaces:**
- Consumes: `Post`, `MediaType`, `OverlayData` de `src/types/post.ts`
- Produces:
  - `getSupabaseBrowserClient()` em `src/lib/supabase/client.ts`
  - `getSupabaseAdminClient()` em `src/lib/supabase/admin.ts`
  - `uploadWeddingMedia(blob: Blob, ext: string): Promise<string>` em `src/lib/supabase/posts.ts`
  - `createPostRecord(input: CreatePostInput): Promise<Post>` em `src/lib/supabase/posts.ts`
  - `fetchPosts(options?: { includeHidden?: boolean }): Promise<Post[]>` em `src/lib/supabase/posts.ts`

- [ ] **Step 1: Escrever o teste falhando para `src/lib/supabase/posts.ts`**

Create `src/lib/supabase/__tests__/posts.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest';
import { buildStorageFileName, preparePostInsertPayload } from '../posts';

describe('Supabase Posts Service Helpers', () => {
  it('generates a sanitized unique file name for wedding media uploads', () => {
    const fileName = buildStorageFileName('Maria Clara!', 'webp', 1700000000000);
    expect(fileName).toMatch(/^1700000000000_maria_clara_[a-z0-9]+\.webp$/);
  });

  it('prepares post insert payload with 5000ms default for photos and clamps video duration to 10000ms', () => {
    const photoPayload = preparePostInsertPayload({
      guestName: '  João Pedro ',
      mediaUrl: 'https://example.com/photo.webp',
      mediaType: 'photo',
      hasAnimatedOverlay: false,
      overlayData: null,
    });

    expect(photoPayload.guest_name).toBe('João Pedro');
    expect(photoPayload.duration_ms).toBe(5000);
    expect(photoPayload.visible).toBe(true);

    const videoPayload = preparePostInsertPayload({
      guestName: 'Ana',
      mediaUrl: 'https://example.com/vid.mp4',
      mediaType: 'video',
      durationMs: 14500,
      hasAnimatedOverlay: true,
      overlayData: { filter: 'golden-hour', elements: [] },
    });

    expect(videoPayload.duration_ms).toBe(10000);
    expect(videoPayload.has_animated_overlay).toBe(true);
  });
});
```

- [ ] **Step 2: Rodar o teste para confirmar que falha**

Run: `npx vitest run src/lib/supabase/__tests__/posts.test.ts`
Expected: FAIL (`Cannot find module '../posts'`)

- [ ] **Step 3: Criar `supabase/schema.sql`, `.env.example` e implementar os módulos Supabase**

Create `supabase/schema.sql`:
```sql
-- Criação do bucket público de mídia
insert into storage.buckets (id, name, public)
values ('wedding-media', 'wedding-media', true)
on conflict (id) do nothing;

-- Políticas de Storage para convidados enviarem e visualizarem mídias
create policy "Leitura publica wedding-media"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'wedding-media');

create policy "Upload publico wedding-media"
on storage.objects for insert
to anon, authenticated
with check (bucket_id = 'wedding-media');

-- Tabela principal de postagens
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  guest_name text not null,
  media_url text not null,
  media_type text not null check (media_type in ('photo', 'video', 'boomerang')),
  duration_ms integer not null default 5000,
  has_animated_overlay boolean not null default false,
  overlay_data jsonb null,
  visible boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_posts_created_at on public.posts (created_at desc);
create index if not exists idx_posts_visible on public.posts (visible);

alter table public.posts enable row level security;

create policy "Convidados podem ler posts"
on public.posts for select
to anon, authenticated
using (true);

create policy "Convidados podem criar posts"
on public.posts for insert
to anon, authenticated
with check (true);

-- Ativar Realtime na tabela posts
alter publication supabase_realtime add table public.posts;
```

Create `.env.example`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon-publica
SUPABASE_SERVICE_ROLE_KEY=sua-chave-service-role-secreta
DASHBOARD_PASSWORD=casamentogabi
NEXT_PUBLIC_GIPHY_API_KEY=dc6zaTOxFJmzC
```

Create `src/lib/supabase/client.ts`:
```typescript
import { createClient, SupabaseClient } from '@supabase/supabase-js';

let browserClient: SupabaseClient | null = null;

export function getSupabaseBrowserClient(): SupabaseClient {
  if (browserClient) return browserClient;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

  browserClient = createClient(supabaseUrl, supabaseAnonKey);
  return browserClient;
}
```

Create `src/lib/supabase/admin.ts`:
```typescript
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export function getSupabaseAdminClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    'placeholder-service-key';

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
}
```

Create `src/lib/supabase/posts.ts`:
```typescript
import {
  DEFAULT_PHOTO_DURATION_MS,
  MAX_VIDEO_DURATION_MS,
  MediaType,
  OverlayData,
  Post,
} from '@/types/post';
import { getSupabaseBrowserClient } from './client';

export const STORAGE_BUCKET = 'wedding-media';

export interface CreatePostInput {
  guestName: string;
  mediaUrl: string;
  mediaType: MediaType;
  durationMs?: number;
  hasAnimatedOverlay: boolean;
  overlayData: OverlayData | null;
}

export function buildStorageFileName(
  guestName: string,
  ext: string,
  timestamp = Date.now()
): string {
  const sanitized = guestName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'convidado';
  const randomSuffix = Math.random().toString(36).substring(2, 7);
  const cleanExt = ext.replace(/^\./, '');
  return `${timestamp}_${sanitized}_${randomSuffix}.${cleanExt}`;
}

export function preparePostInsertPayload(input: CreatePostInput) {
  const rawDuration =
    input.mediaType === 'video'
      ? input.durationMs ?? DEFAULT_PHOTO_DURATION_MS
      : DEFAULT_PHOTO_DURATION_MS;

  const clampedDuration = Math.min(
    Math.max(rawDuration, 2000),
    MAX_VIDEO_DURATION_MS
  );

  return {
    guest_name: input.guestName.trim() || 'Convidado',
    media_url: input.mediaUrl,
    media_type: input.mediaType,
    duration_ms: clampedDuration,
    has_animated_overlay: input.hasAnimatedOverlay,
    overlay_data: input.overlayData,
    visible: true,
  };
}

export async function uploadWeddingMedia(
  blob: Blob,
  guestName: string,
  ext: string
): Promise<string> {
  const supabase = getSupabaseBrowserClient();
  const filePath = buildStorageFileName(guestName, ext);

  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(filePath, blob, {
      cacheControl: '3600',
      upsert: false,
      contentType: blob.type || undefined,
    });

  if (error) {
    throw new Error(`Falha no upload da mídia: ${error.message}`);
  }

  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(filePath);
  return data.publicUrl;
}

export async function createPostRecord(input: CreatePostInput): Promise<Post> {
  const supabase = getSupabaseBrowserClient();
  const payload = preparePostInsertPayload(input);

  const { data, error } = await supabase
    .from('posts')
    .insert(payload)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(`Falha ao salvar postagem: ${error?.message}`);
  }

  return data as Post;
}

export async function fetchPosts(options?: {
  includeHidden?: boolean;
}): Promise<Post[]> {
  const supabase = getSupabaseBrowserClient();
  let query = supabase
    .from('posts')
    .select('*')
    .order('created_at', { ascending: false });

  if (!options?.includeHidden) {
    query = query.eq('visible', true);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`Erro ao carregar mural: ${error.message}`);
  }

  return (data ?? []) as Post[];
}
```

- [ ] **Step 4: Rodar o teste e verificar que passa**

Run: `npx vitest run src/lib/supabase/__tests__/posts.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add supabase/schema.sql .env.example src/lib/supabase/
git commit -m "feat: add Supabase schema, clients, and media/post helpers"
```

---

### Task 3: Utilitários de Overlay Híbrido, Exportação Canvas (`.webp`) e Componente `<StoryRenderer />`

**Files:**
- Create: `src/lib/overlayUtils.ts`
- Create: `src/lib/canvasExport.ts`
- Create: `src/components/shared/StoryRenderer.tsx`
- Create: `src/components/shared/StoryRenderer.module.scss`
- Test: `src/lib/__tests__/overlayUtils.test.ts`
- Test: `src/components/shared/__tests__/StoryRenderer.test.tsx`

**Interfaces:**
- Consumes: `Post`, `OverlayData`, `OverlayElement`, `FilterPreset`, `FILTER_CSS_MAP` de `src/types/post.ts`
- Produces:
  - `clampPercent(val: number): number`, `pixelToPercent(px: number, total: number): number`, `requiresJsonOverlay(mediaType: MediaType, overlay: OverlayData): boolean` em `src/lib/overlayUtils.ts`
  - `flattenPhotoToWebp(imageSource: HTMLImageElement | HTMLCanvasElement, overlay: OverlayData): Promise<Blob>` em `src/lib/canvasExport.ts`
  - `<StoryRenderer post={post} autoPlay muted onEnded={...} />` em `src/components/shared/StoryRenderer.tsx`

- [ ] **Step 1: Escrever os testes falhando para `overlayUtils` e `StoryRenderer`**

Create `src/lib/__tests__/overlayUtils.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { clampPercent, pixelToPercent, requiresJsonOverlay } from '../overlayUtils';
import { OverlayData } from '@/types/post';

describe('overlayUtils', () => {
  it('converts pixel coordinates to 0-100 percentages and clamps boundaries', () => {
    expect(pixelToPercent(180, 360)).toBe(50);
    expect(pixelToPercent(-20, 360)).toBe(0);
    expect(pixelToPercent(500, 360)).toBe(100);
    expect(clampPercent(105)).toBe(100);
    expect(clampPercent(-5)).toBe(0);
  });

  it('determines hybrid rendering strategy: static photos flatten, GIFs and videos use JSON overlay', () => {
    const staticOverlay: OverlayData = {
      filter: 'noiva-glow',
      elements: [
        { id: '1', type: 'text', content: 'Felicidades!', x: 50, y: 50, scale: 1, rotation: 0 },
        { id: '2', type: 'emoji', content: '🥂', x: 20, y: 20, scale: 1, rotation: 0 },
      ],
    };

    const gifOverlay: OverlayData = {
      filter: 'original',
      elements: [
        { id: '3', type: 'gif', content: 'https://media.giphy.com/test.gif', x: 40, y: 40, scale: 1, rotation: 0 },
      ],
    };

    expect(requiresJsonOverlay('photo', staticOverlay)).toBe(false);
    expect(requiresJsonOverlay('photo', gifOverlay)).toBe(true);
    expect(requiresJsonOverlay('video', staticOverlay)).toBe(true);
    expect(requiresJsonOverlay('boomerang', staticOverlay)).toBe(true);
  });
});
```

Create `src/components/shared/__tests__/StoryRenderer.test.tsx`:
```tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { StoryRenderer } from '../StoryRenderer';
import { Post } from '@/types/post';

describe('StoryRenderer', () => {
  it('renders media and mounts JSON overlay elements when has_animated_overlay is true', () => {
    const mockPost: Post = {
      id: 'post-1',
      guest_name: 'Camila',
      media_url: 'https://example.com/video.mp4',
      media_type: 'video',
      duration_ms: 6000,
      has_animated_overlay: true,
      visible: true,
      created_at: new Date().toISOString(),
      overlay_data: {
        filter: 'golden-hour',
        elements: [
          {
            id: 'el-text',
            type: 'text',
            content: 'Viva a Gabi!',
            x: 50,
            y: 75,
            scale: 1,
            rotation: 0,
            color: '#ffffff',
          },
          {
            id: 'el-gif',
            type: 'gif',
            content: 'https://media.giphy.com/party.gif',
            x: 30,
            y: 30,
            scale: 1.2,
            rotation: 10,
          },
        ],
      },
    };

    render(<StoryRenderer post={mockPost} />);
    expect(screen.getByText('Viva a Gabi!')).toBeTruthy();
    expect(screen.getByAltText('Sticker animado')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Rodar os testes para confirmar que falham**

Run: `npx vitest run src/lib/__tests__/overlayUtils.test.ts src/components/shared/__tests__/StoryRenderer.test.tsx`
Expected: FAIL (`Cannot find module '../overlayUtils'`)

- [ ] **Step 3: Implementar `overlayUtils.ts`, `canvasExport.ts` e `<StoryRenderer />`**

Create `src/lib/overlayUtils.ts`:
```typescript
import { MediaType, OverlayData } from '@/types/post';

export function clampPercent(val: number): number {
  if (Number.isNaN(val)) return 50;
  return Math.min(100, Math.max(0, Number(val.toFixed(2))));
}

export function pixelToPercent(px: number, containerSize: number): number {
  if (containerSize <= 0) return 50;
  return clampPercent((px / containerSize) * 100);
}

/**
 * Implementa a Abordagem A (Híbrida):
 * - Fotos com apenas filtro, texto e emoji são achatadas (flattened) no Canvas -> retorna false.
 * - Vídeos, Boomerangs ou Fotos que possuem GIF animado mantêm overlay_data em JSON -> retorna true.
 */
export function requiresJsonOverlay(
  mediaType: MediaType,
  overlay: OverlayData
): boolean {
  if (mediaType === 'video' || mediaType === 'boomerang') {
    return true;
  }
  return overlay.elements.some((el) => el.type === 'gif');
}
```

Create `src/lib/canvasExport.ts`:
```typescript
import { FILTER_CSS_MAP, OverlayData } from '@/types/post';

const TARGET_WIDTH = 1080;
const TARGET_HEIGHT = 1920;

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

  // 2. Aplicar filtro CSS no contexto
  ctx.save();
  ctx.filter = FILTER_CSS_MAP[overlay.filter] || 'none';

  if (mirrorHorizontal) {
    ctx.translate(TARGET_WIDTH, 0);
    ctx.scale(-1, 1);
  }

  // Desenhar imagem em modo cover (9:16)
  const srcWidth =
    'videoWidth' in source && source.videoWidth
      ? source.videoWidth
      : source.width;
  const srcHeight =
    'videoHeight' in source && source.videoHeight
      ? source.videoHeight
      : source.height;

  if (srcWidth > 0 && srcHeight > 0) {
    const scale = Math.max(TARGET_WIDTH / srcWidth, TARGET_HEIGHT / srcHeight);
    const drawW = srcWidth * scale;
    const drawH = srcHeight * scale;
    const offsetX = (TARGET_WIDTH - drawW) / 2;
    const offsetY = (TARGET_HEIGHT - drawH) / 2;
    ctx.drawImage(source, offsetX, offsetY, drawW, drawH);
  }
  ctx.restore();

  // 3. Desenhar elementos estáticos (textos e emojis)
  for (const el of overlay.elements) {
    if (el.type === 'gif') continue;

    const posX = (el.x / 100) * TARGET_WIDTH;
    const posY = (el.y / 100) * TARGET_HEIGHT;

    ctx.save();
    ctx.translate(posX, posY);
    ctx.rotate((el.rotation * Math.PI) / 180);
    ctx.scale(el.scale, el.scale);

    if (el.type === 'emoji') {
      ctx.font = '96px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(el.content, 0, 0);
    } else if (el.type === 'text') {
      const fontMap = {
        modern: 'bold 52px Inter, sans-serif',
        classic: 'bold 54px Georgia, serif',
        script: 'bold 60px cursive, serif',
      };
      ctx.font = fontMap[el.fontFamily || 'modern'];
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const metrics = ctx.measureText(el.content);
      const padX = 28;
      const padY = 18;
      const boxW = metrics.width + padX * 2;
      const boxH = 72 + padY;

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
```

Create `src/components/shared/StoryRenderer.module.scss`:
```scss
@use '@/styles/variables' as *;
@use '@/styles/mixins' as *;

.storyContainer {
  @include story-aspect-box;
  width: 100%;
  height: 100%;
  background-color: $color-bg-dark;
  user-select: none;
}

.mediaElement {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.overlayLayer {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: $z-overlay;
}

.overlayItem {
  position: absolute;
  transform-origin: center center;
  white-space: pre-wrap;
  text-align: center;
}

.textBadge {
  padding: 6px 14px;
  border-radius: 10px;
  font-weight: 700;
  font-size: clamp(1rem, 2.5vw, 1.4rem);
  line-height: 1.25;
  text-shadow: 0 2px 6px rgba(0, 0, 0, 0.35);

  &.modern {
    font-family: $font-sans;
  }
  &.classic {
    font-family: $font-serif;
  }
  &.script {
    font-family: $font-script;
  }
}

.emojiItem {
  font-size: clamp(2.2rem, 5vw, 3.5rem);
  line-height: 1;
}

.gifItem {
  width: 110px;
  height: auto;
  object-fit: contain;
}
```

Create `src/components/shared/StoryRenderer.tsx`:
```tsx
'use client';

import React from 'react';
import { FILTER_CSS_MAP, Post } from '@/types/post';
import styles from './StoryRenderer.module.scss';

interface StoryRendererProps {
  post: Post;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
  onEnded?: () => void;
  className?: string;
}

export const StoryRenderer: React.FC<StoryRendererProps> = ({
  post,
  autoPlay = true,
  muted = true,
  loop = true,
  onEnded,
  className,
}) => {
  const showOverlay = Boolean(post.has_animated_overlay && post.overlay_data);
  const filterCss =
    showOverlay && post.overlay_data
      ? FILTER_CSS_MAP[post.overlay_data.filter] || 'none'
      : 'none';

  return (
    <div className={`${styles.storyContainer} ${className || ''}`}>
      {post.media_type === 'video' || post.media_type === 'boomerang' ? (
        <video
          src={post.media_url}
          className={styles.mediaElement}
          style={{ filter: filterCss }}
          autoPlay={autoPlay}
          muted={muted}
          loop={loop}
          playsInline
          onEnded={onEnded}
        />
      ) : (
        <img
          src={post.media_url}
          alt={`Foto enviada por ${post.guest_name}`}
          className={styles.mediaElement}
          style={{ filter: filterCss }}
        />
      )}

      {showOverlay && post.overlay_data && (
        <div className={styles.overlayLayer}>
          {post.overlay_data.elements.map((el) => (
            <div
              key={el.id}
              className={styles.overlayItem}
              style={{
                left: `${el.x}%`,
                top: `${el.y}%`,
                transform: `translate(-50%, -50%) scale(${el.scale}) rotate(${el.rotation}deg)`,
              }}
            >
              {el.type === 'text' && (
                <div
                  className={`${styles.textBadge} ${styles[el.fontFamily || 'modern']}`}
                  style={{
                    color: el.color || '#ffffff',
                    backgroundColor: el.backgroundColor || 'rgba(0,0,0,0.55)',
                  }}
                >
                  {el.content}
                </div>
              )}

              {el.type === 'emoji' && (
                <div className={styles.emojiItem}>{el.content}</div>
              )}

              {el.type === 'gif' && (
                <img
                  src={el.content}
                  alt="Sticker animado"
                  className={styles.gifItem}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
```

- [ ] **Step 4: Rodar os testes e verificar que passam**

Run: `npx vitest run src/lib/__tests__/overlayUtils.test.ts src/components/shared/__tests__/StoryRenderer.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/overlayUtils.ts src/lib/canvasExport.ts src/lib/__tests__/ src/components/shared/
git commit -m "feat: add hybrid overlay utils, canvas WebP flatten, and StoryRenderer"
```

---

### Task 4: Experiência do Convidado — Boas-vindas (`GuestWelcomeModal`) e Câmera (`useCamera` + `CameraView`)

**Files:**
- Create: `src/components/capture/GuestWelcomeModal.tsx`
- Create: `src/components/capture/GuestWelcomeModal.module.scss`
- Create: `src/hooks/useCamera.ts`
- Create: `src/components/capture/CameraView.tsx`
- Create: `src/components/capture/CameraView.module.scss`
- Test: `src/components/capture/__tests__/GuestWelcomeModal.test.tsx`

**Interfaces:**
- Consumes: `MediaType` de `src/types/post.ts`
- Produces:
  - `GUEST_NAME_STORAGE_KEY = 'gabi_guest_name'`
  - `<GuestWelcomeModal onConfirm={(name: string) => void} />`
  - `CapturedMedia = { blob: Blob; previewUrl: string; mediaType: MediaType; durationMs: number; mirrored: boolean }`
  - `<CameraView guestName={string} onChangeName={() => void} onCapture={(media: CapturedMedia) => void} />`

- [ ] **Step 1: Escrever o teste falhando para `GuestWelcomeModal`**

Create `src/components/capture/__tests__/GuestWelcomeModal.test.tsx`:
```tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GuestWelcomeModal, GUEST_NAME_STORAGE_KEY } from '../GuestWelcomeModal';

describe('GuestWelcomeModal', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('asks for the guest name, saves it in localStorage, and triggers onConfirm', () => {
    const onConfirm = vi.fn();
    render(<GuestWelcomeModal onConfirm={onConfirm} />);

    const input = screen.getByPlaceholderText(/Ex: Tia Márcia, Primo Leo/i);
    fireEvent.change(input, { target: { value: '  Prima Bia  ' } });

    const submitBtn = screen.getByRole('button', { name: /Abrir Câmera/i });
    fireEvent.click(submitBtn);

    expect(window.localStorage.getItem(GUEST_NAME_STORAGE_KEY)).toBe('Prima Bia');
    expect(onConfirm).toHaveBeenCalledWith('Prima Bia');
  });
});
```

- [ ] **Step 2: Rodar o teste para confirmar que falha**

Run: `npx vitest run src/components/capture/__tests__/GuestWelcomeModal.test.tsx`
Expected: FAIL (`Cannot find module '../GuestWelcomeModal'`)

- [ ] **Step 3: Implementar `GuestWelcomeModal`, `useCamera` e `CameraView`**

Create `src/components/capture/GuestWelcomeModal.module.scss`:
```scss
@use '@/styles/variables' as *;
@use '@/styles/mixins' as *;

.backdrop {
  position: fixed;
  inset: 0;
  z-index: $z-modal;
  @include flex-center;
  background: rgba(10, 10, 14, 0.85);
  backdrop-filter: blur(12px);
  padding: 24px;
}

.card {
  width: 100%;
  max-width: 380px;
  background: $color-surface-light;
  border-radius: $radius-lg;
  padding: 32px 24px;
  text-align: center;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.45);
}

.badge {
  display: inline-block;
  background: $color-champagne;
  color: $color-gold-hover;
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: 6px 14px;
  border-radius: $radius-full;
  margin-bottom: 14px;
}

.title {
  font-family: $font-serif;
  font-size: 1.75rem;
  color: $color-text-primary;
  margin-bottom: 8px;
}

.subtitle {
  font-size: 0.95rem;
  color: $color-text-muted;
  margin-bottom: 24px;
  line-height: 1.45;
}

.input {
  width: 100%;
  padding: 14px 16px;
  font-size: 1rem;
  border: 2px solid #e3ded6;
  border-radius: $radius-md;
  margin-bottom: 16px;
  outline: none;
  transition: border-color 0.2s;

  &:focus {
    border-color: $color-gold;
  }
}

.submitBtn {
  width: 100%;
  padding: 14px 20px;
  border: none;
  border-radius: $radius-md;
  background: $color-gold;
  color: #ffffff;
  font-size: 1rem;
  font-weight: 700;
  transition: background 0.2s;

  &:hover:not(:disabled) {
    background: $color-gold-hover;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}
```

Create `src/components/capture/GuestWelcomeModal.tsx`:
```tsx
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
        <button
          type="submit"
          className={styles.submitBtn}
          disabled={!name.trim()}
        >
          Abrir Câmera 📸
        </button>
      </form>
    </div>
  );
};
```

Create `src/hooks/useCamera.ts`:
```typescript
'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  DEFAULT_PHOTO_DURATION_MS,
  MAX_VIDEO_DURATION_MS,
  MediaType,
} from '@/types/post';

export interface CapturedMedia {
  blob: Blob;
  previewUrl: string;
  mediaType: MediaType;
  durationMs: number;
  mirrored: boolean;
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
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async (targetFacing: 'user' | 'environment') => {
    stopStream();
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: targetFacing,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      setCameraError(
        'Não foi possível acessar a câmera diretamente. Você pode tirar foto ou escolher da galeria no botão abaixo!'
      );
    }
  }, [stopStream]);

  useEffect(() => {
    startCamera(facingMode);
    return () => stopStream();
  }, [facingMode, startCamera, stopStream]);

  const toggleFacingMode = useCallback(() => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  }, []);

  const capturePhoto = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1080;
    canvas.height = video.videoHeight || 1920;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const previewUrl = URL.createObjectURL(blob);
        onCapture({
          blob,
          previewUrl,
          mediaType: 'photo',
          durationMs: DEFAULT_PHOTO_DURATION_MS,
          mirrored: false, // Já foi espelhado no canvas inicial
        });
      },
      'image/webp',
      0.9
    );
  }, [facingMode, onCapture]);

  const startVideoOrBoomerang = useCallback(() => {
    const stream = streamRef.current;
    if (!stream || isRecording) return;

    const maxDuration = mode === 'boomerang' ? 1600 : MAX_VIDEO_DURATION_MS;
    const chunks: BlobPart[] = [];
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/mp4';

    const recorder = new MediaRecorder(stream, { mimeType });
    recorderRef.current = recorder;
    const startTime = Date.now();
    setIsRecording(true);
    setProgress(0);

    const interval = window.setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, (elapsed / maxDuration) * 100);
      setProgress(pct);
      if (elapsed >= maxDuration && recorder.state === 'recording') {
        recorder.stop();
      }
    }, 60);

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstop = () => {
      window.clearInterval(interval);
      setIsRecording(false);
      setProgress(0);
      const durationMs =
        mode === 'boomerang'
          ? DEFAULT_PHOTO_DURATION_MS
          : Math.min(MAX_VIDEO_DURATION_MS, Math.max(2500, Date.now() - startTime));

      const blob = new Blob(chunks, { type: recorder.mimeType || 'video/webm' });
      const previewUrl = URL.createObjectURL(blob);
      onCapture({
        blob,
        previewUrl,
        mediaType: mode,
        durationMs,
        mirrored: facingMode === 'user',
      });
    };

    recorder.start();
  }, [facingMode, isRecording, mode, onCapture]);

  const stopRecordingEarly = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state === 'recording') {
      recorderRef.current.stop();
    }
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
```

Create `src/components/capture/CameraView.module.scss`:
```scss
@use '@/styles/variables' as *;
@use '@/styles/mixins' as *;

.viewport {
  position: relative;
  width: 100%;
  height: 100dvh;
  max-width: 480px;
  margin: 0 auto;
  background: $color-bg-dark;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.videoFeed {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;

  &.mirrored {
    transform: scaleX(-1);
  }
}

.topBar {
  position: relative;
  z-index: $z-overlay;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 16px;
}

.guestBadge {
  @include glass-panel(0.6);
  color: #ffffff;
  border-radius: $radius-full;
  padding: 8px 14px;
  font-size: 0.85rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 6px;
}

.iconBtn {
  @include glass-panel(0.6);
  @include flex-center;
  width: 44px;
  height: 44px;
  border-radius: $radius-full;
  color: #ffffff;
}

.errorOverlay {
  position: relative;
  z-index: $z-overlay;
  margin: auto 24px;
  @include glass-panel(0.8);
  padding: 24px;
  border-radius: $radius-lg;
  text-align: center;
  color: #ffffff;

  p {
    margin-bottom: 16px;
    font-size: 0.95rem;
    line-height: 1.45;
  }
}

.bottomBar {
  position: relative;
  z-index: $z-overlay;
  padding: 16px 20px 30px;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.8), transparent);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;
}

.modeSelector {
  display: flex;
  gap: 16px;
  @include glass-panel(0.5);
  padding: 6px 14px;
  border-radius: $radius-full;
}

.modeBtn {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.65);
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 4px 8px;

  &.active {
    color: $color-gold;
  }
}

.controlsRow {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-around;
}

.shutterBtn {
  width: 78px;
  height: 78px;
  border-radius: $radius-full;
  border: 4px solid #ffffff;
  background: rgba(255, 255, 255, 0.25);
  @include flex-center;
  padding: 6px;
  transition: transform 0.15s;

  &:active {
    transform: scale(0.92);
  }

  .shutterInner {
    width: 100%;
    height: 100%;
    border-radius: $radius-full;
    background: #ffffff;
    transition: all 0.2s;
  }

  &.recording .shutterInner {
    background: $color-danger;
    transform: scale(0.6);
    border-radius: 12px;
  }
}

.hiddenFileInput {
  display: none;
}
```

Create `src/components/capture/CameraView.tsx`:
```tsx
'use client';

import React, { useRef } from 'react';
import { Image as ImageIcon, RefreshCw, User } from 'lucide-react';
import {
  DEFAULT_PHOTO_DURATION_MS,
  MAX_VIDEO_DURATION_MS,
  MediaType,
} from '@/types/post';
import { CapturedMedia, useCamera } from '@/hooks/useCamera';
import styles from './CameraView.module.scss';

interface CameraViewProps {
  guestName: string;
  onChangeName: () => void;
  onCapture: (media: CapturedMedia) => void;
}

export const CameraView: React.FC<CameraViewProps> = ({
  guestName,
  onChangeName,
  onCapture,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const {
    videoRef,
    facingMode,
    mode,
    setMode,
    isRecording,
    cameraError,
    toggleFacingMode,
    capturePhoto,
    startVideoOrBoomerang,
    stopRecordingEarly,
  } = useCamera(onCapture);

  const handleShutterClick = () => {
    if (mode === 'photo') {
      capturePhoto();
    } else if (isRecording) {
      stopRecordingEarly();
    } else {
      startVideoOrBoomerang();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isVideo = file.type.startsWith('video/');
    const previewUrl = URL.createObjectURL(file);
    onCapture({
      blob: file,
      previewUrl,
      mediaType: isVideo ? 'video' : 'photo',
      durationMs: isVideo ? MAX_VIDEO_DURATION_MS : DEFAULT_PHOTO_DURATION_MS,
      mirrored: false,
    });
  };

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
        <button
          type="button"
          className={styles.guestBadge}
          onClick={onChangeName}
          title="Trocar seu nome"
        >
          <User size={15} />
          <span>{guestName}</span>
        </button>

        <button
          type="button"
          className={styles.iconBtn}
          onClick={toggleFacingMode}
          aria-label="Inverter câmera"
        >
          <RefreshCw size={20} />
        </button>
      </div>

      {cameraError && (
        <div className={styles.errorOverlay}>
          <p>{cameraError}</p>
          <button
            type="button"
            className={styles.guestBadge}
            onClick={() => fileInputRef.current?.click()}
          >
            Escolher Foto ou Vídeo do Celular
          </button>
        </div>
      )}

      <div className={styles.bottomBar}>
        <div className={styles.modeSelector}>
          {(['photo', 'boomerang', 'video'] as MediaType[]).map((m) => (
            <button
              key={m}
              type="button"
              className={`${styles.modeBtn} ${mode === m ? styles.active : ''}`}
              onClick={() => setMode(m)}
            >
              {m === 'photo' ? 'Foto' : m === 'boomerang' ? 'Boomerang' : 'Vídeo 10s'}
            </button>
          ))}
        </div>

        <div className={styles.controlsRow}>
          <button
            type="button"
            className={styles.iconBtn}
            onClick={() => fileInputRef.current?.click()}
            aria-label="Abrir galeria"
          >
            <ImageIcon size={22} />
          </button>

          <button
            type="button"
            className={`${styles.shutterBtn} ${isRecording ? styles.recording : ''}`}
            onClick={handleShutterClick}
            aria-label="Disparar câmera"
          >
            <div className={styles.shutterInner} />
          </button>

          <button
            type="button"
            className={styles.iconBtn}
            onClick={toggleFacingMode}
            aria-label="Virar câmera"
          >
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
```

- [ ] **Step 4: Rodar o teste e verificar que passa**

Run: `npx vitest run src/components/capture/__tests__/GuestWelcomeModal.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/capture/ src/hooks/useCamera.ts
git commit -m "feat: add GuestWelcomeModal and Instagram-style CameraView with photo/boomerang/video"
```

---

### Task 5: Editor Stories (`StoryEditor`, `StickerDrawer`, `DraggableOverlay`, Giphy API) e Rota `/`

**Files:**
- Create: `src/lib/giphy.ts`
- Create: `src/components/capture/DraggableOverlay.tsx`
- Create: `src/components/capture/StickerDrawer.tsx`
- Create: `src/components/capture/StickerDrawer.module.scss`
- Create: `src/components/capture/StoryEditor.tsx`
- Create: `src/components/capture/StoryEditor.module.scss`
- Create: `src/app/(guest)/page.tsx`
- Test: `src/components/capture/__tests__/StoryEditor.test.tsx`

**Interfaces:**
- Consumes: `CapturedMedia` de `src/hooks/useCamera.ts`, `FilterPreset`, `OverlayData`, `OverlayElement`, `FILTER_CSS_MAP`, `FILTER_LABELS` de `src/types/post.ts`, `requiresJsonOverlay` de `src/lib/overlayUtils.ts`, `flattenPhotoToWebp` de `src/lib/canvasExport.ts`, `uploadWeddingMedia`, `createPostRecord` de `src/lib/supabase/posts.ts`
- Produces:
  - `searchWeddingGifs(query: string): Promise<Array<{ id: string; url: string; title: string }>>` em `src/lib/giphy.ts`
  - `<StoryEditor media={CapturedMedia} guestName={string} onCancel={() => void} onSuccess={() => void} />`
  - Rota principal dos convidados em `src/app/(guest)/page.tsx`

- [ ] **Step 1: Escrever o teste falhando para `StoryEditor`**

Create `src/components/capture/__tests__/StoryEditor.test.tsx`:
```tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { StoryEditor } from '../StoryEditor';
import { CapturedMedia } from '@/hooks/useCamera';

describe('StoryEditor', () => {
  const mockMedia: CapturedMedia = {
    blob: new Blob(['fake'], { type: 'image/webp' }),
    previewUrl: 'blob:https://example.com/fake-photo',
    mediaType: 'photo',
    durationMs: 5000,
    mirrored: false,
  };

  it('allows switching filters, adding text overlay, and adding wedding emojis', () => {
    render(
      <StoryEditor
        media={mockMedia}
        guestName="Lucas"
        onCancel={vi.fn()}
        onSuccess={vi.fn()}
      />
    );

    // 1. Trocar filtro para Golden Hour
    const goldenFilterBtn = screen.getByRole('button', { name: /Golden Hour/i });
    fireEvent.click(goldenFilterBtn);

    // 2. Abrir ferramenta de texto (Aa) e adicionar frase
    const textBtn = screen.getByRole('button', { name: /Texto Aa/i });
    fireEvent.click(textBtn);

    const textInput = screen.getByPlaceholderText(/Digite sua mensagem/i);
    fireEvent.change(textInput, { target: { value: 'Viva os noivos!' } });

    const confirmTextBtn = screen.getByRole('button', { name: /Concluir Texto/i });
    fireEvent.click(confirmTextBtn);

    expect(screen.getByText('Viva os noivos!')).toBeTruthy();

    // 3. Abrir gaveta de emojis/GIFs e adicionar emoji
    const stickerBtn = screen.getByRole('button', { name: /Emojis e GIFs/i });
    fireEvent.click(stickerBtn);

    const emojiBtn = screen.getByRole('button', { name: '🥂' });
    fireEvent.click(emojiBtn);

    expect(screen.getByText('🥂')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Rodar o teste para confirmar que falha**

Run: `npx vitest run src/components/capture/__tests__/StoryEditor.test.tsx`
Expected: FAIL (`Cannot find module '../StoryEditor'`)

- [ ] **Step 3: Implementar `giphy.ts`, `DraggableOverlay.tsx`, `StickerDrawer.tsx`, `StoryEditor.tsx` e `src/app/(guest)/page.tsx`**

Create `src/lib/giphy.ts`:
```typescript
export interface GifStickerItem {
  id: string;
  url: string;
  title: string;
}

export const CURATED_WEDDING_GIFS: GifStickerItem[] = [
  {
    id: 'wed-1',
    title: 'Brinde Champagne',
    url: 'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif',
  },
  {
    id: 'wed-2',
    title: 'Corações Festa',
    url: 'https://media.giphy.com/media/26BRv0ThflsHCqDrG/giphy.gif',
  },
  {
    id: 'wed-3',
    title: 'Dançando na Pista',
    url: 'https://media.giphy.com/media/l0MYGb1LuZ3n7dRnO/giphy.gif',
  },
  {
    id: 'wed-4',
    title: 'Confete Celebração',
    url: 'https://media.giphy.com/media/artj92V8o75VPL7AeQ/giphy.gif',
  },
];

export const WEDDING_EMOJIS = [
  '🥂', '💍', '👰', '🤵', '❤️', '🎉', '✨', '🔥', '😍', '💃', '🕺', '🍾', '💐', '🎂', '🥳', '🥹',
];

export const WEDDING_STICKER_PHRASES = [
  'Team Noiva 👰✨',
  'Team Noivo 🤵🔥',
  'Open Bar Aprovado 🥂',
  'Casamento do Ano 💍',
  'Viva os Noivos! ❤️',
  'Última noite de solteiros 🎉',
];

export async function searchWeddingGifs(query: string): Promise<GifStickerItem[]> {
  const apiKey = process.env.NEXT_PUBLIC_GIPHY_API_KEY;
  if (!query.trim() || !apiKey) {
    return CURATED_WEDDING_GIFS;
  }

  try {
    const endpoint = `https://api.giphy.com/v1/stickers/search?api_key=${encodeURIComponent(
      apiKey
    )}&q=${encodeURIComponent(query)}&limit=12&rating=g`;
    const res = await fetch(endpoint);
    if (!res.ok) return CURATED_WEDDING_GIFS;
    const json = await res.json();
    if (!Array.isArray(json.data) || json.data.length === 0) {
      return CURATED_WEDDING_GIFS;
    }
    return json.data.map((item: any) => ({
      id: item.id,
      title: item.title || 'GIF',
      url: item.images?.fixed_height?.url || item.images?.original?.url,
    }));
  } catch {
    return CURATED_WEDDING_GIFS;
  }
}
```

Create `src/components/capture/DraggableOverlay.tsx`:
```tsx
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
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent, id: string) => {
    if (activeIdRef.current !== id || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = pixelToPercent(e.clientX - rect.left, rect.width);
    const y = pixelToPercent(e.clientY - rect.top, rect.height);
    onUpdateElement(id, { x, y });
  };

  const handlePointerUp = (e: React.PointerEvent, id: string) => {
    if (activeIdRef.current !== id) return;
    activeIdRef.current = null;
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
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

          {el.type === 'emoji' && (
            <div className={styles.emojiSticker}>{el.content}</div>
          )}

          {el.type === 'gif' && (
            <img src={el.content} alt="GIF Sticker" className={styles.gifSticker} />
          )}
        </div>
      ))}
    </div>
  );
};
```

Create `src/components/capture/StickerDrawer.module.scss`:
```scss
@use '@/styles/variables' as *;
@use '@/styles/mixins' as *;

.drawerBackdrop {
  position: absolute;
  inset: 0;
  z-index: $z-drawer;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}

.drawerSheet {
  @include glass-panel(0.92);
  border-radius: $radius-lg $radius-lg 0 0;
  padding: 20px 16px 28px;
  max-height: 72%;
  overflow-y: auto;
  color: #ffffff;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;

  h3 {
    font-size: 1rem;
    font-weight: 700;
  }
}

.closeBtn {
  background: transparent;
  border: none;
  color: #ffffff;
  font-size: 0.9rem;
}

.sectionTitle {
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgba(255, 255, 255, 0.6);
  margin: 14px 0 8px;
}

.emojiGrid {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 8px;
}

.emojiBtn {
  background: rgba(255, 255, 255, 0.08);
  border: none;
  border-radius: $radius-sm;
  font-size: 1.6rem;
  padding: 6px;
}

.phraseGrid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.phraseBtn {
  background: rgba(201, 162, 93, 0.28);
  border: 1px solid $color-gold;
  color: #ffffff;
  border-radius: $radius-full;
  padding: 6px 12px;
  font-size: 0.82rem;
  font-weight: 600;
}

.searchInput {
  width: 100%;
  padding: 10px 14px;
  border-radius: $radius-md;
  border: 1px solid rgba(255, 255, 255, 0.25);
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
  margin-bottom: 12px;
}

.gifGrid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.gifCard {
  background: rgba(255, 255, 255, 0.08);
  border: none;
  border-radius: $radius-md;
  padding: 8px;
  @include flex-center;

  img {
    max-width: 100%;
    height: 90px;
    object-fit: contain;
  }
}
```

Create `src/components/capture/StickerDrawer.tsx`:
```tsx
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
    searchWeddingGifs(query).then((res) => {
      if (active) setGifs(res);
    });
    return () => {
      active = false;
    };
  }, [query]);

  return (
    <div className={styles.drawerBackdrop}>
      <div className={styles.drawerSheet}>
        <div className={styles.header}>
          <h3>Stickers, Emojis & GIFs</h3>
          <button type="button" className={styles.closeBtn} onClick={onClose}>
            Fechar ✕
          </button>
        </div>

        <p className={styles.sectionTitle}>Stickers do Casamento</p>
        <div className={styles.phraseGrid}>
          {WEDDING_STICKER_PHRASES.map((phrase) => (
            <button
              key={phrase}
              type="button"
              className={styles.phraseBtn}
              onClick={() => {
                onSelectPhrase(phrase);
                onClose();
              }}
            >
              {phrase}
            </button>
          ))}
        </div>

        <p className={styles.sectionTitle}>Emojis</p>
        <div className={styles.emojiGrid}>
          {WEDDING_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              className={styles.emojiBtn}
              onClick={() => {
                onSelectEmoji(emoji);
                onClose();
              }}
            >
              {emoji}
            </button>
          ))}
        </div>

        <p className={styles.sectionTitle}>GIFs Animados</p>
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Buscar GIF (ex: festa, brinde, dança)..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className={styles.gifGrid}>
          {gifs.map((g) => (
            <button
              key={g.id}
              type="button"
              className={styles.gifCard}
              onClick={() => {
                onSelectGif(g.url);
                onClose();
              }}
            >
              <img src={g.url} alt={g.title} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
```

Create `src/components/capture/StoryEditor.module.scss`:
```scss
@use '@/styles/variables' as *;
@use '@/styles/mixins' as *;

.editorViewport {
  position: relative;
  width: 100%;
  height: 100dvh;
  max-width: 480px;
  margin: 0 auto;
  background: $color-bg-dark;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.mediaStage {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.previewMedia {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.interactiveOverlay {
  position: absolute;
  inset: 0;
  z-index: $z-overlay;
  touch-action: none;
}

.draggableItem {
  position: absolute;
  cursor: grab;
  user-select: none;

  &:active {
    cursor: grabbing;
  }
}

.textSticker {
  padding: 8px 16px;
  border-radius: 12px;
  font-weight: 700;
  font-size: 1.25rem;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.3);
}

.emojiSticker {
  font-size: 3.2rem;
}

.gifSticker {
  width: 120px;
  height: auto;
}

.topToolbar {
  position: relative;
  z-index: 30;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
}

.toolGroup {
  display: flex;
  gap: 10px;
}

.toolBtn {
  @include glass-panel(0.65);
  color: #ffffff;
  border-radius: $radius-full;
  padding: 8px 14px;
  font-size: 0.88rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 6px;
}

.textModal {
  position: absolute;
  inset: 0;
  z-index: $z-drawer;
  background: rgba(0, 0, 0, 0.78);
  @include flex-center;
  flex-direction: column;
  padding: 24px;
  gap: 16px;
}

.textInput {
  width: 100%;
  background: transparent;
  border: none;
  border-bottom: 2px solid $color-gold;
  color: #ffffff;
  font-size: 1.5rem;
  font-weight: 700;
  text-align: center;
  padding: 10px;
  outline: none;
}

.colorRow {
  display: flex;
  gap: 10px;
}

.colorSwatch {
  width: 30px;
  height: 30px;
  border-radius: $radius-full;
  border: 2px solid #ffffff;
}

.bottomArea {
  position: relative;
  z-index: 30;
  padding: 12px 16px 26px;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.88), transparent);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.filterStrip {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 4px;
}

.filterPill {
  @include glass-panel(0.5);
  color: rgba(255, 255, 255, 0.8);
  border-radius: $radius-full;
  padding: 6px 12px;
  font-size: 0.78rem;
  font-weight: 600;
  white-space: nowrap;

  &.activeFilter {
    background: $color-gold;
    color: #ffffff;
    border-color: $color-gold;
  }
}

.sendBtn {
  width: 100%;
  padding: 15px;
  border: none;
  border-radius: $radius-full;
  background: $color-gold;
  color: #ffffff;
  font-size: 1rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;

  &:disabled {
    opacity: 0.6;
  }
}

.errorBanner {
  background: rgba(217, 70, 70, 0.9);
  color: #ffffff;
  padding: 8px 12px;
  border-radius: $radius-sm;
  font-size: 0.82rem;
  text-align: center;
}
```

Create `src/components/capture/StoryEditor.tsx`:
```tsx
'use client';

import React, { useState, useRef } from 'react';
import { Send, Smile, Type, X } from 'lucide-react';
import {
  FILTER_CSS_MAP,
  FILTER_LABELS,
  FilterPreset,
  OverlayData,
  OverlayElement,
} from '@/types/post';
import { CapturedMedia } from '@/hooks/useCamera';
import { requiresJsonOverlay } from '@/lib/overlayUtils';
import { flattenPhotoToWebp } from '@/lib/canvasExport';
import { createPostRecord, uploadWeddingMedia } from '@/lib/supabase/posts';
import { DraggableOverlay } from './DraggableOverlay';
import { StickerDrawer } from './StickerDrawer';
import styles from './StoryEditor.module.scss';

interface StoryEditorProps {
  media: CapturedMedia;
  guestName: string;
  onCancel: () => void;
  onSuccess: () => void;
}

const TEXT_COLORS = ['#ffffff', '#c9a25d', '#ff5978', '#38bdf8', '#4ade80', '#111111'];

export const StoryEditor: React.FC<StoryEditorProps> = ({
  media,
  guestName,
  onCancel,
  onSuccess,
}) => {
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [filter, setFilter] = useState<FilterPreset>('original');
  const [elements, setElements] = useState<OverlayElement[]>([]);
  const [isTypingText, setIsTypingText] = useState(false);
  const [draftText, setDraftText] = useState('');
  const [draftColor, setDraftColor] = useState('#ffffff');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const addElement = (partial: Omit<OverlayElement, 'id' | 'x' | 'y' | 'scale' | 'rotation'>) => {
    const newEl: OverlayElement = {
      id: `el_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      x: 50,
      y: 45,
      scale: 1,
      rotation: 0,
      ...partial,
    };
    setElements((prev) => [...prev, newEl]);
  };

  const handleConfirmText = () => {
    if (draftText.trim()) {
      addElement({
        type: 'text',
        content: draftText.trim(),
        color: draftColor,
        backgroundColor: draftColor === '#111111' ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.6)',
        fontFamily: 'modern',
      });
    }
    setDraftText('');
    setIsTypingText(false);
  };

  const handleUpdateElement = (id: string, patch: Partial<OverlayElement>) => {
    setElements((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
  };

  const handleRemoveElement = (id: string) => {
    setElements((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSendToWall = async () => {
    setIsUploading(true);
    setUploadError(null);
    try {
      const overlayData: OverlayData = { filter, elements };
      const useJsonOverlay = requiresJsonOverlay(media.mediaType, overlayData);

      let finalBlob = media.blob;
      let ext = media.mediaType === 'photo' ? 'webp' : 'webm';

      if (!useJsonOverlay && media.mediaType === 'photo' && imageRef.current) {
        finalBlob = await flattenPhotoToWebp(imageRef.current, overlayData, media.mirrored);
        ext = 'webp';
      }

      const publicUrl = await uploadWeddingMedia(finalBlob, guestName, ext);
      await createPostRecord({
        guestName,
        mediaUrl: publicUrl,
        mediaType: media.mediaType,
        durationMs: media.durationMs,
        hasAnimatedOverlay: useJsonOverlay,
        overlayData: useJsonOverlay ? overlayData : null,
      });

      onSuccess();
    } catch (err: any) {
      setUploadError(err?.message || 'Erro ao enviar. Tente novamente!');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className={styles.editorViewport}>
      <div className={styles.mediaStage}>
        {media.mediaType === 'photo' ? (
          <img
            ref={imageRef}
            src={media.previewUrl}
            alt="Preview da captura"
            className={styles.previewMedia}
            style={{ filter: FILTER_CSS_MAP[filter] }}
            crossOrigin="anonymous"
          />
        ) : (
          <video
            src={media.previewUrl}
            className={styles.previewMedia}
            style={{ filter: FILTER_CSS_MAP[filter] }}
            autoPlay
            loop
            muted
            playsInline
          />
        )}

        <DraggableOverlay
          elements={elements}
          onUpdateElement={handleUpdateElement}
          onRemoveElement={handleRemoveElement}
        />
      </div>

      <div className={styles.topToolbar}>
        <button type="button" className={styles.toolBtn} onClick={onCancel}>
          <X size={18} />
          <span>Descartar</span>
        </button>

        <div className={styles.toolGroup}>
          <button
            type="button"
            className={styles.toolBtn}
            onClick={() => setIsTypingText(true)}
            aria-label="Texto Aa"
          >
            <Type size={18} />
            <span>Texto Aa</span>
          </button>

          <button
            type="button"
            className={styles.toolBtn}
            onClick={() => setIsDrawerOpen(true)}
            aria-label="Emojis e GIFs"
          >
            <Smile size={18} />
            <span>Emojis e GIFs</span>
          </button>
        </div>
      </div>

      {isTypingText && (
        <div className={styles.textModal}>
          <input
            type="text"
            className={styles.textInput}
            placeholder="Digite sua mensagem..."
            value={draftText}
            onChange={(e) => setDraftText(e.target.value)}
            style={{ color: draftColor }}
            autoFocus
          />
          <div className={styles.colorRow}>
            {TEXT_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className={styles.colorSwatch}
                style={{ backgroundColor: c }}
                onClick={() => setDraftColor(c)}
              />
            ))}
          </div>
          <button
            type="button"
            className={styles.toolBtn}
            onClick={handleConfirmText}
          >
            Concluir Texto
          </button>
        </div>
      )}

      {isDrawerOpen && (
        <StickerDrawer
          onSelectEmoji={(emoji) => addElement({ type: 'emoji', content: emoji })}
          onSelectPhrase={(phrase) =>
            addElement({
              type: 'text',
              content: phrase,
              color: '#ffffff',
              backgroundColor: 'rgba(201, 162, 93, 0.85)',
            })
          }
          onSelectGif={(gifUrl) => addElement({ type: 'gif', content: gifUrl })}
          onClose={() => setIsDrawerOpen(false)}
        />
      )}

      <div className={styles.bottomArea}>
        {uploadError && <div className={styles.errorBanner}>{uploadError}</div>}

        <div className={styles.filterStrip}>
          {(Object.keys(FILTER_LABELS) as FilterPreset[]).map((fKey) => (
            <button
              key={fKey}
              type="button"
              className={`${styles.filterPill} ${filter === fKey ? styles.activeFilter : ''}`}
              onClick={() => setFilter(fKey)}
            >
              {FILTER_LABELS[fKey]}
            </button>
          ))}
        </div>

        <button
          type="button"
          className={styles.sendBtn}
          onClick={handleSendToWall}
          disabled={isUploading}
        >
          <Send size={18} />
          <span>{isUploading ? 'Enviando para o Telão...' : 'Enviar para o Telão ✨'}</span>
        </button>
      </div>
    </div>
  );
};
```

Create `src/app/(guest)/page.tsx`:
```tsx
'use client';

import React, { useState, useEffect } from 'react';
import {
  GUEST_NAME_STORAGE_KEY,
  GuestWelcomeModal,
} from '@/components/capture/GuestWelcomeModal';
import { CameraView } from '@/components/capture/CameraView';
import { StoryEditor } from '@/components/capture/StoryEditor';
import { CapturedMedia } from '@/hooks/useCamera';

export default function GuestCapturePage() {
  const [guestName, setGuestName] = useState<string>('');
  const [showNameModal, setShowNameModal] = useState<boolean>(false);
  const [capturedMedia, setCapturedMedia] = useState<CapturedMedia | null>(null);
  const [sentToast, setSentToast] = useState<boolean>(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(GUEST_NAME_STORAGE_KEY);
    if (saved) {
      setGuestName(saved);
    } else {
      setShowNameModal(true);
    }
  }, []);

  const handleSuccess = () => {
    setCapturedMedia(null);
    setSentToast(true);
    window.setTimeout(() => setSentToast(false), 4000);
  };

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

      {sentToast && (
        <div
          style={{
            position: 'fixed',
            top: 72,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 80,
            background: '#2e9b68',
            color: '#fff',
            padding: '10px 20px',
            borderRadius: 999,
            fontWeight: 700,
            boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
          }}
        >
          ✨ Enviado! Olhe para o telão da festa!
        </div>
      )}

      {capturedMedia ? (
        <StoryEditor
          media={capturedMedia}
          guestName={guestName || 'Convidado'}
          onCancel={() => setCapturedMedia(null)}
          onSuccess={handleSuccess}
        />
      ) : (
        <CameraView
          guestName={guestName || 'Convidado'}
          onChangeName={() => setShowNameModal(true)}
          onCapture={(media) => setCapturedMedia(media)}
        />
      )}
    </main>
  );
}
```

- [ ] **Step 4: Rodar o teste e verificar que passa**

Run: `npx vitest run src/components/capture/__tests__/StoryEditor.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/giphy.ts src/components/capture/ src/app/\(guest\)/
git commit -m "feat: implement StoryEditor with filters, text, emojis, Giphy stickers, and guest route"
```

---

### Task 6: Telão Ao Vivo (`/telao`) — Fila Prioritária Realtime, Tempos de 5s e Transições Aleatórias

**Files:**
- Create: `src/hooks/useRealtimePosts.ts`
- Create: `src/hooks/useSlideshowQueue.ts`
- Create: `src/components/telao/SlideshowStage.tsx`
- Create: `src/components/telao/SlideshowStage.module.scss`
- Create: `src/app/telao/page.tsx`
- Test: `src/hooks/__tests__/useSlideshowQueue.test.ts`

**Interfaces:**
- Consumes: `Post`, `TRANSITION_CLASSES`, `TransitionType`, `DEFAULT_PHOTO_DURATION_MS` de `src/types/post.ts`, `<StoryRenderer />` de `src/components/shared/StoryRenderer.tsx`, `fetchPosts` de `src/lib/supabase/posts.ts`
- Produces:
  - `pickRandomTransition(previous?: TransitionType): TransitionType` em `src/hooks/useSlideshowQueue.ts`
  - `useSlideshowQueue(initialPosts: Post[])` em `src/hooks/useSlideshowQueue.ts`
  - `<SlideshowStage />` e rota `/telao` em `src/app/telao/page.tsx`

- [ ] **Step 1: Escrever o teste falhando para `useSlideshowQueue`**

Create `src/hooks/__tests__/useSlideshowQueue.test.ts`:
```typescript
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { pickRandomTransition, useSlideshowQueue } from '../useSlideshowQueue';
import { Post } from '@/types/post';

const makePost = (id: string, guest = 'Convidado'): Post => ({
  id,
  guest_name: guest,
  media_url: `https://example.com/${id}.webp`,
  media_type: 'photo',
  duration_ms: 5000,
  has_animated_overlay: false,
  overlay_data: null,
  visible: true,
  created_at: new Date().toISOString(),
});

describe('useSlideshowQueue', () => {
  it('prioritizes newly arrived Realtime posts ahead of historical cycling and removes hidden posts immediately', () => {
    const p1 = makePost('p1', 'Alice');
    const p2 = makePost('p2', 'Bruno');
    const { result } = renderHook(() => useSlideshowQueue([p1, p2]));

    expect(result.current.currentPost?.id).toBe('p1');
    expect(result.current.isPrioritySlide).toBe(false);

    // Convidado envia foto nova em tempo real (p3)
    const p3 = makePost('p3', 'Carla');
    act(() => {
      result.current.enqueueRealtimePost(p3);
    });

    // Quando o slide atual termina os 5s e avança, p3 fura a fila como prioritário!
    act(() => {
      result.current.nextSlide();
    });

    expect(result.current.currentPost?.id).toBe('p3');
    expect(result.current.isPrioritySlide).toBe(true);

    // Se a noiva ocultar p3 no dashboard enquanto ele está no telão, pula imediatamente!
    act(() => {
      result.current.removeOrHidePost('p3');
    });

    expect(result.current.currentPost?.id).toBe('p2');
  });

  it('picks a random transition from the 4 predefined transitions without repeating the previous one', () => {
    for (let i = 0; i < 15; i++) {
      const next = pickRandomTransition('cube-3d');
      expect(next).not.toBe('cube-3d');
    }
  });
});
```

- [ ] **Step 2: Rodar o teste para confirmar que falha**

Run: `npx vitest run src/hooks/__tests__/useSlideshowQueue.test.ts`
Expected: FAIL (`Cannot find module '../useSlideshowQueue'`)

- [ ] **Step 3: Implementar `useSlideshowQueue.ts`, `useRealtimePosts.ts`, `SlideshowStage.tsx` e `src/app/telao/page.tsx`**

Create `src/hooks/useSlideshowQueue.ts`:
```typescript
'use client';

import { useState, useCallback, useEffect } from 'react';
import { Post, TRANSITION_CLASSES, TransitionType } from '@/types/post';

export function pickRandomTransition(previous?: TransitionType): TransitionType {
  const candidates = previous
    ? TRANSITION_CLASSES.filter((t) => t !== previous)
    : TRANSITION_CLASSES;
  const randomIndex = Math.floor(Math.random() * candidates.length);
  return candidates[randomIndex] || 'fade-scale';
}

export function useSlideshowQueue(initialPosts: Post[]) {
  const [historyList, setHistoryList] = useState<Post[]>(() =>
    initialPosts.filter((p) => p.visible)
  );
  const [priorityQueue, setPriorityQueue] = useState<Post[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);
  const [currentPost, setCurrentPost] = useState<Post | null>(
    () => initialPosts.find((p) => p.visible) ?? null
  );
  const [isPrioritySlide, setIsPrioritySlide] = useState<boolean>(false);
  const [transition, setTransition] = useState<TransitionType>('fade-scale');

  useEffect(() => {
    const visibleInitial = initialPosts.filter((p) => p.visible);
    setHistoryList(visibleInitial);
    if (!currentPost && visibleInitial.length > 0) {
      setCurrentPost(visibleInitial[0]);
      setHistoryIndex(0);
    }
  }, [initialPosts]);

  const enqueueRealtimePost = useCallback((newPost: Post) => {
    if (!newPost.visible) return;
    setHistoryList((prev) => {
      if (prev.some((p) => p.id === newPost.id)) return prev;
      return [newPost, ...prev];
    });
    setPriorityQueue((prev) => {
      if (prev.some((p) => p.id === newPost.id)) return prev;
      return [...prev, newPost];
    });
    setCurrentPost((curr) => curr ?? newPost);
  }, []);

  const nextSlide = useCallback(() => {
    setTransition((prev) => pickRandomTransition(prev));

    if (priorityQueue.length > 0) {
      const [nextPriority, ...restQueue] = priorityQueue;
      setPriorityQueue(restQueue);
      setCurrentPost(nextPriority);
      setIsPrioritySlide(true);
      return;
    }

    setIsPrioritySlide(false);
    if (historyList.length === 0) {
      setCurrentPost(null);
      return;
    }

    const nextIdx = (historyIndex + 1) % historyList.length;
    setHistoryIndex(nextIdx);
    setCurrentPost(historyList[nextIdx]);
  }, [historyIndex, historyList, priorityQueue]);

  const removeOrHidePost = useCallback(
    (postId: string) => {
      const updatedHistory = historyList.filter((p) => p.id !== postId);
      const updatedPriority = priorityQueue.filter((p) => p.id !== postId);

      setHistoryList(updatedHistory);
      setPriorityQueue(updatedPriority);

      if (currentPost?.id === postId) {
        setTransition((prev) => pickRandomTransition(prev));
        if (updatedPriority.length > 0) {
          const [nextP, ...restP] = updatedPriority;
          setPriorityQueue(restP);
          setCurrentPost(nextP);
          setIsPrioritySlide(true);
        } else if (updatedHistory.length > 0) {
          const safeIdx = historyIndex % updatedHistory.length;
          setHistoryIndex(safeIdx);
          setCurrentPost(updatedHistory[safeIdx]);
          setIsPrioritySlide(false);
        } else {
          setCurrentPost(null);
          setIsPrioritySlide(false);
        }
      }
    },
    [currentPost, historyIndex, historyList, priorityQueue]
  );

  return {
    currentPost,
    isPrioritySlide,
    transition,
    totalVisibleCount: historyList.length,
    enqueueRealtimePost,
    removeOrHidePost,
    nextSlide,
  };
}
```

Create `src/hooks/useRealtimePosts.ts`:
```typescript
'use client';

import { useEffect } from 'react';
import { Post } from '@/types/post';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

interface RealtimeCallbacks {
  onInsert?: (post: Post) => void;
  onUpdate?: (post: Post) => void;
  onDelete?: (oldId: string) => void;
}

export function useRealtimePosts({ onInsert, onUpdate, onDelete }: RealtimeCallbacks) {
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    const channel = supabase
      .channel('wedding-posts-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'posts' },
        (payload) => {
          if (payload.new && onInsert) {
            onInsert(payload.new as Post);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'posts' },
        (payload) => {
          if (payload.new && onUpdate) {
            onUpdate(payload.new as Post);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'posts' },
        (payload) => {
          if (payload.old && 'id' in payload.old && onDelete) {
            onDelete(String(payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [onInsert, onUpdate, onDelete]);
}
```

Create `src/components/telao/SlideshowStage.module.scss`:
```scss
@use '@/styles/variables' as *;
@use '@/styles/mixins' as *;

.wallViewport {
  position: relative;
  width: 100vw;
  height: 100vh;
  background: $color-bg-dark;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ambientBg {
  position: absolute;
  inset: -40px;
  background-size: cover;
  background-position: center;
  filter: blur(48px) brightness(0.38) saturate(1.2);
  transform: scale(1.1);
  transition: background-image 0.8s ease;
}

.stageLayout {
  position: relative;
  z-index: 10;
  width: 100%;
  max-width: 1480px;
  height: 90vh;
  padding: 0 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 56px;
}

.storyCard {
  height: 88vh;
  @include story-aspect-box;
  border-radius: $radius-lg;
  box-shadow: 0 28px 80px rgba(0, 0, 0, 0.7);
  border: 2px solid rgba(255, 255, 255, 0.16);
  background: #000000;
}

.progressHeader {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 30;
  padding: 14px 16px 24px;
  background: linear-gradient(to bottom, rgba(0, 0, 0, 0.72), transparent);
}

.progressBarTrack {
  width: 100%;
  height: 5px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: $radius-full;
  overflow: hidden;
  margin-bottom: 12px;
}

.progressBarFill {
  height: 100%;
  background: #ffffff;
  transform-origin: left center;
  animation-name: storyProgressLinear;
  animation-timing-function: linear;
  animation-fill-mode: forwards;
}

@keyframes storyProgressLinear {
  from {
    width: 0%;
  }
  to {
    width: 100%;
  }
}

.authorRow {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #ffffff;
}

.authorName {
  font-weight: 700;
  font-size: 1.05rem;
  text-shadow: 0 2px 6px rgba(0, 0, 0, 0.5);
}

.priorityBadge {
  background: $color-gold;
  color: #ffffff;
  font-size: 0.76rem;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: $radius-full;
}

.sidePanel {
  @include glass-panel(0.65);
  border-radius: $radius-lg;
  padding: 32px 28px;
  width: 320px;
  color: #ffffff;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;

  h2 {
    font-family: $font-serif;
    font-size: 1.7rem;
    color: $color-champagne;
  }

  p {
    font-size: 0.95rem;
    color: rgba(255, 255, 255, 0.8);
    line-height: 1.45;
  }
}

.qrBox {
  background: #ffffff;
  padding: 16px;
  border-radius: $radius-md;
  @include flex-center;
}

.emptyState {
  @include glass-panel(0.75);
  border-radius: $radius-lg;
  padding: 48px;
  text-align: center;
  color: #ffffff;
  max-width: 560px;

  h1 {
    font-family: $font-serif;
    font-size: 2.3rem;
    margin-bottom: 12px;
  }

  p {
    color: rgba(255, 255, 255, 0.8);
    margin-bottom: 28px;
  }
}
```

Create `src/components/telao/SlideshowStage.tsx`:
```tsx
'use client';

import React, { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { DEFAULT_PHOTO_DURATION_MS, Post } from '@/types/post';
import { useSlideshowQueue } from '@/hooks/useSlideshowQueue';
import { useRealtimePosts } from '@/hooks/useRealtimePosts';
import { StoryRenderer } from '@/components/shared/StoryRenderer';
import styles from './SlideshowStage.module.scss';

interface SlideshowStageProps {
  initialPosts: Post[];
}

export const SlideshowStage: React.FC<SlideshowStageProps> = ({ initialPosts }) => {
  const [captureUrl, setCaptureUrl] = useState('https://gabifotomural.vercel.app');
  const {
    currentPost,
    isPrioritySlide,
    transition,
    enqueueRealtimePost,
    removeOrHidePost,
    nextSlide,
  } = useSlideshowQueue(initialPosts);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCaptureUrl(window.location.origin);
    }
  }, []);

  useRealtimePosts({
    onInsert: (post) => enqueueRealtimePost(post),
    onUpdate: (post) => {
      if (!post.visible) {
        removeOrHidePost(post.id);
      } else {
        enqueueRealtimePost(post);
      }
    },
    onDelete: (id) => removeOrHidePost(id),
  });

  useEffect(() => {
    if (!currentPost) return;
    const duration = currentPost.duration_ms || DEFAULT_PHOTO_DURATION_MS;
    const timer = window.setTimeout(() => {
      nextSlide();
    }, duration);
    return () => window.clearTimeout(timer);
  }, [currentPost, nextSlide]);

  const activeDuration = currentPost?.duration_ms || DEFAULT_PHOTO_DURATION_MS;

  return (
    <div className={styles.wallViewport}>
      {currentPost && currentPost.media_type === 'photo' && (
        <div
          className={styles.ambientBg}
          style={{ backgroundImage: `url(${currentPost.media_url})` }}
        />
      )}

      <div className={styles.stageLayout}>
        {currentPost ? (
          <div
            key={`${currentPost.id}-${transition}`}
            className={`${styles.storyCard} transition-${transition}`}
          >
            <div className={styles.progressHeader}>
              <div className={styles.progressBarTrack}>
                <div
                  className={styles.progressBarFill}
                  style={{ animationDuration: `${activeDuration}ms` }}
                />
              </div>
              <div className={styles.authorRow}>
                <span className={styles.authorName}>
                  📸 {currentPost.guest_name}
                </span>
                {isPrioritySlide && (
                  <span className={styles.priorityBadge}>✨ Acabou de enviar!</span>
                )}
              </div>
            </div>

            <StoryRenderer post={currentPost} autoPlay muted loop />
          </div>
        ) : (
          <div className={styles.emptyState}>
            <h1>Mural Ao Vivo do Casamento ✨</h1>
            <p>
              Aponte a câmera do seu celular para o QR Code ao lado e envie a
              primeira selfie da noite!
            </p>
          </div>
        )}

        <aside className={styles.sidePanel}>
          <h2>Apareça no Telão!</h2>
          <p>Escaneie o QR Code abaixo, tire sua selfie e decore seu story:</p>
          <div className={styles.qrBox}>
            <QRCodeSVG value={captureUrl} size={190} />
          </div>
          <p>Sem precisar baixar aplicativo ❤️</p>
        </aside>
      </div>
    </div>
  );
};
```

Create `src/app/telao/page.tsx`:
```tsx
'use client';

import React, { useEffect, useState } from 'react';
import { Post } from '@/types/post';
import { fetchPosts } from '@/lib/supabase/posts';
import { SlideshowStage } from '@/components/telao/SlideshowStage';

export default function TelaoPage() {
  const [posts, setPosts] = useState<Post[]>([]);

  useEffect(() => {
    fetchPosts({ includeHidden: false })
      .then((data) => setPosts(data))
      .catch(() => setPosts([]));
  }, []);

  return <SlideshowStage initialPosts={posts} />;
}
```

- [ ] **Step 4: Rodar o teste e verificar que passa**

Run: `npx vitest run src/hooks/__tests__/useSlideshowQueue.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useSlideshowQueue.ts src/hooks/useRealtimePosts.ts src/hooks/__tests__/ src/components/telao/ src/app/telao/
git commit -m "feat: implement live /telao slideshow with 5s timer, priority Realtime queue, and 4 random transitions"
```

---

### Task 7: Autenticação Simples do Dashboard, API de Moderação e Utilitário de Download `.ZIP`

**Files:**
- Create: `src/lib/auth.ts`
- Create: `src/app/api/auth/route.ts`
- Create: `src/app/api/posts/[id]/route.ts`
- Create: `src/lib/zipDownload.ts`
- Test: `src/lib/__tests__/zipDownload.test.ts`

**Interfaces:**
- Consumes: `Post` de `src/types/post.ts`, `getSupabaseAdminClient` de `src/lib/supabase/admin.ts`
- Produces:
  - `DASHBOARD_COOKIE_NAME = 'gabi_dashboard_auth'`, `verifyDashboardPassword(input: string): boolean` em `src/lib/auth.ts`
  - `POST /api/auth` e `DELETE /api/auth` em `src/app/api/auth/route.ts`
  - `PATCH /api/posts/[id]` (alterar `visible`) e `DELETE /api/posts/[id]` em `src/app/api/posts/[id]/route.ts`
  - `formatArchiveEntryName(post: Post, index: number): string` e `buildMemoriesZip(posts: Post[], onProgress?: (pct: number) => void): Promise<Blob>` em `src/lib/zipDownload.ts`

- [ ] **Step 1: Escrever o teste falhando para `zipDownload.ts` e `auth.ts`**

Create `src/lib/__tests__/zipDownload.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { formatArchiveEntryName } from '../zipDownload';
import { verifyDashboardPassword } from '../auth';
import { Post } from '@/types/post';

describe('Dashboard Auth & ZIP Archive Utilities', () => {
  it('formats archive file names cleanly with index, guest name, and media extension', () => {
    const post: Post = {
      id: '1',
      guest_name: 'Tio João & Tia Ana',
      media_url: 'https://cdn.supabase.co/storage/v1/object/public/wedding-media/123_foto.webp',
      media_type: 'photo',
      duration_ms: 5000,
      has_animated_overlay: false,
      overlay_data: null,
      visible: true,
      created_at: '2026-10-21T23:15:00.000Z',
    };

    const name = formatArchiveEntryName(post, 0);
    expect(name).toBe('001_Tio_Joao_Tia_Ana.webp');
  });

  it('verifies the dashboard password against DASHBOARD_PASSWORD env or default fallback', () => {
    expect(verifyDashboardPassword('casamentogabi')).toBe(true);
    expect(verifyDashboardPassword('senha-errada')).toBe(false);
  });
});
```

- [ ] **Step 2: Rodar o teste para confirmar que falha**

Run: `npx vitest run src/lib/__tests__/zipDownload.test.ts`
Expected: FAIL (`Cannot find module '../zipDownload'`)

- [ ] **Step 3: Implementar `auth.ts`, `api/auth/route.ts`, `api/posts/[id]/route.ts` e `zipDownload.ts`**

Create `src/lib/auth.ts`:
```typescript
export const DASHBOARD_COOKIE_NAME = 'gabi_dashboard_auth';
export const DASHBOARD_COOKIE_VALUE = 'authenticated_bride';

export function verifyDashboardPassword(input: string): boolean {
  const expected = process.env.DASHBOARD_PASSWORD || 'casamentogabi';
  return input.trim() === expected;
}
```

Create `src/app/api/auth/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import {
  DASHBOARD_COOKIE_NAME,
  DASHBOARD_COOKIE_VALUE,
  verifyDashboardPassword,
} from '@/lib/auth';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const password = String(body.password || '');

  if (!verifyDashboardPassword(password)) {
    return NextResponse.json(
      { error: 'Senha incorreta. Tente novamente!' },
      { status: 401 }
    );
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(DASHBOARD_COOKIE_NAME, DASHBOARD_COOKIE_VALUE, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 dias
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(DASHBOARD_COOKIE_NAME);
  return res;
}
```

Create `src/app/api/posts/[id]/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { DASHBOARD_COOKIE_NAME, DASHBOARD_COOKIE_VALUE } from '@/lib/auth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

function isAuthorized(req: NextRequest): boolean {
  const cookie = req.cookies.get(DASHBOARD_COOKIE_NAME)?.value;
  return cookie === DASHBOARD_COOKIE_VALUE;
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const { id } = await context.params;
  const body = await req.json().catch(() => ({}));
  const visible = Boolean(body.visible);

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from('posts')
    .update({ visible })
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ post: data });
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const { id } = await context.params;
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from('posts').delete().eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
```

Create `src/lib/zipDownload.ts`:
```typescript
import JSZip from 'jszip';
import { Post } from '@/types/post';

export function formatArchiveEntryName(post: Post, index: number): string {
  const paddedIndex = String(index + 1).padStart(3, '0');
  const safeGuest =
    post.guest_name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'Convidado';

  const urlPath = post.media_url.split('?')[0];
  const extMatch = urlPath.match(/\.(webp|jpg|jpeg|png|mp4|webm)$/i);
  const defaultExt = post.media_type === 'photo' ? 'webp' : 'webm';
  const ext = extMatch ? extMatch[1].toLowerCase() : defaultExt;

  return `${paddedIndex}_${safeGuest}.${ext}`;
}

export async function buildMemoriesZip(
  posts: Post[],
  onProgress?: (percent: number) => void
): Promise<Blob> {
  const zip = new JSZip();
  const folder = zip.folder('Recordacoes_Casamento');

  if (!folder) {
    throw new Error('Não foi possível criar pasta no arquivo ZIP');
  }

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    try {
      const response = await fetch(post.media_url);
      if (response.ok) {
        const blob = await response.blob();
        const fileName = formatArchiveEntryName(post, i);
        folder.file(fileName, blob);
      }
    } catch {
      // Ignora arquivos individuais com falha de rede para não interromper o pacote inteiro
    }

    if (onProgress) {
      onProgress(Math.round(((i + 1) / posts.length) * 100));
    }
  }

  return zip.generateAsync({ type: 'blob' });
}
```

- [ ] **Step 4: Rodar o teste e verificar que passa**

Run: `npx vitest run src/lib/__tests__/zipDownload.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth.ts src/lib/zipDownload.ts src/lib/__tests__/zipDownload.test.ts src/app/api/
git commit -m "feat: add dashboard password auth API, post moderation API, and JSZip downloader"
```

---

### Task 8: Dashboard da Noiva (`/dashboard`) — Aside Bar ("Fotos"), Galeria, Download Individual/ZIP e Moderação

**Files:**
- Create: `src/components/dashboard/DashboardSidebar.tsx`
- Create: `src/components/dashboard/DashboardSidebar.module.scss`
- Create: `src/components/dashboard/MediaCard.tsx`
- Create: `src/components/dashboard/MediaCard.module.scss`
- Create: `src/components/dashboard/DashboardClient.tsx`
- Create: `src/components/dashboard/DashboardClient.module.scss`
- Create: `src/app/dashboard/login/page.tsx`
- Create: `src/app/dashboard/page.tsx`
- Test: `src/components/dashboard/__tests__/DashboardClient.test.tsx`

**Interfaces:**
- Consumes: `Post` de `src/types/post.ts`, `<StoryRenderer />` de `src/components/shared/StoryRenderer.tsx`, `buildMemoriesZip`, `formatArchiveEntryName` de `src/lib/zipDownload.ts`, `useRealtimePosts` de `src/hooks/useRealtimePosts.ts`
- Produces:
  - `<DashboardSidebar activeTab={...} onSelectTab={...} />` com item de menu principal **"Fotos"**
  - `<MediaCard post={post} onToggleVisible={...} onDelete={...} />`
  - `<DashboardClient initialPosts={Post[]} />` e rotas `/dashboard` + `/dashboard/login`

- [ ] **Step 1: Escrever o teste falhando para `DashboardClient`**

Create `src/components/dashboard/__tests__/DashboardClient.test.tsx`:
```tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { DashboardClient } from '../DashboardClient';
import { Post } from '@/types/post';

const samplePosts: Post[] = [
  {
    id: 'post-10',
    guest_name: 'Madrinha Fernanda',
    media_url: 'https://example.com/fernanda.webp',
    media_type: 'photo',
    duration_ms: 5000,
    has_animated_overlay: false,
    overlay_data: null,
    visible: true,
    created_at: '2026-10-21T22:00:00.000Z',
  },
  {
    id: 'post-11',
    guest_name: 'Padrinho Rafael',
    media_url: 'https://example.com/rafael.webm',
    media_type: 'video',
    duration_ms: 8000,
    has_animated_overlay: false,
    overlay_data: null,
    visible: false,
    created_at: '2026-10-21T22:05:00.000Z',
  },
];

describe('DashboardClient', () => {
  it('renders the aside bar with "Fotos" menu item, displays guest memories, and filters by guest name or tab', () => {
    render(<DashboardClient initialPosts={samplePosts} />);

    // Menu lateral (aside) com item "Fotos"
    const asideNav = screen.getByRole('complementary');
    expect(asideNav).toBeTruthy();
    expect(screen.getByRole('button', { name: /Fotos/i })).toBeTruthy();

    // Na aba Fotos (visíveis), mostra Madrinha Fernanda
    expect(screen.getByText('Madrinha Fernanda')).toBeTruthy();

    // Alternar para a aba de Ocultos/Moderação mostra Padrinho Rafael
    const hiddenTabBtn = screen.getByRole('button', { name: /Ocultos/i });
    fireEvent.click(hiddenTabBtn);

    expect(screen.getByText('Padrinho Rafael')).toBeTruthy();

    // Botão de salvar pacote completo .ZIP está presente
    expect(screen.getByRole('button', { name: /Baixar Tudo \(\.ZIP\)/i })).toBeTruthy();
  });
});
```

- [ ] **Step 2: Rodar o teste para confirmar que falha**

Run: `npx vitest run src/components/dashboard/__tests__/DashboardClient.test.tsx`
Expected: FAIL (`Cannot find module '../DashboardClient'`)

- [ ] **Step 3: Implementar `DashboardSidebar`, `MediaCard`, `DashboardClient` e páginas `/dashboard` + `/dashboard/login`**

Create `src/components/dashboard/DashboardSidebar.module.scss`:
```scss
@use '@/styles/variables' as *;

.sidebar {
  width: 260px;
  min-height: 100vh;
  background: $color-surface-light;
  border-right: 1px solid #e8e2d9;
  padding: 28px 20px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  flex-shrink: 0;
}

.brand {
  margin-bottom: 32px;
  padding: 0 8px;

  span {
    display: inline-block;
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: $color-gold;
    margin-bottom: 4px;
  }

  h1 {
    font-family: $font-serif;
    font-size: 1.5rem;
    color: $color-text-primary;
  }
}

.navMenu {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.navItem {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 12px 14px;
  border: none;
  border-radius: $radius-md;
  background: transparent;
  color: $color-text-muted;
  font-size: 0.95rem;
  font-weight: 600;
  transition: all 0.2s;

  .navLabel {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  &:hover {
    background: $color-champagne;
    color: $color-text-primary;
  }

  &.active {
    background: $color-gold;
    color: #ffffff;
  }
}

.countPill {
  font-size: 0.78rem;
  padding: 2px 8px;
  border-radius: $radius-full;
  background: rgba(0, 0, 0, 0.08);
}

.footerLinks {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-top: 20px;
  border-top: 1px solid #e8e2d9;
}

.telaoLink {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  border-radius: $radius-md;
  background: $color-champagne;
  color: $color-text-primary;
  text-decoration: none;
  font-weight: 700;
  font-size: 0.9rem;
}
```

Create `src/components/dashboard/DashboardSidebar.tsx`:
```tsx
'use client';

import React from 'react';
import { EyeOff, Image as ImageIcon, QrCode, Tv } from 'lucide-react';
import styles from './DashboardSidebar.module.scss';

export type DashboardTab = 'fotos' | 'ocultos' | 'qrcode';

interface DashboardSidebarProps {
  activeTab: DashboardTab;
  onSelectTab: (tab: DashboardTab) => void;
  visibleCount: number;
  hiddenCount: number;
}

export const DashboardSidebar: React.FC<DashboardSidebarProps> = ({
  activeTab,
  onSelectTab,
  visibleCount,
  hiddenCount,
}) => {
  return (
    <aside className={styles.sidebar}>
      <div>
        <div className={styles.brand}>
          <span>Recordações da Festa</span>
          <h1>Mural da Noiva</h1>
        </div>

        <nav className={styles.navMenu}>
          <button
            type="button"
            className={`${styles.navItem} ${activeTab === 'fotos' ? styles.active : ''}`}
            onClick={() => onSelectTab('fotos')}
          >
            <span className={styles.navLabel}>
              <ImageIcon size={18} />
              <span>Fotos</span>
            </span>
            <span className={styles.countPill}>{visibleCount}</span>
          </button>

          <button
            type="button"
            className={`${styles.navItem} ${activeTab === 'ocultos' ? styles.active : ''}`}
            onClick={() => onSelectTab('ocultos')}
          >
            <span className={styles.navLabel}>
              <EyeOff size={18} />
              <span>Ocultos</span>
            </span>
            <span className={styles.countPill}>{hiddenCount}</span>
          </button>

          <button
            type="button"
            className={`${styles.navItem} ${activeTab === 'qrcode' ? styles.active : ''}`}
            onClick={() => onSelectTab('qrcode')}
          >
            <span className={styles.navLabel}>
              <QrCode size={18} />
              <span>QR Code da Festa</span>
            </span>
          </button>
        </nav>
      </div>

      <div className={styles.footerLinks}>
        <a
          href="/telao"
          target="_blank"
          rel="noreferrer"
          className={styles.telaoLink}
        >
          <Tv size={18} />
          <span>Abrir Telão Ao Vivo</span>
        </a>
      </div>
    </aside>
  );
};
```

Create `src/components/dashboard/MediaCard.module.scss`:
```scss
@use '@/styles/variables' as *;
@use '@/styles/mixins' as *;

.card {
  background: $color-surface-light;
  border-radius: $radius-md;
  border: 1px solid #e8e2d9;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
}

.previewWrapper {
  width: 100%;
  @include story-aspect-box;
}

.cardFooter {
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.metaInfo {
  display: flex;
  align-items: center;
  justify-content: space-between;

  strong {
    font-size: 0.95rem;
    color: $color-text-primary;
  }

  span {
    font-size: 0.78rem;
    color: $color-text-muted;
  }
}

.actionsRow {
  display: flex;
  gap: 8px;
}

.actionBtn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 10px;
  border-radius: $radius-sm;
  border: 1px solid #dfd9ce;
  background: $color-bg-light;
  color: $color-text-primary;
  font-size: 0.82rem;
  font-weight: 600;
  text-decoration: none;

  &:hover {
    background: $color-champagne;
  }

  &.dangerBtn {
    color: $color-danger;
  }
}
```

Create `src/components/dashboard/MediaCard.tsx`:
```tsx
'use client';

import React from 'react';
import { Download, Eye, EyeOff, Trash2 } from 'lucide-react';
import { Post } from '@/types/post';
import { StoryRenderer } from '@/components/shared/StoryRenderer';
import { formatArchiveEntryName } from '@/lib/zipDownload';
import styles from './MediaCard.module.scss';

interface MediaCardProps {
  post: Post;
  index: number;
  onToggleVisible: (post: Post) => void;
  onDelete: (postId: string) => void;
}

export const MediaCard: React.FC<MediaCardProps> = ({
  post,
  index,
  onToggleVisible,
  onDelete,
}) => {
  const timeFormatted = new Date(post.created_at).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const handleIndividualDownload = async () => {
    try {
      const res = await fetch(post.media_url);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = formatArchiveEntryName(post, index);
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      window.open(post.media_url, '_blank');
    }
  };

  return (
    <article className={styles.card}>
      <div className={styles.previewWrapper}>
        <StoryRenderer post={post} autoPlay={false} muted loop />
      </div>

      <div className={styles.cardFooter}>
        <div className={styles.metaInfo}>
          <strong>{post.guest_name}</strong>
          <span>{timeFormatted}</span>
        </div>

        <div className={styles.actionsRow}>
          <button
            type="button"
            className={styles.actionBtn}
            onClick={handleIndividualDownload}
            title="Salvar arquivo"
          >
            <Download size={15} />
            <span>Salvar</span>
          </button>

          <button
            type="button"
            className={styles.actionBtn}
            onClick={() => onToggleVisible(post)}
            title={post.visible ? 'Ocultar do telão' : 'Mostrar no telão'}
          >
            {post.visible ? <EyeOff size={15} /> : <Eye size={15} />}
            <span>{post.visible ? 'Ocultar' : 'Mostrar'}</span>
          </button>

          <button
            type="button"
            className={`${styles.actionBtn} ${styles.dangerBtn}`}
            onClick={() => onDelete(post.id)}
            title="Excluir permanentemente"
            aria-label="Excluir"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>
    </article>
  );
};
```

Create `src/components/dashboard/DashboardClient.module.scss`:
```scss
@use '@/styles/variables' as *;

.dashboardShell {
  display: flex;
  min-height: 100vh;
  background: $color-bg-light;
}

.mainContent {
  flex: 1;
  padding: 32px 40px;
  overflow-y: auto;
}

.topHeader {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 28px;

  h2 {
    font-family: $font-serif;
    font-size: 1.85rem;
    color: $color-text-primary;
  }

  p {
    color: $color-text-muted;
    font-size: 0.92rem;
  }
}

.headerControls {
  display: flex;
  align-items: center;
  gap: 12px;
}

.searchInput {
  padding: 10px 14px;
  border-radius: $radius-md;
  border: 1px solid #dcd5ca;
  background: $color-surface-light;
  font-size: 0.9rem;
  min-width: 220px;
}

.zipBtn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 11px 18px;
  border: none;
  border-radius: $radius-md;
  background: $color-gold;
  color: #ffffff;
  font-weight: 700;
  font-size: 0.92rem;

  &:hover:not(:disabled) {
    background: $color-gold-hover;
  }

  &:disabled {
    opacity: 0.6;
  }
}

.mediaGrid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
  gap: 22px;
}

.qrCard {
  background: $color-surface-light;
  border: 1px solid #e8e2d9;
  border-radius: $radius-lg;
  padding: 40px;
  max-width: 480px;
  text-align: center;

  h3 {
    font-family: $font-serif;
    font-size: 1.6rem;
    margin-bottom: 10px;
  }

  p {
    color: $color-text-muted;
    margin-bottom: 24px;
  }
}
```

Create `src/components/dashboard/DashboardClient.tsx`:
```tsx
'use client';

import React, { useState, useMemo } from 'react';
import { FolderDown } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Post } from '@/types/post';
import { useRealtimePosts } from '@/hooks/useRealtimePosts';
import { buildMemoriesZip } from '@/lib/zipDownload';
import { DashboardSidebar, DashboardTab } from './DashboardSidebar';
import { MediaCard } from './MediaCard';
import styles from './DashboardClient.module.scss';

interface DashboardClientProps {
  initialPosts: Post[];
}

export const DashboardClient: React.FC<DashboardClientProps> = ({
  initialPosts,
}) => {
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [activeTab, setActiveTab] = useState<DashboardTab>('fotos');
  const [searchQuery, setSearchQuery] = useState('');
  const [zipProgress, setZipProgress] = useState<number | null>(null);

  useRealtimePosts({
    onInsert: (newPost) => {
      setPosts((prev) =>
        prev.some((p) => p.id === newPost.id) ? prev : [newPost, ...prev]
      );
    },
    onUpdate: (updated) => {
      setPosts((prev) =>
        prev.map((p) => (p.id === updated.id ? updated : p))
      );
    },
    onDelete: (deletedId) => {
      setPosts((prev) => prev.filter((p) => p.id !== deletedId));
    },
  });

  const visiblePosts = useMemo(() => posts.filter((p) => p.visible), [posts]);
  const hiddenPosts = useMemo(() => posts.filter((p) => !p.visible), [posts]);

  const displayedPosts = useMemo(() => {
    const base = activeTab === 'ocultos' ? hiddenPosts : visiblePosts;
    if (!searchQuery.trim()) return base;
    const q = searchQuery.toLowerCase();
    return base.filter((p) => p.guest_name.toLowerCase().includes(q));
  }, [activeTab, hiddenPosts, searchQuery, visiblePosts]);

  const handleToggleVisible = async (post: Post) => {
    const nextVisible = !post.visible;
    setPosts((prev) =>
      prev.map((p) => (p.id === post.id ? { ...p, visible: nextVisible } : p))
    );
    await fetch(`/api/posts/${post.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visible: nextVisible }),
    });
  };

  const handleDelete = async (postId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    await fetch(`/api/posts/${postId}`, { method: 'DELETE' });
  };

  const handleDownloadAllZip = async () => {
    if (visiblePosts.length === 0 || zipProgress !== null) return;
    setZipProgress(0);
    try {
      const zipBlob = await buildMemoriesZip(visiblePosts, (pct) =>
        setZipProgress(pct)
      );
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Recordacoes_Casamento_Gabi.zip';
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setZipProgress(null);
    }
  };

  const captureUrl =
    typeof window !== 'undefined'
      ? window.location.origin
      : 'https://gabifotomural.vercel.app';

  return (
    <div className={styles.dashboardShell}>
      <DashboardSidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        visibleCount={visiblePosts.length}
        hiddenCount={hiddenPosts.length}
      />

      <main className={styles.mainContent}>
        <header className={styles.topHeader}>
          <div>
            <h2>
              {activeTab === 'fotos'
                ? 'Galeria de Fotos & Stories'
                : activeTab === 'ocultos'
                ? 'Itens Ocultados do Telão'
                : 'QR Code para os Convidados'}
            </h2>
            <p>
              Salve todas as lembranças enviadas pelos convidados durante a festa.
            </p>
          </div>

          <div className={styles.headerControls}>
            <input
              type="search"
              className={styles.searchInput}
              placeholder="Filtrar por convidado..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />

            <button
              type="button"
              className={styles.zipBtn}
              onClick={handleDownloadAllZip}
              disabled={visiblePosts.length === 0 || zipProgress !== null}
            >
              <FolderDown size={18} />
              <span>
                {zipProgress !== null
                  ? `Compactando (${zipProgress}%)...`
                  : 'Baixar Tudo (.ZIP)'}
              </span>
            </button>
          </div>
        </header>

        {activeTab === 'qrcode' ? (
          <div className={styles.qrCard}>
            <h3>QR Code Oficial da Festa</h3>
            <p>
              Imprima para colocar nas mesas ou exiba na entrada do salão:
            </p>
            <QRCodeSVG value={captureUrl} size={240} />
          </div>
        ) : (
          <section className={styles.mediaGrid}>
            {displayedPosts.map((post, idx) => (
              <MediaCard
                key={post.id}
                post={post}
                index={idx}
                onToggleVisible={handleToggleVisible}
                onDelete={handleDelete}
              />
            ))}
          </section>
        )}
      </main>
    </div>
  );
};
```

Create `src/app/dashboard/login/page.tsx`:
```tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from '@/components/capture/GuestWelcomeModal.module.scss';

export default function DashboardLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });

    setLoading(false);
    if (res.ok) {
      router.push('/dashboard');
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || 'Senha inválida');
    }
  };

  return (
    <div className={styles.backdrop}>
      <form className={styles.card} onSubmit={handleSubmit}>
        <span className={styles.badge}>💍 Área dos Noivos</span>
        <h1 className={styles.title}>Dashboard de Fotos</h1>
        <p className={styles.subtitle}>
          Digite a senha da festa para ver e baixar todas as fotos e vídeos:
        </p>

        <input
          type="password"
          className={styles.input}
          placeholder="Senha do Dashboard"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
        />

        {error && (
          <p style={{ color: '#d94646', marginBottom: 12, fontSize: '0.88rem' }}>
            {error}
          </p>
        )}

        <button type="submit" className={styles.submitBtn} disabled={loading}>
          {loading ? 'Entrando...' : 'Acessar Galeria'}
        </button>
      </form>
    </div>
  );
}
```

Create `src/app/dashboard/page.tsx`:
```tsx
import React from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { DASHBOARD_COOKIE_NAME, DASHBOARD_COOKIE_VALUE } from '@/lib/auth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { DashboardClient } from '@/components/dashboard/DashboardClient';
import { Post } from '@/types/post';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get(DASHBOARD_COOKIE_NAME)?.value;

  if (authCookie !== DASHBOARD_COOKIE_VALUE) {
    redirect('/dashboard/login');
  }

  let initialPosts: Post[] = [];
  try {
    const supabase = getSupabaseAdminClient();
    const { data } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false });
    initialPosts = (data ?? []) as Post[];
  } catch {
    initialPosts = [];
  }

  return <DashboardClient initialPosts={initialPosts} />;
}
```

- [ ] **Step 4: Rodar toda a suíte de testes e o build do Next.js para validar o sistema completo**

Run: `npx vitest run`
Expected: PASS (todas as 7 suítes passando)

Run: `npm run build`
Expected: Build do Next.js concluído sem erros de compilação TypeScript ou SASS.

- [ ] **Step 5: Commit final**

```bash
git add src/components/dashboard/ src/app/dashboard/
git commit -m "feat: implement bride Dashboard with Fotos aside menu, moderation, and ZIP download"
```
