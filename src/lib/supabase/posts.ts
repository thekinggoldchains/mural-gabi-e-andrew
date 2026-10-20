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
  let query = supabase.from('posts').select('*');

  if (!options?.includeHidden) {
    query = query.eq('visible', true);
  }

  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) {
    throw new Error(`Erro ao carregar mural: ${error.message}`);
  }

  return (data ?? []) as Post[];
}
