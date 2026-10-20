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
