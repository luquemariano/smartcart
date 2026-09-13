import { and, asc, desc, eq, inArray, ne } from 'drizzle-orm';
import { db } from '@/db';
import { shoppingItems, shoppingSessions, stores } from '@/db/schema';
import {
  buildStoreHistoryOverviews,
  compatibleProductPresentation,
  compareProductObservations,
  comparePurchaseSummaries,
  type ProductComparison,
  type ProductObservation,
  type PurchaseComparison,
  type StoreHistoryOverview,
} from '@/lib/shopping-comparison';
import {
  buildShoppingHistoryEntry,
  type ShoppingHistoryEntry,
} from '@/lib/shopping-history';
import { shoppingItemSubtotal } from '@/lib/shopping-summary';
import {
  ShoppingSessionNotFoundError,
  getShoppingSession,
} from '@/server/shopping-sessions';

export class ShoppingHistoryNotFoundError extends Error {}

export type ShoppingHistoryQuery = {
  storeId?: string;
  sort?: 'newest' | 'oldest';
  limit?: number;
  offset?: number;
};

export type ShoppingHistoryPage = {
  entries: ShoppingHistoryEntry[];
  pagination: {
    limit: number;
    offset: number;
    hasMore: boolean;
    nextOffset: number | null;
  };
};

export type ShoppingHistoryDetail = {
  history: ShoppingHistoryEntry;
  items: Array<
    (typeof shoppingItems)['$inferSelect'] & { subtotal: string | null }
  >;
  comparison: PurchaseComparison;
  productComparisons: ProductComparison[];
};

function normalizePage(query: ShoppingHistoryQuery) {
  const limit = Math.min(50, Math.max(1, Math.trunc(query.limit ?? 20)));
  const offset = Math.max(0, Math.trunc(query.offset ?? 0));
  return { limit, offset };
}

export async function listCompletedShoppingHistory(
  userId: string,
  query: ShoppingHistoryQuery = {},
): Promise<ShoppingHistoryPage> {
  const { limit, offset } = normalizePage(query);
  const order =
    query.sort === 'oldest'
      ? asc(shoppingSessions.finishedAt)
      : desc(shoppingSessions.finishedAt);
  const sessionRows = await db
    .select({ session: shoppingSessions, store: stores })
    .from(shoppingSessions)
    .leftJoin(
      stores,
      and(
        eq(stores.id, shoppingSessions.storeId),
        eq(stores.ownerUserId, userId),
      ),
    )
    .where(
      and(
        eq(shoppingSessions.ownerUserId, userId),
        eq(shoppingSessions.status, 'completed'),
        query.storeId ? eq(shoppingSessions.storeId, query.storeId) : undefined,
      ),
    )
    .orderBy(
      order,
      query.sort === 'oldest'
        ? asc(shoppingSessions.id)
        : desc(shoppingSessions.id),
    )
    .limit(limit + 1)
    .offset(offset);

  const hasMore = sessionRows.length > limit;
  const pageRows = sessionRows.slice(0, limit);
  const sessionIds = pageRows.map(({ session }) => session.id);
  const itemRows = sessionIds.length
    ? await db
        .select()
        .from(shoppingItems)
        .where(inArray(shoppingItems.shoppingSessionId, sessionIds))
    : [];
  const itemsBySession = new Map<string, typeof itemRows>();
  for (const item of itemRows) {
    const current = itemsBySession.get(item.shoppingSessionId) ?? [];
    current.push(item);
    itemsBySession.set(item.shoppingSessionId, current);
  }

  return {
    entries: pageRows.map(({ session, store }) =>
      buildShoppingHistoryEntry(
        session,
        store
          ? { id: store.id, name: store.name, branchName: store.branchName }
          : null,
        itemsBySession.get(session.id) ?? [],
      ),
    ),
    pagination: {
      limit,
      offset,
      hasMore,
      nextOffset: hasMore ? offset + limit : null,
    },
  };
}

