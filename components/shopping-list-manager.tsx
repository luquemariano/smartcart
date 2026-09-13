/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect */
'use client';
import { useCallback, useEffect, useState } from 'react';
import {
  addLocalListToActiveShoppingSession,
  addLocalShoppingListItem,
  createLocalShoppingList,
  deleteLocalShoppingList,
  duplicateLocalShoppingList,
  listLocalShoppingLists,
  resetLocalShoppingList,
  startLocalShoppingSessionFromList,
  updateLocalShoppingListItem,
} from '@/lib/local-shopping-list-repository';
import { listLocalProducts } from '@/lib/local-product-repository';
import { listLocalStores } from '@/lib/local-store-repository';
import { listLocalPriceObservations } from '@/lib/local-price-observation-repository';
import { compareShoppingList } from '@/lib/shopping-list-comparison';
type Product = {
  id: string;
  name: string;
  brand: string | null;
  barcode: string | null;
  quantityValue: string | null;
  quantityUnit: string | null;
};
export function ShoppingListManager({
  mode,
  guestId,
}: {
  mode: 'guest' | 'authenticated';
  guestId?: string | null;
}) {
  const [lists, setLists] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [name, setName] = useState('');
  const [manual, setManual] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [productId, setProductId] = useState('');
  const [message, setMessage] = useState('');
  const [comparison, setComparison] = useState<any | null>(null);
  const load = useCallback(async () => {
    if (mode === 'guest' && guestId) {
      const data = listLocalShoppingLists(guestId);
      setLists(data);
      setProducts(listLocalProducts(guestId));
    } else {
      const r = await fetch('/api/shopping-lists');
      const d = await r.json();
      setLists(d.lists ?? []);
      const p = await fetch('/api/products');
      setProducts(p.ok ? ((await p.json()).products ?? []) : []);
    }
  }, [guestId, mode]);
  useEffect(() => {
    void load();
  }, [load]);
  async function action(fn: () => Promise<unknown> | unknown) {
    try {
      setMessage('');
      await fn();
      await load();
      if (selected && mode === 'authenticated') {
        const response = await fetch(`/api/shopping-lists/${selected.id}`);
        if (response.ok) setSelected(await response.json());
      }
      if (selected && mode === 'guest' && guestId) {
        setSelected(
          listLocalShoppingLists(guestId).find(
            (item) => item.id === selected.id,
          ) ?? null,
        );
      }
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : 'No pudimos completar la acción.',
      );
    }
  }
  async function create() {
    if (!name.trim()) return;
    await action(async () => {
      if (mode === 'guest' && guestId) createLocalShoppingList(guestId, name);
      else
        await fetch('/api/shopping-lists', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name }),
        });
      setName('');
    });
  }
  async function addItem() {
    if (!selected) return;
    await action(async () => {
      if (mode === 'guest' && guestId)
        addLocalShoppingListItem(
          guestId,
          selected.id,
          productId
            ? { productId, quantity: '1' }
            : { productId: null, productName: manual, quantity: '1' },
          products.find((p) => p.id === productId),
        );
      else
        await fetch(`/api/shopping-lists/${selected.id}/items`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(
            productId
              ? { productId, quantity: '1' }
              : { productId: null, productName: manual, quantity: '1' },
          ),
        });
      setManual('');
      setProductId('');
    });
  }
  async function compareList(listId: string) {
    try {
      setMessage('');
      if (mode === 'guest' && guestId) {
        const local = listLocalShoppingLists(guestId).find(
          (item) => item.id === listId,
        );
        if (!local) return;
        const prices = local.items.flatMap((item) =>
          item.productId
            ? listLocalPriceObservations(guestId, item.productId)
            : [],
        );
        setComparison({
          list: local,
          ...compareShoppingList(
            local.items.map((item) => ({
              productId: item.productId,
              name: item.productName,
              quantity: item.quantity,
            })),
            listLocalStores(guestId).map((store) => ({
              id: store.id,
              name: store.name,
              branchName: store.branchName ?? null,
            })),
            prices,
          ),
        });
      } else {
        const response = await fetch(
          `/api/shopping-lists/${listId}/comparison`,
        );
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.error ?? 'No pudimos comparar la lista.');
        setComparison(data);
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'No pudimos comparar la lista.',
      );
    }
  }
  return (
    <section
      className="mt-8 border-t border-slate-200 pt-6"
      aria-labelledby="shopping-lists-title"
    >
      <h2
        id="shopping-lists-title"
        className="text-xl font-bold text-slate-950"
      >
        Mis listas
      </h2>
      <p className="mt-2 text-sm text-slate-600">
        Plantillas reutilizables para tus compras.
      </p>
      <div className="mt-4 flex gap-2">
        <input
          aria-label="Nombre de la lista"
          className="min-h-11 min-w-0 flex-1 rounded-xl border border-slate-300 px-3"
          placeholder="Compra mensual"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button
          className="min-h-11 rounded-xl bg-blue-600 px-4 font-semibold text-white"
          onClick={() => void create()}
          type="button"
        >
          Crear
        </button>
      </div>
      {lists.length === 0 ? (
        <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
          Todavía no creaste listas.
        </p>
      ) : (
        <ul className="mt-5 space-y-2" aria-label="Listas de compras">
          {lists.map((list) => (
            <li
              key={list.id}
              className="rounded-xl border border-slate-200 bg-white p-4"
            >
              <button
                className="w-full text-left"
                onClick={() => {
                  if (mode === 'guest') setSelected(list);
                  else
                    void fetch(`/api/shopping-lists/${list.id}`)
                      .then((response) => response.json())
                      .then(setSelected);
                }}
                type="button"
              >
                <span className="font-semibold">{list.name}</span>
                <span className="ml-2 text-sm text-slate-500">
                  {list.items?.length ?? list.itemCount ?? 0} ítems
                </span>
              </button>
              <div className="mt-3 flex flex-wrap gap-3 text-sm font-semibold">
                <button
                  className="text-blue-700"
                  onClick={() =>
                    void action(() =>
                      mode === 'guest' && guestId
                        ? duplicateLocalShoppingList(guestId, list.id)
                        : fetch(`/api/shopping-lists/${list.id}`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ action: 'duplicate' }),
                          }),
                    )
                  }
                  type="button"
                >
                  Duplicar
                </button>
                <button
                  className="text-rose-700"
                  onClick={() =>
                    void action(() =>
                      mode === 'guest' && guestId
                        ? deleteLocalShoppingList(guestId, list.id)
                        : fetch(`/api/shopping-lists/${list.id}`, {
                            method: 'DELETE',
                          }),
                    )
                  }
                  type="button"
                >
                  Eliminar
                </button>
                <button
                  className="text-emerald-700"
                  onClick={() => void compareList(list.id)}
                  type="button"
                >
                  Comparar supermercados
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {selected && (
        <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4">
          <h3 className="font-bold">{selected.list?.name ?? selected.name}</h3>
          <ul className="mt-3 space-y-2">
            {(selected.items ?? []).map((item: any) => (
              <li
                key={item.id}
                className={`flex items-center gap-2 text-sm ${item.isChecked ? 'text-slate-400 line-through' : 'text-slate-800'}`}
              >
                <input
                  aria-label={`Marcar ${item.productName}`}
                  checked={item.isChecked}
                  onChange={(e) =>
                    void action(() =>
                      mode === 'guest' && guestId
                        ? updateLocalShoppingListItem(guestId, item.id, {
                            isChecked: e.target.checked,
                          })
                        : fetch(`/api/shopping-list-items/${item.id}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              isChecked: e.target.checked,
                            }),
                          }),
                    )
                  }
                  type="checkbox"
                />
                <span>
                  {item.productName} ×{item.quantity}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-4 space-y-2">
            <select
              aria-label="Producto para la lista"
              className="min-h-10 w-full rounded-lg border border-slate-300 px-3"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
            >
              <option value="">Producto manual…</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            {!productId && (
              <input
                aria-label="Nombre manual para la lista"
                className="min-h-10 w-full rounded-lg border border-slate-300 px-3"
                placeholder="Pan"
                value={manual}
                onChange={(e) => setManual(e.target.value)}
              />
            )}
            <button
              className="min-h-10 w-full rounded-lg bg-blue-600 px-3 font-semibold text-white"
              onClick={() => void addItem()}
              type="button"
            >
              + Agregar ítem
            </button>
            <button
              className="min-h-10 w-full rounded-lg border border-blue-300 px-3 font-semibold text-blue-700"
              onClick={() =>
                void action(() =>
                  mode === 'guest' && guestId
                    ? resetLocalShoppingList(guestId, selected.id)
                    : fetch(`/api/shopping-lists/${selected.id}/items`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'reset' }),
                      }),
                )
              }
              type="button"
            >
              Desmarcar todos
            </button>
            <button
              className="min-h-10 w-full rounded-lg border border-slate-300 px-3 font-semibold text-slate-700"
              onClick={() =>
                void action(() =>
                  mode === 'guest' && guestId
                    ? addLocalListToActiveShoppingSession(
                        guestId,
                        selected.id,
                        products,
                      )
                    : fetch(`/api/shopping-lists/${selected.id}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'import' }),
                      }),
                )
              }
              type="button"
            >
              Agregar lista a la compra activa
            </button>
            <button
              className="min-h-10 w-full rounded-lg border border-slate-300 px-3 font-semibold text-slate-700"
              onClick={() =>
                void action(() =>
                  mode === 'guest' && guestId
                    ? startLocalShoppingSessionFromList(
                        guestId,
                        selected.id,
                        products,
                      )
                    : fetch(`/api/shopping-lists/${selected.id}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          action: 'start-import',
                          options: {},
                        }),
                      }),
                )
              }
              type="button"
            >
              Empezar compra con esta lista
            </button>
          </div>
        </div>
      )}
      {comparison && (
        <div
          className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4"
          aria-label="Comparación de supermercados"
        >
          <h3 className="font-bold">Comparación: {comparison.list.name}</h3>
          {comparison.stores.length === 0 ? (
            <p className="mt-2 text-sm text-slate-700">
              No hay precios conocidos para comparar.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {comparison.stores.map((store: any) => (
                <li className="rounded-lg bg-white p-3" key={store.store.id}>
                  <p className="font-semibold">
                    {store.store.name}
                    {store.store.branchName
                      ? ` · ${store.store.branchName}`
                      : ''}
                  </p>
                  <p className="text-sm text-slate-700">
                    ${store.totalKnown} · {store.pricedItems}/
                    {comparison.list.items?.filter(
                      (item: any) => item.productId,
                    ).length ?? store.totalItems}{' '}
                    productos · {store.coveragePercent}% cobertura
                  </p>
                  {store.items.filter((item: any) => item.status !== 'priced')
                    .length > 0 && (
                    <p className="text-sm text-rose-700">
                      Faltan:{' '}
                      {store.items
                        .filter((item: any) => item.status !== 'priced')
                        .map((item: any) => item.name)
                        .join(', ')}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
          {comparison.bestStore ? (
            <p className="mt-3 font-semibold text-emerald-800">
              Mejor opción: {comparison.bestStore.name}
            </p>
          ) : (
            comparison.stores.length > 0 && (
              <p className="mt-3 text-sm text-slate-700">
                No hay suficiente cobertura para determinar el supermercado más
                barato.
              </p>
            )
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
