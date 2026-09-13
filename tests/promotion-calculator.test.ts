import { describe, expect, it } from 'vitest';
import {
  calculatePromotion,
  chooseBestPromotion,
} from '@/lib/promotion-calculator';
import { compareShoppingList } from '@/lib/shopping-list-comparison';

const now = '2026-09-13T12:00:00.000Z';
const promo = (extra: Record<string, unknown>) => ({
  id: 'p',
  type: 'percentage' as const,
  value: '20.00',
  buyQuantity: null,
  payQuantity: null,
  startsAt: '2026-01-01T00:00:00.000Z',
  endsAt: '2026-12-31T00:00:00.000Z',
  isActive: true,
  ...extra,
});
describe('promotion calculator', () => {
  it('applies percentage with exact money and rounds half up', () =>
    expect(
      calculatePromotion(
        '999.99',
        '1',
        promo({ value: '15.00' }),
        new Date(now),
      ).effectiveSubtotal,
    ).toBe('849.99'));
  it('supports fixed price', () =>
    expect(
      calculatePromotion(
        '2000.00',
        '2',
        promo({ type: 'fixed_price', value: '1500.00' }),
        new Date(now),
      ).effectiveSubtotal,
    ).toBe('3000.00'));
  it('supports 2x1 and 3x2 quantities', () => {
    const p = promo({
      type: 'buy_n_pay_m',
      value: null,
      buyQuantity: 2,
      payQuantity: 1,
    });
    expect(
      calculatePromotion('100.00', '1', p, new Date(now)).effectiveSubtotal,
    ).toBe('100.00');
    expect(
      calculatePromotion('100.00', '2', p, new Date(now)).effectiveSubtotal,
    ).toBe('100.00');
    expect(
      calculatePromotion('100.00', '3', p, new Date(now)).effectiveSubtotal,
    ).toBe('200.00');
    const q = promo({
      type: 'buy_n_pay_m',
      value: null,
      buyQuantity: 3,
      payQuantity: 2,
    });
    expect(
      calculatePromotion('100.00', '5', q, new Date(now)).effectiveSubtotal,
    ).toBe('400.00');
    expect(
      calculatePromotion('100.00', '6', q, new Date(now)).effectiveSubtotal,
    ).toBe('400.00');
  });
  it('does not apply N x M to decimal quantities', () =>
    expect(
      calculatePromotion(
        '100.00',
        '1.5',
        promo({
          type: 'buy_n_pay_m',
          value: null,
          buyQuantity: 2,
          payQuantity: 1,
        }),
        new Date(now),
      ).reason,
    ).toBe('decimal_quantity'));
  it('honors inactive, future and expired validity', () => {
    for (const p of [
      promo({ isActive: false }),
      promo({ startsAt: '2027-01-01T00:00:00.000Z' }),
      promo({ endsAt: '2026-01-01T00:00:00.000Z' }),
    ])
      expect(
        calculatePromotion('100.00', '1', p, new Date(now)).applicable,
      ).toBe(false);
  });
  it('chooses the best individual promotion without stacking and deterministically breaks ties', () => {
    const result = chooseBestPromotion(
      '1000.00',
      '2',
      [
        promo({ id: 'z', value: '10.00' }),
        promo({ id: 'a', type: 'fixed_price', value: '850.00' }),
      ],
      new Date(now),
    );
    expect(result.p?.id).toBe('a');
    expect(result.result.effectiveSubtotal).toBe('1700.00');
  });
  it('keeps F15 coverage and base price semantics while applying effective totals', () => {
    const result = compareShoppingList(
      [{ productId: 'p1', name: 'Leche', quantity: '1' }],
      [
        { id: 's1', name: 'Store', branchName: null },
        { id: 's2', name: 'Other', branchName: null },
      ],
      [
        {
          productId: 'p1',
          storeId: 's1',
          unitPrice: '1000.00',
          currency: 'ARS',
          observedAt: now,
        },
      ],
      [
        promo({
          id: 'discount',
          productId: 'p1',
          storeId: 's1',
          value: '20.00',
        }),
        promo({
          id: 'missing',
          productId: 'p1',
          storeId: 's2',
          type: 'fixed_price',
          value: '1.00',
        }),
      ],
      new Date(now),
    );
    expect(result.stores[0].coveragePercent).toBe('100.00');
    expect(result.stores[0].totalKnown).toBe('1000.00');
    expect(result.stores[0].effectiveTotal).toBe('800.00');
    expect(result.stores).toHaveLength(1);
  });
});
