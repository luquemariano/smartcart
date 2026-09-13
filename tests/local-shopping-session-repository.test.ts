import { beforeEach, describe, expect, it } from 'vitest';
import {
  finishLocalShoppingSession,
  getActiveLocalShoppingSession,
  getPendingGuestShoppingSessions,
  listLocalShoppingSessions,
  startLocalShoppingSession,
} from '@/lib/local-shopping-session-repository';

describe('local shopping session repository', () => {
  beforeEach(() => window.localStorage.clear());

  it('restores one active session, finishes it idempotently and keeps history', () => {
    const session = startLocalShoppingSession('guest-a', 'store-a');
    expect(getActiveLocalShoppingSession('guest-a')?.id).toBe(session.id);
    expect(getPendingGuestShoppingSessions('guest-a')).toHaveLength(1);
    expect(() => startLocalShoppingSession('guest-a', null)).toThrow(
      'ACTIVE_SHOPPING_SESSION',
    );

    const finished = finishLocalShoppingSession('guest-a', session.id);
    const repeated = finishLocalShoppingSession('guest-a', session.id);
    expect(finished.status).toBe('completed');
    expect(repeated.finishedAt).toBe(finished.finishedAt);
    expect(getActiveLocalShoppingSession('guest-a')).toBeNull();
    expect(listLocalShoppingSessions('guest-a')).toHaveLength(1);
  });

  it('isolates sessions by guest id', () => {
    startLocalShoppingSession('guest-a', 'store-a');
    expect(getActiveLocalShoppingSession('guest-b')).toBeNull();
    expect(listLocalShoppingSessions('guest-b')).toHaveLength(0);
  });
});
