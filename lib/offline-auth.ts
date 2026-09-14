import { deleteOffline, listOffline, saveOfflineMeta } from '@/lib/offline-db';

const LAST_ACTIVE_OWNER_KEY = 'auth:last-active-owner';

export type OfflineAuthSnapshot = {
  key: string;
  ownerUserId: string;
  displayName: string | null;
  email: string | null;
  authenticatedAt: string;
  lastValidatedAt: string;
  knownAuthenticatedSession: true;
};

type LastActiveOwner = {
  key: string;
  ownerUserId: string;
  value: string;
};

function snapshotKey(ownerUserId: string) {
  return `auth:snapshot:${ownerUserId}`;
}

export async function saveOfflineAuthSnapshot(user: {
  id: string;
  name?: string | null;
  email?: string | null;
}) {
  const now = new Date().toISOString();
  const existing = await listOffline<{
    key: string;
    value: OfflineAuthSnapshot;
  }>('offline_meta', (value) => value.key === snapshotKey(user.id));
  const previous = existing[0]?.value;
  const snapshot: OfflineAuthSnapshot = {
    key: snapshotKey(user.id),
    ownerUserId: user.id,
    displayName: user.name ?? null,
    email: user.email ?? null,
    authenticatedAt: previous?.authenticatedAt ?? now,
    lastValidatedAt: now,
    knownAuthenticatedSession: true,
  };
  await saveOfflineMeta({
    key: snapshotKey(user.id),
    ownerUserId: user.id,
    value: snapshot,
  });
  await saveOfflineMeta({
    key: LAST_ACTIVE_OWNER_KEY,
    ownerUserId: user.id,
    value: user.id,
  });
}

export async function getKnownOfflineAuthSnapshot() {
  const lastActive = await listOffline<LastActiveOwner>(
    'offline_meta',
    (value) => value.key === LAST_ACTIVE_OWNER_KEY,
  );
  const ownerUserId = lastActive[0]?.value;
  if (!ownerUserId) return null;
  const snapshots = await listOffline<{
    key: string;
    ownerUserId: string;
    value: OfflineAuthSnapshot;
  }>(
    'offline_meta',
    (value) =>
      value.key === snapshotKey(ownerUserId) &&
      value.ownerUserId === ownerUserId &&
      value.value.knownAuthenticatedSession === true,
  );
  return snapshots[0]?.value ?? null;
}

export async function invalidateOfflineAuthSnapshot(ownerUserId: string) {
  await deleteOffline('offline_meta', snapshotKey(ownerUserId));
  const lastActive = await listOffline<LastActiveOwner>(
    'offline_meta',
    (value) => value.key === LAST_ACTIVE_OWNER_KEY,
  );
  if (lastActive[0]?.value === ownerUserId)
    await deleteOffline('offline_meta', LAST_ACTIVE_OWNER_KEY);
}

export function isNetworkAuthFailure(error: { status?: number } | null) {
  return Boolean(error && (error.status === 0 || error.status === undefined));
}
