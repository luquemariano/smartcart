import { beforeEach, describe, expect, it } from 'vitest';
import {
  createLocalProduct,
  deleteLocalProduct,
} from '@/lib/local-product-repository';
import {
  addLocalShoppingItem,
  deleteLocalShoppingItem,
  hasLocalShoppingItemForProduct,
  listLocalShoppingItems,
  updateLocalShoppingItemQuantity,
} from '@/lib/local-shopping-item-repository';
import {
  finishLocalShoppingSession,
  startLocalShoppingSession,
} from '@/lib/local-shopping-session-repository';

describe('local shopping item repository', () => {
  beforeEach(() => window.localStorage.clear());

  it('snapshots catalog/manual products, merges catalog quantities and restores history', () => {
    const product = createLocalProduct('guest-items', {
      name: 'Leche',
      brand: 'La Serenísima',
      barcode: '00012345678905',
      quantityValue: '1',
      quantityUnit: 'l',
    });
    const session = startLocalShoppingSession('guest-items', 'store-1');
    const first = addLocalShoppingItem(
      'guest-items',
      session.id,
      { productId: product.id, quantity: '2' },
      product,
    );
    const merged = addLocalShoppingItem(
      'guest-items',
      session.id,
      { productId: product.id, quantity: '1.5' },
      product,
    );
    expect(merged.id).toBe(first.id);
    expect(merged.quantity).toBe('3.5');
    expect(merged.productName).toBe('Leche');

    const manual = addLocalShoppingItem('guest-items', session.id, {
      productId: null,
      productName: 'Pan francés',
      quantity: '1',
    });
    addLocalShoppingItem('guest-items', session.id, {
      productId: null,
      productName: 'Pan francés',
      quantity: '1',
    });
    expect(listLocalShoppingItems('guest-items', session.id)).toHaveLength(3);
    updateLocalShoppingItemQuantity('guest-items', manual.id, {
      quantity: '1.250',
    });
    expect(
      listLocalShoppingItems('guest-items', session.id).find(
        (item) => item.id === manual.id,
      )?.quantity,
    ).toBe('1.25');
    expect(hasLocalShoppingItemForProduct('guest-items', product.id)).toBe(
      true,
    );
    expect(() => deleteLocalProduct('guest-items', product.id)).toThrow(
      'REFERENCED_PRODUCT',
    );

    deleteLocalShoppingItem('guest-items', manual.id);
    finishLocalShoppingSession('guest-items', session.id);
    expect(listLocalShoppingItems('guest-items', session.id)).toHaveLength(2);
    expect(() =>
      updateLocalShoppingItemQuantity('guest-items', first.id, {
        quantity: '4',
      }),
    ).toThrow('COMPLETED_SHOPPING_SESSION');
    expect(() => deleteLocalShoppingItem('guest-items', first.id)).toThrow(
      'COMPLETED_SHOPPING_SESSION',
    );
  });

  it('isolates guests and rejects catalog items without a snapshot source', () => {
    const session = startLocalShoppingSession('guest-a', null);
    const otherSession = startLocalShoppingSession('guest-b', null);
    expect(listLocalShoppingItems('guest-b', otherSession.id)).toHaveLength(0);
    expect(() =>
      addLocalShoppingItem('guest-a', session.id, {
        productId: 'missing',
        quantity: '1',
      }),
    ).toThrow('PRODUCT_NOT_FOUND');
  });
});
