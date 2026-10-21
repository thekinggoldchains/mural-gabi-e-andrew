import type { Metadata } from 'next';
import { SlideshowStage } from '@/components/telao/SlideshowStage';

export const metadata: Metadata = {
  title: 'Telão Ao Vivo — Mural do Casamento',
};

export default function TelaoPage() {
  return <SlideshowStage />;
}
