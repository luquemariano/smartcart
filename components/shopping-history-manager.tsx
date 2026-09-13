'use client';

import { useCallback, useEffect, useState } from 'react';
import { compareMoney, formatMoney } from '@/lib/money';
import {
  buildStoreHistoryOverviews,
  compatibleProductPresentation,
  compareProductObservations,
  comparePurchaseSummaries,
  type ProductComparison,
  type ProductObservation,
  type PurchaseComparison,
  type StoreHistoryOverview,
} from '@/lib/shopping-comparison';
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
type Detail = {
  history: ShoppingHistoryEntry;
  items: HistoryItem[];
  comparison: PurchaseComparison;
  productComparisons: ProductComparison[];
};
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

function signedMoney(value: string | null, currency: string) {
  if (!value) return 'No disponible';
  return value.startsWith('-')
    ? `-${formatMoney(value.slice(1), currency)}`
    : `+${formatMoney(value, currency)}`;
}

function signedPercentage(value: string | null) {
  if (!value) return 'No calculable';
  return value.startsWith('-') ? `${value} %` : `+${value} %`;
}

function comparisonStatusLabel(status: PurchaseComparison['status']) {
  return {
    more_expensive: 'Más cara',
    cheaper: 'Más barata',
    same_total: 'Mismo total',
    partial: 'Comparación parcial',
    insufficient: 'Datos insuficientes',
  }[status];
}

function comparisonExplanation(comparison: PurchaseComparison) {
  if (comparison.reason === 'no_previous_purchase')
    return 'Aún no hay una compra anterior comparable.';
  if (comparison.reason === 'currency_mismatch')
    return 'Las compras usan monedas diferentes; no se comparan monetariamente.';
  if (comparison.status === 'partial')
    return 'La comparación es parcial porque una de las compras tiene precios pendientes.';
  if (comparison.status === 'more_expensive')
    return `Esta compra fue ${comparison.percentage ? `${comparison.percentage.replace('-', '')} %` : 'más'} más cara que la anterior.`;
  if (comparison.status === 'cheaper')
    return `Esta compra fue ${comparison.percentage?.replace('-', '') ?? ''} % más barata que la anterior.`;
  return 'Esta compra tuvo el mismo total que la anterior.';
}

function readGuestDetail(guestId: string, entry: ShoppingHistoryEntry): Detail {
  const allEntries = readGuestHistoryEntries(guestId);
  const previous =
    [...allEntries]
      .filter((candidate) => candidate.sessionId !== entry.sessionId)
      .sort((left, right) => {
        const leftDate = new Date(left.finishedAt ?? left.startedAt).getTime();
        const rightDate = new Date(
          right.finishedAt ?? right.startedAt,
        ).getTime();
        return rightDate - leftDate;
      })
      .find((candidate) => candidate.store?.id === entry.store?.id) ??
    [...allEntries]
      .filter((candidate) => candidate.sessionId !== entry.sessionId)
      .sort((left, right) => {
        const leftDate = new Date(left.finishedAt ?? left.startedAt).getTime();
        const rightDate = new Date(
          right.finishedAt ?? right.startedAt,
        ).getTime();
        return rightDate - leftDate;
      })[0] ??
    null;
  const allItems = getPendingGuestShoppingItems(guestId);
  const entriesBySession = new Map(
    allEntries.map((candidate) => [candidate.sessionId, candidate]),
  );
  const currentItems = listLocalShoppingItems(guestId, entry.sessionId);
  const productComparisons = currentItems
    .filter((item) => item.productId)
    .map((item) => {
      const currentObservation: ProductObservation = {
        sessionId: entry.sessionId,
        finishedAt: entry.finishedAt,
        store: entry.store,
        currency: entry.currency,
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        productQuantityValue: item.productQuantityValue,
        productQuantityUnit: item.productQuantityUnit,
      };
      const previousObservation = allItems
        .filter(
          (candidate) =>
            candidate.productId === item.productId &&
            candidate.shoppingSessionId !== entry.sessionId,
        )
        .map((candidate) => {
          const candidateEntry = entriesBySession.get(
            candidate.shoppingSessionId,
          );
          return candidateEntry
            ? {
                sessionId: candidate.shoppingSessionId,
                finishedAt: candidateEntry.finishedAt,
                store: candidateEntry.store,
                currency: candidateEntry.currency,
                productId: candidate.productId,
                productName: candidate.productName,
                quantity: candidate.quantity,
                unitPrice: candidate.unitPrice,
                productQuantityValue: candidate.productQuantityValue,
                productQuantityUnit: candidate.productQuantityUnit,
              }
            : null;
        })
        .filter((candidate): candidate is ProductObservation =>
          Boolean(candidate),
        )
        .sort(
          (left, right) =>
            new Date(right.finishedAt ?? 0).getTime() -
            new Date(left.finishedAt ?? 0).getTime(),
        )
        .find((candidate) =>
          compatibleProductPresentation(currentObservation, candidate),
        );
      return compareProductObservations(
        currentObservation,
        previousObservation ?? null,
      );
    });
  return {
    history: entry,
    items: currentItems,
    comparison: comparePurchaseSummaries(entry, previous),
    productComparisons,
  };
}

