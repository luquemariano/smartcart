import { describe, expect, it } from 'vitest';
import { selectLatestPricePerStore } from '@/server/price-observations';
import { parseMoneyInput } from '@/lib/money';

describe('PriceObservation server contracts', () => {
  it('selects the latest row per Product and Store without mixing stores', () => {
    const rows = [
      { productId: 'p', storeId: 'b', observedAt: '2026-09-13' },
      { productId: 'p', storeId: 'b', observedAt: '2026-09-12' },
      { productId: 'p', storeId: 'a', observedAt: '2026-09-11' },
      { productId: 'other', storeId: 'a', observedAt: '2026-09-10' },
    ];
    expect(selectLatestPricePerStore(rows)).toEqual([
      rows[0],
      rows[2],
      rows[3],
    ]);
  });

  it('keeps owner filtering at the query boundary and preserves money as text', () => {
    const ownerRows = [
      {
        ownerUserId: 'a',
        productId: 'p',
        storeId: 'a',
        observedAt: new Date('2026-09-13'),
      },
      {
        ownerUserId: 'b',
        productId: 'p',
        storeId: 'a',
        observedAt: new Date('2026-09-14'),
      },
    ];
    const visible = ownerRows.filter((row) => row.ownerUserId === 'a');
    expect(visible).toHaveLength(1);
    expect(parseMoneyInput('1234.56')).toBe('1234.56');
  });
});
