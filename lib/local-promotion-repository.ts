import type { PromotionCandidate } from '@/lib/promotion-calculator';
export type LocalPromotion = PromotionCandidate & {
  guestId: string;
  createdAt: string;
  updatedAt: string;
  productId: string;
  storeId: string;
};
const PREFIX = 'smartcart_guest_promotions_v1:';
const key = (guestId: string) => `${PREFIX}${guestId}`;
function read(guestId: string): LocalPromotion[] {
  if (typeof window === 'undefined') return [];
  try {
    const value = JSON.parse(localStorage.getItem(key(guestId)) ?? '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}
function write(guestId: string, values: LocalPromotion[]) {
  localStorage.setItem(key(guestId), JSON.stringify(values));
}
export function listLocalPromotions(
  guestId: string,
  filter?: { productId?: string; storeId?: string; active?: boolean },
  at = new Date(),
) {
  return read(guestId).filter(
    (p) =>
      (!filter?.productId || p.productId === filter.productId) &&
      (!filter?.storeId || p.storeId === filter.storeId) &&
      (!filter?.active ||
        (p.isActive && at >= new Date(p.startsAt) && at <= new Date(p.endsAt))),
  );
}
export function createLocalPromotion(
  guestId: string,
  input: Omit<LocalPromotion, 'id' | 'guestId' | 'createdAt' | 'updatedAt'>,
) {
  const now = new Date().toISOString();
  const value = {
    ...input,
    id: crypto.randomUUID(),
    guestId,
    createdAt: now,
    updatedAt: now,
  };
  write(guestId, [...read(guestId), value]);
  return value;
}
export function updateLocalPromotion(
  guestId: string,
  id: string,
  input: Omit<LocalPromotion, 'id' | 'guestId' | 'createdAt' | 'updatedAt'>,
) {
  const values = read(guestId);
  const index = values.findIndex((p) => p.id === id);
  if (index < 0) throw new Error('PROMOTION_NOT_FOUND');
  const value = {
    ...values[index],
    ...input,
    updatedAt: new Date().toISOString(),
  };
  values[index] = value;
  write(guestId, values);
  return value;
}
export function deleteLocalPromotion(guestId: string, id: string) {
  const values = read(guestId);
  if (!values.some((p) => p.id === id)) throw new Error('PROMOTION_NOT_FOUND');
  write(
    guestId,
    values.filter((p) => p.id !== id),
  );
}
export function getPendingGuestPromotions(guestId: string) {
  return read(guestId);
}
export function clearGuestPromotionsAfterImport(guestId: string) {
  if (typeof window !== 'undefined') localStorage.removeItem(key(guestId));
}
