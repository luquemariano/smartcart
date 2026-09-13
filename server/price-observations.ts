import { and, desc, eq, inArray } from 'drizzle-orm';
import { db } from '@/db';
import {
  priceObservations,
  products,
  stores,
  shoppingItems,
  shoppingSessions,
} from '@/db/schema';

export const PRICE_OBSERVATION_SOURCE = 'shopping_session';

export function selectLatestPricePerStore<
  T extends { productId: string; storeId: string; observedAt: Date | string },
>(rows: T[]) {
  const seen = new Set<string>();
  return rows.filter((row) => {
    const key = `${row.productId}:${row.storeId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function createPriceObservationsForSession(
  executor: typeof db,
  ownerUserId: string,
  sessionId: string,
  observedAt: Date,
) {
  const eligible = await executor
    .select({
      item: shoppingItems,
      storeId: shoppingSessions.storeId,
      currency: shoppingSessions.currency,
      productOwnerId: products.ownerUserId,
      storeOwnerId: stores.ownerUserId,
    })
    .from(shoppingItems)
    .innerJoin(
      shoppingSessions,
      eq(shoppingSessions.id, shoppingItems.shoppingSessionId),
    )
    .innerJoin(products, eq(products.id, shoppingItems.productId))
    .innerJoin(stores, eq(stores.id, shoppingSessions.storeId))
    .where(
      and(
        eq(shoppingItems.shoppingSessionId, sessionId),
        eq(shoppingSessions.ownerUserId, ownerUserId),
        eq(products.ownerUserId, ownerUserId),
        eq(stores.ownerUserId, ownerUserId),
      ),
    );

  const values = eligible
    .filter(
      ({ item, storeId, currency, productOwnerId, storeOwnerId }) =>
        item.productId !== null &&
        item.unitPrice !== null &&
        storeId !== null &&
        currency === 'ARS' &&
        productOwnerId === ownerUserId &&
        storeOwnerId === ownerUserId,
    )
    .map(({ item, storeId, currency }) => ({
      id: crypto.randomUUID(),
      ownerUserId,
      productId: item.productId!,
      storeId: storeId!,
      unitPrice: item.unitPrice!,
      currency,
      observedAt,
      source: PRICE_OBSERVATION_SOURCE,
      shoppingSessionId: sessionId,
      shoppingItemId: item.id,
    }));

  if (values.length === 0) return 0;
  await executor.insert(priceObservations).values(values).onConflictDoNothing();
  return values.length;
}

export async function listPriceObservations(
  ownerUserId: string,
  productId: string,
  limit = 50,
) {
  return db
    .select({
      id: priceObservations.id,
      unitPrice: priceObservations.unitPrice,
      currency: priceObservations.currency,
      observedAt: priceObservations.observedAt,
      source: priceObservations.source,
      store: {
        id: stores.id,
        name: stores.name,
        branchName: stores.branchName,
      },
    })
    .from(priceObservations)
    .innerJoin(stores, eq(stores.id, priceObservations.storeId))
    .where(
      and(
        eq(priceObservations.ownerUserId, ownerUserId),
        eq(priceObservations.productId, productId),
      ),
    )
    .orderBy(desc(priceObservations.observedAt))
    .limit(Math.min(Math.max(limit, 1), 100));
}

export async function getLatestPricesForProducts(
  productIds: string[],
  ownerUserId: string,
) {
  if (productIds.length === 0) return [];
  const rows = await db
    .select()
    .from(priceObservations)
    .where(
      and(
        eq(priceObservations.ownerUserId, ownerUserId),
        inArray(priceObservations.productId, productIds),
      ),
    )
    .orderBy(
      priceObservations.productId,
      priceObservations.storeId,
      desc(priceObservations.observedAt),
    );
  return selectLatestPricePerStore(rows);
}

export async function getLatestPriceByStore(
  productId: string,
  ownerUserId: string,
) {
  const rows = await getLatestPricesForProducts([productId], ownerUserId);
  return rows;
}
