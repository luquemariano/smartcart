import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { ShoppingItemManager } from '@/components/shopping-item-manager';
import { createLocalProduct } from '@/lib/local-product-repository';
import {
  finishLocalShoppingSession,
  startLocalShoppingSession,
} from '@/lib/local-shopping-session-repository';

describe('shopping item manager', () => {
  beforeEach(() => window.localStorage.clear());

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
});
