'use client';

import { useCallback, useEffect, useState } from 'react';
import { formatMoney } from '@/lib/money';
import {
  buildShoppingHistoryEntry,
  type ShoppingHistoryEntry,
} from '@/lib/shopping-history';
import {
  getPendingGuestShoppingItems,
  listLocalShoppingItems,
  type LocalShoppingItem,
} from '@/lib/local-shopping-item-repository';
import { listLocalShoppingSessions } from '@/lib/local-shopping-session-repository';
import { listLocalStores, type LocalStore } from '@/lib/local-store-repository';
import { shoppingItemSubtotal } from '@/lib/shopping-summary';

type Mode = 'guest' | 'authenticated';
type StoreView = Pick<LocalStore, 'id' | 'name' | 'branchName'>;
type HistoryItem = LocalShoppingItem & { subtotal?: string | null };
type Detail = { history: ShoppingHistoryEntry; items: HistoryItem[] };
type GuestHistoryPage = {
  entries: ShoppingHistoryEntry[];
  hasMore: boolean;
};

function storeLabel(store: StoreView | null) {
  if (!store) return 'Sin supermercado';
  return store.branchName ? `${store.name} ${store.branchName}` : store.name;
}

function storeOptionLabel(store: StoreView) {
  return store.branchName ? `${store.name} · ${store.branchName}` : store.name;
}

