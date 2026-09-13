'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  getActiveLocalShoppingSession,
  listLocalShoppingSessions,
  startLocalShoppingSession,
  finishLocalShoppingSession,
  type LocalShoppingSession,
} from '@/lib/local-shopping-session-repository';
import { listLocalStores, type LocalStore } from '@/lib/local-store-repository';

type SessionView = LocalShoppingSession & { ownerUserId?: string };
type StoreView = Pick<LocalStore, 'id' | 'name' | 'branchName'>;
type Mode = 'guest' | 'authenticated';

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

function storeLabel(store: StoreView | undefined) {
  if (!store) return 'Sin supermercado';
  return store.branchName ? `${store.name} ${store.branchName}` : store.name;
}

export function ShoppingSessionManager({
  mode,
  guestId,
}: {
  mode: Mode;
  guestId?: string | null;
}) {
  const [stores, setStores] = useState<StoreView[]>([]);
  const [sessions, setSessions] = useState<SessionView[]>([]);
  const [active, setActive] = useState<SessionView | null>(null);
  const [storeId, setStoreId] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setMessage('');
    if (mode === 'guest' && guestId) {
      const localStores = listLocalStores(guestId);
      const localSessions = listLocalShoppingSessions(guestId);
      setStores(localStores);
      setSessions(localSessions);
      setActive(getActiveLocalShoppingSession(guestId));
      setLoading(false);
      return;
    }
    if (mode === 'authenticated') {
      try {
        const [storesResponse, sessionsResponse, activeResponse] =
          await Promise.all([
            fetch('/api/stores'),
            fetch('/api/shopping-sessions'),
            fetch('/api/shopping-sessions/active'),
          ]);
        const storesData = await storesResponse.json();
        const sessionsData = await sessionsResponse.json();
        const activeData = await activeResponse.json();
        setStores(storesResponse.ok ? (storesData.stores ?? []) : []);
        setSessions(sessionsResponse.ok ? (sessionsData.sessions ?? []) : []);
        setActive(activeResponse.ok ? (activeData.session ?? null) : null);
        if (!storesResponse.ok || !sessionsResponse.ok || !activeResponse.ok) {
          setMessage('No pudimos cargar tus compras.');
        }
      } catch {
        setStores([]);
        setSessions([]);
        setActive(null);
        setMessage('No pudimos cargar tus compras.');
      }
    }
    setLoading(false);
  }, [guestId, mode]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function start() {
    setBusy(true);
    setMessage('');
    try {
      if (mode === 'guest' && guestId) {
        startLocalShoppingSession(guestId, storeId || null);
      } else {
        const response = await fetch('/api/shopping-sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ storeId: storeId || null }),
        });
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error ?? 'No pudimos iniciar la compra.');
        }
      }
      await load();
    } catch (error) {
      setMessage(
        error instanceof Error && error.message.includes('activa')
          ? error.message
          : error instanceof Error
            ? error.message
            : 'No pudimos iniciar la compra.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function finish() {
    if (!active) return;
    setBusy(true);
    setMessage('');
    try {
      if (mode === 'guest' && guestId) {
        finishLocalShoppingSession(guestId, active.id);
      } else {
        const response = await fetch(`/api/shopping-sessions/${active.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'completed' }),
        });
        if (!response.ok) throw new Error('No pudimos finalizar la compra.');
      }
      await load();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'No pudimos finalizar la compra.',
      );
    } finally {
      setBusy(false);
    }
  }

  const activeStore = stores.find((store) => store.id === active?.storeId);

  return (
    <section
      className="mt-8 border-t border-slate-200 pt-6"
      aria-labelledby="shopping-session-title"
    >
      <h2
        id="shopping-session-title"
        className="text-xl font-bold text-slate-950"
      >
        Compra en curso
      </h2>
      <p className="mt-2 text-sm text-slate-600">
        {mode === 'guest'
          ? 'Esta compra queda guardada en este dispositivo.'
          : 'Una sola compra activa por vez.'}
      </p>
      {loading ? (
        <p className="mt-5 text-sm text-slate-500">Cargando compra…</p>
      ) : active ? (
        <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4">
          <p className="font-semibold text-slate-900">
            {storeLabel(activeStore)}
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Iniciada {formatDate(active.startedAt)}
          </p>
          <p className="mt-3 text-sm text-slate-600">
            Todavía no hay productos ni precios en esta etapa.
          </p>
          <div className="mt-4 flex gap-3">
            <button
              className="min-h-11 flex-1 rounded-lg border border-blue-300 px-3 py-2 text-sm font-semibold text-blue-700"
              onClick={() => setMessage('La compra está lista para continuar.')}
              type="button"
            >
              Continuar compra
            </button>
            <button
              className="min-h-11 rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
              disabled={busy}
              onClick={() => void finish()}
              type="button"
            >
              Finalizar
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="font-semibold text-slate-900">¿Empezamos una compra?</p>
          <label className="mt-4 block text-sm font-medium text-slate-700">
            Supermercado
            <select
              aria-label="Supermercado de la compra"
              className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3"
              onChange={(event) => setStoreId(event.target.value)}
              value={storeId}
            >
              <option value="">Sin supermercado</option>
              {stores.map((store) => (
                <option key={store.id} value={store.id}>
                  {storeLabel(store)}
                </option>
              ))}
            </select>
          </label>
          <button
            className="mt-4 min-h-11 w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white disabled:opacity-50"
            disabled={busy}
            onClick={() => void start()}
            type="button"
          >
            Empezar compra
          </button>
        </div>
      )}
      {sessions.some((session) => session.status === 'completed') && (
        <div className="mt-6">
          <h3 className="font-semibold text-slate-900">Compras anteriores</h3>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            {sessions
              .filter((session) => session.status === 'completed')
              .map((session) => (
                <li
                  key={session.id}
                  className="rounded-lg border border-slate-200 px-3 py-2"
                >
                  {storeLabel(
                    stores.find((store) => store.id === session.storeId),
                  )}{' '}
                  · {formatDate(session.startedAt)}
                </li>
              ))}
          </ul>
        </div>
      )}
      {message && (
        <p className="mt-3 text-sm text-rose-700" role="alert">
          {message}
        </p>
      )}
    </section>
  );
}
