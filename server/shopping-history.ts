import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { shoppingItems, shoppingSessions, stores } from '@/db/schema';
import {
  buildShoppingHistoryEntry,
  type ShoppingHistoryEntry,
} from '@/lib/shopping-history';
import { getShoppingSessionSummary } from '@/server/shopping-items';
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
) {
  const session = await getShoppingSession(userId, sessionId);
  if (session.status !== 'completed') throw new ShoppingHistoryNotFoundError();
  const result = await getShoppingSessionSummary(userId, sessionId);
  const [store] = session.storeId
    ? await db
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
    : [];
  return {
    history: buildShoppingHistoryEntry(session, store ?? null, result.items),
    items: result.items,
  };
}

export function isHistorySessionNotFound(error: unknown) {
  return (
    error instanceof ShoppingHistoryNotFoundError ||
    error instanceof ShoppingSessionNotFoundError
  );
}
