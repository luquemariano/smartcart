import { normalizeBarcode } from '@/lib/product-validation';

export const DEFAULT_SCANNED_QUANTITY = '1';

export function findProductByBarcode<T extends { barcode: string | null }>(
  products: T[],
  barcode: string,
): T | undefined {
  return products.find(
    (product) => normalizeBarcode(product.barcode) === barcode,
  );
}
