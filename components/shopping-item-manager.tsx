'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  addLocalShoppingItem,
  deleteLocalShoppingItem,
  listLocalShoppingItems,
  updateLocalShoppingItemQuantity,
  type LocalShoppingItem,
} from '@/lib/local-shopping-item-repository';
import {
  listLocalProducts,
  type LocalProduct,
} from '@/lib/local-product-repository';
import {
  shoppingItemInputSchema,
  shoppingItemQuantitySchema,
} from '@/lib/shopping-item-validation';

type Mode = 'guest' | 'authenticated';
type SessionStatus = 'active' | 'completed';
type ProductView = Pick<
  LocalProduct,
  'id' | 'name' | 'brand' | 'barcode' | 'quantityValue' | 'quantityUnit'
>;
type ItemView = LocalShoppingItem;

function presentationLabel(item: ItemView) {
  if (!item.productQuantityValue || !item.productQuantityUnit)
    return item.productName;
  return `${item.productName} · ${item.productQuantityValue} ${item.productQuantityUnit}`;
}

function productSnapshot(product: ProductView) {
  return {
    id: product.id,
    name: product.name,
    brand: product.brand,
    barcode: product.barcode,
    quantityValue: product.quantityValue,
    quantityUnit: product.quantityUnit,
  };
}

