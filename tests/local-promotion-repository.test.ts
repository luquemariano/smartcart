import { beforeEach, describe, expect, it } from 'vitest';
import {
  createLocalPromotion,
  deleteLocalPromotion,
  listLocalPromotions,
  updateLocalPromotion,
} from '@/lib/local-promotion-repository';
const input = {
  productId: 'product-a',
  storeId: 'store-a',
  type: 'percentage' as const,
  value: '20.00',
  buyQuantity: null,
  payQuantity: null,
  startsAt: '2026-01-01T00:00:00.000Z',
  endsAt: '2026-12-31T00:00:00.000Z',
  isActive: true,
};
describe('local promotion repository', () => {
  beforeEach(() => window.localStorage.clear());
  it('supports create, list, update, deactivate and delete', () => {
    const created = createLocalPromotion('guest-a', input);
    expect(listLocalPromotions('guest-a')).toHaveLength(1);
    updateLocalPromotion('guest-a', created.id, { ...input, isActive: false });
    expect(listLocalPromotions('guest-a', { active: true })).toHaveLength(0);
    deleteLocalPromotion('guest-a', created.id);
    expect(listLocalPromotions('guest-a')).toHaveLength(0);
  });
  it('isolates guests and filters by product/store', () => {
    createLocalPromotion('guest-a', input);
    createLocalPromotion('guest-a', {
      ...input,
      productId: 'product-b',
      storeId: 'store-b',
    });
    expect(listLocalPromotions('guest-b')).toHaveLength(0);
    expect(
      listLocalPromotions('guest-a', {
        productId: 'product-b',
        storeId: 'store-b',
      }),
    ).toHaveLength(1);
  });
});
