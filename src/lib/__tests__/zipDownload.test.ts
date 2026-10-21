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