export function ShoppingItemManager({
  mode,
  guestId,
  sessionId,
  status,
}: {
  mode: Mode;
  guestId?: string | null;
  sessionId: string;
  status: SessionStatus;
}) {
  const readOnly = status === 'completed';
  const [products, setProducts] = useState<ProductView[]>([]);
  const [items, setItems] = useState<ItemView[]>([]);
  const [catalogProductId, setCatalogProductId] = useState('');
  const [catalogQuantity, setCatalogQuantity] = useState('1');
  const [manualName, setManualName] = useState('');
  const [manualBrand, setManualBrand] = useState('');
  const [manualQuantity, setManualQuantity] = useState('1');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    setMessage('');
    if (mode === 'guest' && guestId) {
      setProducts(listLocalProducts(guestId));
      setItems(listLocalShoppingItems(guestId, sessionId));
      return;
    }
    if (mode === 'authenticated') {
      try {
        const [productsResponse, itemsResponse] = await Promise.all([
          fetch('/api/products'),
          fetch(`/api/shopping-sessions/${sessionId}/items`),
        ]);
        const productsData = await productsResponse.json();
        const itemsData = await itemsResponse.json();
        if (!productsResponse.ok || !itemsResponse.ok)
          throw new Error('No pudimos cargar los ítems.');
        setProducts(productsData.products ?? []);
        setItems(itemsData.items ?? []);
      } catch {
        setProducts([]);
        setItems([]);
        setMessage('No pudimos cargar los ítems.');
      }
    }
  }, [guestId, mode, sessionId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function addItem(input: unknown, product?: ProductView) {
    const parsed = shoppingItemInputSchema.safeParse(input);
    if (!parsed.success) {
      setMessage(parsed.error.issues[0]?.message ?? 'El ítem no es válido.');
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      if (mode === 'guest' && guestId) {
        addLocalShoppingItem(
          guestId,
          sessionId,
          parsed.data,
          product ? productSnapshot(product) : undefined,
        );
      } else {
        const response = await fetch(
          `/api/shopping-sessions/${sessionId}/items`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(parsed.data),
          },
        );
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error ?? 'No pudimos agregar el ítem.');
        }
      }
      await load();
      setCatalogProductId('');
      setCatalogQuantity('1');
      setManualName('');
      setManualBrand('');
      setManualQuantity('1');
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'No pudimos agregar el ítem.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function updateQuantity(itemId: string, quantity: string) {
    const parsed = shoppingItemQuantitySchema.safeParse({ quantity });
    if (!parsed.success) {
      setMessage(
        parsed.error.issues[0]?.message ?? 'La cantidad no es válida.',
      );
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      if (mode === 'guest' && guestId) {
        updateLocalShoppingItemQuantity(guestId, itemId, parsed.data);
      } else {
        const response = await fetch(`/api/shopping-items/${itemId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(parsed.data),
        });
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error ?? 'No pudimos actualizar la cantidad.');
        }
      }
      await load();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'No pudimos actualizar la cantidad.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function removeItem(itemId: string) {
    setBusy(true);
    setMessage('');
    try {
      if (mode === 'guest' && guestId) {
        deleteLocalShoppingItem(guestId, itemId);
      } else {
        const response = await fetch(`/api/shopping-items/${itemId}`, {
          method: 'DELETE',
        });
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error ?? 'No pudimos eliminar el ítem.');
        }
      }
      await load();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'No pudimos eliminar el ítem.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      className="mt-5 border-t border-blue-200 pt-4"
      aria-labelledby={`shopping-items-${sessionId}`}
    >
      <h3
        id={`shopping-items-${sessionId}`}
        className="font-semibold text-slate-900"
      >
        Ítems de la compra
      </h3>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-slate-600">
          Todavía no agregaste productos.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="rounded-lg border border-slate-200 bg-white p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-900">
                    {presentationLabel(item)}
                  </p>
                  {item.productBrand && (
                    <p className="text-xs text-slate-500">
                      {item.productBrand}
                    </p>
                  )}
                  <p className="text-sm text-slate-600">
                    Cantidad: {item.quantity}
                  </p>
                </div>
                {!readOnly && (
                  <button
                    className="text-sm font-semibold text-rose-700 disabled:opacity-50"
                    disabled={busy}
                    onClick={() => void removeItem(item.id)}
                    type="button"
                  >
                    Eliminar
                  </button>
                )}
              </div>
              {!readOnly && (
                <div className="mt-3 flex gap-2">
                  <input
                    aria-label={`Cantidad de ${item.productName}`}
                    className="min-h-10 w-28 rounded-lg border border-slate-300 px-3"
                    inputMode="decimal"
                    defaultValue={item.quantity}
                    key={`${item.id}-${item.quantity}`}
                  />
                  <button
                    className="min-h-10 rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-700 disabled:opacity-50"
                    disabled={busy}
                    onClick={(event) => {
                      const input = event.currentTarget.previousElementSibling;
                      if (input instanceof HTMLInputElement)
                        void updateQuantity(item.id, input.value);
                    }}
                    type="button"
                  >
                    Guardar cantidad
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {!readOnly && (
        <div className="mt-4 space-y-4">
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-sm font-semibold text-slate-800">
              Desde Mis productos
            </p>
            <select
              aria-label="Producto del catálogo"
              className="mt-2 min-h-10 w-full rounded-lg border border-slate-300 px-3"
              onChange={(event) => setCatalogProductId(event.target.value)}
              value={catalogProductId}
            >
              <option value="">Elegir producto</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
            <input
              aria-label="Cantidad del producto del catálogo"
              className="mt-2 min-h-10 w-full rounded-lg border border-slate-300 px-3"
              inputMode="decimal"
              onChange={(event) => setCatalogQuantity(event.target.value)}
              value={catalogQuantity}
            />
            <button
              className="mt-2 min-h-10 w-full rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
              disabled={busy || !catalogProductId}
              onClick={() => {
                const product = products.find(
                  (candidate) => candidate.id === catalogProductId,
                );
                void addItem(
                  { productId: catalogProductId, quantity: catalogQuantity },
                  product,
                );
              }}
              type="button"
            >
              Agregar producto
            </button>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-sm font-semibold text-slate-800">
              Producto manual
            </p>
            <input
              aria-label="Nombre del producto manual"
              className="mt-2 min-h-10 w-full rounded-lg border border-slate-300 px-3"
              onChange={(event) => setManualName(event.target.value)}
              placeholder="Pan francés"
              value={manualName}
            />
            <input
              aria-label="Marca del producto manual"
              className="mt-2 min-h-10 w-full rounded-lg border border-slate-300 px-3"
              onChange={(event) => setManualBrand(event.target.value)}
              placeholder="Marca (opcional)"
              value={manualBrand}
            />
            <input
              aria-label="Cantidad del producto manual"
              className="mt-2 min-h-10 w-full rounded-lg border border-slate-300 px-3"
              inputMode="decimal"
              onChange={(event) => setManualQuantity(event.target.value)}
              value={manualQuantity}
            />
            <button
              className="mt-2 min-h-10 w-full rounded-lg border border-blue-300 px-3 py-2 text-sm font-semibold text-blue-700 disabled:opacity-50"
              disabled={busy || !manualName.trim()}
              onClick={() =>
                void addItem({
                  productId: null,
                  productName: manualName,
                  brand: manualBrand,
                  quantity: manualQuantity,
                })
              }
              type="button"
            >
              Agregar manual
            </button>
          </div>
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
