/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  addLocalShoppingItem,
  deleteLocalShoppingItem,
  listLocalShoppingItems,
  updateLocalShoppingItem,
  type LocalShoppingItem,
} from '@/lib/local-shopping-item-repository';
import {
  listLocalProducts,
  type LocalProduct,
} from '@/lib/local-product-repository';
import { listLocalShoppingSessions } from '@/lib/local-shopping-session-repository';
import { formatMoney } from '@/lib/money';
import {
  calculateShoppingSummary,
  shoppingItemSubtotal,
  type ShoppingSummary,
} from '@/lib/shopping-summary';
import {
  shoppingItemInputSchema,
  shoppingItemPatchSchema,
} from '@/lib/shopping-item-validation';
import { productInputSchema } from '@/lib/product-validation';
import {
  listOffline,
  putOffline,
  deleteOffline,
  enqueueOfflineOperation,
} from '@/lib/offline-db';
import { makeOfflineOperation } from '@/lib/offline-sync';
import { useOnlineStatus } from '@/lib/online-status';

type Mode = 'guest' | 'authenticated';
type SessionStatus = 'active' | 'completed';
type ProductView = Pick<
  LocalProduct,
  'id' | 'name' | 'brand' | 'barcode' | 'quantityValue' | 'quantityUnit'
>;
type ItemView = Omit<LocalShoppingItem, 'createdAt' | 'updatedAt'> & {
  createdAt: string | Date;
  updatedAt: string | Date;
  subtotal?: string | null;
};
type EditValue = { quantity: string; unitPrice: string };

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

function quantityWithDelta(value: string, delta: 1 | -1) {
  const [whole, fraction = ''] = value.split('.');
  const scaled =
    BigInt(whole) * BigInt(1000) + BigInt(fraction.padEnd(3, '0') || '0');
  const next = scaled + BigInt(delta);
  if (next < BigInt(1)) return value;
  const nextWhole = next / BigInt(1000);
  const nextFraction = (next % BigInt(1000))
    .toString()
    .padStart(3, '0')
    .replace(/0+$/, '');
  return nextFraction ? `${nextWhole}.${nextFraction}` : `${nextWhole}`;
}

function pendingPrice(item: ItemView) {
  return item.unitPrice === null
    ? 'Precio pendiente'
    : formatMoney(item.unitPrice);
}

