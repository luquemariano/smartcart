import { and, asc, eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { shoppingItems, shoppingSessions } from '@/db/schema';
import { addDecimalStrings } from '@/lib/decimal';
import {
  calculateShoppingSummary,
  shoppingItemSubtotal,
} from '@/lib/shopping-summary';
import { productInputSchema } from '@/lib/product-validation';
import {
  shoppingItemInputSchema,
  shoppingItemPatchSchema,
  type ShoppingItemInput,
} from '@/lib/shopping-item-validation';
import { getProduct, ProductNotFoundError } from '@/server/products';
import {
  getShoppingSession,
  ShoppingSessionNotFoundError,
} from '@/server/shopping-sessions';

export class ShoppingItemNotFoundError extends Error {}
export class ShoppingItemCompletedError extends Error {}
export class ShoppingItemQuantityLimitError extends Error {}
export class ShoppingItemPriceConflictError extends Error {}

const MAX_QUANTITY_SCALED = BigInt('999999999999');

function isForeignKeyViolation(error: unknown): boolean {
  const candidates = [
    error,
    typeof error === 'object' && error !== null && 'cause' in error
      ? error.cause
      : null,
  ];
  return candidates.some(
    (candidate) =>
      typeof candidate === 'object' &&
      candidate !== null &&
      'code' in candidate &&
      candidate.code === '23503',
  );
}

function isNumericOverflow(error: unknown): boolean {
  const candidates = [
    error,
    typeof error === 'object' && error !== null && 'cause' in error
      ? error.cause
      : null,
  ];
  return candidates.some(
    (candidate) =>
      typeof candidate === 'object' &&
      candidate !== null &&
      'code' in candidate &&
      candidate.code === '22003',
  );
}

function toManualSnapshot(
  input: Extract<ShoppingItemInput, { productId: null }>,
) {
  const parsed = productInputSchema.parse({
    name: input.productName,
    brand: input.brand,
    barcode: input.barcode,
    quantityValue: input.quantityValue,
    quantityUnit: input.quantityUnit,
  });
  return {
    productId: null,
    productName: parsed.name,
    productBrand: parsed.brand,
    productBarcode: parsed.barcode,
    productQuantityValue: parsed.quantityValue,
    productQuantityUnit: parsed.quantityUnit,
  };
}

function ensureActiveStatus(status: string) {
  if (status === 'completed') throw new ShoppingItemCompletedError();
}

export async function listShoppingItems(userId: string, sessionId: string) {
  await getShoppingSession(userId, sessionId);
  const items = await db
    .select()
    .from(shoppingItems)
    .where(eq(shoppingItems.shoppingSessionId, sessionId))
    .orderBy(asc(shoppingItems.createdAt), asc(shoppingItems.id));
  return items.map((item) => ({
    ...item,
    subtotal: shoppingItemSubtotal(item),
  }));
}

export async function getShoppingSessionSummary(
  userId: string,
  sessionId: string,
) {
  const session = await getShoppingSession(userId, sessionId);
  const items = await listShoppingItems(userId, sessionId);
  return {
    session,
    items,
    summary: calculateShoppingSummary(
      session.budgetAmount,
      session.currency,
      items,
    ),
  };
}

export async function addShoppingItem(
  userId: string,
  sessionId: string,
  input: unknown,
  executor: typeof db = db,
) {
  const parsed = shoppingItemInputSchema.parse(input);
  const catalogProduct =
    parsed.productId === null
      ? null
      : await getProduct(userId, parsed.productId);
  const catalogSnapshot = catalogProduct
    ? {
        productId: catalogProduct.id,
        productName: catalogProduct.name,
        productBrand: catalogProduct.brand,
        productBarcode: catalogProduct.barcode,
        productQuantityValue: catalogProduct.quantityValue,
        productQuantityUnit: catalogProduct.quantityUnit,
      }
    : toManualSnapshot(
        parsed as Extract<ShoppingItemInput, { productId: null }>,
      );
  try {
    return await executor.transaction(async (tx) => {
      const [session] = await tx
        .select()
        .from(shoppingSessions)
        .where(
          and(
            eq(shoppingSessions.id, sessionId),
            eq(shoppingSessions.ownerUserId, userId),
          ),
        )
        .for('update');
      if (!session) throw new ShoppingSessionNotFoundError();
      ensureActiveStatus(session.status);

      const now = new Date();
      const existing =
        parsed.productId === null
          ? null
          : (
              await tx
                .select()
                .from(shoppingItems)
                .where(
                  and(
                    eq(shoppingItems.shoppingSessionId, sessionId),
                    eq(shoppingItems.productId, parsed.productId),
                  ),
                )
                .limit(1)
            )[0];
      if (existing) {
        if (existing.unitPrice !== parsed.unitPrice)
          throw new ShoppingItemPriceConflictError();
        const [item] = await tx
          .update(shoppingItems)
          .set({
            quantity: sql`${shoppingItems.quantity} + cast(${parsed.quantity} as numeric)`,
            updatedAt: now,
          })
          .where(eq(shoppingItems.id, existing.id))
          .returning();
        return item;
      }
      const [item] = await tx
        .insert(shoppingItems)
        .values({
          id: crypto.randomUUID(),
          shoppingSessionId: sessionId,
          ...catalogSnapshot,
          quantity: parsed.quantity,
          unitPrice: parsed.unitPrice,
          createdAt: now,
          updatedAt: now,
        })
        .returning();
      return item;
    });
  } catch (error) {
    if (error instanceof ProductNotFoundError) throw error;
    if (isForeignKeyViolation(error)) throw new ProductNotFoundError();
    if (isNumericOverflow(error)) throw new ShoppingItemQuantityLimitError();
    throw error;
  }
}

async function getOwnedItem(userId: string, itemId: string) {
  const [row] = await db
    .select({ item: shoppingItems, session: shoppingSessions })
    .from(shoppingItems)
    .innerJoin(
      shoppingSessions,
      eq(shoppingSessions.id, shoppingItems.shoppingSessionId),
    )
    .where(
      and(
        eq(shoppingItems.id, itemId),
        eq(shoppingSessions.ownerUserId, userId),
      ),
    )
    .limit(1);
  if (!row) throw new ShoppingItemNotFoundError();
  return row;
}

export async function updateShoppingItemQuantity(
  userId: string,
  itemId: string,
  input: unknown,
) {
  return updateShoppingItem(userId, itemId, input);
}

export async function updateShoppingItem(
  userId: string,
  itemId: string,
  input: unknown,
  executor: typeof db = db,
) {
  const parsed = shoppingItemPatchSchema.parse(input);
  const row = await getOwnedItem(userId, itemId);
  ensureActiveStatus(row.session.status);
  try {
    const changes = {
      ...(parsed.quantity === undefined ? {} : { quantity: parsed.quantity }),
      ...(parsed.unitPrice === undefined
        ? {}
        : { unitPrice: parsed.unitPrice }),
    };
    const [item] = await executor
      .update(shoppingItems)
      .set({ ...changes, updatedAt: new Date() })
      .where(eq(shoppingItems.id, itemId))
      .returning();
    return item;
  } catch (error) {
    if (isNumericOverflow(error)) throw new ShoppingItemQuantityLimitError();
    throw error;
  }
}

export async function deleteShoppingItem(
  userId: string,
  itemId: string,
  executor: typeof db = db,
) {
  const row = await getOwnedItem(userId, itemId);
  ensureActiveStatus(row.session.status);
  await executor.delete(shoppingItems).where(eq(shoppingItems.id, itemId));
}

export function addShoppingItemQuantities(left: string, right: string) {
  return addDecimalStrings(left, right, 3, MAX_QUANTITY_SCALED);
}
