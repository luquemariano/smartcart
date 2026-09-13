import { and, asc, desc, eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { products, shoppingListItems, shoppingLists } from '@/db/schema';
import { addShoppingItem } from '@/server/shopping-items';
import {
  getActiveShoppingSession,
  startShoppingSession,
} from '@/server/shopping-sessions';
import { getProduct } from '@/server/products';
import {
  shoppingListNameSchema,
  shoppingListItemInputSchema,
  shoppingListItemPatchSchema,
  shoppingItemQuantitySchema,
} from '@/lib/shopping-list-validation';

export class ShoppingListNotFoundError extends Error {}
export class ShoppingListProductError extends Error {}
export class ShoppingListItemNotFoundError extends Error {}
export class ShoppingListDuplicateError extends Error {}
function normalizedListName(name: string) {
  return name.trim().replace(/\s+/g, ' ').toLocaleLowerCase('es-AR');
}

export async function getShoppingList(userId: string, listId: string) {
  const [list] = await db
    .select()
    .from(shoppingLists)
    .where(
      and(eq(shoppingLists.id, listId), eq(shoppingLists.ownerUserId, userId)),
    )
    .limit(1);
  if (!list) throw new ShoppingListNotFoundError();
  return list;
}
export async function listShoppingLists(userId: string) {
  const rows = await db
    .select({
      list: shoppingLists,
      itemCount: sql<number>`count(${shoppingListItems.id})`,
    })
    .from(shoppingLists)
    .leftJoin(
      shoppingListItems,
      eq(shoppingListItems.shoppingListId, shoppingLists.id),
    )
    .where(eq(shoppingLists.ownerUserId, userId))
    .groupBy(shoppingLists.id)
    .orderBy(desc(shoppingLists.updatedAt));
  return rows.map(({ list, itemCount }) => ({
    ...list,
    itemCount: Number(itemCount),
  }));
}
export async function getShoppingListDetail(userId: string, listId: string) {
  return {
    list: await getShoppingList(userId, listId),
    items: await db
      .select()
      .from(shoppingListItems)
      .where(eq(shoppingListItems.shoppingListId, listId))
      .orderBy(asc(shoppingListItems.createdAt)),
  };
}
export async function createShoppingList(userId: string, input: unknown) {
  const name = shoppingListNameSchema.parse(input);
  const existing = await db
    .select({ name: shoppingLists.name })
    .from(shoppingLists)
    .where(eq(shoppingLists.ownerUserId, userId));
  if (
    existing.some(
      (list) => normalizedListName(list.name) === normalizedListName(name),
    )
  )
    throw new ShoppingListDuplicateError();
  const [list] = await db
    .insert(shoppingLists)
    .values({ id: crypto.randomUUID(), ownerUserId: userId, name })
    .returning();
  return list;
}
export async function updateShoppingList(
  userId: string,
  listId: string,
  input: unknown,
) {
  const name = shoppingListNameSchema.parse(input);
  await getShoppingList(userId, listId);
  const [list] = await db
    .update(shoppingLists)
    .set({ name, updatedAt: new Date() })
    .where(
      and(eq(shoppingLists.id, listId), eq(shoppingLists.ownerUserId, userId)),
    )
    .returning();
  return list;
}
export async function deleteShoppingList(userId: string, listId: string) {
  await getShoppingList(userId, listId);
  await db
    .delete(shoppingLists)
    .where(
      and(eq(shoppingLists.id, listId), eq(shoppingLists.ownerUserId, userId)),
    );
}
function productSnapshot(product: typeof products.$inferSelect) {
  return {
    productId: product.id,
    productName: product.name,
    productBrand: product.brand,
    productBarcode: product.barcode,
    productQuantityValue: product.quantityValue,
    productQuantityUnit: product.quantityUnit,
  };
}
export async function addShoppingListItem(
  userId: string,
  listId: string,
  input: unknown,
) {
  await getShoppingList(userId, listId);
  const parsed = shoppingListItemInputSchema.parse(input);
  const catalog =
    parsed.productId === null
      ? null
      : await getProduct(userId, parsed.productId).catch(() => {
          throw new ShoppingListProductError();
        });
  const snapshot = catalog
    ? productSnapshot(catalog)
    : {
        productId: null,
        productName: parsed.productName!,
        productBrand: parsed.brand ?? null,
        productBarcode: parsed.barcode ?? null,
        productQuantityValue: parsed.quantityValue ?? null,
        productQuantityUnit: parsed.quantityUnit ?? null,
      };
  if (catalog) {
    const [existing] = await db
      .select()
      .from(shoppingListItems)
      .where(
        and(
          eq(shoppingListItems.shoppingListId, listId),
          eq(shoppingListItems.productId, catalog.id),
        ),
      )
      .limit(1);
    if (existing) {
      const [updated] = await db
        .update(shoppingListItems)
        .set({
          quantity: sql`${shoppingListItems.quantity} + cast(${parsed.quantity} as numeric)`,
          updatedAt: new Date(),
        })
        .where(eq(shoppingListItems.id, existing.id))
        .returning();
      await db
        .update(shoppingLists)
        .set({ updatedAt: new Date() })
        .where(eq(shoppingLists.id, listId));
      return updated;
    }
  }
  const now = new Date();
  const [item] = await db
    .insert(shoppingListItems)
    .values({
      id: crypto.randomUUID(),
      shoppingListId: listId,
      ...snapshot,
      quantity: parsed.quantity,
      isChecked: false,
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  await db
    .update(shoppingLists)
    .set({ updatedAt: now })
    .where(eq(shoppingLists.id, listId));
  return item;
}
async function ownedItem(userId: string, itemId: string) {
  const [row] = await db
    .select({ item: shoppingListItems, list: shoppingLists })
    .from(shoppingListItems)
    .innerJoin(
      shoppingLists,
      eq(shoppingLists.id, shoppingListItems.shoppingListId),
    )
    .where(
      and(
        eq(shoppingListItems.id, itemId),
        eq(shoppingLists.ownerUserId, userId),
      ),
    )
    .limit(1);
  if (!row) throw new ShoppingListItemNotFoundError();
  return row;
}
export async function updateShoppingListItem(
  userId: string,
  itemId: string,
  input: unknown,
) {
  const parsed = shoppingListItemPatchSchema.parse(input);
  await ownedItem(userId, itemId);
  const quantity =
    parsed.quantity === undefined
      ? undefined
      : shoppingItemQuantitySchema.parse({ quantity: parsed.quantity })
          .quantity;
  const [item] = await db
    .update(shoppingListItems)
    .set({
      ...(quantity === undefined ? {} : { quantity }),
      ...(parsed.isChecked === undefined
        ? {}
        : { isChecked: parsed.isChecked }),
      updatedAt: new Date(),
    })
    .where(eq(shoppingListItems.id, itemId))
    .returning();
  return item;
}
export async function deleteShoppingListItem(userId: string, itemId: string) {
  const row = await ownedItem(userId, itemId);
  await db.delete(shoppingListItems).where(eq(shoppingListItems.id, itemId));
  await db
    .update(shoppingLists)
    .set({ updatedAt: new Date() })
    .where(eq(shoppingLists.id, row.list.id));
}
export async function resetShoppingList(userId: string, listId: string) {
  await getShoppingList(userId, listId);
  await db
    .update(shoppingListItems)
    .set({ isChecked: false, updatedAt: new Date() })
    .where(eq(shoppingListItems.shoppingListId, listId));
}
export async function duplicateShoppingList(
  userId: string,
  listId: string,
  name?: string,
) {
  const detail = await getShoppingListDetail(userId, listId);
  const [copy] = await db
    .insert(shoppingLists)
    .values({
      id: crypto.randomUUID(),
      ownerUserId: userId,
      name: shoppingListNameSchema.parse(name ?? `${detail.list.name} copia`),
    })
    .returning();
  for (const item of detail.items)
    await db.insert(shoppingListItems).values({
      id: crypto.randomUUID(),
      shoppingListId: copy.id,
      productId: item.productId,
      productName: item.productName,
      productBrand: item.productBrand,
      productBarcode: item.productBarcode,
      productQuantityValue: item.productQuantityValue,
      productQuantityUnit: item.productQuantityUnit,
      quantity: item.quantity,
      isChecked: false,
    });
  return getShoppingListDetail(userId, copy.id);
}
export async function addListToActiveShoppingSession(
  userId: string,
  listId: string,
) {
  const session = await getActiveShoppingSession(userId);
  if (!session) throw new Error('NO_ACTIVE_SESSION');
  const detail = await getShoppingListDetail(userId, listId);
  for (const item of detail.items)
    await addShoppingItem(
      userId,
      session.id,
      item.productId
        ? {
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: null,
          }
        : {
            productId: null,
            productName: item.productName,
            brand: item.productBrand,
            barcode: item.productBarcode,
            quantityValue: item.productQuantityValue,
            quantityUnit: item.productQuantityUnit,
            quantity: item.quantity,
            unitPrice: null,
          },
    );
  return session;
}

export async function startShoppingSessionFromList(
  userId: string,
  listId: string,
  input: { storeId?: string | null; budgetAmount?: string | null } = {},
) {
  const session = await startShoppingSession(userId, {
    storeId: input.storeId ?? null,
    budgetAmount: input.budgetAmount ?? null,
  });
  const detail = await getShoppingListDetail(userId, listId);
  for (const item of detail.items)
    await addShoppingItem(
      userId,
      session.id,
      item.productId
        ? {
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: null,
          }
        : {
            productId: null,
            productName: item.productName,
            brand: item.productBrand,
            barcode: item.productBarcode,
            quantityValue: item.productQuantityValue,
            quantityUnit: item.productQuantityUnit,
            quantity: item.quantity,
            unitPrice: null,
          },
    );
  return session;
}
