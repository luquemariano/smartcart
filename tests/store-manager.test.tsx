import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { StoreManager } from '@/components/store-manager';

describe('store manager', () => {
  beforeEach(() => window.localStorage.clear());

  it('shows an empty state, adds a local store and selects it', async () => {
    render(<StoreManager guestId="guest-ui" mode="guest" />);

    expect(
      await screen.findByText('Todavía no guardaste ningún supermercado.'),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: '+ Agregar supermercado' }),
    );
    fireEvent.change(screen.getByLabelText('Nombre *'), {
      target: { value: 'ChangoMás' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByText('ChangoMás')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'ChangoMás' }));
    await waitFor(() =>
      expect(
        screen.getByText('Supermercado seleccionado: ChangoMás'),
      ).toBeInTheDocument(),
    );
  });
});
