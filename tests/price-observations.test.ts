import { beforeEach, describe, expect, it } from 'vitest';
import { createLocalProduct } from '@/lib/local-product-repository';
import {
  getLatestLocalPricesByStore,
  listLocalPriceObservations,
} from '@/lib/local-price-observation-repository';
import {
  addLocalShoppingItem,
  listLocalShoppingItems,
} from '@/lib/local-shopping-item-repository';
import {
  finishLocalShoppingSession,
  startLocalShoppingSession,
} from '@/lib/local-shopping-session-repository';

function product(guestId: string, name: string) {
  return createLocalProduct(guestId, {
    name,
    brand: null,
    barcode: null,
    quantityValue: null,
    quantityUnit: null,
  });
}

function finishWithItem(
  guestId: string,
  storeId: string | null,
  productId: string | null,
  unitPrice: string | null,
  name = 'Producto',
) {
  const session = startLocalShoppingSession(guestId, storeId);
  addLocalShoppingItem(
    guestId,
    session.id,
    {
      productId,
      ...(productId ? {} : { productName: name, brand: null }),
      quantity: '1',
      unitPrice,
    },
    productId
      ? {
          id: productId,
          name,
          brand: null,
          barcode: null,
          quantityValue: null,
          quantityUnit: null,
        }
      : undefined,
  );
  return finishLocalShoppingSession(guestId, session.id);
}

describe('PriceObservation guest', () => {
  beforeEach(() => window.localStorage.clear());

  it('creates exact observation with ARS, Product, Store and finishedAt', () => {
    const guest = 'price-guest-a';
    const saved = product(guest, 'Yerba');
    const session = startLocalShoppingSession(guest, 'store-a');
    addLocalShoppingItem(
      guest,
      session.id,
      {
        productId: saved.id,
        quantity: '1',
        unitPrice: '1234.56',
      },
      saved,
    );
    const finished = finishLocalShoppingSession(guest, session.id);
    const [observation] = listLocalPriceObservations(guest, saved.id);
    expect(observation).toMatchObject({
      productId: saved.id,
      storeId: 'store-a',
      unitPrice: '1234.56',
      currency: 'ARS',
      source: 'shopping_session',
      observedAt: finished.finishedAt,
      shoppingSessionId: session.id,
    });
  });

  it('is idempotent and isolates guest IDs', () => {
    const saved = product('price-isolation-a', 'Leche');
    const finished = finishWithItem(
      'price-isolation-a',
      'store-a',
      saved.id,
      '10.00',
      saved.name,
    );
    expect(finished.finishedAt).not.toBeNull();
    expect(
      listLocalPriceObservations('price-isolation-a', saved.id),
    ).toHaveLength(1);
    expect(
      listLocalPriceObservations('price-isolation-a', saved.id),
    ).toHaveLength(1);
    expect(
      listLocalPriceObservations('price-isolation-b', saved.id),
    ).toHaveLength(0);
  });

  it('omits manual, no-price and no-store items', () => {
    finishWithItem('price-eligible', 'store-a', null, '10.00', 'Manual');
    const saved = product('price-eligible', 'Arroz');
    finishWithItem('price-eligible', 'store-a', saved.id, null, saved.name);
    finishWithItem('price-eligible', null, saved.id, '20.00', saved.name);
    expect(listLocalPriceObservations('price-eligible', saved.id)).toHaveLength(
      0,
    );
  });

  it('keeps multiple products and latest price per store separated', () => {
    const guest = 'price-multi';
    const first = product(guest, 'Producto A');
    const second = product(guest, 'Producto B');
    finishWithItem(guest, 'store-a', first.id, '100.00', first.name);
    finishWithItem(guest, 'store-b', first.id, '90.00', first.name);
    finishWithItem(guest, 'store-a', second.id, '50.00', second.name);
    const observations = listLocalPriceObservations(guest, first.id);
    expect(observations).toHaveLength(2);
    expect(new Set(observations.map((item) => item.storeId))).toEqual(
      new Set(['store-a', 'store-b']),
    );
    expect(getLatestLocalPricesByStore(guest, first.id)).toHaveLength(2);
    expect(getLatestLocalPricesByStore(guest, second.id)).toHaveLength(1);
  });

  it('does not alter ShoppingItems while creating observations', () => {
    const guest = 'price-integrity';
    const saved = product(guest, 'Fideos');
    const session = startLocalShoppingSession(guest, 'store-a');
    addLocalShoppingItem(
      guest,
      session.id,
      {
        productId: saved.id,
        quantity: '2',
        unitPrice: '999.90',
      },
      saved,
    );
    finishLocalShoppingSession(guest, session.id);
    expect(listLocalShoppingItems(guest, session.id)[0]).toMatchObject({
      quantity: '2',
      unitPrice: '999.90',
    });
  });
});
