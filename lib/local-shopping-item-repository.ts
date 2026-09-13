import { addDecimalStrings } from '@/lib/decimal';
import {
  shoppingItemInputSchema,
  shoppingItemPatchSchema,
  shoppingItemQuantitySchema,
  type ShoppingItemInput,
} from '@/lib/shopping-item-validation';
import { listLocalShoppingSessions } from '@/lib/local-shopping-session-repository';

export type LocalShoppingItem = {
  id: string;
  shoppingSessionId: string;
  productId: string | null;
  productName: string;
  productBrand: string | null;
  productBarcode: string | null;
  productQuantityValue: string | null;
  productQuantityUnit: string | null;
  quantity: string;
  unitPrice: string | null;
  createdAt: string;
  updatedAt: string;
};

export type LocalShoppingItemProduct = {
  id: string;
  name: string;
  brand: string | null;
  barcode: string | null;
  quantityValue: string | null;
  quantityUnit: string | null;
};

const STORAGE_PREFIX = 'smartcart_guest_shopping_items_v1:';

function storageKey(guestId: string) {
  return `${STORAGE_PREFIX}${guestId}`;
}

function read(guestId: string): LocalShoppingItem[] {
  if (typeof window === 'undefined') return [];
  const raw = window.localStorage.getItem(storageKey(guestId));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as LocalShoppingItem[];
    return Array.isArray(parsed)
      ? parsed.map((item) => ({ ...item, unitPrice: item.unitPrice ?? null }))
      : [];
  } catch {
    return [];
  }
}

function write(guestId: string, items: LocalShoppingItem[]) {
  window.localStorage.setItem(storageKey(guestId), JSON.stringify(items));
}

function ensureSession(guestId: string, sessionId: string, mutable: boolean) {
  const session = listLocalShoppingSessions(guestId).find(
    (candidate) => candidate.id === sessionId,
  );
  if (!session) throw new Error('SHOPPING_SESSION_NOT_FOUND');
  if (mutable && session.status === 'completed')
    throw new Error('COMPLETED_SHOPPING_SESSION');
  return session;
}

export function listLocalShoppingItems(
  guestId: string,
  sessionId: string,
): LocalShoppingItem[] {
  ensureSession(guestId, sessionId, false);
  return read(guestId)
    .filter((item) => item.shoppingSessionId === sessionId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function addLocalShoppingItem(
  guestId: string,
  sessionId: string,
  input: unknown,
  catalogProduct?: LocalShoppingItemProduct,
): LocalShoppingItem {
  ensureSession(guestId, sessionId, true);
  const parsed = shoppingItemInputSchema.parse(input);
  const items = read(guestId);
  if (parsed.productId !== null && catalogProduct?.id !== parsed.productId) {
    throw new Error('PRODUCT_NOT_FOUND');
  }

  const existing =
    parsed.productId === null
      ? null
      : items.find(
          (item) =>
            item.shoppingSessionId === sessionId &&
            item.productId === parsed.productId,
        );
  if (existing) {
    if (existing.unitPrice !== parsed.unitPrice)
      throw new Error('PRICE_CONFLICT');
    let quantity: string;
    try {
      quantity = addDecimalStrings(
        existing.quantity,
        parsed.quantity,
        3,
        BigInt('999999999999'),
      );
    } catch {
      throw new Error('QUANTITY_OVERFLOW');
    }
    const updated = {
      ...existing,
      quantity,
      updatedAt: new Date().toISOString(),
    };
    write(
      guestId,
      items.map((item) => (item.id === existing.id ? updated : item)),
    );
    return updated;
  }

  const snapshot =
    parsed.productId !== null
      ? {
          productId: parsed.productId,
          productName: catalogProduct!.name,
          productBrand: catalogProduct!.brand,
          productBarcode: catalogProduct!.barcode,
          productQuantityValue: catalogProduct!.quantityValue,
          productQuantityUnit: catalogProduct!.quantityUnit,
        }
      : {
          productId: null,
          productName: parsed.productName,
          productBrand: parsed.brand,
          productBarcode: parsed.barcode,
          productQuantityValue: parsed.quantityValue,
          productQuantityUnit: parsed.quantityUnit,
        };
  const now = new Date().toISOString();
  const item: LocalShoppingItem = {
    id: crypto.randomUUID(),
    shoppingSessionId: sessionId,
    ...snapshot,
    quantity: parsed.quantity,
    unitPrice: parsed.unitPrice,
    createdAt: now,
    updatedAt: now,
  };
  write(guestId, [...items, item]);
  return item;
}

export function updateLocalShoppingItemQuantity(
  guestId: string,
  itemId: string,
  input: unknown,
): LocalShoppingItem {
  const parsed = shoppingItemQuantitySchema.parse(input);
  const items = read(guestId);
  const existing = items.find((item) => item.id === itemId);
  if (!existing) throw new Error('SHOPPING_ITEM_NOT_FOUND');
  ensureSession(guestId, existing.shoppingSessionId, true);
  const updated = {
    ...existing,
    quantity: parsed.quantity,
    updatedAt: new Date().toISOString(),
  };
  write(
    guestId,
    items.map((item) => (item.id === itemId ? updated : item)),
  );
  return updated;
}

export function updateLocalShoppingItem(
  guestId: string,
  itemId: string,
  input: unknown,
): LocalShoppingItem {
  const parsed = shoppingItemPatchSchema.parse(input);
  const items = read(guestId);
  const existing = items.find((item) => item.id === itemId);
  if (!existing) throw new Error('SHOPPING_ITEM_NOT_FOUND');
  ensureSession(guestId, existing.shoppingSessionId, true);
  const updated = {
    ...existing,
    ...(parsed.quantity === undefined ? {} : { quantity: parsed.quantity }),
    ...(parsed.unitPrice === undefined ? {} : { unitPrice: parsed.unitPrice }),
    updatedAt: new Date().toISOString(),
  };
  write(
    guestId,
    items.map((item) => (item.id === itemId ? updated : item)),
  );
  return updated;
}

export function deleteLocalShoppingItem(guestId: string, itemId: string): void {
  const items = read(guestId);
  const existing = items.find((item) => item.id === itemId);
  if (!existing) throw new Error('SHOPPING_ITEM_NOT_FOUND');
  ensureSession(guestId, existing.shoppingSessionId, true);
  write(
    guestId,
    items.filter((item) => item.id !== itemId),
  );
}

export function hasLocalShoppingItemForProduct(
  guestId: string,
  productId: string,
): boolean {
  return read(guestId).some((item) => item.productId === productId);
}

export function getPendingGuestShoppingItems(
  guestId: string,
): LocalShoppingItem[] {
  return read(guestId);
}

export function clearGuestShoppingItemsAfterImport(guestId: string): void {
  if (typeof window !== 'undefined')
    window.localStorage.removeItem(storageKey(guestId));
}

export type { ShoppingItemInput };
