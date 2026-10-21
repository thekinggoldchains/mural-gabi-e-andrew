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
