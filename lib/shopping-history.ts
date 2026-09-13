import type {
  ShoppingSummary,
  ShoppingItemForSummary,
} from '@/lib/shopping-summary';
import { calculateShoppingSummary } from '@/lib/shopping-summary';

export type HistorySession = {
  id: string;
  storeId: string | null;
  status: 'active' | 'completed';
  budgetAmount: string | null;
  currency: string;
  startedAt: string | Date;
  finishedAt: string | Date | null;
};

export type HistoryStore = {
  id: string;
  name: string;
  branchName: string | null;
} | null;

export type ShoppingHistoryEntry = ShoppingSummary & {
  sessionId: string;
  store: HistoryStore;
  startedAt: string | Date;
  finishedAt: string | Date | null;
};

export function buildShoppingHistoryEntry(
  session: HistorySession,
  store: HistoryStore,
  items: ShoppingItemForSummary[],
): ShoppingHistoryEntry {
  return {
    ...calculateShoppingSummary(session.budgetAmount, session.currency, items),
    sessionId: session.id,
    store,
    startedAt: session.startedAt,
    finishedAt: session.finishedAt,
  };
}
