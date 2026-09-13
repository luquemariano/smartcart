import {
  listLocalShoppingItems,
  type LocalShoppingItem,
} from '@/lib/local-shopping-item-repository';
import type { LocalShoppingSession } from '@/lib/local-shopping-session-repository';

export type LocalPriceObservation = {
  id: string;
  guestId: string;
  productId: string;
  storeId: string;
  unitPrice: string;
  currency: string;
  observedAt: string;
  source: 'shopping_session';
  shoppingSessionId: string;
  shoppingItemId: string;
  createdAt: string;
};

const PREFIX = 'smartcart_guest_price_observations_v1:';
function key(guestId: string) {
  return `${PREFIX}${guestId}`;
}
function read(guestId: string): LocalPriceObservation[] {
  if (typeof window === 'undefined') return [];
  try {
    const value = JSON.parse(window.localStorage.getItem(key(guestId)) ?? '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}
function write(guestId: string, value: LocalPriceObservation[]) {
  window.localStorage.setItem(key(guestId), JSON.stringify(value));
}

export function createLocalPriceObservationsForSession(
  guestId: string,
  session: LocalShoppingSession,
): number {
  if (session.status !== 'completed' || !session.storeId || !session.finishedAt)
    return 0;
  const existing = read(guestId);
  const known = new Set(
    existing.map((observation) => observation.shoppingItemId),
  );
  const eligible = listLocalShoppingItems(guestId, session.id).filter(
    (item) => item.productId && item.unitPrice && !known.has(item.id),
  );
  const created = eligible.map((item) =>
    observationFromItem(guestId, session, item),
  );
  if (created.length) write(guestId, [...existing, ...created]);
  return created.length;
}

function observationFromItem(
  guestId: string,
  session: LocalShoppingSession,
  item: LocalShoppingItem,
): LocalPriceObservation {
  return {
    id: crypto.randomUUID(),
    guestId,
    productId: item.productId!,
    storeId: session.storeId!,
    unitPrice: item.unitPrice!,
    currency: session.currency,
    observedAt: session.finishedAt!,
    source: 'shopping_session',
    shoppingSessionId: session.id,
    shoppingItemId: item.id,
    createdAt: new Date().toISOString(),
  };
}

export function listLocalPriceObservations(guestId: string, productId: string) {
  return read(guestId)
    .filter((observation) => observation.productId === productId)
    .sort((a, b) => b.observedAt.localeCompare(a.observedAt));
}
export function getLatestLocalPricesByStore(
  guestId: string,
  productId: string,
) {
  const seen = new Set<string>();
  return listLocalPriceObservations(guestId, productId).filter(
    (observation) => {
      if (seen.has(observation.storeId)) return false;
      seen.add(observation.storeId);
      return true;
    },
  );
}
export function clearGuestPriceObservationsAfterImport(guestId: string) {
  if (typeof window !== 'undefined')
    window.localStorage.removeItem(key(guestId));
}
