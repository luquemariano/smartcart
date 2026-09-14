/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
'use client';
import { useEffect, useState } from 'react';
import { syncOfflineOperations } from '@/lib/offline-sync';
import { listPendingOfflineOperations } from '@/lib/offline-db';
import { useOnlineStatus } from '@/lib/online-status';

export function OfflineStatus({ ownerUserId }: { ownerUserId?: string }) {
  const online = useOnlineStatus();
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(false);
  async function refresh() {
    if (!ownerUserId) return;
    setPending((await listPendingOfflineOperations(ownerUserId)).length);
  }
  async function retry() {
    if (!ownerUserId || !online) return;
    setSyncing(true);
    setError(false);
    try {
      await syncOfflineOperations(ownerUserId);
      await refresh();
    } catch {
      setError(true);
    } finally {
      setSyncing(false);
    }
  }
  useEffect(() => {
    void refresh();
  }, [ownerUserId]);
  useEffect(() => {
    const onQueueChanged = () => void refresh();
    window.addEventListener('smartcart-offline-queue-changed', onQueueChanged);
    return () =>
      window.removeEventListener(
        'smartcart-offline-queue-changed',
        onQueueChanged,
      );
  }, [ownerUserId]);
  useEffect(() => {
    if (online) void retry();
  }, [online]);
  if (!ownerUserId) return null;
  return (
    <div
      className="mt-2 flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600"
      role="status"
    >
      <span>
        {!online
          ? 'Sin conexión'
          : syncing
            ? 'Sincronizando…'
            : error
              ? 'Error de sincronización'
              : pending
                ? `Cambios pendientes (${pending})`
                : 'Todo sincronizado'}
      </span>
      {(error || pending > 0) && online && (
        <button
          className="font-semibold text-blue-700"
          onClick={() => void retry()}
          type="button"
        >
          Reintentar
        </button>
      )}
    </div>
  );
}
