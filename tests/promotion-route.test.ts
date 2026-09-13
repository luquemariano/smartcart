import { describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  list: vi.fn(),
  create: vi.fn(),
}));
vi.mock('@/lib/server-session', () => ({ getServerSession: mocks.getSession }));
vi.mock('@/server/promotions', () => ({
  listPromotions: mocks.list,
  createPromotion: mocks.create,
  PromotionReferenceError: class extends Error {},
}));
import { GET, POST } from '@/app/api/promotions/route';
describe('promotion auth routes', () => {
  it('requires auth and never accepts client ownership', async () => {
    mocks.getSession.mockResolvedValueOnce(null);
    expect(
      (await GET(new Request('http://localhost/api/promotions'))).status,
    ).toBe(401);
    mocks.getSession.mockResolvedValueOnce({ user: { id: 'owner-a' } });
    const response = await POST(
      new Request('http://localhost/api/promotions', {
        method: 'POST',
        body: JSON.stringify({
          storeId: 's',
          productId: 'p',
          type: 'percentage',
          value: '10.00',
          startsAt: '2026-01-01T00:00:00.000Z',
          endsAt: '2026-12-31T00:00:00.000Z',
          ownerUserId: 'owner-b',
        }),
      }),
    );
    expect(response.status).toBe(201);
    expect(mocks.create).toHaveBeenCalledWith(
      'owner-a',
      expect.objectContaining({ ownerUserId: 'owner-b' }),
    );
  });
  it('lists only the authenticated owner and supports filters', async () => {
    mocks.getSession.mockResolvedValue({ user: { id: 'owner-a' } });
    mocks.list.mockResolvedValue([]);
    const response = await GET(
      new Request(
        'http://localhost/api/promotions?storeId=s&productId=p&active=true',
      ),
    );
    expect(response.status).toBe(200);
    expect(mocks.list).toHaveBeenCalledWith('owner-a', {
      storeId: 's',
      productId: 'p',
      active: true,
    });
  });
});
