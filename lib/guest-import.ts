import { getPendingGuestShoppingItems } from '@/lib/local-shopping-item-repository';
import { getPendingGuestShoppingLists } from '@/lib/local-shopping-list-repository';
import { getPendingGuestProducts } from '@/lib/local-product-repository';
import { getPendingGuestShoppingSessions } from '@/lib/local-shopping-session-repository';
import { getPendingGuestIdentity } from '@/lib/guest-identity';
import { getPendingGuestStores } from '@/lib/local-store-repository';
import { clearGuestStoresAfterImport } from '@/lib/local-store-repository';
import { clearGuestProductsAfterImport } from '@/lib/local-product-repository';
import { clearGuestShoppingSessionsAfterImport } from '@/lib/local-shopping-session-repository';
import { clearGuestShoppingItemsAfterImport } from '@/lib/local-shopping-item-repository';
import { clearGuestShoppingListsAfterImport } from '@/lib/local-shopping-list-repository';
import { clearGuestIdentityAfterImport } from '@/lib/guest-identity';
import { clearGuestPriceObservationsAfterImport } from '@/lib/local-price-observation-repository';
import {
  clearGuestPromotionsAfterImport,
  getPendingGuestPromotions,
} from '@/lib/local-promotion-repository';

export function buildGuestImportSnapshot(guestId: string) {
  const allItems = getPendingGuestShoppingItems(guestId);
  const sessions = getPendingGuestShoppingSessions(guestId);
  return {
    guestId,
    version: 1 as const,
    stores: getPendingGuestStores(guestId),
    products: getPendingGuestProducts(guestId),
    sessions: sessions.map((session) => ({
      ...session,
      items: allItems.filter((item) => item.shoppingSessionId === session.id),
    })),
    lists: getPendingGuestShoppingLists(guestId),
    promotions: getPendingGuestPromotions(guestId),
  };
}
export function getPendingGuestImportSnapshot() {
  const guestId = getPendingGuestIdentity();
  return guestId ? buildGuestImportSnapshot(guestId) : null;
}
export function hasPendingGuestImportData() {
  const snapshot = getPendingGuestImportSnapshot();
  return Boolean(
    snapshot &&
    (snapshot.stores.length ||
      snapshot.products.length ||
      snapshot.sessions.length ||
      snapshot.lists.length ||
      snapshot.promotions.length),
  );
}
export async function importGuestData() {
  const snapshot = getPendingGuestImportSnapshot();
  if (!snapshot) return { importStatus: 'empty' as const };
  const response = await fetch('/api/guest-import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(snapshot),
  });
  const result = await response.json();
  if (!response.ok && result.importStatus !== 'conflict')
    throw new Error(result.error ?? 'No pudimos importar tus datos guest.');
  if (
    result.importStatus === 'imported' ||
    result.importStatus === 'already_imported'
  ) {
    clearGuestStoresAfterImport(snapshot.guestId);
    clearGuestProductsAfterImport(snapshot.guestId);
    clearGuestShoppingSessionsAfterImport(snapshot.guestId);
    clearGuestShoppingItemsAfterImport(snapshot.guestId);
    clearGuestShoppingListsAfterImport(snapshot.guestId);
    clearGuestPriceObservationsAfterImport(snapshot.guestId);
    clearGuestPromotionsAfterImport(snapshot.guestId);
    clearGuestIdentityAfterImport();
  }
  return { ...result, responseOk: response.ok, snapshot };
}
