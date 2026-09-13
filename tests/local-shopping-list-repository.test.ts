import { beforeEach, describe, expect, it } from 'vitest';
import { createLocalProduct } from '@/lib/local-product-repository';
import { startLocalShoppingSession } from '@/lib/local-shopping-session-repository';
import {
  addLocalShoppingListItem,
  addLocalListToActiveShoppingSession,
  createLocalShoppingList,
  duplicateLocalShoppingList,
  listLocalShoppingLists,
  resetLocalShoppingList,
  updateLocalShoppingListItem,
} from '@/lib/local-shopping-list-repository';
import { listLocalShoppingItems } from '@/lib/local-shopping-item-repository';

describe('local shopping list repository', () => {
  beforeEach(() => window.localStorage.clear());
  it('persists lists, snapshots catalog items, merges products and resets checks', () => {
    const product = createLocalProduct('guest-a', {
      name: 'Leche',
      brand: 'La Serenísima',
      quantityValue: '1',
      quantityUnit: 'l',
      barcode: null,
    });
    const list = createLocalShoppingList('guest-a', '  Compra mensual  ');
    addLocalShoppingListItem(
      'guest-a',
      list.id,
      { productId: product.id, quantity: '2' },
      product,
    );
    addLocalShoppingListItem(
      'guest-a',
      list.id,
      { productId: product.id, quantity: '1' },
      product,
    );
    const item = listLocalShoppingLists('guest-a')[0].items[0];
    expect(item.productName).toBe('Leche');
    expect(item.quantity).toBe('3');
    updateLocalShoppingListItem('guest-a', item.id, { isChecked: true });
    resetLocalShoppingList('guest-a', list.id);
    expect(listLocalShoppingLists('guest-a')[0].items[0].isChecked).toBe(false);
  });
  it('duplicates with unchecked items, isolates guests and imports into a session', () => {
    const list = createLocalShoppingList('guest-a', 'Super semanal');
    addLocalShoppingListItem('guest-a', list.id, {
      productId: null,
      productName: 'Pan',
      quantity: '1',
    });
    const copy = duplicateLocalShoppingList('guest-a', list.id);
    expect(copy.name).toBe('Super semanal copia');
    expect(listLocalShoppingLists('guest-b')).toHaveLength(0);
    const session = startLocalShoppingSession('guest-a', null);
    addLocalListToActiveShoppingSession('guest-a', copy.id, []);
    expect(listLocalShoppingItems('guest-a', session.id)[0].productName).toBe(
      'Pan',
    );
  });
});
