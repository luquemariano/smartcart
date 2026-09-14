import { describe, expect, it } from 'vitest';
import {
  getKnownOfflineAuthSnapshot,
  invalidateOfflineAuthSnapshot,
  isNetworkAuthFailure,
  saveOfflineAuthSnapshot,
} from '@/lib/offline-auth';
import { listOffline } from '@/lib/offline-db';

describe('offline auth snapshot', () => {
  it('persists only non-sensitive known-authenticated metadata', async () => {
    const ownerUserId = crypto.randomUUID();
    await saveOfflineAuthSnapshot({
      id: ownerUserId,
      name: 'María',
      email: 'maria@example.com',
    });

    const snapshot = await getKnownOfflineAuthSnapshot();
    expect(snapshot).toMatchObject({
      ownerUserId,
      displayName: 'María',
      email: 'maria@example.com',
      knownAuthenticatedSession: true,
    });
    expect(JSON.stringify(snapshot)).not.toMatch(/token|password|secret/i);
  });

  it('uses only the last validated owner and invalidates logout', async () => {
    const ownerA = crypto.randomUUID();
    const ownerB = crypto.randomUUID();
    await saveOfflineAuthSnapshot({ id: ownerA, name: 'A' });
    await saveOfflineAuthSnapshot({ id: ownerB, name: 'B' });
    expect((await getKnownOfflineAuthSnapshot())?.ownerUserId).toBe(ownerB);

    await invalidateOfflineAuthSnapshot(ownerB);
    expect(await getKnownOfflineAuthSnapshot()).toBeNull();
    const ownerASnapshot = await listOffline<{ ownerUserId: string }>(
      'offline_meta',
      (value) => value.ownerUserId === ownerA,
    );
    expect(ownerASnapshot.length).toBeGreaterThan(0);
  });

  it('allows fallback only for network failures, never auth rejection', () => {
    expect(isNetworkAuthFailure({ status: 0 })).toBe(true);
    expect(isNetworkAuthFailure({})).toBe(true);
    expect(isNetworkAuthFailure({ status: 401 })).toBe(false);
    expect(isNetworkAuthFailure({ status: 403 })).toBe(false);
  });
});
