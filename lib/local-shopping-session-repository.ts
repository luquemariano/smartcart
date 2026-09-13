import { serializeMoney } from '@/lib/money';

export type LocalShoppingSessionStatus = 'active' | 'completed';

export type LocalShoppingSession = {
  id: string;
  storeId: string | null;
  status: LocalShoppingSessionStatus;
  budgetAmount: string | null;
  currency: string;
  startedAt: string;
  finishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

const STORAGE_PREFIX = 'smartcart_guest_shopping_sessions_v1:';

function storageKey(guestId: string) {
  return `${STORAGE_PREFIX}${guestId}`;
}

function read(guestId: string): LocalShoppingSession[] {
  if (typeof window === 'undefined') return [];
  const raw = window.localStorage.getItem(storageKey(guestId));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as LocalShoppingSession[];
    return Array.isArray(parsed)
      ? parsed.map((session) => ({
          ...session,
          budgetAmount: session.budgetAmount ?? null,
          currency: session.currency ?? 'ARS',
        }))
      : [];
  } catch {
    return [];
  }
}

function write(guestId: string, sessions: LocalShoppingSession[]) {
  window.localStorage.setItem(storageKey(guestId), JSON.stringify(sessions));
}

export function listLocalShoppingSessions(
  guestId: string,
): LocalShoppingSession[] {
  return read(guestId).sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

export function getActiveLocalShoppingSession(
  guestId: string,
): LocalShoppingSession | null {
  return read(guestId).find((session) => session.status === 'active') ?? null;
}

export function startLocalShoppingSession(
  guestId: string,
  storeId: string | null,
  budgetAmount: string | null = null,
): LocalShoppingSession {
  if (getActiveLocalShoppingSession(guestId)) {
    throw new Error('ACTIVE_SHOPPING_SESSION');
  }
  const now = new Date().toISOString();
  const session: LocalShoppingSession = {
    id: crypto.randomUUID(),
    storeId,
    status: 'active',
    budgetAmount: serializeMoney(budgetAmount),
    currency: 'ARS',
    startedAt: now,
    finishedAt: null,
    createdAt: now,
    updatedAt: now,
  };
  write(guestId, [...read(guestId), session]);
  return session;
}

export function updateLocalShoppingSessionBudget(
  guestId: string,
  sessionId: string,
  budgetAmount: string | null,
): LocalShoppingSession {
  const sessions = read(guestId);
  const existing = sessions.find((session) => session.id === sessionId);
  if (!existing) throw new Error('SHOPPING_SESSION_NOT_FOUND');
  if (existing.status === 'completed')
    throw new Error('COMPLETED_SHOPPING_SESSION');
  const updated: LocalShoppingSession = {
    ...existing,
    budgetAmount: serializeMoney(budgetAmount),
    currency: 'ARS',
    updatedAt: new Date().toISOString(),
  };
  write(
    guestId,
    sessions.map((session) => (session.id === sessionId ? updated : session)),
  );
  return updated;
}

export function finishLocalShoppingSession(
  guestId: string,
  sessionId: string,
): LocalShoppingSession {
  const sessions = read(guestId);
  const existing = sessions.find((session) => session.id === sessionId);
  if (!existing) throw new Error('SHOPPING_SESSION_NOT_FOUND');
  if (existing.status === 'completed') return existing;
  const now = new Date().toISOString();
  const finished: LocalShoppingSession = {
    ...existing,
    status: 'completed',
    finishedAt: now,
    updatedAt: now,
  };
  write(
    guestId,
    sessions.map((session) => (session.id === sessionId ? finished : session)),
  );
  return finished;
}

export function hasLocalShoppingSessionForStore(
  guestId: string,
  storeId: string,
): boolean {
  return read(guestId).some((session) => session.storeId === storeId);
}

export function getPendingGuestShoppingSessions(
  guestId: string,
): LocalShoppingSession[] {
  return listLocalShoppingSessions(guestId);
}

export function clearGuestShoppingSessionsAfterImport(guestId: string): void {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(storageKey(guestId));
  }
}
