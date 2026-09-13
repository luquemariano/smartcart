import { createHash } from 'node:crypto';
import { and, eq, isNull } from 'drizzle-orm';
import { db } from '@/db';
import {
  guestImports,
  products,
  shoppingItems,
  shoppingListItems,
  shoppingLists,
  shoppingSessions,
  stores,
} from '@/db/schema';
import {
  normalizeBarcode,
  normalizeProductPart,
  productDuplicateKey,
  productInputSchema,
} from '@/lib/product-validation';
import { normalizeStorePart, storeInputSchema } from '@/lib/store-validation';
import { guestImportSnapshotSchema } from '@/lib/guest-import-validation';
import { createPriceObservationsForSession } from '@/server/price-observations';

export class GuestImportAlreadyCompletedError extends Error {}
export class GuestImportActiveSessionConflictError extends Error {}
export class GuestImportDataError extends Error {}

export type GuestImportResult = {
  importStatus: 'imported';
  alreadyImported: false;
  stores: { imported: number; reused: number };
  products: { imported: number; reused: number };
  sessions: { imported: number; skipped: number; conflicted: number };
  itemsImported: number;
  listsImported: number;
  activeSessionConflict: false;
  warnings: string[];
};

function hashGuestId(guestId: string) {
  return createHash('sha256').update(guestId).digest('hex');
}
function date(value: string) {
  return new Date(value);
}
function foreignKeyCode(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === '23503'
  );
}

