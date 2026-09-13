import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  listCompletedShoppingHistory: vi.fn(),
  getCompletedShoppingHistoryDetail: vi.fn(),
}));

vi.mock('@/lib/server-session', () => ({
  getServerSession: mocks.getServerSession,
}));
vi.mock('@/server/shopping-history', () => ({
  listCompletedShoppingHistory: mocks.listCompletedShoppingHistory,
  getCompletedShoppingHistoryDetail: mocks.getCompletedShoppingHistoryDetail,
  isHistorySessionNotFound: vi.fn(() => false),
}));

import { GET as getHistory } from '@/app/api/shopping-history/route';
import { GET as getHistoryDetail } from '@/app/api/shopping-history/[id]/route';

describe('shopping history route validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getServerSession.mockResolvedValue({ user: { id: 'user-a' } });
    mocks.listCompletedShoppingHistory.mockResolvedValue({
      entries: [],
      pagination: { limit: 20, offset: 0, hasMore: false, nextOffset: null },
    });
  });

  it('requires an authenticated session', async () => {
    mocks.getServerSession.mockResolvedValue(null);
    const response = await getHistory(
      new Request('http://localhost/api/shopping-history'),
    );
    expect(response.status).toBe(401);
    expect(mocks.listCompletedShoppingHistory).not.toHaveBeenCalled();
  });

  it('rejects invalid filters and IDs server-side', async () => {
    const invalidSort = await getHistory(
      new Request('http://localhost/api/shopping-history?sort=random'),
    );
    expect(invalidSort.status).toBe(400);
    const invalidStore = await getHistory(
      new Request('http://localhost/api/shopping-history?storeId=foreign'),
    );
    expect(invalidStore.status).toBe(400);
    const invalidId = await getHistoryDetail(new Request('http://localhost'), {
      params: Promise.resolve({ id: 'not-a-uuid' }),
    });
    expect(invalidId.status).toBe(400);
    expect(mocks.getCompletedShoppingHistoryDetail).not.toHaveBeenCalled();
  });

  it('passes the authenticated owner and bounded pagination to the domain', async () => {
    const response = await getHistory(
      new Request(
        'http://localhost/api/shopping-history?limit=100&offset=20&sort=oldest&storeId=550e8400-e29b-41d4-a716-446655440000',
      ),
    );
    expect(response.status).toBe(200);
    expect(mocks.listCompletedShoppingHistory).toHaveBeenCalledWith('user-a', {
      limit: 50,
      offset: 20,
      sort: 'oldest',
      storeId: '550e8400-e29b-41d4-a716-446655440000',
    });
  });
});
