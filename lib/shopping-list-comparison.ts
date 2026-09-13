import {
  compareMoney,
  multiplyMoneyByQuantity,
  sumMoney,
  subtractMoney,
} from '@/lib/money';
import {
  chooseBestPromotion,
  type PromotionCandidate,
} from '@/lib/promotion-calculator';

export type ComparisonListItem = {
  productId: string | null;
  name: string;
  quantity: string;
};
export type ComparisonStore = {
  id: string;
  name: string;
  branchName: string | null;
};
export type ComparisonPrice = {
  productId: string;
  storeId: string;
  unitPrice: string;
  currency: string;
  observedAt: Date | string;
  createdAt?: Date | string;
  id?: string;
};

export function compareShoppingList(
  listItems: ComparisonListItem[],
  stores: ComparisonStore[],
  latestPrices: ComparisonPrice[],
  promotions: PromotionCandidate[] = [],
  comparisonDate = new Date(),
) {
  const comparable = listItems.filter((item) => item.productId !== null);
  if (comparable.length === 0)
    return {
      comparisonStatus: 'no_comparable_products' as const,
      totalItems: listItems.length,
      stores: [],
      bestStore: null,
    };

  const orderedPrices = [...latestPrices]
    .filter((price) => price.currency === 'ARS')
    .sort((left, right) => {
      const observedDelta =
        new Date(right.observedAt).getTime() -
        new Date(left.observedAt).getTime();
      if (observedDelta !== 0) return observedDelta;
      const createdDelta =
        new Date(right.createdAt ?? 0).getTime() -
        new Date(left.createdAt ?? 0).getTime();
      if (createdDelta !== 0) return createdDelta;
      return (right.id ?? '').localeCompare(left.id ?? '');
    });
  const relevantStoreIds = new Set(orderedPrices.map((price) => price.storeId));
  const visibleStores = stores.filter((store) =>
    relevantStoreIds.has(store.id),
  );
  const comparisons = visibleStores.map((store) => {
    const prices = new Map<string, ComparisonPrice>();
    for (const price of orderedPrices) {
      if (price.storeId === store.id && !prices.has(price.productId)) {
        prices.set(price.productId, price);
      }
    }
    const items = listItems.map((item) => {
      if (!item.productId)
        return { ...item, status: 'manual_uncomparable' as const };
      const price = prices.get(item.productId);
      if (!price) return { ...item, status: 'missing_price' as const };
      const applicablePromotions = promotions.filter(
        (promotion) =>
          promotion.productId === item.productId &&
          promotion.storeId === store.id,
      );
      const selected = chooseBestPromotion(
        price.unitPrice,
        item.quantity,
        applicablePromotions,
        comparisonDate,
      );
      const baseSubtotal = multiplyMoneyByQuantity(
        price.unitPrice,
        item.quantity,
      );
      return {
        ...item,
        status: 'priced' as const,
        unitPrice: price.unitPrice,
        baseUnitPrice: price.unitPrice,
        subtotal: baseSubtotal,
        baseSubtotal,
        effectiveSubtotal: selected.result.effectiveSubtotal,
        promotion: selected.p,
        savings: selected.result.savings,
        observedAt: price.observedAt,
      };
    });
    const pricedItems = items.filter((item) => item.status === 'priced');
    const knownTotal = sumMoney(pricedItems.map((item) => item.subtotal));
    const effectiveTotal = sumMoney(
      pricedItems.map((item) => item.effectiveSubtotal),
    );
    const promotionSavings = subtractMoney(knownTotal, effectiveTotal);
    const comparableCount = comparable.length;
    const coveragePercent = (
      (pricedItems.length * 100) /
      comparableCount
    ).toFixed(2);
    return {
      store,
      totalKnown: knownTotal,
      effectiveTotal,
      promotionSavings,
      currency: 'ARS' as const,
      totalItems: listItems.length,
      pricedItems: pricedItems.length,
      missingItems: comparableCount - pricedItems.length,
      coveragePercent,
      isComplete: pricedItems.length === comparableCount,
      newestObservationAt: pricedItems.length
        ? new Date(
            Math.max(
              ...pricedItems.map((item) =>
                new Date(item.observedAt!).getTime(),
              ),
            ),
          ).toISOString()
        : null,
      oldestObservationAt: pricedItems.length
        ? new Date(
            Math.min(
              ...pricedItems.map((item) =>
                new Date(item.observedAt!).getTime(),
              ),
            ),
          ).toISOString()
        : null,
      items,
    };
  });

  const complete = comparisons.filter((comparison) => comparison.isComplete);
  let bestStore: (typeof comparisons)[number]['store'] | null = null;
  const comparisonStatus: 'complete' | 'partial' | 'insufficient_data' =
    complete.length > 0
      ? 'complete'
      : comparisons.length > 0
        ? 'partial'
        : 'insufficient_data';
  let savingsVsNextBest: string | null = null;
  if (complete.length >= 2) {
    const ordered = [...complete].sort((left, right) =>
      compareMoney(left.effectiveTotal, right.effectiveTotal),
    );
    if (
      compareMoney(ordered[0].effectiveTotal, ordered[1].effectiveTotal) !== 0
    ) {
      bestStore = ordered[0].store;
      savingsVsNextBest = subtractExact(
        ordered[1].effectiveTotal,
        ordered[0].effectiveTotal,
      );
    }
  }
  return {
    comparisonStatus,
    totalItems: listItems.length,
    stores: comparisons,
    bestStore,
    savingsVsNextBest,
  };
}

function subtractExact(left: string, right: string) {
  const leftParts = left.split('.');
  const rightParts = right.split('.');
  const leftCents = BigInt(leftParts[0]) * BigInt(100) + BigInt(leftParts[1]);
  const rightCents =
    BigInt(rightParts[0]) * BigInt(100) + BigInt(rightParts[1]);
  const value = leftCents - rightCents;
  return `${value / BigInt(100)}.${(value % BigInt(100)).toString().padStart(2, '0')}`;
}
