import { beforeEach, describe, expect, it } from 'vitest';
import {
  createLocalProduct,
  deleteLocalProduct,
  getPendingGuestProducts,
  listLocalProducts,
  updateLocalProduct,
} from '@/lib/local-product-repository';
import { addLocalShoppingItem } from '@/lib/local-shopping-item-repository';
import { startLocalShoppingSession } from '@/lib/local-shopping-session-repository';

const input = {
  name: 'Spaghetti',
  brand: 'Matarazzo',
  barcode: '00012345678905',
  quantityValue: '500',
  quantityUnit: 'g' as const,
};

describe('local product repository', () => {
  beforeEach(() => window.localStorage.clear());

  it('supports create, search, update, pending read and delete', () => {
    const product = createLocalProduct('guest-a', input);
    expect(listLocalProducts('guest-a', 'matarazzo')).toHaveLength(1);
    expect(getPendingGuestProducts('guest-a')).toHaveLength(1);
    updateLocalProduct('guest-a', product.id, {
      ...input,
      name: 'Spaghetti Integral',
    });
    expect(listLocalProducts('guest-a')[0].name).toBe('Spaghetti Integral');
    deleteLocalProduct('guest-a', product.id);
    expect(listLocalProducts('guest-a')).toHaveLength(0);
  });

  it('isolates guests and rejects barcode or manual duplicates', () => {
    createLocalProduct('guest-a', input);
    expect(listLocalProducts('guest-b')).toHaveLength(0);
    expect(() =>
      createLocalProduct('guest-a', { ...input, name: 'Otro nombre' }),
    ).toThrow('DUPLICATE_PRODUCT');
    expect(() =>
      createLocalProduct('guest-a', { ...input, barcode: null }),
    ).toThrow('DUPLICATE_PRODUCT');
  });

  it('protects products referenced by a local shopping item', () => {
    const product = createLocalProduct('guest-a', input);
    const session = startLocalShoppingSession('guest-a', null);
    addLocalShoppingItem(
      'guest-a',
      session.id,
      { productId: product.id, quantity: '1' },
      product,
    );
    expect(() => deleteLocalProduct('guest-a', product.id)).toThrow(
      'REFERENCED_PRODUCT',
    );
  });
});
