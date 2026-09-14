import { and, desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { shoppingSessions } from '@/db/schema';
import { createPriceObservationsForSession } from '@/server/price-observations';
import { getStore } from '@/server/stores';
import { DEFAULT_CURRENCY, serializeMoney } from '@/lib/money';
import {
  startShoppingSessionSchema,
  type StartShoppingSessionInput,
} from '@/lib/shopping-session-validation';

export class ShoppingSessionNotFoundError extends Error {}
export class ActiveShoppingSessionError extends Error {}
export class ShoppingSessionStoreError extends Error {}
export class ShoppingSessionCompletedError extends Error {}

function isConstraintViolation(error: unknown, code: string): boolean {
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
      candidate.code === code,
  );
}

export async function startShoppingSession(
  userId: string,
  input: StartShoppingSessionInput,
) {
  const parsed = startShoppingSessionSchema.parse(input);
  if (parsed.storeId) {
    try {
      await getStore(userId, parsed.storeId);
    } catch {
      throw new ShoppingSessionStoreError();
    }
  }

  const currentActive = await getActiveShoppingSession(userId);
  if (currentActive) throw new ActiveShoppingSessionError();

  const now = new Date();
  try {
    const [session] = await db
      .insert(shoppingSessions)
      .values({
        id: crypto.randomUUID(),
        ownerUserId: userId,
        storeId: parsed.storeId,
        status: 'active',
        budgetAmount: serializeMoney(parsed.budgetAmount),
        currency: DEFAULT_CURRENCY,
        startedAt: now,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    return session;
  } catch (error) {
    if (isConstraintViolation(error, '23505')) {
      throw new ActiveShoppingSessionError();
    }
    if (isConstraintViolation(error, '23503')) {
      throw new ShoppingSessionStoreError();
    }
    throw error;
  }
}

export async function getActiveShoppingSession(userId: string) {
  const [session] = await db
    .select()
    .from(shoppingSessions)
    .where(
      and(
        eq(shoppingSessions.ownerUserId, userId),
        eq(shoppingSessions.status, 'active'),
      ),
    )
    .limit(1);
  return session ?? null;
}

export async function listShoppingSessions(userId: string) {
  return db
    .select()
    .from(shoppingSessions)
    .where(eq(shoppingSessions.ownerUserId, userId))
    .orderBy(desc(shoppingSessions.startedAt));
}

export async function getShoppingSession(userId: string, sessionId: string) {
  const [session] = await db
    .select()
    .from(shoppingSessions)
    .where(
      and(
        eq(shoppingSessions.id, sessionId),
        eq(shoppingSessions.ownerUserId, userId),
      ),
    )
    .limit(1);
  if (!session) throw new ShoppingSessionNotFoundError();
  return session;
}

export async function finishShoppingSession(
  userId: string,
  sessionId: string,
  executor: typeof db = db,
) {
  return executor.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(shoppingSessions)
      .where(
        and(
          eq(shoppingSessions.id, sessionId),
          eq(shoppingSessions.ownerUserId, userId),
        ),
      )
      .limit(1);
    if (!existing) throw new ShoppingSessionNotFoundError();
    if (existing.status === 'completed') return existing;

    const now = new Date();
    const [session] = await tx
      .update(shoppingSessions)
      .set({ status: 'completed', finishedAt: now, updatedAt: now })
      .where(
        and(
          eq(shoppingSessions.id, sessionId),
          eq(shoppingSessions.ownerUserId, userId),
          eq(shoppingSessions.status, 'active'),
        ),
      )
      .returning();
    if (!session) throw new ShoppingSessionNotFoundError();
    await createPriceObservationsForSession(
      tx as unknown as typeof db,
      userId,
      sessionId,
      session.finishedAt ?? now,
    );
    return session;
  });
}

export async function updateShoppingSessionBudget(
  userId: string,
  sessionId: string,
  budgetAmount: string | null,
) {
  const existing = await getShoppingSession(userId, sessionId);
  if (existing.status === 'completed')
    throw new ShoppingSessionCompletedError();
  const now = new Date();
  const [session] = await db
    .update(shoppingSessions)
    .set({
      budgetAmount: serializeMoney(budgetAmount),
      currency: DEFAULT_CURRENCY,
      updatedAt: now,
    })
    .where(
      and(
        eq(shoppingSessions.id, sessionId),
        eq(shoppingSessions.ownerUserId, userId),
        eq(shoppingSessions.status, 'active'),
      ),
    )
    .returning();
  if (!session) throw new ShoppingSessionNotFoundError();
  return session;
}
