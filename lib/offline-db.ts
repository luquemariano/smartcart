import {
  MAX_PENDING_OPERATIONS,
  OFFLINE_DB_NAME,
  OFFLINE_DB_VERSION,
  type OfflineMeta,
  type OfflineOperation,
} from '@/lib/offline-types';

const stores = [
  'offline_meta',
  'offline_sessions',
  'offline_items',
  'offline_operations',
  'offline_products',
  'offline_stores',
] as const;

type StoreName = (typeof stores)[number];

function canUseIndexedDb() {
  return typeof window !== 'undefined' && typeof indexedDB !== 'undefined';
}

let dbPromise: Promise<IDBDatabase> | null = null;
const memory = new Map<StoreName, Map<string, unknown>>(
  stores.map((name) => [name, new Map()]),
);

function openDb(): Promise<IDBDatabase> {
  if (!canUseIndexedDb())
    return Promise.reject(new Error('IndexedDB unavailable'));
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(OFFLINE_DB_NAME, OFFLINE_DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      for (const name of stores) {
        if (!db.objectStoreNames.contains(name)) {
          const store = db.createObjectStore(name, {
            keyPath: name === 'offline_meta' ? 'key' : 'id',
          });
          if (name === 'offline_operations') {
            store.createIndex('owner_status', ['ownerUserId', 'status']);
            store.createIndex('owner_createdAt', ['ownerUserId', 'createdAt']);
            store.createIndex(
              'clientOperationId',
              ['ownerUserId', 'clientOperationId'],
              { unique: true },
            );
          }
        }
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error('Could not open IndexedDB'));
  });
  return dbPromise;
}

function keyFor(value: { id?: string; key?: string }) {
  return value.id ?? value.key ?? '';
}

export async function putOffline<T extends { id?: string; key?: string }>(
  storeName: StoreName,
  value: T,
) {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const request = db
        .transaction(storeName, 'readwrite')
        .objectStore(storeName)
        .put(value);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch {
    memory.get(storeName)!.set(keyFor(value), value);
  }
  return value;
}

export async function deleteOffline(storeName: StoreName, key: string) {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const request = db
        .transaction(storeName, 'readwrite')
        .objectStore(storeName)
        .delete(key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch {
    memory.get(storeName)!.delete(key);
  }
}

export async function listOffline<T>(
  storeName: StoreName,
  predicate?: (value: T) => boolean,
): Promise<T[]> {
  try {
    const db = await openDb();
    return await new Promise<T[]>((resolve, reject) => {
      const request = db
        .transaction(storeName, 'readonly')
        .objectStore(storeName)
        .getAll();
      request.onsuccess = () =>
        resolve(
          (request.result as T[]).filter(
            (value) => !predicate || predicate(value),
          ),
        );
      request.onerror = () => reject(request.error);
    });
  } catch {
    return [...memory.get(storeName)!.values()].filter(
      (value) => !predicate || predicate(value as T),
    ) as T[];
  }
}

export async function enqueueOfflineOperation(
  operation: Omit<OfflineOperation, 'id' | 'retryCount' | 'status'>,
) {
  const existing = await listOffline<OfflineOperation>(
    'offline_operations',
    (candidate) =>
      candidate.ownerUserId === operation.ownerUserId &&
      candidate.status === 'pending',
  );
  if (existing.length >= MAX_PENDING_OPERATIONS)
    throw new Error(
      'La cola offline alcanzó su límite. Volvé a conectarte para sincronizar.',
    );
  const value: OfflineOperation = {
    ...operation,
    id: crypto.randomUUID(),
    retryCount: 0,
    status: 'pending',
    lastError: null,
  };
  const result = await putOffline('offline_operations', value);
  if (typeof window !== 'undefined')
    window.dispatchEvent(new Event('smartcart-offline-queue-changed'));
  return result;
}

export async function listPendingOfflineOperations(ownerUserId: string) {
  return (
    await listOffline<OfflineOperation>(
      'offline_operations',
      (value) =>
        value.ownerUserId === ownerUserId &&
        ['pending', 'failed', 'conflict'].includes(value.status),
    )
  ).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function saveOfflineMeta(meta: OfflineMeta) {
  return putOffline('offline_meta', meta);
}
