// @vitest-environment node

import { and, eq, inArray } from 'drizzle-orm';
import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { db } from '@/db';
import {
  guestImports,
  priceObservations,
  products,
  shoppingItems,
  shoppingListItems,
  shoppingLists,
  shoppingSessions,
  stores,
} from '@/db/schema';
import {
  GuestImportAlreadyCompletedError,
  importGuestSnapshot,
} from '@/server/guest-import';

const runIntegration = Boolean(process.env.DATABASE_URL);
const ownerId = `f14-integration-owner-${crypto.randomUUID()}`;
const guestId = crypto.randomUUID();
const now = new Date().toISOString();
const storeId = crypto.randomUUID();
const productId = crypto.randomUUID();
const sessionId = crypto.randomUUID();
const itemId = crypto.randomUUID();
const listId = crypto.randomUUID();
const listItemId = crypto.randomUUID();

const snapshot = {
  guestId,
  version: 1 as const,
  stores: [
    {
      id: storeId,
      name: 'F14 Integration Store',
      branchName: 'Main',
      address: null,
      latitude: null,
      longitude: null,
      createdAt: now,
      updatedAt: now,
    },
  ],
  products: [
    {
      id: productId,
      name: 'F14 Integration Product',
      brand: 'Test',
      barcode: '7791234567890',
      quantityValue: null,
      quantityUnit: null,
      createdAt: now,
      updatedAt: now,
    },
  ],
  sessions: [
    {
      id: sessionId,
      storeId,
      status: 'completed' as const,
      budgetAmount: null,
      currency: 'ARS',
      startedAt: now,
      finishedAt: now,
      createdAt: now,
      updatedAt: now,
      items: [
        {
          id: itemId,
          shoppingSessionId: sessionId,
          productId,
          productName: 'F14 Integration Product',
          productBrand: 'Test',
          productBarcode: '7791234567890',
          productQuantityValue: null,
          productQuantityUnit: null,
          quantity: '1',
          unitPrice: '1234.56',
          createdAt: now,
          updatedAt: now,
        },
      ],
    },
  ],
  lists: [
    {
      id: listId,
      name: 'F14 Integration List',
      createdAt: now,
      updatedAt: now,
      items: [
        {
          id: listItemId,
          shoppingListId: listId,
          productId,
          productName: 'F14 Integration Product',
          productBrand: 'Test',
          productBarcode: '7791234567890',
          productQuantityValue: null,
          productQuantityUnit: null,
          quantity: '1',
          isChecked: false,
          createdAt: now,
          updatedAt: now,
        },
      ],
    },
  ],
};

async function counts() {
  const sessionRows = await db
    .select({ id: shoppingSessions.id })
    .from(shoppingSessions)
    .where(eq(shoppingSessions.ownerUserId, ownerId));
  const sessionIds = sessionRows.map((row) => row.id);
  const listRows = await db
    .select({ id: shoppingLists.id })
    .from(shoppingLists)
    .where(eq(shoppingLists.ownerUserId, ownerId));
  const listIds = listRows.map((row) => row.id);
  const [
    store,
    product,
    sessions,
    items,
    lists,
    listItems,
    observations,
    imports,
  ] = await Promise.all([
    db
      .select({ id: stores.id })
      .from(stores)
      .where(eq(stores.ownerUserId, ownerId)),
    db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.ownerUserId, ownerId)),
    Promise.resolve(sessionRows),
    sessionIds.length
      ? db
          .select({ id: shoppingItems.id })
          .from(shoppingItems)
          .where(inArray(shoppingItems.shoppingSessionId, sessionIds))
      : Promise.resolve([]),
    Promise.resolve(listRows),
    listIds.length
      ? db
          .select({ id: shoppingListItems.id })
          .from(shoppingListItems)
          .where(inArray(shoppingListItems.shoppingListId, listIds))
      : Promise.resolve([]),
    db
      .select({ id: priceObservations.id })
      .from(priceObservations)
      .where(eq(priceObservations.ownerUserId, ownerId)),
    db
      .select({ id: guestImports.id })
      .from(guestImports)
      .where(eq(guestImports.ownerUserId, ownerId)),
  ]);
  return {
    stores: store.length,
    products: product.length,
    sessions: sessions.length,
    items: items.length,
    lists: lists.length,
    listItems: listItems.length,
    observations: observations.length,
    imports: imports.length,
  };
}

