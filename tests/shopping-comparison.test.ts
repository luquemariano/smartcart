import { describe, expect, it } from 'vitest';
import {
  buildStoreHistoryOverviews,
  compareProductObservations,
  comparePurchaseSummaries,
  type ProductObservation,
} from '@/lib/shopping-comparison';
import { buildShoppingHistoryEntry } from '@/lib/shopping-history';

function entry(
  sessionId: string,
  total: string,
  finishedAt: string,
  options: {
    storeId?: string;
    currency?: string;
    unpricedItemsCount?: number;
  } = {},
) {
  const result = buildShoppingHistoryEntry(
    {
      id: sessionId,
      storeId: options.storeId ?? 'store-a',
      status: 'completed',
      budgetAmount: null,
      currency: options.currency ?? 'ARS',
      startedAt: finishedAt,
      finishedAt,
    },
    { id: options.storeId ?? 'store-a', name: 'Carrefour', branchName: null },
    [],
  );
  return {
    ...result,
    itemsTotal: total,
    unpricedItemsCount: options.unpricedItemsCount ?? 0,
  };
}

function observation(
  sessionId: string,
  unitPrice: string | null,
  options: Partial<ProductObservation> = {},
): ProductObservation {
  return {
    sessionId,
    finishedAt: options.finishedAt ?? '2026-09-13T10:00:00.000Z',
    store: options.store ?? {
      id: 'store-a',
      name: 'Carrefour',
      branchName: null,
    },
    currency: options.currency ?? 'ARS',
    productId: 'product-a',
    productName: 'Leche entera',
    quantity: '1',
    unitPrice,
    productQuantityValue: options.productQuantityValue ?? '1',
    productQuantityUnit: options.productQuantityUnit ?? 'l',
  };
}

describe('shopping comparison', () => {
  it.each([
    ['more_expensive', '120.00', '100.00', '20.00', '20.00'],
    ['cheaper', '80.00', '100.00', '-20.00', '-20.00'],
    ['same_total', '100.00', '100.00', '0.00', '0.00'],
  ] as const)(
    '%s compares exact totals',
    (status, current, previous, difference, percentage) => {
      const result = comparePurchaseSummaries(
        entry('current', current, '2026-09-13T10:00:00.000Z'),
        entry('previous', previous, '2026-09-12T10:00:00.000Z'),
      );
      expect(result.status).toBe(status);
      expect(result.difference).toBe(difference);
      expect(result.percentage).toBe(percentage);
    },
  );

  it('does not calculate a percentage over a zero previous total', () => {
    const result = comparePurchaseSummaries(
      entry('current', '10.00', '2026-09-13T10:00:00.000Z'),
      entry('previous', '0.00', '2026-09-12T10:00:00.000Z'),
    );
    expect(result.difference).toBe('10.00');
    expect(result.percentage).toBeNull();
  });

  it('marks incomplete and currency-mismatch comparisons explicitly', () => {
    const partial = comparePurchaseSummaries(
      entry('current', '120.00', '2026-09-13T10:00:00.000Z', {
        unpricedItemsCount: 1,
      }),
      entry('previous', '100.00', '2026-09-12T10:00:00.000Z'),
    );
    expect(partial.status).toBe('partial');
    expect(partial.reason).toBe('incomplete_purchase');
    const mismatch = comparePurchaseSummaries(
      entry('current', '120.00', '2026-09-13T10:00:00.000Z'),
      entry('previous', '100.00', '2026-09-12T10:00:00.000Z', {
        currency: 'USD',
      }),
    );
    expect(mismatch.status).toBe('insufficient');
    expect(mismatch.difference).toBeNull();
  });

  it('compares compatible product presentations and rejects incompatible ones', () => {
    const current = observation('current', '1650.00');
    const previous = observation('previous', '1500.00', {
      finishedAt: '2026-09-12T10:00:00.000Z',
    });
    expect(compareProductObservations(current, previous)).toMatchObject({
      status: 'more_expensive',
      difference: '150.00',
      percentage: '10.00',
    });
    expect(
      compareProductObservations(
        current,
        observation('previous', '1500.00', {
          productQuantityValue: '500',
          productQuantityUnit: 'g',
        }),
      ).status,
    ).toBe('insufficient');
    expect(compareProductObservations(current, null).reason).toBe(
      'no_previous_observation',
    );
  });

  it('builds supermarket summaries from valid historical purchases', () => {
    const summaries = buildStoreHistoryOverviews([
      entry('new', '120.00', '2026-09-13T10:00:00.000Z'),
      entry('old', '100.00', '2026-09-12T10:00:00.000Z'),
      entry('partial', '50.00', '2026-09-11T10:00:00.000Z', {
        unpricedItemsCount: 1,
      }),
    ]);
    expect(summaries[0]).toMatchObject({
      completedPurchasesCount: 3,
      validPurchasesCount: 2,
      historicalSpend: '220.00',
      averageTicket: '110.00',
      comparison: { status: 'more_expensive', difference: '20.00' },
    });
  });
});
