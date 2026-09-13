import { and, eq, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { stores } from '@/db/schema';
import { listCurrentPromotions } from '@/server/promotions';
import { getLatestPricesForProducts } from '@/server/price-observations';
import { getShoppingListDetail } from '@/server/shopping-lists';
import { compareShoppingList } from '@/lib/shopping-list-comparison';
import type { PromotionCandidate } from '@/lib/promotion-calculator';

export class ShoppingListComparisonNotFoundError extends Error {}

export async function compareShoppingListForUser(
  userId: string,
  listId: string,
) {
  const detail = await getShoppingListDetail(userId, listId).catch(() => {
    throw new ShoppingListComparisonNotFoundError();
  });
  const productIds = detail.items.flatMap((item) =>
    item.productId ? [item.productId] : [],
  );
  const prices = await getLatestPricesForProducts(productIds, userId);
  const promotions = await listCurrentPromotions(
    userId,
    prices.map((price) => ({
      productId: price.productId,
      storeId: price.storeId,
    })),
  );
  const storeIds = [...new Set(prices.map((price) => price.storeId))];
  const ownerStores = storeIds.length
    ? await db
        .select({
          id: stores.id,
          name: stores.name,
          branchName: stores.branchName,
        })
        .from(stores)
        .where(
          and(eq(stores.ownerUserId, userId), inArray(stores.id, storeIds)),
        )
    : [];
  return {
    list: detail.list,
    ...compareShoppingList(
      detail.items.map((item) => ({
        productId: item.productId,
        name: item.productName,
        quantity: item.quantity,
      })),
      ownerStores,
      prices,
      promotions as unknown as PromotionCandidate[],
    ),
  };
}
