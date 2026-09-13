import { and, desc, eq, inArray, lte, gte } from 'drizzle-orm';
import { db } from '@/db';
import { products, promotions, stores } from '@/db/schema';
import {
  promotionInputSchema,
  type PromotionInput,
} from '@/lib/promotion-validation';

export class PromotionNotFoundError extends Error {}
export class PromotionReferenceError extends Error {}

export async function listPromotions(
  ownerUserId: string,
  filters?: { storeId?: string; productId?: string; active?: boolean },
) {
  const now = new Date();
  return db
    .select()
    .from(promotions)
    .where(
      and(
        eq(promotions.ownerUserId, ownerUserId),
        filters?.storeId ? eq(promotions.storeId, filters.storeId) : undefined,
        filters?.productId
          ? eq(promotions.productId, filters.productId)
          : undefined,
        filters?.active
          ? and(
              eq(promotions.isActive, true),
              lte(promotions.startsAt, now),
              gte(promotions.endsAt, now),
            )
          : undefined,
      ),
    )
    .orderBy(desc(promotions.startsAt));
}
export async function getPromotion(ownerUserId: string, id: string) {
  const [value] = await db
    .select()
    .from(promotions)
    .where(and(eq(promotions.id, id), eq(promotions.ownerUserId, ownerUserId)))
    .limit(1);
  if (!value) throw new PromotionNotFoundError();
  return value;
}
async function assertRefs(ownerUserId: string, input: PromotionInput) {
  const found = await db
    .select({ productId: products.id, storeId: stores.id })
    .from(products)
    .innerJoin(stores, eq(stores.ownerUserId, products.ownerUserId))
    .where(
      and(
        eq(products.id, input.productId),
        eq(stores.id, input.storeId),
        eq(products.ownerUserId, ownerUserId),
        eq(stores.ownerUserId, ownerUserId),
      ),
    )
    .limit(1);
  if (!found.length) throw new PromotionReferenceError();
}
export async function createPromotion(ownerUserId: string, raw: unknown) {
  const input = promotionInputSchema.parse(raw);
  await assertRefs(ownerUserId, input);
  const [value] = await db
    .insert(promotions)
    .values({
      id: crypto.randomUUID(),
      ownerUserId,
      storeId: input.storeId,
      productId: input.productId,
      type: input.type,
      value: input.value ?? null,
      buyQuantity: input.buyQuantity?.toString() ?? null,
      payQuantity: input.payQuantity?.toString() ?? null,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      isActive: input.isActive ?? true,
    })
    .returning();
  return value;
}
export async function updatePromotion(
  ownerUserId: string,
  id: string,
  raw: unknown,
) {
  await getPromotion(ownerUserId, id);
  const input = promotionInputSchema.parse(raw);
  await assertRefs(ownerUserId, input);
  const [value] = await db
    .update(promotions)
    .set({
      storeId: input.storeId,
      productId: input.productId,
      type: input.type,
      value: input.value ?? null,
      buyQuantity: input.buyQuantity?.toString() ?? null,
      payQuantity: input.payQuantity?.toString() ?? null,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      isActive: input.isActive ?? true,
      updatedAt: new Date(),
    })
    .where(and(eq(promotions.id, id), eq(promotions.ownerUserId, ownerUserId)))
    .returning();
  return value;
}
export async function deletePromotion(ownerUserId: string, id: string) {
  await getPromotion(ownerUserId, id);
  await db
    .delete(promotions)
    .where(and(eq(promotions.id, id), eq(promotions.ownerUserId, ownerUserId)));
}
export async function listCurrentPromotions(
  ownerUserId: string,
  pairs: Array<{ productId: string; storeId: string }>,
  at = new Date(),
) {
  if (!pairs.length) return [];
  const productIds = [...new Set(pairs.map((p) => p.productId))];
  const storeIds = [...new Set(pairs.map((p) => p.storeId))];
  return db
    .select()
    .from(promotions)
    .where(
      and(
        eq(promotions.ownerUserId, ownerUserId),
        inArray(promotions.productId, productIds),
        inArray(promotions.storeId, storeIds),
        eq(promotions.isActive, true),
        lte(promotions.startsAt, at),
        gte(promotions.endsAt, at),
      ),
    );
}
