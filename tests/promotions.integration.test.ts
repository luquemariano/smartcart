// @vitest-environment node
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { db } from '@/db';
import { guestImports, products, promotions, stores } from '@/db/schema';
import {
  importGuestSnapshot,
  GuestImportAlreadyCompletedError,
} from '@/server/guest-import';
import {
  createPromotion,
  deletePromotion,
  getPromotion,
  listPromotions,
  updatePromotion,
} from '@/server/promotions';
import { deleteProduct, ProductReferencedError } from '@/server/products';
import { deleteStore, StoreReferencedError } from '@/server/stores';
import { createStore } from '@/server/stores';
import { createProduct } from '@/server/products';

const enabled = Boolean(process.env.DATABASE_URL);
const ownerId = `f16-integration-${crypto.randomUUID()}`;
const guestId = crypto.randomUUID();
const now = new Date().toISOString();
const storeSourceId = crypto.randomUUID();
const productSourceId = crypto.randomUUID();
const promotionSourceId = crypto.randomUUID();
const snapshot = {
  guestId,
  version: 1 as const,
  stores: [
    {
      id: storeSourceId,
      name: 'F16 Import Store',
      branchName: null,
      address: null,
      latitude: null,
      longitude: null,
      createdAt: now,
      updatedAt: now,
    },
  ],
  products: [
    {
      id: productSourceId,
      name: 'F16 Import Product',
      brand: null,
      barcode: null,
      quantityValue: null,
      quantityUnit: null,
      createdAt: now,
      updatedAt: now,
    },
  ],
  sessions: [],
  lists: [],
  promotions: [
    {
      id: promotionSourceId,
      guestId,
      productId: productSourceId,
      storeId: storeSourceId,
      type: 'percentage' as const,
      value: '20.00',
      buyQuantity: null,
      payQuantity: null,
      startsAt: new Date(Date.now() - 86400000).toISOString(),
      endsAt: new Date(Date.now() + 86400000).toISOString(),
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
  ],
};
async function counts() {
  const [s, p, r, g] = await Promise.all([
    db
      .select({ id: stores.id })
      .from(stores)
      .where(eq(stores.ownerUserId, ownerId)),
    db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.ownerUserId, ownerId)),
    db
      .select({ id: promotions.id })
      .from(promotions)
      .where(eq(promotions.ownerUserId, ownerId)),
    db
      .select({ id: guestImports.id })
      .from(guestImports)
      .where(eq(guestImports.ownerUserId, ownerId)),
  ]);
  return {
    stores: s.length,
    products: p.length,
    promotions: r.length,
    guest_imports: g.length,
  };
}

describe.skipIf(!enabled)('F16 PostgreSQL integration', () => {
  beforeAll(async () => {
    await db.delete(guestImports).where(eq(guestImports.ownerUserId, ownerId));
  });
  afterAll(async () => {
    await db.delete(promotions).where(eq(promotions.ownerUserId, ownerId));
    await db.delete(products).where(eq(products.ownerUserId, ownerId));
    await db.delete(stores).where(eq(stores.ownerUserId, ownerId));
    await db.delete(guestImports).where(eq(guestImports.ownerUserId, ownerId));
  });
  it('imports Promotion once and preserves counts on retry', async () => {
    await importGuestSnapshot(ownerId, snapshot);
    const first = await counts();
    expect(first).toEqual({
      stores: 1,
      products: 1,
      promotions: 1,
      guest_imports: 1,
    });
    const [store] = await db
      .select()
      .from(stores)
      .where(eq(stores.ownerUserId, ownerId));
    const [product] = await db
      .select()
      .from(products)
      .where(eq(products.ownerUserId, ownerId));
    const [promotion] = await db
      .select()
      .from(promotions)
      .where(eq(promotions.ownerUserId, ownerId));
    expect(promotion).toMatchObject({
      ownerUserId: ownerId,
      storeId: store.id,
      productId: product.id,
      type: 'percentage',
      value: '20.00',
    });
    await expect(importGuestSnapshot(ownerId, snapshot)).rejects.toBeInstanceOf(
      GuestImportAlreadyCompletedError,
    );
    await expect(counts()).resolves.toEqual(first);
  });
  it('performs real CRUD ownership and protects Product/Store deletion', async () => {
    const store = await createStore(ownerId, {
      name: 'CRUD Store',
      branchName: null,
      address: null,
      latitude: null,
      longitude: null,
    });
    const product = await createProduct(ownerId, {
      name: 'CRUD Product',
      brand: null,
      barcode: null,
      quantityValue: null,
      quantityUnit: null,
    });
    const input = {
      storeId: store.id,
      productId: product.id,
      type: 'percentage' as const,
      value: '10.00',
      startsAt: new Date(Date.now() - 1000),
      endsAt: new Date(Date.now() + 86400000),
      isActive: true,
    };
    const created = await createPromotion(ownerId, input);
    expect(
      (await listPromotions(ownerId)).some((p) => p.id === created.id),
    ).toBe(true);
    expect((await getPromotion(ownerId, created.id)).value).toBe('10.00');
    await updatePromotion(ownerId, created.id, {
      ...input,
      type: 'fixed_price',
      value: '850.00',
    });
    expect((await getPromotion(ownerId, created.id)).type).toBe('fixed_price');
    await expect(
      getPromotion('other-owner', created.id),
    ).rejects.toBeInstanceOf(Error);
    await expect(deleteProduct(ownerId, product.id)).rejects.toBeInstanceOf(
      ProductReferencedError,
    );
    await expect(deleteStore(ownerId, store.id)).rejects.toBeInstanceOf(
      StoreReferencedError,
    );
    await deletePromotion(ownerId, created.id);
    await deleteProduct(ownerId, product.id);
    await deleteStore(ownerId, store.id);
  });
});
