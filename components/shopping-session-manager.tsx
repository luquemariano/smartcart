'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  finishLocalShoppingSession,
  getActiveLocalShoppingSession,
  startLocalShoppingSession,
  updateLocalShoppingSessionBudget,
  type LocalShoppingSession,
} from '@/lib/local-shopping-session-repository';
import { formatMoney } from '@/lib/money';
import {
  calculateShoppingSummary,
  type ShoppingSummary,
} from '@/lib/shopping-summary';
import { listLocalShoppingItems } from '@/lib/local-shopping-item-repository';
import {
  budgetShoppingSessionSchema,
  startShoppingSessionSchema,
} from '@/lib/shopping-session-validation';
import { listLocalStores, type LocalStore } from '@/lib/local-store-repository';
import { ShoppingItemManager } from '@/components/shopping-item-manager';
import { ShoppingHistoryManager } from '@/components/shopping-history-manager';
import { BarcodeProductAdder } from '@/components/barcode-product-adder';

type SessionView = LocalShoppingSession;
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
  const [active, setActive] = useState<SessionView | null>(null);
  const [activeSummary, setActiveSummary] = useState<ShoppingSummary | null>(
    null,
  );
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const [storeId, setStoreId] = useState('');
  const [budgetInput, setBudgetInput] = useState('');
  const [budgetEditOpen, setBudgetEditOpen] = useState(false);
  const [budgetEditValue, setBudgetEditValue] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setMessage('');
    setHistoryRefreshKey((current) => current + 1);
    if (mode === 'guest' && guestId) {
      const localStores = listLocalStores(guestId);
      const localActive = getActiveLocalShoppingSession(guestId);
      setStores(localStores);
      setActive(localActive);
      setActiveSummary(
        localActive
          ? calculateShoppingSummary(
              localActive.budgetAmount,
              localActive.currency,
              listLocalShoppingItems(guestId, localActive.id),
            )
          : null,
      );
      setBudgetEditValue(localActive?.budgetAmount ?? '');
      setLoading(false);
      return;
    }
    if (mode === 'authenticated') {
      try {
        const [storesResponse, activeResponse] = await Promise.all([
          fetch('/api/stores'),
          fetch('/api/shopping-sessions/active'),
        ]);
        const storesData = await storesResponse.json();
        const activeData = await activeResponse.json();
        const nextActive = activeResponse.ok
          ? (activeData?.session ?? null)
          : null;
        setStores(storesResponse.ok ? (storesData?.stores ?? []) : []);
        setActive(nextActive);
        setActiveSummary(
          activeResponse.ok ? (activeData?.summary ?? null) : null,
        );
        setBudgetEditValue(nextActive?.budgetAmount ?? '');
        if (!storesResponse.ok || !activeResponse.ok) {
          setMessage('No pudimos cargar tus compras.');
        }
      } catch {
        setStores([]);
        setActive(null);
        setActiveSummary(null);
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
    const parsed = startShoppingSessionSchema.safeParse({
      storeId: storeId || null,
      budgetAmount: budgetInput,
    });
    if (!parsed.success) {
      setMessage(
        parsed.error.issues[0]?.message ?? 'El presupuesto no es válido.',
      );
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      if (mode === 'guest' && guestId) {
        startLocalShoppingSession(
          guestId,
          parsed.data.storeId,
          parsed.data.budgetAmount,
        );
      } else {
        const response = await fetch('/api/shopping-sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(parsed.data),
        });
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error ?? 'No pudimos iniciar la compra.');
        }
      }
      setBudgetInput('');
      await load();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'No pudimos iniciar la compra.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function saveBudget() {
    if (!active) return;
    const parsed = budgetShoppingSessionSchema.safeParse({
      budgetAmount: budgetEditValue,
    });
    if (!parsed.success) {
      setMessage(
        parsed.error.issues[0]?.message ?? 'El presupuesto no es válido.',
      );
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      if (mode === 'guest' && guestId) {
        updateLocalShoppingSessionBudget(
          guestId,
          active.id,
          parsed.data.budgetAmount,
        );
      } else {
        const response = await fetch(`/api/shopping-sessions/${active.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(parsed.data),
        });
        if (!response.ok) {
          const data = await response.json();
          throw new Error(
            data.error ?? 'No pudimos actualizar el presupuesto.',
          );
        }
      }
      setBudgetEditOpen(false);
      await load();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'No pudimos actualizar el presupuesto.',
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
      setBudgetEditOpen(false);
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

  function budgetUsageWidth(summary: ShoppingSummary) {
    const percentage = Number(summary.budgetUsagePercentage ?? '0');
    return `${Math.min(100, Math.max(0, percentage))}%`;
  }

  function summaryMessage(summary: ShoppingSummary) {
    if (!summary.budgetAmount || !summary.budgetUsagePercentage) return null;
    const percentage = Number(summary.budgetUsagePercentage);
    if (summary.itemsTotal === '0.00')
      return 'Todavía no hay gasto registrado.';
    if (percentage >= 100)
      return `Superaste tu presupuesto en ${formatMoney(summary.remainingBudget ? summary.remainingBudget.replace('-', '') : '0.00', summary.currency)}.`;
    if (percentage >= 80) return 'Estás cerca de tu presupuesto.';
    return `Te quedan ${formatMoney(summary.remainingBudget, summary.currency)}.`;
  }

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
          {activeSummary && (
            <div
              className="mt-4 rounded-lg bg-white p-3"
              aria-label="Resumen de la compra"
            >
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Gastado
                  </p>
                  <p className="mt-1 text-lg font-bold text-slate-950">
                    {formatMoney(
                      activeSummary.itemsTotal,
                      activeSummary.currency,
                    )}
                  </p>
                </div>
                {activeSummary.budgetAmount && (
                  <>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Presupuesto
                      </p>
                      <p className="mt-1 text-lg font-bold text-slate-950">
                        {formatMoney(
                          activeSummary.budgetAmount,
                          activeSummary.currency,
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Disponible
                      </p>
                      <p
                        className={`mt-1 text-lg font-bold ${activeSummary.remainingBudget?.startsWith('-') ? 'text-rose-700' : 'text-slate-950'}`}
                      >
                        {activeSummary.itemsTotal === '0.00'
                          ? 'Sin gastos todavía'
                          : formatMoney(
                              activeSummary.remainingBudget,
                              activeSummary.currency,
                            )}
                      </p>
                    </div>
                  </>
                )}
              </div>
              {activeSummary.budgetAmount &&
                activeSummary.budgetUsagePercentage && (
                  <div className="mt-4">
                    <div className="flex justify-between text-sm text-slate-600">
                      <span>Uso del presupuesto</span>
                      <span>{activeSummary.budgetUsagePercentage}%</span>
                    </div>
                    <div
                      className="mt-2 h-3 overflow-hidden rounded-full bg-slate-200"
                      role="progressbar"
                      aria-label="Uso del presupuesto"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={Math.min(
                        100,
                        Math.max(
                          0,
                          Number(activeSummary.budgetUsagePercentage),
                        ),
                      )}
                    >
                      <div
                        className={`h-full rounded-full ${Number(activeSummary.budgetUsagePercentage) >= 100 ? 'bg-rose-600' : Number(activeSummary.budgetUsagePercentage) >= 80 ? 'bg-amber-500' : 'bg-blue-600'}`}
                        style={{ width: budgetUsageWidth(activeSummary) }}
                      />
                    </div>
                    <p className="mt-2 text-sm text-slate-700">
                      {summaryMessage(activeSummary)}
                    </p>
                  </div>
                )}
            </div>
          )}
          <div className="mt-4 rounded-lg bg-white/70 p-3">
            <p className="text-sm font-semibold text-slate-700">Presupuesto</p>
            {!active.budgetAmount && (
              <p className="mt-1 text-sm text-slate-600">
                Sin presupuesto definido
              </p>
            )}
            {budgetEditOpen ? (
              <div className="mt-3 space-y-2">
                <input
                  aria-label="Presupuesto de la compra"
                  className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3"
                  inputMode="decimal"
                  onChange={(event) => setBudgetEditValue(event.target.value)}
                  placeholder="100000.00"
                  value={budgetEditValue}
                />
                <div className="flex gap-3">
                  <button
                    className="min-h-10 flex-1 rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                    disabled={busy}
                    onClick={() => void saveBudget()}
                    type="button"
                  >
                    Guardar presupuesto
                  </button>
                  <button
                    className="min-h-10 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700"
                    onClick={() => setBudgetEditOpen(false)}
                    type="button"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-3 flex flex-wrap gap-3">
                <button
                  className="text-sm font-semibold text-blue-700"
                  onClick={() => {
                    setBudgetEditValue(active.budgetAmount ?? '');
                    setBudgetEditOpen(true);
                  }}
                  type="button"
                >
                  {active.budgetAmount
                    ? 'Cambiar presupuesto'
                    : 'Definir presupuesto'}
                </button>
                {active.budgetAmount && (
                  <button
                    className="text-sm font-semibold text-slate-600"
                    onClick={() => {
                      setBudgetEditValue('');
                      setBudgetEditOpen(true);
                    }}
                    type="button"
                  >
                    Quitar presupuesto
                  </button>
                )}
              </div>
            )}
          </div>
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
          <ShoppingItemManager
            guestId={guestId}
            mode={mode}
            sessionId={active.id}
            status={active.status}
            onSummaryChange={setActiveSummary}
          />
          <BarcodeProductAdder
            guestId={guestId}
            mode={mode}
            sessionId={active.id}
          />
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
          <label className="mt-4 block text-sm font-medium text-slate-700">
            Presupuesto (opcional)
            <input
              aria-label="Presupuesto opcional"
              className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3"
              inputMode="decimal"
              onChange={(event) => setBudgetInput(event.target.value)}
              placeholder="100000.00"
              value={budgetInput}
            />
            <span className="mt-1 block text-xs font-normal text-slate-500">
              Importe en ARS, sin separadores de miles y con punto decimal.
            </span>
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
      <ShoppingHistoryManager
        key={historyRefreshKey}
        guestId={guestId}
        mode={mode}
        refreshKey={historyRefreshKey}
        stores={stores}
      />
      {message && (
        <p className="mt-3 text-sm text-rose-700" role="alert">
          {message}
        </p>
      )}
    </section>
  );
}
