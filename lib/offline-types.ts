export const OFFLINE_DB_NAME = 'smartcart_offline_v1';
export const OFFLINE_DB_VERSION = 1;
export const MAX_PENDING_OPERATIONS = 500;

export type OfflineOperationType =
  | 'product_create'
  | 'shopping_item_create'
  | 'shopping_item_update'
  | 'shopping_item_delete'
  | 'shopping_session_finish';

export type OfflineOperationStatus =
  'pending' | 'syncing' | 'failed' | 'conflict';

export type OfflineOperation = {
  id: string;
  ownerUserId: string;
  clientOperationId: string;
  type: OfflineOperationType;
  localEntityId?: string;
  serverEntityId?: string | null;
  payload: Record<string, unknown>;
  createdAt: string;
  retryCount: number;
  status: OfflineOperationStatus;
  lastError?: string | null;
};

export type OfflineMeta = {
  key: string;
  ownerUserId: string;
  value: unknown;
};
