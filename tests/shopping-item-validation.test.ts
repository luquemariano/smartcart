import { describe, expect, it } from 'vitest';
import {
  shoppingItemInputSchema,
  shoppingItemQuantitySchema,
} from '@/lib/shopping-item-validation';

describe('shopping item validation', () => {
  it('accepts catalog and manual items with canonical quantities', () => {
    expect(
      shoppingItemInputSchema.parse({
        productId: 'product-1',
        quantity: '2.000',
      }),
    ).toMatchObject({ productId: 'product-1', quantity: '2' });
    expect(
      shoppingItemInputSchema.parse({
        productId: null,
        productName: 'Pan francés',
        quantity: '1.500',
      }),
    ).toMatchObject({
      productId: null,
      productName: 'Pan francés',
      quantity: '1.5',
    });
  });

  it('rejects zero, negatives, comma decimals and excess precision', () => {
    for (const quantity of ['0', '-1', '1,5', '1.0000', '1000000000']) {
      expect(() => shoppingItemQuantitySchema.parse({ quantity })).toThrow();
    }
  });
});
