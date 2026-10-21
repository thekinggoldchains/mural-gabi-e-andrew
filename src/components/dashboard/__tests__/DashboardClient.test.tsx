import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
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
