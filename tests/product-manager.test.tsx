import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { ProductManager } from '@/components/product-manager';

describe('product manager', () => {
  beforeEach(() => window.localStorage.clear());

  it('shows empty state, creates, searches and selects a local product', async () => {
    render(<ProductManager guestId="guest-ui" mode="guest" />);
    expect(
      await screen.findByText('Todavía no guardaste ningún producto.'),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '+ Agregar producto' }));
    fireEvent.change(screen.getByLabelText('Nombre *'), {
      target: { value: 'Spaghetti' },
    });
    fireEvent.change(screen.getByLabelText('Marca'), {
      target: { value: 'Matarazzo' },
    });
    fireEvent.change(screen.getByLabelText('Cantidad'), {
      target: { value: '500' },
    });
    fireEvent.change(screen.getByLabelText('Unidad'), {
      target: { value: 'g' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByText('Matarazzo Spaghetti')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Buscar producto'), {
      target: { value: 'Matarazzo' },
    });
    expect(screen.getByText('Matarazzo Spaghetti')).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: 'Matarazzo Spaghetti' }),
    );
    expect(
      screen.getByText('Producto seleccionado: Spaghetti'),
    ).toBeInTheDocument();
  });
});
