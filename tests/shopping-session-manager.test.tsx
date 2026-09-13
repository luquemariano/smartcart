import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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
    fireEvent.change(screen.getByLabelText('Presupuesto opcional'), {
      target: { value: '100000.50' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Empezar compra' }));
    expect(await screen.findByText('Compra en curso')).toBeInTheDocument();
    expect(screen.getByText('Carrefour Colón')).toBeInTheDocument();
    expect(screen.getByText(/100\.000,50/)).toBeInTheDocument();

    unmount();
    render(<ShoppingSessionManager guestId="guest-session-ui" mode="guest" />);
    expect(await screen.findByText('Carrefour Colón')).toBeInTheDocument();
    expect(screen.getByText(/100\.000,50/)).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: 'Cambiar presupuesto' }),
    );
    fireEvent.change(screen.getByLabelText('Presupuesto de la compra'), {
      target: { value: '120000' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Guardar presupuesto' }),
    );
    expect(await screen.findByText(/120\.000,00/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Quitar presupuesto' }));
    fireEvent.click(
      screen.getByRole('button', { name: 'Guardar presupuesto' }),
    );
    expect(
      await screen.findByText('Sin presupuesto definido'),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: 'Definir presupuesto' }),
    );
    fireEvent.change(screen.getByLabelText('Presupuesto de la compra'), {
      target: { value: '100000' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Guardar presupuesto' }),
    );
    expect(await screen.findByText(/100\.000,00/)).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Finalizar' })).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Finalizar' }));
    expect(await screen.findByText('Compras anteriores')).toBeInTheDocument();
    expect(screen.getByText(/Presupuesto:.*100\.000,00/)).toBeInTheDocument();
  });
});