describe.skipIf(!runIntegration)(
  'F12 guest import and PriceObservation integration',
  () => {
    beforeAll(async () => {
      await db
        .delete(guestImports)
        .where(eq(guestImports.ownerUserId, ownerId));
    });

    afterAll(async () => {
      const sessionRows = await db
        .select({ id: shoppingSessions.id })
        .from(shoppingSessions)
        .where(eq(shoppingSessions.ownerUserId, ownerId));
      const listRows = await db
        .select({ id: shoppingLists.id })
        .from(shoppingLists)
        .where(eq(shoppingLists.ownerUserId, ownerId));
      await db
        .delete(priceObservations)
        .where(eq(priceObservations.ownerUserId, ownerId));
      if (sessionRows.length)
        await db.delete(shoppingItems).where(
          inArray(
            shoppingItems.shoppingSessionId,
            sessionRows.map((row) => row.id),
          ),
        );
      if (listRows.length)
        await db.delete(shoppingListItems).where(
          inArray(
            shoppingListItems.shoppingListId,
            listRows.map((row) => row.id),
          ),
        );
      await db
        .delete(shoppingLists)
        .where(eq(shoppingLists.ownerUserId, ownerId));
      await db
        .delete(shoppingSessions)
        .where(eq(shoppingSessions.ownerUserId, ownerId));
      await db.delete(products).where(eq(products.ownerUserId, ownerId));
      await db.delete(stores).where(eq(stores.ownerUserId, ownerId));
      await db
        .delete(guestImports)
        .where(eq(guestImports.ownerUserId, ownerId));
    });

    it('imports all entities, reconstructs one observation and keeps counts on retry', async () => {
      const first = await importGuestSnapshot(ownerId, snapshot);
      expect(first.importStatus).toBe('imported');
      const firstCounts = await counts();
      expect(firstCounts).toEqual({
        stores: 1,
        products: 1,
        sessions: 1,
        items: 1,
        lists: 1,
        listItems: 1,
        observations: 1,
        imports: 1,
      });
      const [importedProduct] = await db
        .select({ id: products.id })
        .from(products)
        .where(eq(products.ownerUserId, ownerId));
      const [importedStore] = await db
        .select({ id: stores.id })
        .from(stores)
        .where(eq(stores.ownerUserId, ownerId));
      const [importedSession] = await db
        .select({ id: shoppingSessions.id })
        .from(shoppingSessions)
        .where(eq(shoppingSessions.ownerUserId, ownerId));
      const [importedItem] = await db
        .select({ id: shoppingItems.id })
        .from(shoppingItems)
        .where(eq(shoppingItems.shoppingSessionId, importedSession.id));
      const [observation] = await db
        .select()
        .from(priceObservations)
        .where(
          and(
            eq(priceObservations.ownerUserId, ownerId),
            eq(priceObservations.shoppingItemId, importedItem.id),
          ),
        );
      expect(observation).toMatchObject({
        productId: importedProduct.id,
        storeId: importedStore.id,
        shoppingSessionId: importedSession.id,
        shoppingItemId: importedItem.id,
        unitPrice: '1234.56',
        currency: 'ARS',
        source: 'shopping_session',
      });
      expect(observation.observedAt.toISOString()).toBe(now);

      await expect(
        importGuestSnapshot(ownerId, snapshot),
      ).rejects.toBeInstanceOf(GuestImportAlreadyCompletedError);
      await expect(counts()).resolves.toEqual(firstCounts);
    });
  },
);