export async function getCompletedShoppingHistoryDetail(
  userId: string,
  sessionId: string,
): Promise<ShoppingHistoryDetail> {
  const session = await getShoppingSession(userId, sessionId);
  if (session.status !== 'completed') throw new ShoppingHistoryNotFoundError();
  const [sameStorePrevious] = session.storeId
    ? await db
        .select({ session: shoppingSessions, store: stores })
        .from(shoppingSessions)
        .leftJoin(
          stores,
          and(
            eq(stores.id, shoppingSessions.storeId),
            eq(stores.ownerUserId, userId),
          ),
        )
        .where(
          and(
            eq(shoppingSessions.ownerUserId, userId),
            eq(shoppingSessions.status, 'completed'),
            eq(shoppingSessions.storeId, session.storeId),
            ne(shoppingSessions.id, session.id),
          ),
        )
        .orderBy(desc(shoppingSessions.finishedAt), desc(shoppingSessions.id))
        .limit(1)
    : [];
  const [previous] = sameStorePrevious
    ? [sameStorePrevious]
    : await db
        .select({ session: shoppingSessions, store: stores })
        .from(shoppingSessions)
        .leftJoin(
          stores,
          and(
            eq(stores.id, shoppingSessions.storeId),
            eq(stores.ownerUserId, userId),
          ),
        )
        .where(
          and(
            eq(shoppingSessions.ownerUserId, userId),
            eq(shoppingSessions.status, 'completed'),
            ne(shoppingSessions.id, session.id),
          ),
        )
        .orderBy(desc(shoppingSessions.finishedAt), desc(shoppingSessions.id))
        .limit(1);
  const relatedSessionIds = [
    session.id,
    ...(previous ? [previous.session.id] : []),
  ];
  const [currentStore, previousStore] = await Promise.all([
    session.storeId
      ? db
          .select({
            id: stores.id,
            name: stores.name,
            branchName: stores.branchName,
          })
          .from(stores)
          .where(
            and(eq(stores.id, session.storeId), eq(stores.ownerUserId, userId)),
          )
          .limit(1)
      : Promise.resolve([]),
    previous?.session.storeId
      ? db
          .select({
            id: stores.id,
            name: stores.name,
            branchName: stores.branchName,
          })
          .from(stores)
          .where(
            and(
              eq(stores.id, previous.session.storeId),
              eq(stores.ownerUserId, userId),
            ),
          )
          .limit(1)
      : Promise.resolve([]),
  ]);
  const itemRows = await db
    .select()
    .from(shoppingItems)
    .where(inArray(shoppingItems.shoppingSessionId, relatedSessionIds))
    .orderBy(asc(shoppingItems.createdAt), asc(shoppingItems.id));
  const itemsBySession = new Map<string, typeof itemRows>();
  for (const item of itemRows) {
    const current = itemsBySession.get(item.shoppingSessionId) ?? [];
    current.push(item);
    itemsBySession.set(item.shoppingSessionId, current);
  }
  const currentItems = (itemsBySession.get(session.id) ?? []).map((item) => ({
    ...item,
    subtotal: shoppingItemSubtotal(item),
  }));
  const previousItems = previous
    ? (itemsBySession.get(previous.session.id) ?? []).map((item) => ({
        ...item,
        subtotal: shoppingItemSubtotal(item),
      }))
    : [];
  const currentHistory = buildShoppingHistoryEntry(
    session,
    currentStore[0] ?? null,
    currentItems,
  );
  const previousHistory = previous
    ? buildShoppingHistoryEntry(
        previous.session,
        previousStore[0] ?? previous.store ?? null,
        previousItems,
      )
    : null;
  const previousItemsByProduct = new Map<string, ProductObservation[]>();
  const productIds = currentItems
    .map((item) => item.productId)
    .filter((productId): productId is string => Boolean(productId));
  if (productIds.length) {
    const observations = await db
      .select({ item: shoppingItems, session: shoppingSessions, store: stores })
      .from(shoppingItems)
      .innerJoin(
        shoppingSessions,
        eq(shoppingSessions.id, shoppingItems.shoppingSessionId),
      )
      .leftJoin(
        stores,
        and(
          eq(stores.id, shoppingSessions.storeId),
          eq(stores.ownerUserId, userId),
        ),
      )
      .where(
        and(
          eq(shoppingSessions.ownerUserId, userId),
          eq(shoppingSessions.status, 'completed'),
          inArray(shoppingItems.productId, productIds),
        ),
      )
      .orderBy(
        desc(shoppingSessions.finishedAt),
        desc(shoppingSessions.id),
        desc(shoppingItems.createdAt),
      );
    for (const row of observations) {
      if (!row.item.productId) continue;
      const current = previousItemsByProduct.get(row.item.productId) ?? [];
      current.push({
        sessionId: row.session.id,
        finishedAt: row.session.finishedAt,
        store: row.store
          ? {
              id: row.store.id,
              name: row.store.name,
              branchName: row.store.branchName,
            }
          : null,
        currency: row.session.currency,
        productId: row.item.productId,
        productName: row.item.productName,
        quantity: row.item.quantity,
        unitPrice: row.item.unitPrice,
        productQuantityValue: row.item.productQuantityValue,
        productQuantityUnit: row.item.productQuantityUnit,
      });
      previousItemsByProduct.set(row.item.productId, current);
    }
  }
  const productComparisons = currentItems
    .filter((item) => item.productId)
    .map((item) => {
      const currentObservation: ProductObservation = {
        sessionId: session.id,
        finishedAt: session.finishedAt,
        store: currentStore[0] ?? null,
        currency: session.currency,
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        productQuantityValue: item.productQuantityValue,
        productQuantityUnit: item.productQuantityUnit,
      };
      const previousObservation = (
        previousItemsByProduct.get(item.productId!) ?? []
      )
        .filter((candidate) => candidate.sessionId !== session.id)
        .find((candidate) =>
          compatibleProductPresentation(currentObservation, candidate),
        );
      return compareProductObservations(
        currentObservation,
        previousObservation ?? null,
      );
    });
  return {
    history: currentHistory,
    items: currentItems,
    comparison: comparePurchaseSummaries(currentHistory, previousHistory),
    productComparisons,
  };
}

