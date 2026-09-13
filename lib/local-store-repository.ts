import { storeDuplicateKey, type StoreInput } from '@/lib/store-validation';
import { hasLocalShoppingSessionForStore } from '@/lib/local-shopping-session-repository';

export type LocalStore = StoreInput & {
  id: string;
  createdAt: string;
  updatedAt: string;
};

const STORAGE_PREFIX = 'smartcart_guest_stores_v1:';

function storageKey(guestId: string) {
  return `${STORAGE_PREFIX}${guestId}`;
}

function read(guestId: string): LocalStore[] {
  if (typeof window === 'undefined') return [];
  const raw = window.localStorage.getItem(storageKey(guestId));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as LocalStore[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(guestId: string, stores: LocalStore[]) {
  window.localStorage.setItem(storageKey(guestId), JSON.stringify(stores));
}

function ensureUnique(
  stores: LocalStore[],
  input: StoreInput,
  currentId?: string,
) {
  const key = storeDuplicateKey(input.name, input.branchName);
  return !stores.some(
    (store) =>
      store.id !== currentId &&
      storeDuplicateKey(store.name, store.branchName) === key,
  );
}

export function listLocalStores(guestId: string): LocalStore[] {
  return read(guestId).sort((a, b) => a.name.localeCompare(b.name, 'es'));
}

export function createLocalStore(
  guestId: string,
  input: StoreInput,
): LocalStore {
  const stores = read(guestId);
  if (!ensureUnique(stores, input)) throw new Error('DUPLICATE_STORE');
  const now = new Date().toISOString();
  const store: LocalStore = {
    ...input,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
  };
  write(guestId, [...stores, store]);
  return store;
}

export function updateLocalStore(
  guestId: string,
  id: string,
  input: StoreInput,
): LocalStore {
  const stores = read(guestId);
  if (!ensureUnique(stores, input, id)) throw new Error('DUPLICATE_STORE');
  const existing = stores.find((store) => store.id === id);
  if (!existing) throw new Error('STORE_NOT_FOUND');
  const store: LocalStore = {
    ...existing,
    ...input,
    updatedAt: new Date().toISOString(),
  };
  write(
    guestId,
    stores.map((item) => (item.id === id ? store : item)),
  );
  return store;
}

export function deleteLocalStore(guestId: string, id: string): void {
  const stores = read(guestId);
  if (!stores.some((store) => store.id === id))
    throw new Error('STORE_NOT_FOUND');
  if (hasLocalShoppingSessionForStore(guestId, id))
    throw new Error('STORE_REFERENCED');
  write(
    guestId,
    stores.filter((store) => store.id !== id),
  );
}
