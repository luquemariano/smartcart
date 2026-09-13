import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const state = {
    id: 'session-rollback',
    ownerUserId: 'owner-a',
    storeId: 'store-a',
    status: 'active' as 'active' | 'completed',
    finishedAt: null as Date | null,
  };
  const tx = {
    select: () => ({
      from: () => ({
        where: () => ({ limit: async () => [state] }),
      }),
    }),
    update: () => ({
      set: (values: { status: 'completed'; finishedAt: Date }) => ({
        where: () => ({
          returning: async () => {
            state.status = values.status;
            state.finishedAt = values.finishedAt;
            return [state];
          },
        }),
      }),
    }),
  };
  return {
    state,
    tx,
    db: {
      transaction: async (callback: (value: typeof tx) => Promise<unknown>) => {
        const before = { ...state };
        try {
          return await callback(tx);
        } catch (error) {
          Object.assign(state, before);
          throw error;
        }
      },
    },
    createPriceObservationsForSession: vi
      .fn()
      .mockRejectedValue(new Error('observation failure')),
  };
});

vi.mock('@/db', () => ({ db: mocks.db }));
vi.mock('@/server/price-observations', () => ({
  createPriceObservationsForSession: mocks.createPriceObservationsForSession,
}));

import { finishShoppingSession } from '@/server/shopping-sessions';

describe('finishShoppingSession rollback', () => {
  beforeEach(() => {
    mocks.state.status = 'active';
    mocks.state.finishedAt = null;
    mocks.createPriceObservationsForSession.mockClear();
  });

  it('keeps session active and propagates observation failure', async () => {
    await expect(
      finishShoppingSession('owner-a', 'session-rollback'),
    ).rejects.toThrow('observation failure');
    expect(mocks.createPriceObservationsForSession).toHaveBeenCalledOnce();
    expect(mocks.state.status).toBe('active');
    expect(mocks.state.finishedAt).toBeNull();
  });
});
