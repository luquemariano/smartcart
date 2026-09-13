import {
  normalizeBarcode,
  normalizeProductPart,
  productDuplicateKey,
  productInputSchema,
  type ProductData,
  type ProductInput,
} from '@/lib/product-validation';
import { hasLocalShoppingItemForProduct } from '@/lib/local-shopping-item-repository';

export type LocalProduct = ProductData & {
  id: string;
  createdAt: string;
  updatedAt: string;
};

const STORAGE_PREFIX = 'smartcart_guest_products_v1:';

function storageKey(guestId: string) {
  return `${STORAGE_PREFIX}${guestId}`;
}

function read(guestId: string): LocalProduct[] {
  if (typeof window === 'undefined') return [];
  const raw = window.localStorage.getItem(storageKey(guestId));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as LocalProduct[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(guestId: string, products: LocalProduct[]) {
  window.localStorage.setItem(storageKey(guestId), JSON.stringify(products));
}

function normalizedInput(input: ProductInput): ProductData {
  return productInputSchema.parse(input);
}

function ensureUnique(
  products: LocalProduct[],
  input: ProductData,
  currentId?: string,
) {
  const duplicateKey = productDuplicateKey(input);
  const barcode = normalizeBarcode(input.barcode);
  return !products.some((product) => {
    if (product.id === currentId) return false;
    if (barcode && normalizeBarcode(product.barcode) === barcode) return true;
    return productDuplicateKey(product) === duplicateKey;
  });
}

export function listLocalProducts(
  guestId: string,
  query?: string,
): LocalProduct[] {
  const products = read(guestId);
  const normalizedQuery = normalizeProductPart(query) ?? '';
  return products
    .filter((product) => {
      if (!normalizedQuery) return true;
      return [product.name, product.brand, product.barcode].some((value) =>
        normalizeProductPart(value)?.includes(normalizedQuery),
      );
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'es'));
}

export function createLocalProduct(
  guestId: string,
  input: ProductInput,
): LocalProduct {
  const parsed = normalizedInput(input);
  const products = read(guestId);
  if (!ensureUnique(products, parsed)) throw new Error('DUPLICATE_PRODUCT');
  const now = new Date().toISOString();
  const product: LocalProduct = {
    ...parsed,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
  };
  write(guestId, [...products, product]);
  return product;
}

export function updateLocalProduct(
  guestId: string,
  id: string,
  input: ProductInput,
): LocalProduct {
  const parsed = normalizedInput(input);
  const products = read(guestId);
  if (!ensureUnique(products, parsed, id)) throw new Error('DUPLICATE_PRODUCT');
  const existing = products.find((product) => product.id === id);
  if (!existing) throw new Error('PRODUCT_NOT_FOUND');
  const product: LocalProduct = {
    ...existing,
    ...parsed,
    updatedAt: new Date().toISOString(),
  };
  write(
    guestId,
    products.map((item) => (item.id === id ? product : item)),
  );
  return product;
}

export function deleteLocalProduct(guestId: string, id: string): void {
  const products = read(guestId);
  if (!products.some((product) => product.id === id)) {
    throw new Error('PRODUCT_NOT_FOUND');
  }
  if (hasLocalShoppingItemForProduct(guestId, id)) {
    throw new Error('REFERENCED_PRODUCT');
  }
  write(
    guestId,
    products.filter((product) => product.id !== id),
  );
}

export function getPendingGuestProducts(guestId: string): LocalProduct[] {
  return listLocalProducts(guestId);
}

export function clearGuestProductsAfterImport(guestId: string): void {
  if (typeof window !== 'undefined')
    window.localStorage.removeItem(storageKey(guestId));
}