function readGuestHistoryEntries(guestId: string) {
  const allItems = getPendingGuestShoppingItems(guestId);
  const itemMap = new Map<string, LocalShoppingItem[]>();
  for (const item of allItems) {
    const current = itemMap.get(item.shoppingSessionId) ?? [];
    current.push(item);
    itemMap.set(item.shoppingSessionId, current);
  }
  const localStores = listLocalStores(guestId);
  return listLocalShoppingSessions(guestId)
    .filter((session) => session.status === 'completed')
    .map((session) =>
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
    );
}

function readGuestHistoryPage(
  guestId: string,
  selectedStoreId: string,
  sort: 'newest' | 'oldest',
  offset: number,
): GuestHistoryPage {
  const localEntries = readGuestHistoryEntries(guestId)
    .filter((entry) => !selectedStoreId || entry.store?.id === selectedStoreId)
    .sort((a, b) => {
      const left = new Date(a.finishedAt ?? a.startedAt).getTime();
      const right = new Date(b.finishedAt ?? b.startedAt).getTime();
      return sort === 'oldest' ? left - right : right - left;
    });
  const page = localEntries.slice(offset, offset + 20);
  return {
    entries: page,
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
  const [overview, setOverview] = useState<StoreHistoryOverview[]>(() =>
    mode === 'guest' && guestId
      ? buildStoreHistoryOverviews(readGuestHistoryEntries(guestId))
      : [],
  );
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
  const mostEconomicStore = overview
    .filter((item) => item.averageTicket)
    .reduce<StoreHistoryOverview | null>(
      (best, item) =>
        !best || compareMoney(item.averageTicket!, best.averageTicket!) < 0
          ? item
          : best,
      null,
    );

  const load = useCallback(async () => {
    setLoading(true);
    setMessage('');
    setDetail(null);
    if (mode === 'guest' && guestId) {
      const page = readGuestHistoryPage(guestId, selectedStoreId, sort, offset);
      setEntries(page.entries);
      setHasMore(page.hasMore);
      setOverview(buildStoreHistoryOverviews(readGuestHistoryEntries(guestId)));
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
        const [response, overviewResponse] = await Promise.all([
          fetch(`/api/shopping-history?${params}`),
          fetch('/api/shopping-history/overview'),
        ]);
        const data = await response.json();
        const overviewData = await overviewResponse.json();
        if (!response.ok || !overviewResponse.ok)
          throw new Error(data.error ?? 'No pudimos cargar el historial.');
        setEntries(data.entries ?? []);
        setHasMore(Boolean(data.pagination?.hasMore));
        setOverview(overviewData.stores ?? []);
      } catch (error) {
        setEntries([]);
        setOverview([]);
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
      setDetail(readGuestDetail(guestId, entry));
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
      {overview.length > 0 && (
        <section
          className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4"
          aria-labelledby="shopping-history-overview-title"
        >
          <h3
            id="shopping-history-overview-title"
            className="font-bold text-slate-900"
          >
            Resumen por supermercado
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            Datos derivados únicamente de tus compras finalizadas.
          </p>
          <ul className="mt-3 space-y-3">
            {overview.map((item) => (
              <li key={item.store.id} className="rounded-lg bg-white p-3">
                <p className="font-semibold text-slate-900">
                  {storeOptionLabel(item.store)}
                </p>
                <p className="mt-1 text-sm text-slate-700">
                  {item.completedPurchasesCount} compras · última compra{' '}
                  {dateLabel(
                    item.lastPurchase.finishedAt ?? item.lastPurchase.startedAt,
                  )}
                </p>
                <p className="mt-1 text-sm text-slate-700">
                  Gasto válido:{' '}
                  {item.historicalSpend
                    ? formatMoney(item.historicalSpend, item.currency)
                    : 'No disponible'}{' '}
                  · Ticket promedio:{' '}
                  {item.averageTicket
                    ? formatMoney(item.averageTicket, item.currency)
                    : 'No disponible'}
                </p>
                {overview.length > 1 &&
                  mostEconomicStore?.store.id === item.store.id && (
                    <p className="mt-1 text-sm font-semibold text-emerald-700">
                      Menor ticket promedio dentro de tu historial comparable.
                    </p>
                  )}
                {item.comparison && (
                  <p className="mt-1 text-sm font-semibold text-slate-700">
                    Última comparación:{' '}
                    {comparisonStatusLabel(item.comparison.status)}{' '}
                    {item.comparison.difference
                      ? `(${signedMoney(item.comparison.difference, item.currency)})`
                      : ''}
                  </p>
                )}
                {item.incompletePurchasesCount > 0 && (
                  <p className="mt-1 text-xs text-amber-700">
                    {item.incompletePurchasesCount} compra(s) parcial(es) no se
                    incluyeron en el gasto válido.
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
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
          <section
            className="mt-4 rounded-lg bg-white p-3"
            aria-labelledby="shopping-comparison-title"
          >
            <h4
              id="shopping-comparison-title"
              className="font-semibold text-slate-900"
            >
              Comparación histórica:{' '}
              {comparisonStatusLabel(detail.comparison.status)}
            </h4>
            <p className="mt-1 text-sm text-slate-700">
              {comparisonExplanation(detail.comparison)}
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">
                  Compra actual
                </p>
                <p className="font-bold text-slate-900">
                  {formatMoney(
                    detail.comparison.current.itemsTotal,
                    detail.comparison.current.currency,
                  )}
                </p>
                <p className="text-xs text-slate-600">
                  {storeLabel(detail.comparison.current.store)} ·{' '}
                  {dateLabel(
                    detail.comparison.current.finishedAt ??
                      detail.comparison.current.startedAt,
                  )}
                </p>
                <p className="text-xs text-slate-600">
                  {detail.comparison.current.itemsCount} tipos ·{' '}
                  {detail.comparison.current.totalQuantity} unidades/cantidades
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">
                  Compra anterior
                </p>
                <p className="font-bold text-slate-900">
                  {detail.comparison.previous
                    ? formatMoney(
                        detail.comparison.previous.itemsTotal,
                        detail.comparison.previous.currency,
                      )
                    : 'No disponible'}
                </p>
                {detail.comparison.previous && (
                  <>
                    <p className="text-xs text-slate-600">
                      {storeLabel(detail.comparison.previous.store)} ·{' '}
                      {dateLabel(
                        detail.comparison.previous.finishedAt ??
                          detail.comparison.previous.startedAt,
                      )}
                    </p>
                    <p className="text-xs text-slate-600">
                      {detail.comparison.previous.itemsCount} tipos ·{' '}
                      {detail.comparison.previous.totalQuantity}{' '}
                      unidades/cantidades
                    </p>
                  </>
                )}
              </div>
            </div>
            {detail.comparison.difference && (
              <p className="mt-3 text-sm font-semibold text-slate-900">
                Diferencia:{' '}
                {signedMoney(
                  detail.comparison.difference,
                  detail.history.currency,
                )}{' '}
                · {signedPercentage(detail.comparison.percentage)}
              </p>
            )}
          </section>
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
          {detail.productComparisons.length > 0 && (
            <section className="mt-5" aria-labelledby="product-history-title">
              <h4
                id="product-history-title"
                className="font-semibold text-slate-900"
              >
                Historial de precios de productos
              </h4>
              <ul className="mt-2 space-y-2">
                {detail.productComparisons.map((comparison) => (
                  <li
                    key={comparison.productId}
                    className="rounded-lg bg-white p-3"
                  >
                    <p className="font-medium text-slate-900">
                      {comparison.productName}
                      {comparison.productQuantityValue &&
                      comparison.productQuantityUnit
                        ? ` · ${comparison.productQuantityValue} ${comparison.productQuantityUnit}`
                        : ''}
                    </p>
                    {comparison.previous &&
                    comparison.current.unitPrice &&
                    comparison.previous.unitPrice ? (
                      <>
                        <p className="mt-1 text-sm text-slate-700">
                          Último precio:{' '}
                          {formatMoney(
                            comparison.current.unitPrice,
                            comparison.current.currency,
                          )}{' '}
                          · Anterior:{' '}
                          {formatMoney(
                            comparison.previous.unitPrice,
                            comparison.previous.currency,
                          )}
                        </p>
                        {comparison.difference && (
                          <p className="text-sm font-semibold text-slate-700">
                            Cambio:{' '}
                            {signedMoney(
                              comparison.difference,
                              comparison.current.currency,
                            )}{' '}
                            · {signedPercentage(comparison.percentage)}
                          </p>
                        )}
                        <p className="text-xs text-slate-500">
                          {storeLabel(comparison.current.store)} ·{' '}
                          {dateLabel(comparison.current.finishedAt)}
                        </p>
                      </>
                    ) : comparison.status === 'partial' ? (
                      <p className="mt-1 text-sm text-amber-700">
                        {comparison.reason === 'current_price_missing'
                          ? 'Precio actual no registrado; comparación parcial.'
                          : 'El precio anterior no está registrado; comparación parcial.'}
                      </p>
                    ) : (
                      <p className="mt-1 text-sm text-slate-600">
                        Aún no hay suficiente historial para comparar.
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
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
