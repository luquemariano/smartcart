import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { ShoppingHistoryManager } from '@/components/shopping-history-manager';
import { createLocalStore } from '@/lib/local-store-repository';
import { addLocalShoppingItem } from '@/lib/local-shopping-item-repository';
import {
  finishLocalShoppingSession,
  startLocalShoppingSession,
} from '@/lib/local-shopping-session-repository';

describe('shopping history manager', () => {
  beforeEach(() => window.localStorage.clear());

  it('shows completed purchases, excludes active, filters stores and opens readonly detail', async () => {
    const guestId = 'guest-history-ui';
    const carrefour = createLocalStore(guestId, {
      name: 'Carrefour',
      branchName: 'Colón',
      address: '',
      latitude: null,
      longitude: null,
    });
    const disco = createLocalStore(guestId, {
      name: 'Disco',
      branchName: null,
      address: '',
      latitude: null,
      longitude: null,
    });
    const first = startLocalShoppingSession(guestId, carrefour.id, '100000');
    addLocalShoppingItem(guestId, first.id, {
      productId: null,
      productName: 'Leche',
      quantity: '2',
      unitPrice: '1850',
    });
    finishLocalShoppingSession(guestId, first.id);
    const second = startLocalShoppingSession(guestId, disco.id);
    addLocalShoppingItem(guestId, second.id, {
      productId: null,
      productName: 'Yerba',
      quantity: '1',
    });
    finishLocalShoppingSession(guestId, second.id);
    startLocalShoppingSession(guestId, carrefour.id, null);

    render(
      <ShoppingHistoryManager
        guestId={guestId}
        mode="guest"
        refreshKey={0}
        stores={[carrefour, disco]}
      />,
    );

    expect(await screen.findByText('Carrefour Colón')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Disco/ })).toBeInTheDocument();
    expect(screen.getByText('1 ítems sin precio')).toBeInTheDocument();
    expect(screen.queryByText('Compra en curso')).not.toBeInTheDocument();
    fireEvent.change(
      screen.getByLabelText('Filtrar historial por supermercado'),
      {
        target: { value: carrefour.id },
      },
    );
    await waitFor(() =>
      expect(
        screen.queryByRole('button', { name: /Disco/ }),
      ).not.toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole('button', { name: /Carrefour Colón/ }));
    expect(await screen.findByText('Productos')).toBeInTheDocument();
    expect(screen.getByText(/2 ×/)).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Eliminar' }),
    ).not.toBeInTheDocument();
  });
});
