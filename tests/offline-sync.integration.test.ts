// @vitest-environment node
import { and, eq, inArray } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

const auth = vi.hoisted(() => ({ user: { id: `f17-${crypto.randomUUID()}` } }));
vi.mock('@/lib/server-session', () => ({
  getServerSession: async () => ({ user: auth.user }),
}));

import { db } from '@/db';
import {
  clientOperations,
  priceObservations,
  products,
  shoppingItems,
  shoppingSessions,
  stores,
} from '@/db/schema';
import { createProduct } from '@/server/products';
import { createStore } from '@/server/stores';
import { startShoppingSession } from '@/server/shopping-sessions';
import { POST } from '@/app/api/offline/sync/route';

const owner = auth.user.id;
const id = () => crypto.randomUUID();
const op = (
  type: string,
  payload: Record<string, unknown>,
  extra: Record<string, unknown> = {},
) => ({ clientOperationId: id(), type, payload, ...extra });

describe.skipIf(!process.env.DATABASE_URL)(
  'F17 offline sync PostgreSQL',
  () => {
    let storeId: string;
    let productId: string;
    let sessionId: string;
    let itemLocalId: string;
    let productLocalId: string;
    let batch: Array<Record<string, unknown>>;

    beforeAll(async () => {
      const store = await createStore(owner, {
        name: 'F17 Store',
        branchName: null,
        address: null,
        latitude: null,
        longitude: null,
      });
      storeId = store.id;
      const product = await createProduct(owner, {
        name: 'F17 Existing',
        brand: null,
        barcode: '779000000001',
        quantityValue: null,
        quantityUnit: null,
      });
      productId = product.id;
      const session = await startShoppingSession(owner, {
        storeId,
        budgetAmount: null,
      });
      sessionId = session.id;
      itemLocalId = id();
      productLocalId = id();
      batch = [
        op(
          'shopping_item_create',
          {
            sessionId,
            input: { productId, quantity: '1', unitPrice: '100.00' },
          },
          { localEntityId: itemLocalId },
        ),
        op('shopping_item_update', {
          itemId: itemLocalId,
          patch: { quantity: '2', unitPrice: '110.00' },
        }),
        op(
          'product_create',
          {
            name: 'F17 Offline',
            brand: 'Test',
            barcode: '779000000002',
            quantityValue: null,
            quantityUnit: null,
          },
          { localEntityId: productLocalId },
        ),
        op(
          'shopping_item_create',
          {
            sessionId,
            input: {
              productId: productLocalId,
              quantity: '3',
              unitPrice: '25.50',
            },
          },
          { localEntityId: id() },
        ),
        op('shopping_session_finish', { sessionId }),
      ];
    });

    afterAll(async () => {
      await db
        .delete(priceObservations)
        .where(eq(priceObservations.ownerUserId, owner));
      await db
        .delete(clientOperations)
        .where(eq(clientOperations.ownerUserId, owner));
      await db
        .delete(shoppingItems)
        .where(inArray(shoppingItems.shoppingSessionId, [sessionId]));
      await db
        .delete(shoppingSessions)
        .where(eq(shoppingSessions.ownerUserId, owner));
      await db.delete(products).where(eq(products.ownerUserId, owner));
      await db.delete(stores).where(eq(stores.ownerUserId, owner));
    });

    it('applies the batch atomically, maps local item/product IDs and makes retry idempotent', async () => {
      const request = () =>
        new Request('http://localhost/api/offline/sync', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ operations: batch }),
        });
      const first = await POST(request());
      expect(first.status).toBe(200);
      expect(
        (await first.json()).results.every(
          (result: { status: string }) => result.status === 'applied',
        ),
      ).toBe(true);
      const firstItems = await db
        .select()
        .from(shoppingItems)
        .where(eq(shoppingItems.shoppingSessionId, sessionId));
      expect(firstItems).toHaveLength(2);
      expect(
        firstItems.find((item) => item.productId === productId)?.quantity,
      ).toBe('2.000');
      expect(
        (
          await db
            .select()
            .from(shoppingSessions)
            .where(eq(shoppingSessions.id, sessionId))
        )[0].status,
      ).toBe('completed');
      expect(
        await db
          .select()
          .from(priceObservations)
          .where(eq(priceObservations.ownerUserId, owner)),
      ).toHaveLength(2);
      const second = await POST(request());
      expect(
        (await second.json()).results.every(
          (result: { status: string }) => result.status === 'already_applied',
        ),
      ).toBe(true);
      expect(
        await db
          .select()
          .from(shoppingItems)
          .where(eq(shoppingItems.shoppingSessionId, sessionId)),
      ).toHaveLength(2);
      expect(
        await db
          .select()
          .from(clientOperations)
          .where(eq(clientOperations.ownerUserId, owner)),
      ).toHaveLength(5);
    });

    it('does not leave an idempotency row after a failed mutation', async () => {
      const operationId = id();
      const response = await POST(
        new Request('http://localhost/api/offline/sync', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            operations: [
              op(
                'shopping_item_update',
                { itemId: id(), patch: { quantity: '2' } },
                { clientOperationId: operationId },
              ),
            ],
          }),
        }),
      );
      expect(response.status).toBe(200);
      expect(
        await db
          .select()
          .from(clientOperations)
          .where(
            and(
              eq(clientOperations.ownerUserId, owner),
              eq(clientOperations.operationId, operationId),
            ),
          ),
      ).toHaveLength(0);
    });

    it('handles two concurrent requests with the same operationId idempotently', async () => {
      const operationId = id();
      const operation = op(
        'product_create',
        {
          name: 'F17 Concurrent',
          brand: null,
          barcode: '779000000003',
          quantityValue: null,
          quantityUnit: null,
        },
        { clientOperationId: operationId, localEntityId: id() },
      );
      const request = () =>
        new Request('http://localhost/api/offline/sync', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ operations: [operation] }),
        });
      const [left, right] = await Promise.all([
        POST(request()),
        POST(request()),
      ]);
      const statuses = [
        (await left.json()).results[0].status,
        (await right.json()).results[0].status,
      ].sort();
      expect(statuses).toEqual(['already_applied', 'applied']);
      expect(
        await db
          .select()
          .from(products)
          .where(
            and(
              eq(products.ownerUserId, owner),
              eq(products.barcode, '779000000003'),
            ),
          ),
      ).toHaveLength(1);
      expect(
        await db
          .select()
          .from(clientOperations)
          .where(
            and(
              eq(clientOperations.ownerUserId, owner),
              eq(clientOperations.operationId, operationId),
            ),
          ),
      ).toHaveLength(1);
    });
  },
);