function dateLabel(value: string | Date | null) {
  if (!value) return 'Fecha no disponible';
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function dateTimeLabel(value: string | Date | null) {
  if (!value) return 'Fecha no disponible';
  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(new Date(value));
}

function differenceLabel(entry: ShoppingHistoryEntry) {
  if (!entry.budgetAmount || !entry.remainingBudget) return null;
  if (entry.remainingBudget.startsWith('-'))
    return `Superaste el presupuesto en ${formatMoney(entry.remainingBudget.slice(1), entry.currency)}`;
  if (entry.remainingBudget === '0.00')
    return 'Usaste exactamente el presupuesto';
  return `Quedaron ${formatMoney(entry.remainingBudget, entry.currency)} del presupuesto`;
}

function totalLabel(entry: ShoppingHistoryEntry) {
  return entry.unpricedItemsCount > 0 ? 'Total registrado' : 'Total';
}

function readGuestHistoryPage(
  guestId: string,
  selectedStoreId: string,
  sort: 'newest' | 'oldest',
  offset: number,
): GuestHistoryPage {
  const allItems = getPendingGuestShoppingItems(guestId);
  const itemMap = new Map<string, LocalShoppingItem[]>();
  for (const item of allItems) {
    const current = itemMap.get(item.shoppingSessionId) ?? [];
    current.push(item);
    itemMap.set(item.shoppingSessionId, current);
  }
  const localStores = listLocalStores(guestId);
  const localEntries = listLocalShoppingSessions(guestId)
    .filter(
      (session) =>
        session.status === 'completed' &&
        (!selectedStoreId || session.storeId === selectedStoreId),
    )
    .sort((a, b) => {
      const left = new Date(a.finishedAt ?? a.startedAt).getTime();
      const right = new Date(b.finishedAt ?? b.startedAt).getTime();
      return sort === 'oldest' ? left - right : right - left;
    });
  const page = localEntries.slice(offset, offset + 20);
  return {
    entries: page.map((session) =>
      buildShoppingHistoryEntry(
        session,
        (() => {
          const store = localStores.find(
            (candidate) => candidate.id === session.storeId,
          );
          return store
            ? { ...store, branchName: store.branchName ?? null }
            : null;
        })(),
        itemMap.get(session.id) ?? [],
      ),
    ),
    hasMore: offset + 20 < localEntries.length,
  };
}

export function ShoppingHistoryManager({
  mode,
  guestId,
  stores,
  refreshKey,
}: {
  mode: Mode;
  guestId?: string | null;
  stores: StoreView[];
  refreshKey: number;
}) {
  const [selectedStoreId, setSelectedStoreId] = useState('');
  const [sort, setSort] = useState<'newest' | 'oldest'>('newest');
  const [offset, setOffset] = useState(0);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(mode === 'authenticated');
  const [message, setMessage] = useState('');
  const [entries, setEntries] = useState<ShoppingHistoryEntry[]>(() =>
    mode === 'guest' && guestId
      ? readGuestHistoryPage(guestId, '', 'newest', 0).entries
      : [],
  );
  const [hasMore, setHasMore] = useState(() =>
    mode === 'guest' && guestId
      ? readGuestHistoryPage(guestId, '', 'newest', 0).hasMore
      : false,
  );

  const load = useCallback(async () => {
    setLoading(true);
    setMessage('');
    setDetail(null);
    if (mode === 'guest' && guestId) {
      const page = readGuestHistoryPage(guestId, selectedStoreId, sort, offset);
      setEntries(page.entries);
      setHasMore(page.hasMore);
      setLoading(false);
      return;
    }
    if (mode === 'authenticated') {
      try {
        const params = new URLSearchParams({
          limit: '20',
          offset: String(offset),
          sort,
        });
        if (selectedStoreId) params.set('storeId', selectedStoreId);
        const response = await fetch(`/api/shopping-history?${params}`);
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.error ?? 'No pudimos cargar el historial.');
        setEntries(data.entries ?? []);
        setHasMore(Boolean(data.pagination?.hasMore));
      } catch (error) {
        setEntries([]);
        setMessage(
          error instanceof Error
            ? error.message
            : 'No pudimos cargar el historial.',
        );
      }
    }
    setLoading(false);
  }, [guestId, mode, offset, selectedStoreId, sort]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load, refreshKey]);

  async function openDetail(entry: ShoppingHistoryEntry) {
    setMessage('');
    if (mode === 'guest' && guestId) {
      setDetail({
        history: entry,
        items: listLocalShoppingItems(guestId, entry.sessionId),
      });
      return;
    }
    try {
      const response = await fetch(`/api/shopping-history/${entry.sessionId}`);
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error ?? 'No pudimos abrir la compra.');
      setDetail(data);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'No pudimos abrir la compra.',
      );
    }
  }

  function changeFilter(nextStoreId: string) {
    setSelectedStoreId(nextStoreId);
    setOffset(0);
  }

  function changeSort(nextSort: 'newest' | 'oldest') {
    setSort(nextSort);
    setOffset(0);
  }

  return (
    <section className="mt-8" aria-labelledby="shopping-history-title">
      <h2
        id="shopping-history-title"
        className="text-xl font-bold text-slate-950"
      >
        Historial
        <span className="sr-only">Compras anteriores</span>
      </h2>
      <p className="mt-2 text-sm text-slate-600">
        {mode === 'guest'
          ? 'Queda guardado solo en este dispositivo.'
          : 'Tus compras finalizadas.'}
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-medium text-slate-700">
          Supermercado
          <select
            aria-label="Filtrar historial por supermercado"
            className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3"
            onChange={(event) => changeFilter(event.target.value)}
            value={selectedStoreId}
          >
            <option value="">Todos los supermercados</option>
            {stores.map((store) => (
              <option key={store.id} value={store.id}>
                {storeOptionLabel(store)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium text-slate-700">
          Orden
          <select
            aria-label="Ordenar historial"
            className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3"
            onChange={(event) =>
              changeSort(event.target.value as 'newest' | 'oldest')
            }
            value={sort}
          >
            <option value="newest">Más recientes primero</option>
            <option value="oldest">Más antiguas primero</option>
          </select>
        </label>
      </div>
      {loading ? (
        <p className="mt-5 text-sm text-slate-500">Cargando historial…</p>
      ) : entries.length === 0 ? (
        <p className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          Todavía no tenés compras finalizadas.
          <br />
          Cuando termines una compra, aparecerá acá.
        </p>
      ) : (
        <>
          <ul className="mt-4 space-y-3">
            {entries.map((entry) => (
              <li key={entry.sessionId}>
                <button
                  className="w-full rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-blue-300"
                  onClick={() => void openDetail(entry)}
                  type="button"
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {dateLabel(entry.finishedAt ?? entry.startedAt)}
                  </p>
                  <p className="mt-1 font-semibold text-slate-900">
                    {storeLabel(entry.store)}
                  </p>
                  <p className="mt-2 text-lg font-bold text-slate-950">
                    {totalLabel(entry)}:{' '}
                    {formatMoney(entry.itemsTotal, entry.currency)}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    {entry.itemsCount} tipos de productos ·{' '}
                    {entry.totalQuantity} unidades/cantidades
                  </p>
                  {entry.unpricedItemsCount > 0 && (
                    <p className="mt-1 text-sm font-semibold text-amber-700">
                      {entry.unpricedItemsCount} ítems sin precio
                    </p>
                  )}
                  <p className="mt-1 text-sm text-slate-600">
                    {entry.budgetAmount
                      ? `Presupuesto: ${formatMoney(entry.budgetAmount, entry.currency)}`
                      : 'Sin presupuesto'}
                  </p>
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex justify-between gap-3">
            <button
              className="min-h-10 rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-700 disabled:opacity-50"
              disabled={offset === 0}
              onClick={() => setOffset(Math.max(0, offset - 20))}
              type="button"
            >
              Anteriores
            </button>
            <button
              className="min-h-10 rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-700 disabled:opacity-50"
              disabled={!hasMore}
              onClick={() => setOffset(offset + 20)}
              type="button"
            >
              Siguientes
            </button>
          </div>
        </>
      )}
      {detail && (
        <div
          className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4"
          aria-label="Detalle de compra finalizada"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-bold text-slate-950">
                {storeLabel(detail.history.store)}
              </h3>
              <p className="mt-1 text-sm text-slate-600">
                {dateTimeLabel(
                  detail.history.finishedAt ?? detail.history.startedAt,
                )}
              </p>
            </div>
            <button
              className="text-sm font-semibold text-blue-700"
              onClick={() => setDetail(null)}
              type="button"
            >
              Cerrar
            </button>
          </div>
          <dl className="mt-4 grid gap-3 sm:grid-cols-3">
            {detail.history.budgetAmount && (
              <div>
                <dt className="text-xs font-semibold uppercase text-slate-500">
                  Presupuesto
                </dt>
                <dd className="font-bold text-slate-900">
                  {formatMoney(
                    detail.history.budgetAmount,
                    detail.history.currency,
                  )}
                </dd>
              </div>
            )}
            <div>
              <dt className="text-xs font-semibold uppercase text-slate-500">
                {totalLabel(detail.history)}
              </dt>
              <dd className="font-bold text-slate-900">
                {formatMoney(
                  detail.history.itemsTotal,
                  detail.history.currency,
                )}
              </dd>
            </div>
            {differenceLabel(detail.history) && (
              <div>
                <dt className="text-xs font-semibold uppercase text-slate-500">
                  Diferencia
                </dt>
                <dd className="font-bold text-slate-900">
                  {differenceLabel(detail.history)}
                </dd>
              </div>
            )}
          </dl>
          {detail.history.unpricedItemsCount > 0 && (
            <p className="mt-3 text-sm font-semibold text-amber-700">
              {detail.history.unpricedItemsCount} ítems sin precio; el total es
              solo lo registrado.
            </p>
          )}
          <p className="mt-3 text-sm text-slate-700">
            {detail.history.itemsCount} tipos de productos ·{' '}
            {detail.history.totalQuantity} unidades/cantidades
          </p>
          <h4 className="mt-4 font-semibold text-slate-900">Productos</h4>
          <ul className="mt-2 space-y-2">
            {detail.items.map((item) => {
              const subtotal = item.subtotal ?? shoppingItemSubtotal(item);
              return (
                <li key={item.id} className="rounded-lg bg-white p-3">
                  <p className="font-medium text-slate-900">
                    {item.productName}
                    {item.productQuantityValue && item.productQuantityUnit
                      ? ` · ${item.productQuantityValue} ${item.productQuantityUnit}`
                      : ''}
                  </p>
                  <p className="text-sm text-slate-600">
                    {item.quantity} ×{' '}
                    {item.unitPrice
                      ? formatMoney(item.unitPrice, detail.history.currency)
                      : 'Precio no registrado'}
                  </p>
                  {subtotal && (
                    <p className="text-sm font-semibold text-slate-800">
                      {formatMoney(subtotal, detail.history.currency)}
                    </p>
                  )}
                </li>
              );
            })}
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
