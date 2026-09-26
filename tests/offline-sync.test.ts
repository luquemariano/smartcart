import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  enqueueOfflineOperation,
  listPendingOfflineOperations,
} from '@/lib/offline-db';
import { syncOfflineOperations } from '@/lib/offline-sync';

afterEach(() => vi.unstubAllGlobals());

describe('offline operation synchronization', () => {
  it('keeps the server ID from a create for a dependent update retry', async () => {
    const ownerUserId = crypto.randomUUID();
    const localItemId = crypto.randomUUID();
    const createOperationId = crypto.randomUUID();
    const updateOperationId = crypto.randomUUID();
    await enqueueOfflineOperation({
      ownerUserId,
      clientOperationId: createOperationId,
      type: 'shopping_item_create',
      localEntityId: localItemId,
      payload: { sessionId: crypto.randomUUID(), input: { quantity: '1' } },
      createdAt: '2026-01-01T00:00:00.000Z',
    });
    await enqueueOfflineOperation({
      ownerUserId,
      clientOperationId: updateOperationId,
      type: 'shopping_item_update',
      localEntityId: localItemId,
      serverEntityId: localItemId,
      payload: {
        itemId: localItemId,
        patch: { quantity: '3', unitPrice: '12.50' },
      },
      createdAt: '2026-01-01T00:00:01.000Z',
    });

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({
          results: [
            {
              clientOperationId: createOperationId,
              status: 'applied',
              serverEntityId: 'server-item-id',
            },
            {
              clientOperationId: updateOperationId,
              status: 'conflict',
              errorCode: 'ShoppingItemNotFoundError',
            },
          ],
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          results: [
            { clientOperationId: updateOperationId, status: 'applied' },
          ],
        }),
      );
    vi.stubGlobal('fetch', fetchMock);

    await syncOfflineOperations(ownerUserId);
    const afterFirstBatch = await listPendingOfflineOperations(ownerUserId);
    expect(afterFirstBatch).toHaveLength(1);
    expect(afterFirstBatch[0]?.serverEntityId).toBe('server-item-id');

    await syncOfflineOperations(ownerUserId);
    expect(await listPendingOfflineOperations(ownerUserId)).toHaveLength(0);
  });
});
