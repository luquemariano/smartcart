import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AccessPanel } from '@/components/access-panel';

const mockedAuthClient = vi.hoisted(() => ({
  useSession: vi.fn(() => ({ data: null, isPending: false })),
  signIn: { social: vi.fn(), email: vi.fn() },
  signUp: { email: vi.fn() },
  signOut: vi.fn(),
}));

vi.mock('@/lib/auth-client', () => ({ authClient: mockedAuthClient }));

describe('access panel', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('shows the local guest state without requiring registration', () => {
    render(<AccessPanel googleConfigured={false} />);

    fireEvent.click(
      screen.getByRole('button', { name: 'Usar sin registrarme' }),
    );

    expect(screen.getByTestId('guest-state')).toBeInTheDocument();
    expect(screen.getByText('Modo invitado')).toBeInTheDocument();
  });
});
