import { describe, expect, it } from 'vitest';
import {
  shoppingItemInputSchema,
  shoppingItemPatchSchema,
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
    expect(
      shoppingItemInputSchema.parse({
        productId: 'product-1',
        quantity: '1.5',
        unitPrice: '2000',
      }),
    ).toMatchObject({ unitPrice: '2000.00' });
    expect(shoppingItemPatchSchema.parse({ unitPrice: '1990.50' })).toEqual({
      unitPrice: '1990.50',
    });
  });

  it('rejects zero, negatives, comma decimals and excess precision', () => {
    for (const quantity of ['0', '-1', '1,5', '1.0000', '1000000000']) {
      expect(() => shoppingItemQuantitySchema.parse({ quantity })).toThrow();
    }
  });

  it('rejects invalid prices and distinguishes null from zero', () => {
    expect(shoppingItemPatchSchema.parse({ unitPrice: null })).toEqual({
      unitPrice: null,
    });
    for (const unitPrice of ['0', '-1', '100,50', '$100', '100.123']) {
      expect(() => shoppingItemPatchSchema.parse({ unitPrice })).toThrow();
    }
  });
});
