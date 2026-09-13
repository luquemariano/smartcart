import { addLocalShoppingItem } from '@/lib/local-shopping-item-repository';
import { addDecimalStrings } from '@/lib/decimal';
import {
  getActiveLocalShoppingSession,
  startLocalShoppingSession,
} from '@/lib/local-shopping-session-repository';
import {
  shoppingListNameSchema,
  shoppingListItemInputSchema,
} from '@/lib/shopping-list-validation';
export type LocalShoppingListItem = {
  id: string;
  shoppingListId: string;
  productId: string | null;
  productName: string;
  productBrand: string | null;
  productBarcode: string | null;
  productQuantityValue: string | null;
  productQuantityUnit: string | null;
  quantity: string;
  isChecked: boolean;
  createdAt: string;
  updatedAt: string;
};
export type LocalShoppingList = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  items: LocalShoppingListItem[];
};
const LISTS = 'smartcart_guest_shopping_lists_v1:';
const ITEMS = 'smartcart_guest_shopping_list_items_v1:';
function read<T>(prefix: string, guestId: string): T[] {
  if (typeof window === 'undefined') return [];
  try {
    const value = JSON.parse(
      window.localStorage.getItem(prefix + guestId) ?? '[]',
    );
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}
function write<T>(prefix: string, guestId: string, value: T[]) {
  window.localStorage.setItem(prefix + guestId, JSON.stringify(value));
}
export function listLocalShoppingLists(guestId: string) {
  return read<LocalShoppingList>(LISTS, guestId)
    .map((list) => ({
      ...list,
      items: read<LocalShoppingListItem>(ITEMS, guestId).filter(
        (item) => item.shoppingListId === list.id,
      ),
    }))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
export function createLocalShoppingList(guestId: string, name: unknown) {
  const parsed = shoppingListNameSchema.parse(name);
  const normalized = parsed.replace(/\s+/g, ' ').toLocaleLowerCase('es-AR');
  if (
    read<LocalShoppingList>(LISTS, guestId).some(
      (list) =>
        list.name.replace(/\s+/g, ' ').toLocaleLowerCase('es-AR') ===
        normalized,
    )
  )
    throw new Error('DUPLICATE_LIST');
  const now = new Date().toISOString();
  const list = {
    id: crypto.randomUUID(),
    name: parsed,
    createdAt: now,
    updatedAt: now,
  };
  write(LISTS, guestId, [...read<LocalShoppingList>(LISTS, guestId), list]);
  return { ...list, items: [] };
}
export function updateLocalShoppingList(
  guestId: string,
  id: string,
  name: unknown,
) {
  const lists = read<LocalShoppingList>(LISTS, guestId);
  const parsed = shoppingListNameSchema.parse(name);
  const existing = lists.find((x) => x.id === id);
  if (!existing) throw new Error('LIST_NOT_FOUND');
  const updated = {
    ...existing,
    name: parsed,
    updatedAt: new Date().toISOString(),
  };
  write(
    LISTS,
    guestId,
    lists.map((x) => (x.id === id ? updated : x)),
  );
  return updated;
}
export function deleteLocalShoppingList(guestId: string, id: string) {
  const lists = read<LocalShoppingList>(LISTS, guestId);
  if (!lists.some((x) => x.id === id)) throw new Error('LIST_NOT_FOUND');
  write(
    LISTS,
    guestId,
    lists.filter((x) => x.id !== id),
  );
  write(
    ITEMS,
    guestId,
    read<LocalShoppingListItem>(ITEMS, guestId).filter(
      (x) => x.shoppingListId !== id,
    ),
  );
}
export function addLocalShoppingListItem(
  guestId: string,
  listId: string,
  input: unknown,
  product?: {
    id: string;
    name: string;
    brand: string | null;
    barcode: string | null;
    quantityValue: string | null;
    quantityUnit: string | null;
  },
) {
  const list = read<LocalShoppingList>(LISTS, guestId).find(
    (x) => x.id === listId,
  );
  if (!list) throw new Error('LIST_NOT_FOUND');
  const parsed = shoppingListItemInputSchema.parse(input);
  const items = read<LocalShoppingListItem>(ITEMS, guestId);
  if (
    parsed.productId &&
    items.some(
      (x) => x.shoppingListId === listId && x.productId === parsed.productId,
    )
  ) {
    const existing = items.find(
      (x) => x.shoppingListId === listId && x.productId === parsed.productId,
    )!;
    const whole = addDecimalStrings(
      existing.quantity,
      parsed.quantity,
      3,
      BigInt('999999999999'),
    );
    const updated = {
      ...existing,
      quantity: whole,
      updatedAt: new Date().toISOString(),
    };
    write(
      ITEMS,
      guestId,
      items.map((x) => (x.id === existing.id ? updated : x)),
    );
    return updated;
  }
  const now = new Date().toISOString();
  const item = {
    id: crypto.randomUUID(),
    shoppingListId: listId,
    ...(product
      ? {
          productId: product.id,
          productName: product.name,
          productBrand: product.brand,
          productBarcode: product.barcode,
          productQuantityValue: product.quantityValue,
          productQuantityUnit: product.quantityUnit,
        }
      : {
          productId: null,
          productName: parsed.productName,
          productBrand: parsed.brand,
          productBarcode: parsed.barcode,
          productQuantityValue: parsed.quantityValue,
          productQuantityUnit: parsed.quantityUnit,
        }),
    quantity: parsed.quantity,
    isChecked: false,
    createdAt: now,
    updatedAt: now,
  };
  write(ITEMS, guestId, [...items, item]);
  touch(guestId, listId);
  return item;
}
function touch(guestId: string, id: string) {
  const lists = read<LocalShoppingList>(LISTS, guestId);
  write(
    LISTS,
    guestId,
    lists.map((x) =>
      x.id === id ? { ...x, updatedAt: new Date().toISOString() } : x,
    ),
  );
}
export function updateLocalShoppingListItem(
  guestId: string,
  id: string,
  changes: { quantity?: string; isChecked?: boolean },
) {
  const items = read<LocalShoppingListItem>(ITEMS, guestId);
  const existing = items.find((x) => x.id === id);
  if (!existing) throw new Error('LIST_ITEM_NOT_FOUND');
  const updated = {
    ...existing,
    ...changes,
    updatedAt: new Date().toISOString(),
  };
  write(
    ITEMS,
    guestId,
    items.map((x) => (x.id === id ? updated : x)),
  );
  touch(guestId, existing.shoppingListId);
  return updated;
}
export function deleteLocalShoppingListItem(guestId: string, id: string) {
  const items = read<LocalShoppingListItem>(ITEMS, guestId);
  const existing = items.find((x) => x.id === id);
  if (!existing) throw new Error('LIST_ITEM_NOT_FOUND');
  write(
    ITEMS,
    guestId,
    items.filter((x) => x.id !== id),
  );
  touch(guestId, existing.shoppingListId);
}
export function resetLocalShoppingList(guestId: string, id: string) {
  const items = read<LocalShoppingListItem>(ITEMS, guestId);
  write(
    ITEMS,
    guestId,
    items.map((x) =>
      x.shoppingListId === id
        ? { ...x, isChecked: false, updatedAt: new Date().toISOString() }
        : x,
    ),
  );
  touch(guestId, id);
}
export function duplicateLocalShoppingList(guestId: string, id: string) {
  const source = listLocalShoppingLists(guestId).find((x) => x.id === id);
  if (!source) throw new Error('LIST_NOT_FOUND');
  const copy = createLocalShoppingList(guestId, `${source.name} copia`);
  for (const item of source.items)
    addLocalShoppingListItem(guestId, copy.id, {
      productId: item.productId,
      productName: item.productName,
      brand: item.productBrand,
      barcode: item.productBarcode,
      quantityValue: item.productQuantityValue,
      quantityUnit: item.productQuantityUnit,
      quantity: item.quantity,
    });
  return listLocalShoppingLists(guestId).find((x) => x.id === copy.id)!;
}
export function addLocalListToActiveShoppingSession(
  guestId: string,
  id: string,
  products: Array<{
    id: string;
    name: string;
    brand: string | null;
    barcode: string | null;
    quantityValue: string | null;
    quantityUnit: string | null;
  }>,
) {
  const session = getActiveLocalShoppingSession(guestId);
  if (!session) throw new Error('NO_ACTIVE_SESSION');
  const list = listLocalShoppingLists(guestId).find((x) => x.id === id);
  if (!list) throw new Error('LIST_NOT_FOUND');
  for (const item of list.items)
    addLocalShoppingItem(
      guestId,
      session.id,
      item.productId
        ? {
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: null,
          }
        : {
            productId: null,
            productName: item.productName,
            brand: item.productBrand,
            barcode: item.productBarcode,
            quantityValue: item.productQuantityValue,
            quantityUnit: item.productQuantityUnit,
            quantity: item.quantity,
            unitPrice: null,
          },
      products.find((p) => p.id === item.productId),
    );
  return session;
}
export function startLocalShoppingSessionFromList(
  guestId: string,
  id: string,
  products: Array<{
    id: string;
    name: string;
    brand: string | null;
    barcode: string | null;
    quantityValue: string | null;
    quantityUnit: string | null;
  }>,
) {
  const session = startLocalShoppingSession(guestId, null);
  const list = listLocalShoppingLists(guestId).find((item) => item.id === id);
  if (!list) throw new Error('LIST_NOT_FOUND');
  for (const item of list.items)
    addLocalShoppingItem(
      guestId,
      session.id,
      item.productId
        ? {
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: null,
          }
        : {
            productId: null,
            productName: item.productName,
            brand: item.productBrand,
            barcode: item.productBarcode,
            quantityValue: item.productQuantityValue,
            quantityUnit: item.productQuantityUnit,
            quantity: item.quantity,
            unitPrice: null,
          },
      products.find((p) => p.id === item.productId),
    );
  return session;
}
export function getPendingGuestShoppingLists(guestId: string) {
  return listLocalShoppingLists(guestId);
}
export function clearGuestShoppingListsAfterImport(guestId: string) {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(LISTS + guestId);
    window.localStorage.removeItem(ITEMS + guestId);
  }
}
