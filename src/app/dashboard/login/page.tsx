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
