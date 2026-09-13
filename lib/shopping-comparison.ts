import {
  compareMoney,
  divideMoneyByInteger,
  percentageDifference,
  subtractMoney,
  sumMoney,
} from '@/lib/money';
import type {
  HistoryStore,
  ShoppingHistoryEntry,
} from '@/lib/shopping-history';

export type PurchaseComparisonStatus =
  'more_expensive' | 'cheaper' | 'same_total' | 'partial' | 'insufficient';

export type PurchaseComparison = {
  status: PurchaseComparisonStatus;
  reason:
    | 'none'
    | 'no_previous_purchase'
    | 'currency_mismatch'
    | 'incomplete_purchase';
  current: ShoppingHistoryEntry;
  previous: ShoppingHistoryEntry | null;
  difference: string | null;
  percentage: string | null;
};

export type ProductObservation = {
  sessionId: string;
  finishedAt: string | Date | null;
  store: HistoryStore;
  currency: string;
  productId: string | null;
  productName: string;
  quantity: string;
  unitPrice: string | null;
  productQuantityValue: string | null;
  productQuantityUnit: string | null;
};

export type ProductComparison = {
  productId: string;
  productName: string;
  productQuantityValue: string | null;
  productQuantityUnit: string | null;
  status: PurchaseComparisonStatus;
  reason:
    | 'none'
    | 'no_previous_observation'
    | 'current_price_missing'
    | 'currency_mismatch'
    | 'incompatible_presentation';
  current: ProductObservation;
  previous: ProductObservation | null;
  difference: string | null;
  percentage: string | null;
};

export type StoreHistoryOverview = {
  store: Exclude<HistoryStore, null>;
  completedPurchasesCount: number;
  validPurchasesCount: number;
  incompletePurchasesCount: number;
  currency: string;
  historicalSpend: string | null;
  averageTicket: string | null;
  lastPurchase: ShoppingHistoryEntry;
  previousPurchase: ShoppingHistoryEntry | null;
  comparison: PurchaseComparison | null;
};

function dateValue(value: string | Date | null) {
  return value ? new Date(value).getTime() : 0;
}

function compareEntries(
  left: ShoppingHistoryEntry,
  right: ShoppingHistoryEntry,
) {
  return (
    dateValue(right.finishedAt ?? right.startedAt) -
    dateValue(left.finishedAt ?? left.startedAt)
  );
}

export function comparePurchaseSummaries(
  current: ShoppingHistoryEntry,
  previous: ShoppingHistoryEntry | null,
): PurchaseComparison {
  if (!previous)
    return {
      status: 'insufficient',
      reason: 'no_previous_purchase',
      current,
      previous: null,
      difference: null,
      percentage: null,
    };
  if (current.currency !== previous.currency)
    return {
      status: 'insufficient',
      reason: 'currency_mismatch',
      current,
      previous,
      difference: null,
      percentage: null,
    };
  const difference = subtractMoney(current.itemsTotal, previous.itemsTotal);
  const order = compareMoney(current.itemsTotal, previous.itemsTotal);
  return {
    status:
      current.unpricedItemsCount > 0 || previous.unpricedItemsCount > 0
        ? 'partial'
        : order > 0
          ? 'more_expensive'
          : order < 0
            ? 'cheaper'
            : 'same_total',
    reason:
      current.unpricedItemsCount > 0 || previous.unpricedItemsCount > 0
        ? 'incomplete_purchase'
        : 'none',
    current,
    previous,
    difference,
    percentage: percentageDifference(current.itemsTotal, previous.itemsTotal),
  };
}

function canonicalDecimal(value: string | null, scale: number) {
  if (value === null) return null;
  const [whole, fraction = ''] = value.split('.');
  return (
    `${whole.replace(/^0+(?=\d)/, '') || '0'}.${fraction
      .padEnd(scale, '0')
      .slice(0, scale)}`
      .replace(/0+$/, '')
      .replace(/\.$/, '') || '0'
  );
}

export function compatibleProductPresentation(
  current: ProductObservation,
  previous: ProductObservation,
) {
  return (
    canonicalDecimal(current.productQuantityValue, 4) ===
      canonicalDecimal(previous.productQuantityValue, 4) &&
    (current.productQuantityUnit ?? '').toLowerCase() ===
      (previous.productQuantityUnit ?? '').toLowerCase()
  );
}

export function compareProductObservations(
  current: ProductObservation,
  previous: ProductObservation | null,
): ProductComparison {
  const base = {
    productId: current.productId ?? '',
    productName: current.productName,
    productQuantityValue: current.productQuantityValue,
    productQuantityUnit: current.productQuantityUnit,
    current,
    previous,
  };
  if (!previous)
    return {
      ...base,
      status: 'insufficient',
      reason: 'no_previous_observation',
      difference: null,
      percentage: null,
    };
  if (
    current.productId !== previous.productId ||
    !compatibleProductPresentation(current, previous)
  )
    return {
      ...base,
      status: 'insufficient',
      reason: 'incompatible_presentation',
      difference: null,
      percentage: null,
    };
  if (!current.unitPrice)
    return {
      ...base,
      status: 'partial',
      reason: 'current_price_missing',
      difference: null,
      percentage: null,
    };
  if (current.currency !== previous.currency)
    return {
      ...base,
      status: 'insufficient',
      reason: 'currency_mismatch',
      difference: null,
      percentage: null,
    };
  if (!previous.unitPrice)
    return {
      ...base,
      status: 'partial',
      reason: 'no_previous_observation',
      difference: null,
      percentage: null,
    };
  const difference = subtractMoney(current.unitPrice, previous.unitPrice);
  const order = compareMoney(current.unitPrice, previous.unitPrice);
  return {
    ...base,
    status: order > 0 ? 'more_expensive' : order < 0 ? 'cheaper' : 'same_total',
    reason: 'none',
    difference,
    percentage: percentageDifference(current.unitPrice, previous.unitPrice),
  };
}

export function buildStoreHistoryOverviews(
  entries: ShoppingHistoryEntry[],
): StoreHistoryOverview[] {
  const grouped = new Map<string, ShoppingHistoryEntry[]>();
  for (const entry of entries) {
    if (!entry.store) continue;
    const current = grouped.get(entry.store.id) ?? [];
    current.push(entry);
    grouped.set(entry.store.id, current);
  }
  return [...grouped.values()]
    .map((storeEntries) => {
      const sorted = [...storeEntries].sort(compareEntries);
      const first = sorted[0];
      const valid = sorted.filter((entry) => entry.unpricedItemsCount === 0);
      const currency = first.currency;
      const sameCurrency = valid.filter((entry) => entry.currency === currency);
      const spend = sameCurrency.length
        ? sumMoney(sameCurrency.map((entry) => entry.itemsTotal))
        : null;
      return {
        store: first.store as Exclude<HistoryStore, null>,
        completedPurchasesCount: sorted.length,
        validPurchasesCount: sameCurrency.length,
        incompletePurchasesCount: sorted.length - sameCurrency.length,
        currency,
        historicalSpend: spend,
        averageTicket: spend
          ? divideMoneyByInteger(spend, sameCurrency.length)
          : null,
        lastPurchase: first,
        previousPurchase: sorted[1] ?? null,
        comparison: sorted[1]
          ? comparePurchaseSummaries(first, sorted[1])
          : null,
      };
    })
    .sort((left, right) =>
      compareEntries(left.lastPurchase, right.lastPurchase),
    );
}
