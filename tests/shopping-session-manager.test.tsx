import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { createLocalStore } from '@/lib/local-store-repository';
import { ShoppingSessionManager } from '@/components/shopping-session-manager';

describe('shopping session manager', () => {
  beforeEach(() => window.localStorage.clear());

  it('starts, restores and finishes a guest session', async () => {
    const store = createLocalStore('guest-session-ui', {
      name: 'Carrefour',
      branchName: 'Colón',
      address: '',
      latitude: null,
      longitude: null,
    });
    const { unmount } = render(
      <ShoppingSessionManager guestId="guest-session-ui" mode="guest" />,
    );
    expect(
      await screen.findByText('¿Empezamos una compra?'),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Supermercado de la compra'), {
      target: { value: store.id },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Empezar compra' }));
    expect(await screen.findByText('Compra en curso')).toBeInTheDocument();
    expect(screen.getByText('Carrefour Colón')).toBeInTheDocument();

    unmount();
    render(<ShoppingSessionManager guestId="guest-session-ui" mode="guest" />);
    expect(await screen.findByText('Carrefour Colón')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Finalizar' }));
    expect(await screen.findByText('Compras anteriores')).toBeInTheDocument();
  });
});
