import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AccessPanel } from '@/components/access-panel';
import { saveOfflineAuthSnapshot } from '@/lib/offline-auth';

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
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: true,
    });
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(new Response(JSON.stringify({ stores: [] }))),
      ),
    );
    mockedAuthClient.useSession.mockReturnValue({
      data: null,
      isPending: false,
    });
  });

  it('shows the local guest state without requiring registration', () => {
    render(<AccessPanel googleConfigured={false} />);

    fireEvent.click(
      screen.getByRole('button', { name: 'Usar sin registrarme' }),
    );

    expect(screen.getByTestId('guest-state')).toBeInTheDocument();
    expect(screen.getByText('Modo invitado')).toBeInTheDocument();
  });

  it('keeps email as a secondary access option with a simple signup toggle', () => {
    render(<AccessPanel googleConfigured={false} />);

    fireEvent.click(screen.getByRole('button', { name: 'Entrar con email' }));
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Contraseña')).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: 'Crear cuenta con email' }),
    );
    expect(screen.getByLabelText('Nombre')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Crear cuenta' }),
    ).toBeInTheDocument();
  });

  it('renders the authenticated state without creating a guest identity on logout', () => {
    mockedAuthClient.useSession.mockReturnValue({
      data: {
        user: {
          name: 'María',
          email: 'maria@example.com',
          image: null,
        },
      },
      isPending: false,
    } as never);

    render(<AccessPanel googleConfigured={false} />);

    expect(screen.getAllByText('maria@example.com').length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));
    expect(mockedAuthClient.signOut).toHaveBeenCalled();
    expect(window.localStorage.getItem('smartcart.guest.identity')).toBeNull();
  });

  it('restores a known authenticated user offline without attempting sign-in', async () => {
    const ownerUserId = crypto.randomUUID();
    await saveOfflineAuthSnapshot({
      id: ownerUserId,
      name: 'María',
      email: 'maria@example.com',
    });
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: false,
    });
    mockedAuthClient.useSession.mockReturnValue({
      data: null,
      error: { status: 0 },
      isPending: false,
    } as never);

    render(<AccessPanel googleConfigured={false} />);

    await waitFor(() => {
      expect(screen.getByText('Sesión offline')).toBeInTheDocument();
    });
    expect(screen.getAllByText('maria@example.com').length).toBeGreaterThan(0);
    expect(mockedAuthClient.signIn.email).not.toHaveBeenCalled();
  });
});
