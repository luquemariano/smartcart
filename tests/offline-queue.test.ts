import { describe, expect, it } from 'vitest';
import {
  compactOfflineOperations,
  orderOfflineOperations,
} from '@/lib/offline-queue';
import type { OfflineOperation } from '@/lib/offline-types';

const operation = (
  type: OfflineOperation['type'],
  createdAt: string,
  localEntityId = 'item',
) => ({
  id: createdAt,
  ownerUserId: 'a',
  clientOperationId: createdAt,
  type,
  localEntityId,
  payload: { quantity: '1' },
  createdAt,
  retryCount: 0,
  status: 'pending' as const,
});
describe('offline queue', () => {
  it('orders product/item/finish dependencies', () =>
    expect(
      orderOfflineOperations([
        operation('shopping_session_finish', '3'),
        operation('shopping_item_create', '2'),
        operation('product_create', '1'),
      ]).map((x) => x.type),
    ).toEqual([
      'product_create',
      'shopping_item_create',
      'shopping_session_finish',
    ]));
  it('compacts create/update and cancels local create/delete', () => {
    const result = compactOfflineOperations([
      operation('shopping_item_create', '1'),
      operation('shopping_item_update', '2'),
      operation('shopping_item_delete', '3'),
    ]);
    expect(result).toEqual([]);
  });
});
