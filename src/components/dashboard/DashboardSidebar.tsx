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