export function ShoppingItemManager({
  mode,
  guestId,
  ownerUserId,
  sessionId,
  status,
  onSummaryChange,
}: {
  mode: Mode;
  guestId?: string | null;
  ownerUserId?: string;
  sessionId: string;
  status: SessionStatus;
  onSummaryChange?: (summary: ShoppingSummary) => void;
}) {
  const online = useOnlineStatus();
  const readOnly = status === 'completed';
  const [products, setProducts] = useState<ProductView[]>([]);
  const [items, setItems] = useState<ItemView[]>([]);
  const [summary, setSummary] = useState<ShoppingSummary | null>(null);
  const [editValues, setEditValues] = useState<Record<string, EditValue>>({});
  const [catalogProductId, setCatalogProductId] = useState('');
  const [catalogQuantity, setCatalogQuantity] = useState('1');
  const [catalogUnitPrice, setCatalogUnitPrice] = useState('');
  const [manualName, setManualName] = useState('');
  const [manualBrand, setManualBrand] = useState('');
  const [manualQuantity, setManualQuantity] = useState('1');
  const [manualUnitPrice, setManualUnitPrice] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const publishSummary = useCallback(
    (next: ShoppingSummary) => {
      setSummary(next);
      onSummaryChange?.(next);
    },
    [onSummaryChange],
  );

  const load = useCallback(async () => {
    setMessage('');
    if (mode === 'guest' && guestId) {
      const localItems = listLocalShoppingItems(guestId, sessionId);
      setProducts(listLocalProducts(guestId));
      setItems(localItems);
      const localSession = listLocalShoppingSessions(guestId).find(
        (candidate) => candidate.id === sessionId,
      );
      if (localSession)
        publishSummary(
          calculateShoppingSummary(
            localSession.budgetAmount,
            localSession.currency,
            localItems,
          ),
        );
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
        if (mode === 'authenticated' && ownerUserId)
          for (const product of productsData.products ?? [])
            await putOffline('offline_products', {
              ...product,
              id: product.id,
              ownerUserId,
            });
        setItems(itemsData.items ?? []);
        if (mode === 'authenticated' && ownerUserId)
          for (const item of itemsData.items ?? [])
            await putOffline('offline_items', {
              ...item,
              id: item.id,
              ownerUserId,
              sessionId,
            });
        if (itemsData.summary) publishSummary(itemsData.summary);
      } catch {
        if (mode === 'authenticated' && ownerUserId) {
          setProducts(
            await listOffline<ProductView & { ownerUserId: string }>(
              'offline_products',
              (value) => value.ownerUserId === ownerUserId,
            ),
          );
          setItems(
            await listOffline<
              ItemView & { ownerUserId: string; sessionId: string }
            >(
              'offline_items',
              (value) =>
                value.ownerUserId === ownerUserId &&
                value.sessionId === sessionId,
            ),
          );
        } else {
          setProducts([]);
          setItems([]);
        }
        setSummary(null);
        setMessage(
          online
            ? 'No pudimos cargar los ítems.'
            : 'Sin conexión: mostramos la última compra guardada.',
        );
      }
    }
  }, [guestId, mode, online, ownerUserId, publishSummary, sessionId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function addItem(input: unknown, product?: ProductView) {
    const parsed = shoppingItemInputSchema.safeParse(input);
    if (!parsed.success) {
      setMessage(parsed.error.issues[0]?.message ?? 'El ítem no es válido.');
      return;
    }
    setBusy(true);
    setMessage('');
    const queueAuthenticatedItem = async () => {
      if (!ownerUserId) throw new Error('No hay una cuenta autenticada.');
      const id = crypto.randomUUID();
      let itemInput = parsed.data;
      let localProduct = product;
      if (parsed.data.productId === null) {
        const productInput = productInputSchema.parse({
          name: parsed.data.productName,
          brand: parsed.data.brand,
          barcode: parsed.data.barcode,
          quantityValue: parsed.data.quantityValue,
          quantityUnit: parsed.data.quantityUnit,
        });
        const localProductId = crypto.randomUUID();
        localProduct = { ...productInput, id: localProductId };
        await putOffline('offline_products', {
          id: localProductId,
          ownerUserId,
          ...productInput,
        });
        await enqueueOfflineOperation(
          makeOfflineOperation(ownerUserId, 'product_create', productInput, {
            localEntityId: localProductId,
          }),
        );
        itemInput = {
          productId: localProductId,
          quantity: parsed.data.quantity,
          unitPrice: parsed.data.unitPrice,
        };
      }
      const itemSnapshot = localProduct
        ? productSnapshot(localProduct)
        : {
            id: '',
            name:
              (parsed.data as { productName?: string }).productName ??
              'Producto',
            brand: null,
            barcode: null,
            quantityValue: null,
            quantityUnit: null,
          };
      await putOffline('offline_items', {
        id,
        ownerUserId,
        sessionId,
        productId: itemInput.productId,
        productName: itemSnapshot.name,
        productBrand: itemSnapshot.brand,
        productBarcode: itemSnapshot.barcode,
        productQuantityValue: itemSnapshot.quantityValue,
        productQuantityUnit: itemSnapshot.quantityUnit,
        quantity: itemInput.quantity,
        unitPrice: itemInput.unitPrice,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      await enqueueOfflineOperation(
        makeOfflineOperation(
          ownerUserId,
          'shopping_item_create',
          { sessionId, input: itemInput },
          { localEntityId: id },
        ),
      );
    };
    try {
      if (mode === 'guest' && guestId) {
        addLocalShoppingItem(
          guestId,
          sessionId,
          parsed.data,
          product ? productSnapshot(product) : undefined,
        );
      } else if (!online && ownerUserId) {
        const id = crypto.randomUUID();
        let itemInput = parsed.data;
        if (parsed.data.productId === null) {
          const productInput = productInputSchema.parse({
            name: parsed.data.productName,
            brand: parsed.data.brand,
            barcode: parsed.data.barcode,
            quantityValue: parsed.data.quantityValue,
            quantityUnit: parsed.data.quantityUnit,
          });
          const localProductId = crypto.randomUUID();
          await putOffline('offline_products', {
            id: localProductId,
            ownerUserId,
            ...productInput,
          });
          await enqueueOfflineOperation(
            makeOfflineOperation(ownerUserId, 'product_create', productInput, {
              localEntityId: localProductId,
            }),
          );
          itemInput = {
            productId: localProductId,
            quantity: parsed.data.quantity,
            unitPrice: parsed.data.unitPrice,
          };
        }
        const snapshot = product
          ? productSnapshot(product)
          : {
              id: '',
              name:
                (parsed.data as { productName?: string }).productName ??
                'Producto',
              brand: null,
              barcode: null,
              quantityValue: null,
              quantityUnit: null,
            };
        await putOffline('offline_items', {
          id,
          ownerUserId,
          sessionId,
          productId: itemInput.productId,
          productName: snapshot.name,
          productBrand: snapshot.brand,
          productBarcode: snapshot.barcode,
          productQuantityValue: snapshot.quantityValue,
          productQuantityUnit: snapshot.quantityUnit,
          quantity: itemInput.quantity,
          unitPrice: itemInput.unitPrice,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        await enqueueOfflineOperation(
          makeOfflineOperation(
            ownerUserId,
            'shopping_item_create',
            { sessionId, input: itemInput },
            { localEntityId: id },
          ),
        );
      } else {
        let response: Response;
        try {
          response = await fetch(`/api/shopping-sessions/${sessionId}/items`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(parsed.data),
          });
        } catch (error) {
          if (error instanceof TypeError && ownerUserId) {
            await queueAuthenticatedItem();
            setMessage('Sin conexión: cambio guardado.');
            response = new Response('{}', { status: 201 });
          } else throw error;
        }
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error ?? 'No pudimos agregar el ítem.');
        }
      }
      await load();
      setCatalogProductId('');
      setCatalogQuantity('1');
      setCatalogUnitPrice('');
      setManualName('');
      setManualBrand('');
      setManualQuantity('1');
      setManualUnitPrice('');
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'No pudimos agregar el ítem.',
      );
    } finally {
      setBusy(false);
    }
  }

  function editValue(item: ItemView): EditValue {
    return (
      editValues[item.id] ?? {
        quantity: item.quantity,
        unitPrice: item.unitPrice ?? '',
      }
    );
  }

  async function updateItem(item: ItemView) {
    const value = editValue(item);
    const parsed = shoppingItemPatchSchema.safeParse({
      quantity: value.quantity,
      unitPrice: value.unitPrice.trim() === '' ? null : value.unitPrice,
    });
    if (!parsed.success) {
      setMessage(parsed.error.issues[0]?.message ?? 'El ítem no es válido.');
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      if (mode === 'guest' && guestId)
        updateLocalShoppingItem(guestId, item.id, parsed.data);
      else if (!online && ownerUserId) {
        await putOffline('offline_items', {
          ...item,
          ...parsed.data,
          ownerUserId,
          sessionId,
          id: item.id,
          updatedAt: new Date().toISOString(),
        });
        await enqueueOfflineOperation(
          makeOfflineOperation(
            ownerUserId,
            'shopping_item_update',
            { patch: parsed.data, itemId: item.id },
            { localEntityId: item.id, serverEntityId: item.id },
          ),
        );
      } else {
        let response: Response | undefined;
        try {
          response = await fetch(`/api/shopping-items/${item.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(parsed.data),
          });
        } catch (error) {
          if (!(error instanceof TypeError && ownerUserId)) throw error;
          await putOffline('offline_items', {
            ...item,
            ...parsed.data,
            ownerUserId,
            sessionId,
            id: item.id,
            updatedAt: new Date().toISOString(),
          });
          await enqueueOfflineOperation(
            makeOfflineOperation(
              ownerUserId,
              'shopping_item_update',
              { patch: parsed.data, itemId: item.id },
              { localEntityId: item.id, serverEntityId: item.id },
            ),
          );
          setMessage('Sin conexión: cambio guardado.');
        }
        if (response && !response.ok) {
          const data = await response.json();
          throw new Error(data.error ?? 'No pudimos actualizar el ítem.');
        }
      }
      await load();
      setMessage('Ítem actualizado.');
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'No pudimos actualizar el ítem.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function removeItem(itemId: string) {
    setBusy(true);
    setMessage('');
    try {
      if (mode === 'guest' && guestId) deleteLocalShoppingItem(guestId, itemId);
      else if (!online && ownerUserId) {
        await deleteOffline('offline_items', itemId);
        await enqueueOfflineOperation(
          makeOfflineOperation(
            ownerUserId,
            'shopping_item_delete',
            { itemId },
            { localEntityId: itemId, serverEntityId: itemId },
          ),
        );
      } else {
        let response: Response | undefined;
        try {
          response = await fetch(`/api/shopping-items/${itemId}`, {
            method: 'DELETE',
          });
        } catch (error) {
          if (!(error instanceof TypeError && ownerUserId)) throw error;
          await deleteOffline('offline_items', itemId);
          await enqueueOfflineOperation(
            makeOfflineOperation(
              ownerUserId,
              'shopping_item_delete',
              { itemId },
              { localEntityId: itemId, serverEntityId: itemId },
            ),
          );
          setMessage('Sin conexión: eliminación guardada.');
        }
        if (response && !response.ok) {
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
      {readOnly && summary && (
        <p className="mt-2 text-sm font-semibold text-slate-700">
          Total final: {formatMoney(summary.itemsTotal, summary.currency)}
        </p>
      )}
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-slate-600">
          Todavía no agregaste productos.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {items.map((item) => {
            const value = editValue(item);
            const subtotal = item.subtotal ?? shoppingItemSubtotal(item);
            return (
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
                    <p className="text-sm text-slate-600">
                      {pendingPrice(item)}
                      {item.unitPrice && ' c/u'}
                    </p>
                    {subtotal ? (
                      <p className="text-sm font-semibold text-slate-800">
                        Subtotal: {formatMoney(subtotal)}
                      </p>
                    ) : (
                      <p className="text-sm text-slate-500">
                        Subtotal pendiente
                      </p>
                    )}
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
                  <div className="mt-3 flex flex-wrap items-end gap-2">
                    <div>
                      <label
                        className="block text-xs font-medium text-slate-600"
                        htmlFor={`quantity-${item.id}`}
                      >
                        Cantidad
                      </label>
                      <div className="flex gap-1">
                        <button
                          aria-label={`Reducir cantidad de ${item.productName}`}
                          className="min-h-10 min-w-10 rounded-lg border border-slate-300"
                          disabled={busy}
                          onClick={() =>
                            setEditValues((current) => ({
                              ...current,
                              [item.id]: {
                                ...value,
                                quantity: quantityWithDelta(value.quantity, -1),
                              },
                            }))
                          }
                          type="button"
                        >
                          −
                        </button>
                        <input
                          id={`quantity-${item.id}`}
                          aria-label={`Cantidad de ${item.productName}`}
                          className="min-h-10 w-24 rounded-lg border border-slate-300 px-3"
                          inputMode="decimal"
                          onChange={(event) =>
                            setEditValues((current) => ({
                              ...current,
                              [item.id]: {
                                ...value,
                                quantity: event.target.value,
                              },
                            }))
                          }
                          value={value.quantity}
                        />
                        <button
                          aria-label={`Aumentar cantidad de ${item.productName}`}
                          className="min-h-10 min-w-10 rounded-lg border border-slate-300"
                          disabled={busy}
                          onClick={() =>
                            setEditValues((current) => ({
                              ...current,
                              [item.id]: {
                                ...value,
                                quantity: quantityWithDelta(value.quantity, 1),
                              },
                            }))
                          }
                          type="button"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <label className="block text-xs font-medium text-slate-600">
                      Precio unitario
                      <input
                        aria-label={`Precio de ${item.productName}`}
                        className="mt-1 min-h-10 w-32 rounded-lg border border-slate-300 px-3"
                        inputMode="decimal"
                        onChange={(event) =>
                          setEditValues((current) => ({
                            ...current,
                            [item.id]: {
                              ...value,
                              unitPrice: event.target.value,
                            },
                          }))
                        }
                        placeholder="1850.00"
                        value={value.unitPrice}
                      />
                    </label>
                    <button
                      className="min-h-10 rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-700 disabled:opacity-50"
                      disabled={busy}
                      onClick={() => void updateItem(item)}
                      type="button"
                    >
                      Guardar cantidad
                    </button>
                  </div>
                )}
              </li>
            );
          })}
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
            <input
              aria-label="Precio unitario del producto del catálogo"
              className="mt-2 min-h-10 w-full rounded-lg border border-slate-300 px-3"
              inputMode="decimal"
              onChange={(event) => setCatalogUnitPrice(event.target.value)}
              placeholder="Precio unitario (opcional)"
              value={catalogUnitPrice}
            />
            <button
              className="mt-2 min-h-10 w-full rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
              disabled={busy || !catalogProductId}
              onClick={() => {
                const product = products.find(
                  (candidate) => candidate.id === catalogProductId,
                );
                void addItem(
                  {
                    productId: catalogProductId,
                    quantity: catalogQuantity,
                    unitPrice: catalogUnitPrice || null,
                  },
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
            <input
              aria-label="Precio unitario del producto manual"
              className="mt-2 min-h-10 w-full rounded-lg border border-slate-300 px-3"
              inputMode="decimal"
              onChange={(event) => setManualUnitPrice(event.target.value)}
              placeholder="Precio unitario (opcional)"
              value={manualUnitPrice}
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
                  unitPrice: manualUnitPrice || null,
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
