import {
  deleteOffline,
  listPendingOfflineOperations,
  putOffline,
} from '@/lib/offline-db';
import { orderOfflineOperations } from '@/lib/offline-queue';
import type { OfflineOperation } from '@/lib/offline-types';

export type SyncResult = {
  clientOperationId: string;
  status: 'applied' | 'already_applied' | 'conflict' | 'failed';
  serverEntityId?: string;
  errorCode?: string;
};

export async function syncOfflineOperations(
  ownerUserId: string,
): Promise<SyncResult[]> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return [];
  const operations = orderOfflineOperations(
    await listPendingOfflineOperations(ownerUserId),
  );
  if (!operations.length) return [];
  const response = await fetch('/api/offline/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      operations: operations
        .slice(0, 100)
        .map(
          ({
            clientOperationId,
            type,
            payload,
            localEntityId,
            serverEntityId,
          }) => ({
            clientOperationId,
            type,
            payload,
            localEntityId,
            serverEntityId,
          }),
        ),
    }),
  });
  if (!response.ok) throw new Error('No se pudo sincronizar la compra.');
  const results = (await response.json()).results as SyncResult[];
  for (const result of results) {
    const operation = operations.find(
      (candidate) => candidate.clientOperationId === result.clientOperationId,
    );
    if (!operation) continue;
    if (result.status === 'applied' || result.status === 'already_applied')
      await deleteOffline('offline_operations', operation.id);
    else
      await putOffline('offline_operations', {
        ...operation,
        status: result.status,
        retryCount: operation.retryCount + 1,
        lastError: result.errorCode ?? 'SYNC_ERROR',
      });
  }
  return results;
}

export function makeOfflineOperation(
  ownerUserId: string,
  type: OfflineOperation['type'],
  payload: Record<string, unknown>,
  ids?: Pick<OfflineOperation, 'localEntityId' | 'serverEntityId'>,
) {
  return {
    ownerUserId,
    clientOperationId: crypto.randomUUID(),
    type,
    payload,
    createdAt: new Date().toISOString(),
    ...ids,
  };
}
