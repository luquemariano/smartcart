import { describe, expect, it } from 'vitest';
import { promotionInputSchema } from '@/lib/promotion-validation';
const dates = {
  startsAt: '2026-01-01T00:00:00.000Z',
  endsAt: '2026-12-31T00:00:00.000Z',
};
const base = { storeId: 's', productId: 'p', isActive: true, ...dates };
describe('promotion validation', () => {
  it('validates percentage, fixed price and N x M boundaries', () => {
    expect(() =>
      promotionInputSchema.parse({
        ...base,
        type: 'percentage',
        value: '0.00',
      }),
    ).toThrow();
    expect(
      promotionInputSchema.parse({
        ...base,
        type: 'percentage',
        value: '100.00',
      }).type,
    ).toBe('percentage');
    expect(
      promotionInputSchema.parse({
        ...base,
        type: 'fixed_price',
        value: '1500.00',
      }).type,
    ).toBe('fixed_price');
    expect(() =>
      promotionInputSchema.parse({
        ...base,
        type: 'fixed_price',
        value: '0.00',
      }),
    ).toThrow();
    expect(
      promotionInputSchema.parse({
        ...base,
        type: 'buy_n_pay_m',
        value: null,
        buyQuantity: 2,
        payQuantity: 1,
      }).buyQuantity,
    ).toBe(2);
    expect(() =>
      promotionInputSchema.parse({
        ...base,
        type: 'buy_n_pay_m',
        value: null,
        buyQuantity: 2,
        payQuantity: 2,
      }),
    ).toThrow();
  });
  it('rejects invalid dates and authority fields', () => {
    expect(() =>
      promotionInputSchema.parse({
        ...base,
        type: 'percentage',
        value: '10.00',
        endsAt: '2025-01-01T00:00:00.000Z',
      }),
    ).toThrow();
    expect(() =>
      promotionInputSchema.parse({
        ...base,
        type: 'percentage',
        value: '10.00',
        ownerUserId: 'attacker',
      }),
    ).toThrow();
    expect(() =>
      promotionInputSchema.parse({
        ...base,
        type: 'percentage',
        value: '10.00',
        userId: 'attacker',
      }),
    ).toThrow();
  });
});
