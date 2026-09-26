import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { OfflineStatus } from '@/components/offline-status';
import { enqueueOfflineOperation } from '@/lib/offline-db';

vi.mock('@/lib/online-status', () => ({
  useOnlineStatus: () => false,
}));

vi.mock('@/lib/offline-sync', () => ({
  syncOfflineOperations: vi.fn(),
}));

afterEach(() => cleanup());

describe('OfflineStatus', () => {
  it('announces pending local operations while offline', async () => {
    const ownerUserId = crypto.randomUUID();
    await enqueueOfflineOperation({
      ownerUserId,
      clientOperationId: crypto.randomUUID(),
      type: 'shopping_item_create',
      payload: {
        name: 'F17 B',
        quantity: 1,
        unit: 'unidad',
        unitPriceCents: 200000,
        storeId: null,
        productId: null,
        note: null,
      },
      createdAt: new Date().toISOString(),
    });

    render(<OfflineStatus ownerUserId={ownerUserId} />);

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Sin conexión · Cambios pendientes (1)',
    );
    expect(screen.queryByRole('button', { name: 'Reintentar' })).toBeNull();
  });
});
