import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createLocalStore } from '@/lib/local-store-repository';
import { ShoppingSessionManager } from '@/components/shopping-session-manager';
import { listPendingOfflineOperations } from '@/lib/offline-db';

const onlineState = vi.hoisted(() => ({ value: true }));
vi.mock('@/lib/online-status', () => ({
  useOnlineStatus: () => onlineState.value,
}));

vi.mock('@/components/shopping-item-manager', () => ({
  ShoppingItemManager: () => null,
}));
vi.mock('@/components/barcode-product-adder', () => ({
  BarcodeProductAdder: () => null,
}));

describe('shopping session manager', () => {
  beforeEach(() => {
    onlineState.value = true;
    window.localStorage.clear();
  });

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

  it('queues authenticated session finish while offline without requesting the API', async () => {
    onlineState.value = false;
    const ownerUserId = crypto.randomUUID();
    const session = {
      id: crypto.randomUUID(),
      storeId: null,
      status: 'active',
      budgetAmount: null,
      currency: 'ARS',
      startedAt: new Date().toISOString(),
      finishedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const fetchMock = vi.fn<
      (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
    >(async (input) => {
      const url = String(input);
      if (url === '/api/stores')
        return Response.json({ stores: [] }) as Response;
      if (url === '/api/shopping-sessions/active')
        return Response.json({ session, summary: null }) as Response;
      if (url.startsWith('/api/shopping-history'))
        return Response.json({ entries: [], hasMore: false }) as Response;
      throw new Error(`Unexpected request: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    render(
      <ShoppingSessionManager mode="authenticated" ownerUserId={ownerUserId} />,
    );
    fireEvent.click(await screen.findByRole('button', { name: 'Finalizar' }));

    expect(
      await screen.findByText(
        'La finalización quedó guardada en este dispositivo y se sincronizará al volver la conexión.',
      ),
    ).toBeInTheDocument();
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Sin conexión · Cambios pendientes (1)',
    );
    expect(
      fetchMock.mock.calls.some(
        ([url, init]) =>
          String(url).includes(session.id) && init?.method === 'PATCH',
      ),
    ).toBe(false);
    const pending = await listPendingOfflineOperations(ownerUserId);
    expect(pending).toHaveLength(1);
    expect(pending[0]?.type).toBe('shopping_session_finish');
    expect(pending[0]?.payload.sessionId).toBe(session.id);
    vi.unstubAllGlobals();
  });
});
