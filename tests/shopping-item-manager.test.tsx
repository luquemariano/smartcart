import {
  fireEvent,
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ShoppingItemManager } from '@/components/shopping-item-manager';
import { createLocalProduct } from '@/lib/local-product-repository';
import {
  finishLocalShoppingSession,
  startLocalShoppingSession,
} from '@/lib/local-shopping-session-repository';
import { listOffline, listPendingOfflineOperations } from '@/lib/offline-db';

describe('shopping item manager', () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(() => cleanup());

  it('adds catalog/manual items, merges catalog quantities and lists completed items', async () => {
    const product = createLocalProduct('guest-ui-items', {
      name: 'Leche',
      brand: 'La Serenísima',
      barcode: null,
      quantityValue: '1',
      quantityUnit: 'l',
    });
    const session = startLocalShoppingSession('guest-ui-items', null);
    const { rerender } = render(
      <ShoppingItemManager
        guestId="guest-ui-items"
        mode="guest"
        sessionId={session.id}
        status="active"
      />,
    );
    expect(
      await screen.findByText('Todavía no agregaste productos.'),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Producto del catálogo'), {
      target: { value: product.id },
    });
    fireEvent.change(
      screen.getByLabelText('Cantidad del producto del catálogo'),
      {
        target: { value: '2' },
      },
    );
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Agregar producto' }),
      ).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Agregar producto' }));
    expect(await screen.findByText('Leche · 1 l')).toBeInTheDocument();
    expect(screen.getByText('Cantidad: 2')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Producto del catálogo'), {
      target: { value: product.id },
    });
    fireEvent.change(
      screen.getByLabelText('Cantidad del producto del catálogo'),
      {
        target: { value: '1.5' },
      },
    );
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Agregar producto' }),
      ).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Agregar producto' }));
    expect(await screen.findByText('Cantidad: 3.5')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Nombre del producto manual'), {
      target: { value: 'Pan francés' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Agregar manual' }));
    expect(await screen.findByText('Pan francés')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Cantidad de Pan francés'), {
      target: { value: '1.25' },
    });
    const manualItem = screen.getByText('Pan francés').closest('li');
    if (!manualItem) throw new Error('manual item row missing');
    fireEvent.click(
      within(manualItem).getByRole('button', { name: 'Guardar cantidad' }),
    );
    expect(await screen.findByText('Cantidad: 1.25')).toBeInTheDocument();
    fireEvent.click(
      within(manualItem).getByRole('button', { name: 'Eliminar' }),
    );
    expect(await screen.findByText('Leche · 1 l')).toBeInTheDocument();

    finishLocalShoppingSession('guest-ui-items', session.id);
    rerender(
      <ShoppingItemManager
        guestId="guest-ui-items"
        mode="guest"
        sessionId={session.id}
        status="completed"
      />,
    );
    expect(await screen.findByText('Cantidad: 3.5')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Eliminar' }),
    ).not.toBeInTheDocument();
  });

  it('keeps a fetched catalog product selectable and queues its item if session loading loses connectivity', async () => {
    const ownerUserId = crypto.randomUUID();
    const sessionId = crypto.randomUUID();
    const product = {
      id: crypto.randomUUID(),
      name: 'Yogur',
      brand: 'Prueba',
      barcode: null,
      quantityValue: '1',
      quantityUnit: 'l',
    };
    const originalOnline = navigator.onLine;
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: true,
    });
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        if (String(input) === '/api/products')
          return new Response(JSON.stringify({ products: [product] }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        throw new TypeError('Failed to fetch');
      }),
    );

    try {
      render(
        <ShoppingItemManager
          mode="authenticated"
          ownerUserId={ownerUserId}
          sessionId={sessionId}
          status="active"
        />,
      );

      const cachedProducts = await waitFor(async () => {
        const cached = await listOffline<
          typeof product & { ownerUserId: string }
        >(
          'offline_products',
          (candidate) => candidate.ownerUserId === ownerUserId,
        );
        expect(cached).toHaveLength(1);
        return cached;
      });
      expect(cachedProducts[0]).toMatchObject(product);
      expect(
        await screen.findByRole('option', { name: 'Yogur' }),
      ).toBeInTheDocument();

      Object.defineProperty(navigator, 'onLine', {
        configurable: true,
        value: false,
      });
      window.dispatchEvent(new Event('offline'));
      fireEvent.change(screen.getByLabelText('Producto del catálogo'), {
        target: { value: product.id },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Agregar producto' }));

      expect(await screen.findByText('Cantidad: 1')).toBeInTheDocument();
      await waitFor(async () => {
        const pending = await listPendingOfflineOperations(ownerUserId);
        expect(pending).toHaveLength(1);
        expect(pending[0]).toMatchObject({
          type: 'shopping_item_create',
          payload: {
            sessionId,
            input: { productId: product.id, quantity: '1', unitPrice: null },
          },
        });
      });
      await expect(
        listOffline<{
          ownerUserId: string;
          sessionId: string;
          productName: string;
        }>(
          'offline_items',
          (item) =>
            item.ownerUserId === ownerUserId && item.sessionId === sessionId,
        ),
      ).resolves.toMatchObject([{ productName: 'Yogur' }]);
    } finally {
      Object.defineProperty(navigator, 'onLine', {
        configurable: true,
        value: originalOnline,
      });
      vi.unstubAllGlobals();
    }
  });
});
