import { describe, expect, it } from 'vitest';
import { buildShoppingHistoryEntry } from '@/lib/shopping-history';

describe('shopping history domain', () => {
  it('derives counts, quantities, totals, pending prices and budget difference', () => {
    const entry = buildShoppingHistoryEntry(
      {
        id: 'session-1',
        storeId: 'store-1',
        status: 'completed',
        budgetAmount: '100000.00',
        currency: 'ARS',
        startedAt: '2026-09-12T10:00:00.000Z',
        finishedAt: '2026-09-12T10:30:00.000Z',
      },
      { id: 'store-1', name: 'Carrefour', branchName: 'Colón' },
      [
        { quantity: '2', unitPrice: '1850.00' },
        { quantity: '1', unitPrice: null },
      ],
    );

    expect(entry).toMatchObject({
      sessionId: 'session-1',
      itemsTotal: '3700.00',
      remainingBudget: '96300.00',
      budgetUsagePercentage: '3.70',
      itemsCount: 2,
      totalQuantity: '3',
      pricedItemsCount: 1,
      unpricedItemsCount: 1,
    });
  });
});