export async function getShoppingHistoryOverview(
  userId: string,
): Promise<StoreHistoryOverview[]> {
  const sessionRows = await db
    .select({ session: shoppingSessions, store: stores })
    .from(shoppingSessions)
    .leftJoin(
      stores,
      and(
        eq(stores.id, shoppingSessions.storeId),
        eq(stores.ownerUserId, userId),
      ),
    )
    .where(
      and(
        eq(shoppingSessions.ownerUserId, userId),
        eq(shoppingSessions.status, 'completed'),
      ),
    )
    .orderBy(desc(shoppingSessions.finishedAt), desc(shoppingSessions.id));
  if (!sessionRows.length) return [];
  const sessionIds = sessionRows.map(({ session }) => session.id);
  const itemRows = await db
    .select()
    .from(shoppingItems)
    .where(inArray(shoppingItems.shoppingSessionId, sessionIds));
  const itemsBySession = new Map<string, typeof itemRows>();
  for (const item of itemRows) {
    const current = itemsBySession.get(item.shoppingSessionId) ?? [];
    current.push(item);
    itemsBySession.set(item.shoppingSessionId, current);
  }
  const entries = sessionRows.map(({ session, store }) =>
    buildShoppingHistoryEntry(
      session,
      store
        ? { id: store.id, name: store.name, branchName: store.branchName }
        : null,
      itemsBySession.get(session.id) ?? [],
    ),
  );
  return buildStoreHistoryOverviews(entries);
}

export function isHistorySessionNotFound(error: unknown) {
  return (
    error instanceof ShoppingHistoryNotFoundError ||
    error instanceof ShoppingSessionNotFoundError
  );
}
