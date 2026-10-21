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
      // Ignora falhas de rede individuais sem abortar o zip completo
    }

    if (onProgress) {
      onProgress(Math.round(((i + 1) / posts.length) * 100));
    }
  }

  return zip.generateAsync({ type: 'blob' });
}
