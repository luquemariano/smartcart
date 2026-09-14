import type {
  OfflineOperation,
  OfflineOperationType,
} from '@/lib/offline-types';

export function orderOfflineOperations(operations: OfflineOperation[]) {
  const rank: Record<OfflineOperationType, number> = {
    product_create: 1,
    shopping_item_create: 2,
    shopping_item_update: 3,
    shopping_item_delete: 4,
    shopping_session_finish: 5,
  };
  return [...operations].sort(
    (a, b) =>
      a.createdAt.localeCompare(b.createdAt) || rank[a.type] - rank[b.type],
  );
}

export function compactOfflineOperations(operations: OfflineOperation[]) {
  const result: OfflineOperation[] = [];
  for (const operation of orderOfflineOperations(operations)) {
    if (operation.type === 'shopping_item_update') {
      const create = result.find(
        (candidate) =>
          candidate.type === 'shopping_item_create' &&
          candidate.localEntityId === operation.localEntityId,
      );
      if (create) {
        create.payload = { ...create.payload, ...operation.payload };
        continue;
      }
    }
    if (operation.type === 'shopping_item_delete') {
      const index = result.findIndex(
        (candidate) =>
          candidate.type === 'shopping_item_create' &&
          candidate.localEntityId === operation.localEntityId,
      );
      if (index >= 0) {
        result.splice(index, 1);
        continue;
      }
    }
    result.push(operation);
  }
  return result;
}
