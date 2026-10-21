export interface GifStickerItem {
  id: string;
  url: string;
  title: string;
}

export const CURATED_WEDDING_GIFS: GifStickerItem[] = [
  { id: 'wed-1', title: 'Brinde Champagne', url: 'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif' },
  { id: 'wed-2', title: 'Corações Festa', url: 'https://media.giphy.com/media/26BRv0ThflsHCqDrG/giphy.gif' },
  { id: 'wed-3', title: 'Dançando na Pista', url: 'https://media.giphy.com/media/l0MYGb1LuZ3n7dRnO/giphy.gif' },
  { id: 'wed-4', title: 'Confete Celebração', url: 'https://media.giphy.com/media/artj92V8o75VPL7AeQ/giphy.gif' },
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
];

interface GiphyApiItem {
  id: string;
  title?: string;
  images?: { fixed_height?: { url?: string }; original?: { url?: string } };
}

export async function searchWeddingGifs(query: string): Promise<GifStickerItem[]> {
  const apiKey = process.env.NEXT_PUBLIC_GIPHY_API_KEY;
  if (!query.trim() || !apiKey) return CURATED_WEDDING_GIFS;

  try {
    const endpoint =
      `https://api.giphy.com/v1/stickers/search?api_key=${encodeURIComponent(apiKey)}` +
      `&q=${encodeURIComponent(query)}&limit=12&rating=g&lang=pt`;
    const res = await fetch(endpoint);
    if (!res.ok) return CURATED_WEDDING_GIFS;
    const json: { data?: GiphyApiItem[] } = await res.json();
    const items = (json.data ?? [])
      .map((item) => ({
        id: item.id,
        title: item.title || 'GIF',
        url: item.images?.fixed_height?.url || item.images?.original?.url || '',
      }))
      .filter((item) => item.url);
    return items.length > 0 ? items : CURATED_WEDDING_GIFS;
  } catch {
    return CURATED_WEDDING_GIFS;
  }
}
