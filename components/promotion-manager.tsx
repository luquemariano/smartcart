/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect, react-hooks/exhaustive-deps, @typescript-eslint/no-unused-expressions */
'use client';
import { useEffect, useState } from 'react';
import { listLocalProducts } from '@/lib/local-product-repository';
import { listLocalStores } from '@/lib/local-store-repository';
import {
  createLocalPromotion,
  deleteLocalPromotion,
  listLocalPromotions,
  updateLocalPromotion,
  type LocalPromotion,
} from '@/lib/local-promotion-repository';

type Props = { mode: 'guest' | 'authenticated'; guestId?: string | null };
const blank = {
  storeId: '',
  productId: '',
  type: 'percentage',
  value: '20.00',
  buyQuantity: '',
  payQuantity: '',
  startsAt: new Date().toISOString().slice(0, 16),
  endsAt: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
  isActive: true,
};
export function PromotionManager({ mode, guestId }: Props) {
  const [stores, setStores] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [form, setForm] = useState<any>(blank);
  const [editing, setEditing] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const load = async () => {
    if (mode === 'guest' && guestId) {
      setStores(listLocalStores(guestId));
      setProducts(listLocalProducts(guestId));
      setItems(listLocalPromotions(guestId));
    } else {
      const [s, p, r] = await Promise.all([
        fetch('/api/stores').then((x) => x.json()),
        fetch('/api/products').then((x) => x.json()),
        fetch('/api/promotions').then((x) => x.json()),
      ]);
      setStores(s.stores ?? []);
      setProducts(p.products ?? []);
      setItems(r.promotions ?? []);
    }
  };
  useEffect(() => {
    void load();
  }, [guestId, mode]);
  function payload() {
    return {
      ...form,
      value: form.type === 'buy_n_pay_m' ? null : form.value,
      buyQuantity:
        form.type === 'buy_n_pay_m' ? Number(form.buyQuantity) : null,
      payQuantity:
        form.type === 'buy_n_pay_m' ? Number(form.payQuantity) : null,
      startsAt: new Date(form.startsAt).toISOString(),
      endsAt: new Date(form.endsAt).toISOString(),
    };
  }
  async function save() {
    try {
      const body = payload();
      if (mode === 'guest' && guestId) {
        const data = {
          ...body,
          id: '',
          guestId,
          createdAt: '',
          updatedAt: '',
        } as LocalPromotion;
        editing
          ? updateLocalPromotion(guestId, editing, data)
          : createLocalPromotion(guestId, data);
      } else {
        await fetch(
          editing ? `/api/promotions/${editing}` : '/api/promotions',
          {
            method: editing ? 'PATCH' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          },
        ).then(async (r) => {
          if (!r.ok) throw new Error((await r.json()).error);
        });
      }
      setForm(blank);
      setEditing(null);
      setMessage('Promoción guardada.');
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Promoción inválida.');
    }
  }
  async function remove(id: string) {
    if (mode === 'guest' && guestId) deleteLocalPromotion(guestId, id);
    else await fetch(`/api/promotions/${id}`, { method: 'DELETE' });
    await load();
  }
  return (
    <section className="rounded-xl border border-slate-200 p-4">
      <h2 className="font-bold">Promociones</h2>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <select
          value={form.storeId}
          onChange={(e) => setForm({ ...form, storeId: e.target.value })}
          aria-label="Store"
        >
          <option value="">Store</option>
          {stores.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <select
          value={form.productId}
          onChange={(e) => setForm({ ...form, productId: e.target.value })}
          aria-label="Product"
        >
          <option value="">Product</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <select
          value={form.type}
          onChange={(e) => setForm({ ...form, type: e.target.value })}
          aria-label="Tipo"
        >
          <option value="percentage">Porcentaje</option>
          <option value="fixed_price">Precio fijo</option>
          <option value="buy_n_pay_m">NxM</option>
        </select>
        {form.type === 'buy_n_pay_m' ? (
          <>
            <input
              value={form.buyQuantity}
              onChange={(e) =>
                setForm({ ...form, buyQuantity: e.target.value })
              }
              placeholder="Compra N"
              type="number"
            />
            <input
              value={form.payQuantity}
              onChange={(e) =>
                setForm({ ...form, payQuantity: e.target.value })
              }
              placeholder="Paga M"
              type="number"
            />
          </>
        ) : (
          <input
            value={form.value}
            onChange={(e) => setForm({ ...form, value: e.target.value })}
            placeholder={
              form.type === 'percentage' ? 'Descuento %' : 'Precio fijo'
            }
          />
        )}
        <input
          value={form.startsAt}
          onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
          type="datetime-local"
        />
        <input
          value={form.endsAt}
          onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
          type="datetime-local"
        />
        <label className="text-sm">
          <input
            checked={form.isActive}
            onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
            type="checkbox"
          />{' '}
          Activa
        </label>
        <button
          className="rounded bg-blue-600 px-3 py-2 text-white"
          onClick={() => void save()}
          type="button"
        >
          {editing ? 'Guardar cambios' : 'Crear promoción'}
        </button>
      </div>
      <p className="mt-2 text-sm text-slate-600">{message}</p>
      <ul className="mt-3 space-y-2">
        {items.map((p) => (
          <li
            className="flex items-center justify-between rounded bg-slate-50 p-2 text-sm"
            key={p.id}
          >
            <span>
              {p.type} · {p.isActive ? 'activa' : 'inactiva'}
            </span>
            <span className="space-x-2">
              <button
                onClick={() => {
                  setEditing(p.id);
                  setForm({
                    ...p,
                    startsAt: new Date(p.startsAt).toISOString().slice(0, 16),
                    endsAt: new Date(p.endsAt).toISOString().slice(0, 16),
                    buyQuantity: p.buyQuantity ?? '',
                    payQuantity: p.payQuantity ?? '',
                  });
                }}
                type="button"
              >
                Editar
              </button>
              <button onClick={() => void remove(p.id)} type="button">
                Eliminar
              </button>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