export async function importGuestSnapshot(
  userId: string,
  input: unknown,
): Promise<GuestImportResult> {
  const snapshot = guestImportSnapshotSchema.parse(input);
  const guestIdHash = hashGuestId(snapshot.guestId);
  const existing = await db
    .select({ id: guestImports.id })
    .from(guestImports)
    .where(
      and(
        eq(guestImports.ownerUserId, userId),
        eq(guestImports.guestIdHash, guestIdHash),
      ),
    )
    .limit(1);
  if (existing.length) throw new GuestImportAlreadyCompletedError();
  if (snapshot.sessions.some((entry) => entry.status === 'active')) {
    const [active] = await db
      .select({ id: shoppingSessions.id })
      .from(shoppingSessions)
      .where(
        and(
          eq(shoppingSessions.ownerUserId, userId),
          eq(shoppingSessions.status, 'active'),
        ),
      )
      .limit(1);
    if (active) throw new GuestImportActiveSessionConflictError();
  }

  try {
    return await db.transaction(async (tx) => {
      const [race] = await tx
        .select({ id: guestImports.id })
        .from(guestImports)
        .where(
          and(
            eq(guestImports.ownerUserId, userId),
            eq(guestImports.guestIdHash, guestIdHash),
          ),
        )
        .limit(1);
      if (race) throw new GuestImportAlreadyCompletedError();
      const storeMap = new Map<string, string>();
      const productMap = new Map<string, string>();
      const sessionMap = new Map<string, string>();
      const listMap = new Map<string, string>();
      let storesImported = 0;
      let storesReused = 0;
      let productsImported = 0;
      let productsReused = 0;
      let itemsImported = 0;
      let listsImported = 0;
      for (const source of snapshot.stores) {
        const parsed = storeInputSchema.parse({
          name: source.name,
          branchName: source.branchName,
          address: source.address,
          latitude: source.latitude,
          longitude: source.longitude,
        });
        const normalizedName = normalizeStorePart(parsed.name)!;
        const normalizedBranchName = normalizeStorePart(parsed.branchName);
        const [found] = await tx
          .select()
          .from(stores)
          .where(
            and(
              eq(stores.ownerUserId, userId),
              eq(stores.normalizedName, normalizedName),
              normalizedBranchName === null
                ? isNull(stores.normalizedBranchName)
                : eq(stores.normalizedBranchName, normalizedBranchName),
            ),
          )
          .limit(1);
        if (found) {
          storeMap.set(source.id, found.id);
          storesReused++;
        } else {
          const id = crypto.randomUUID();
          await tx.insert(stores).values({
            id,
            ownerUserId: userId,
            name: parsed.name,
            normalizedName,
            branchName: parsed.branchName,
            normalizedBranchName,
            address: parsed.address,
            latitude: parsed.latitude?.toString() ?? null,
            longitude: parsed.longitude?.toString() ?? null,
            createdAt: date(source.createdAt),
            updatedAt: date(source.updatedAt),
          });
          storeMap.set(source.id, id);
          storesImported++;
        }
      }
      for (const source of snapshot.products) {
        const parsed = productInputSchema.parse({
          name: source.name,
          brand: source.brand,
          barcode: source.barcode,
          quantityValue: source.quantityValue,
          quantityUnit: source.quantityUnit,
        });
        const barcode = normalizeBarcode(parsed.barcode);
        const duplicateKey = productDuplicateKey(parsed);
        const [found] = barcode
          ? await tx
              .select()
              .from(products)
              .where(
                and(
                  eq(products.ownerUserId, userId),
                  eq(products.normalizedBarcode, barcode),
                ),
              )
              .limit(1)
          : await tx
              .select()
              .from(products)
              .where(
                and(
                  eq(products.ownerUserId, userId),
                  eq(products.duplicateKey, duplicateKey),
                ),
              )
              .limit(1);
        if (found) {
          productMap.set(source.id, found.id);
          productsReused++;
        } else {
          const id = crypto.randomUUID();
          await tx.insert(products).values({
            id,
            ownerUserId: userId,
            name: parsed.name,
            normalizedName: normalizeProductPart(parsed.name)!,
            brand: parsed.brand,
            normalizedBrand: normalizeProductPart(parsed.brand),
            barcode: parsed.barcode,
            normalizedBarcode: barcode,
            quantityValue: parsed.quantityValue,
            quantityUnit: parsed.quantityUnit,
            duplicateKey,
            createdAt: date(source.createdAt),
            updatedAt: date(source.updatedAt),
          });
          productMap.set(source.id, id);
          productsImported++;
        }
      }
      for (const source of snapshot.sessions) {
        const id = crypto.randomUUID();
        await tx.insert(shoppingSessions).values({
          id,
          ownerUserId: userId,
          storeId: source.storeId
            ? (storeMap.get(source.storeId) ?? null)
            : null,
          status: source.status,
          budgetAmount: source.budgetAmount,
          currency: source.currency,
          startedAt: date(source.startedAt),
          finishedAt: source.finishedAt ? date(source.finishedAt) : null,
          createdAt: date(source.createdAt),
          updatedAt: date(source.updatedAt),
        });
        sessionMap.set(source.id, id);
      }
      for (const source of snapshot.sessions)
        for (const item of source.items) {
          const sessionId = sessionMap.get(item.shoppingSessionId);
          if (!sessionId)
            throw new GuestImportDataError(
              'La referencia de sesión guest no existe.',
            );
          const productId = item.productId
            ? productMap.get(item.productId)
            : null;
          if (item.productId && !productId)
            throw new GuestImportDataError(
              'La referencia de producto guest no existe.',
            );
          await tx.insert(shoppingItems).values({
            id: crypto.randomUUID(),
            shoppingSessionId: sessionId,
            productId,
            productName: item.productName,
            productBrand: item.productBrand,
            productBarcode: item.productBarcode,
            productQuantityValue: item.productQuantityValue,
            productQuantityUnit: item.productQuantityUnit,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            createdAt: date(item.createdAt),
            updatedAt: date(item.updatedAt),
          });
          itemsImported++;
        }
      for (const source of snapshot.sessions) {
        const importedSessionId = sessionMap.get(source.id);
        if (
          source.status === 'completed' &&
          importedSessionId &&
          source.finishedAt
        )
          await createPriceObservationsForSession(
            tx as unknown as typeof db,
            userId,
            importedSessionId,
            date(source.finishedAt),
          );
      }
      for (const source of snapshot.lists) {
        const id = crypto.randomUUID();
        await tx.insert(shoppingLists).values({
          id,
          ownerUserId: userId,
          name: source.name,
          createdAt: date(source.createdAt),
          updatedAt: date(source.updatedAt),
        });
        listMap.set(source.id, id);
        listsImported++;
      }
      for (const source of snapshot.lists)
        for (const item of source.items) {
          const listId = listMap.get(item.shoppingListId);
          if (!listId)
            throw new GuestImportDataError(
              'La referencia de lista guest no existe.',
            );
          const productId = item.productId
            ? productMap.get(item.productId)
            : null;
          if (item.productId && !productId)
            throw new GuestImportDataError(
              'La referencia de producto guest no existe.',
            );
          await tx.insert(shoppingListItems).values({
            id: crypto.randomUUID(),
            shoppingListId: listId,
            productId,
            productName: item.productName,
            productBrand: item.productBrand,
            productBarcode: item.productBarcode,
            productQuantityValue: item.productQuantityValue,
            productQuantityUnit: item.productQuantityUnit,
            quantity: item.quantity,
            isChecked: item.isChecked,
            createdAt: date(item.createdAt),
            updatedAt: date(item.updatedAt),
          });
          itemsImported++;
        }
      await tx.insert(guestImports).values({
        id: crypto.randomUUID(),
        ownerUserId: userId,
        guestIdHash,
        version: snapshot.version,
        metadata: {
          stores: storeMap.size,
          products: productMap.size,
          sessions: sessionMap.size,
          lists: listMap.size,
        },
      });
      return {
        importStatus: 'imported',
        alreadyImported: false,
        stores: { imported: storesImported, reused: storesReused },
        products: { imported: productsImported, reused: productsReused },
        sessions: {
          imported: snapshot.sessions.length,
          skipped: 0,
          conflicted: 0,
        },
        itemsImported,
        listsImported,
        activeSessionConflict: false,
        warnings: [],
      };
    });
  } catch (error) {
    if (
      error instanceof GuestImportAlreadyCompletedError ||
      error instanceof GuestImportActiveSessionConflictError ||
      error instanceof GuestImportDataError
    )
      throw error;
    if (foreignKeyCode(error))
      throw new GuestImportDataError(
        'Los datos guest contienen una referencia inválida.',
      );
    throw error;
  }
}
