import { describe, expect, it } from 'vitest';
import { compareShoppingList } from '@/lib/shopping-list-comparison';

const stores = [
  { id: 'a', name: 'A', branchName: null },
  { id: 'b', name: 'B', branchName: null },
  { id: 'c', name: 'C', branchName: null },
];
const list = [
  { productId: 'p1', name: 'Leche', quantity: '2' },
  { productId: 'p2', name: 'Pan', quantity: '1.5' },
];
const price = (
  productId: string,
  storeId: string,
  unitPrice: string,
  observedAt = '2026-09-13',
) => ({ productId, storeId, unitPrice, currency: 'ARS', observedAt });

describe('shopping list comparison', () => {
  it('uses latest prices, multiplies decimal quantities and calculates exact totals', () => {
    const result = compareShoppingList(list, stores, [
      price('p1', 'a', '1234.56'),
      price('p2', 'a', '10.00'),
    ]);
    expect(result.stores[0].totalKnown).toBe('2484.12');
    expect(result.stores[0].coveragePercent).toBe('100.00');
  });
  it('marks missing products and excludes irrelevant stores', () => {
    const result = compareShoppingList(list, stores, [
      price('p1', 'a', '10.00'),
    ]);
    expect(result.stores).toHaveLength(1);
    expect(result.stores[0].missingItems).toBe(1);
    expect(result.stores[0].coveragePercent).toBe('50.00');
    expect(result.bestStore).toBeNull();
  });
  it('does not compare manual items or empty lists', () => {
    expect(
      compareShoppingList(
        [{ productId: null, name: 'Manual', quantity: '1' }],
        stores,
        [],
      ).comparisonStatus,
    ).toBe('no_comparable_products');
    expect(compareShoppingList([], stores, []).comparisonStatus).toBe(
      'no_comparable_products',
    );
    const mixed = compareShoppingList(
      [
        { productId: null, name: 'Manual', quantity: '1' },
        { productId: 'p1', name: 'Leche', quantity: '1' },
      ],
      stores,
      [price('p1', 'a', '10.00')],
    );
    expect(mixed.stores[0].missingItems).toBe(0);
    expect(mixed.stores[0].items[0].status).toBe('manual_uncomparable');
  });
  it('requires two complete stores for a winner and computes savings', () => {
    const result = compareShoppingList(list, stores, [
      price('p1', 'a', '10.00'),
      price('p2', 'a', '10.00'),
      price('p1', 'b', '12.00'),
      price('p2', 'b', '12.00'),
    ]);
    expect(result.bestStore?.id).toBe('a');
    expect(result.savingsVsNextBest).toBe('7.00');
  });
  it('does not declare a winner for partial, single-complete or tied stores', () => {
    expect(
      compareShoppingList(list, stores, [
        price('p1', 'a', '10.00'),
        price('p2', 'a', '10.00'),
        price('p1', 'b', '12.00'),
      ]).bestStore,
    ).toBeNull();
    expect(
      compareShoppingList(list, stores, [
        price('p1', 'a', '10.00'),
        price('p2', 'a', '10.00'),
      ]).bestStore,
    ).toBeNull();
    expect(
      compareShoppingList(list, stores, [
        price('p1', 'a', '10.00'),
        price('p2', 'a', '10.00'),
        price('p1', 'b', '10.00'),
        price('p2', 'b', '10.00'),
      ]).bestStore,
    ).toBeNull();
  });
  it('ignores incompatible currencies and preserves observation dates', () => {
    const result = compareShoppingList(list, stores, [
      price('p1', 'a', '10.00', '2026-09-10'),
      { ...price('p2', 'a', '20.00'), currency: 'USD' },
    ]);
    expect(result.stores[0].coveragePercent).toBe('50.00');
    expect(result.stores[0].oldestObservationAt).toContain('2026-09-10');
  });
  it('selects the latest observation per product and store', () => {
    const result = compareShoppingList(
      [{ productId: 'p1', name: 'Leche', quantity: '1' }],
      [{ id: 's1', name: 'Store A', branchName: null }],
      [
        {
          productId: 'p1',
          storeId: 's1',
          unitPrice: '12.00',
          currency: 'ARS',
          observedAt: '2026-01-01T00:00:00.000Z',
        },
        {
          productId: 'p1',
          storeId: 's1',
          unitPrice: '10.00',
          currency: 'ARS',
          observedAt: '2026-02-01T00:00:00.000Z',
        },
      ],
    );
    expect(result.stores[0].totalKnown).toBe('10.00');
    expect(result.stores[0].items[0].status).toBe('priced');
  });
});
