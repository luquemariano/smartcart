import { and, asc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { priceObservations, promotions, stores } from '@/db/schema';
import {
  normalizeStorePart,
  storeInputSchema,
  type StoreInput,
} from '@/lib/store-validation';

export class StoreNotFoundError extends Error {}
export class StoreDuplicateError extends Error {}
export class StoreReferencedError extends Error {}

function hasErrorCode(error: unknown, code: string): boolean {
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

function toDbValues(userId: string, input: StoreInput) {
  const parsed = storeInputSchema.parse(input);
  return {
    id: crypto.randomUUID(),
    ownerUserId: userId,
    name: parsed.name,
    normalizedName: normalizeStorePart(parsed.name)!,
    branchName: parsed.branchName,
    normalizedBranchName: normalizeStorePart(parsed.branchName),
    address: parsed.address,
    latitude: parsed.latitude?.toString() ?? null,
    longitude: parsed.longitude?.toString() ?? null,
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

export async function createStore(userId: string, input: StoreInput) {
  try {
    const [store] = await db
      .insert(stores)
      .values(toDbValues(userId, input))
      .returning();
    return store;
  } catch (error) {
    if (isUniqueViolation(error)) throw new StoreDuplicateError();
    throw error;
  }
}

export async function listStores(userId: string) {
  return db
    .select()
    .from(stores)
    .where(eq(stores.ownerUserId, userId))
    .orderBy(asc(stores.name), asc(stores.branchName));
}

export async function getStore(userId: string, storeId: string) {
  const [store] = await db
    .select()
    .from(stores)
    .where(and(eq(stores.id, storeId), eq(stores.ownerUserId, userId)))
    .limit(1);

  if (!store) throw new StoreNotFoundError();
  return store;
}

export async function updateStore(
  userId: string,
  storeId: string,
  input: StoreInput,
) {
  try {
    const parsed = storeInputSchema.parse(input);
    const [store] = await db
      .update(stores)
      .set({
        name: parsed.name,
        normalizedName: normalizeStorePart(parsed.name)!,
        branchName: parsed.branchName,
        normalizedBranchName: normalizeStorePart(parsed.branchName),
        address: parsed.address,
        latitude: parsed.latitude?.toString() ?? null,
        longitude: parsed.longitude?.toString() ?? null,
        updatedAt: new Date(),
      })
      .where(and(eq(stores.id, storeId), eq(stores.ownerUserId, userId)))
      .returning();

    if (!store) throw new StoreNotFoundError();
    return store;
  } catch (error) {
    if (isUniqueViolation(error)) throw new StoreDuplicateError();
    throw error;
  }
}

export async function deleteStore(userId: string, storeId: string) {
  try {
    const [priceReference] = await db
      .select({ id: priceObservations.id })
      .from(priceObservations)
      .where(eq(priceObservations.storeId, storeId))
      .limit(1);
    if (priceReference) throw new StoreReferencedError();
    const [promotionReference] = await db
      .select({ id: promotions.id })
      .from(promotions)
      .where(eq(promotions.storeId, storeId))
      .limit(1);
    if (promotionReference) throw new StoreReferencedError();
    const [store] = await db
      .delete(stores)
      .where(and(eq(stores.id, storeId), eq(stores.ownerUserId, userId)))
      .returning({ id: stores.id });

    if (!store) throw new StoreNotFoundError();
  } catch (error) {
    if (hasErrorCode(error, '23503')) {
      throw new StoreReferencedError();
    }
    throw error;
  }
}
