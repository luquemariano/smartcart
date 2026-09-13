import { and, asc, eq, ilike, or } from 'drizzle-orm';
import { db } from '@/db';
import { products } from '@/db/schema';
import {
  normalizeBarcode,
  normalizeProductPart,
  productDuplicateKey,
  productInputSchema,
  type ProductData,
  type ProductInput,
} from '@/lib/product-validation';

export class ProductNotFoundError extends Error {}
export class ProductDuplicateError extends Error {}

function toDbValues(userId: string, input: ProductInput) {
  const parsed = productInputSchema.parse(input);
  return {
    id: crypto.randomUUID(),
    ownerUserId: userId,
    name: parsed.name,
    normalizedName: normalizeProductPart(parsed.name)!,
    brand: parsed.brand,
    normalizedBrand: normalizeProductPart(parsed.brand),
    barcode: parsed.barcode,
    normalizedBarcode: normalizeBarcode(parsed.barcode),
    quantityValue: parsed.quantityValue,
    quantityUnit: parsed.quantityUnit,
    duplicateKey: productDuplicateKey(parsed),
  };
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === '23505'
  );
}

export async function createProduct(userId: string, input: ProductInput) {
  try {
    const [product] = await db
      .insert(products)
      .values(toDbValues(userId, input))
      .returning();
    return product;
  } catch (error) {
    if (isUniqueViolation(error)) throw new ProductDuplicateError();
    throw error;
  }
}

export async function listProducts(userId: string, query?: string) {
  const trimmedQuery = query?.trim();
  const search = trimmedQuery
    ? `%${trimmedQuery.replace(/[\\%_]/g, '\\$&')}%`
    : null;
  const where = search
    ? and(
        eq(products.ownerUserId, userId),
        or(
          ilike(products.name, search),
          ilike(products.brand, search),
          ilike(products.barcode, search),
        ),
      )
    : eq(products.ownerUserId, userId);

  return db
    .select()
    .from(products)
    .where(where)
    .orderBy(asc(products.name), asc(products.brand));
}

export async function getProduct(userId: string, productId: string) {
  const [product] = await db
    .select()
    .from(products)
    .where(and(eq(products.id, productId), eq(products.ownerUserId, userId)))
    .limit(1);

  if (!product) throw new ProductNotFoundError();
  return product;
}

export async function updateProduct(
  userId: string,
  productId: string,
  input: ProductInput,
) {
  const parsed: ProductData = productInputSchema.parse(input);
  try {
    const [product] = await db
      .update(products)
      .set({
        name: parsed.name,
        normalizedName: normalizeProductPart(parsed.name)!,
        brand: parsed.brand,
        normalizedBrand: normalizeProductPart(parsed.brand),
        barcode: parsed.barcode,
        normalizedBarcode: normalizeBarcode(parsed.barcode),
        quantityValue: parsed.quantityValue,
        quantityUnit: parsed.quantityUnit,
        duplicateKey: productDuplicateKey(parsed),
        updatedAt: new Date(),
      })
      .where(and(eq(products.id, productId), eq(products.ownerUserId, userId)))
      .returning();

    if (!product) throw new ProductNotFoundError();
    return product;
  } catch (error) {
    if (isUniqueViolation(error)) throw new ProductDuplicateError();
    throw error;
  }
}

export async function deleteProduct(userId: string, productId: string) {
  const [product] = await db
    .delete(products)
    .where(and(eq(products.id, productId), eq(products.ownerUserId, userId)))
    .returning({ id: products.id });

  if (!product) throw new ProductNotFoundError();
}
