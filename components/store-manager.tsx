'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  createLocalStore,
  deleteLocalStore,
  listLocalStores,
  updateLocalStore,
  type LocalStore,
} from '@/lib/local-store-repository';
import { storeInputSchema, type StoreInput } from '@/lib/store-validation';

type StoreView = LocalStore & { ownerUserId?: string };
type Mode = 'guest' | 'authenticated';

const emptyForm: StoreInput = {
  name: '',
  branchName: '',
  address: '',
  latitude: null,
  longitude: null,
};

export function StoreManager({
  mode,
  guestId,
}: {
  mode: Mode;
  guestId?: string | null;
}) {
  const [stores, setStores] = useState<StoreView[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<StoreInput>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [openForm, setOpenForm] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  const loadStores = useCallback(async () => {
    setLoading(true);
    setMessage('');
    if (mode === 'guest' && guestId) {
      setStores(listLocalStores(guestId));
      setLoading(false);
      return;
    }
    if (mode === 'authenticated') {
      try {
        const response = await fetch('/api/stores');
        const data = await response.json();
        setStores(response.ok ? data.stores : []);
        if (!response.ok)
          setMessage(data.error ?? 'No pudimos cargar tus supermercados.');
      } catch {
        setStores([]);
        setMessage('No pudimos cargar tus supermercados.');
      }
    }
    setLoading(false);
  }, [guestId, mode]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadStores(), 0);
    return () => window.clearTimeout(timer);
  }, [loadStores]);

  function setField(field: keyof StoreInput, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function saveStore(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = storeInputSchema.safeParse({
      ...form,
      latitude: null,
      longitude: null,
    });
    if (!parsed.success) {
      setMessage('El nombre del supermercado es obligatorio.');
      return;
    }
    try {
      if (mode === 'guest' && guestId) {
        if (editingId) updateLocalStore(guestId, editingId, parsed.data);
        else createLocalStore(guestId, parsed.data);
      } else {
        const response = await fetch(
          editingId ? `/api/stores/${editingId}` : '/api/stores',
          {
            method: editingId ? 'PATCH' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(parsed.data),
          },
        );
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error ?? 'STORE_ERROR');
        }
      }
      setForm(emptyForm);
      setEditingId(null);
      setOpenForm(false);
      await loadStores();
    } catch (error) {
      setMessage(
        error instanceof Error && error.message.includes('DUPLICATE')
          ? 'Ese supermercado ya está guardado.'
          : 'No pudimos guardar el supermercado.',
      );
    }
  }

  async function removeStore(id: string) {
    if (mode === 'guest' && guestId) deleteLocalStore(guestId, id);
    else await fetch(`/api/stores/${id}`, { method: 'DELETE' });
    if (selectedId === id) setSelectedId(null);
    await loadStores();
  }

  function editStore(store: StoreView) {
    setEditingId(store.id);
    setForm({
      name: store.name,
      branchName: store.branchName ?? '',
      address: store.address ?? '',
      latitude: null,
      longitude: null,
    });
    setOpenForm(true);
    setMessage('');
  }

  return (
    <section
      className="mt-8 border-t border-slate-200 pt-6"
      aria-labelledby="stores-title"
    >
      <h2 id="stores-title" className="text-xl font-bold text-slate-950">
        ¿Dónde estás comprando?
      </h2>
      <p className="mt-2 text-sm text-slate-600">
        {mode === 'guest'
          ? 'Guardados solo en este dispositivo.'
          : 'Tus supermercados guardados.'}
      </p>
      {loading ? (
        <p className="mt-5 text-sm text-slate-500">Cargando supermercados…</p>
      ) : stores.length === 0 ? (
        <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
          Todavía no guardaste ningún supermercado.
        </p>
      ) : (
        <ul className="mt-5 space-y-3" aria-label="Supermercados">
          {stores.map((store) => (
            <li
              key={store.id}
              className={`rounded-xl border p-4 ${selectedId === store.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white'}`}
            >
              <button
                className="w-full text-left"
                onClick={() => setSelectedId(store.id)}
                type="button"
              >
                <span className="block font-semibold text-slate-900">
                  {store.name}
                </span>
                {store.branchName && (
                  <span className="mt-1 block text-sm text-slate-600">
                    {store.branchName}
                  </span>
                )}
                {store.address && (
                  <span className="mt-1 block text-xs text-slate-500">
                    {store.address}
                  </span>
                )}
              </button>
              <div className="mt-3 flex gap-3">
                <button
                  className="text-sm font-semibold text-blue-700"
                  onClick={() => editStore(store)}
                  type="button"
                >
                  Editar
                </button>
                <button
                  className="text-sm font-semibold text-slate-600"
                  onClick={() => void removeStore(store.id)}
                  type="button"
                >
                  Eliminar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {selectedId && (
        <p className="mt-4 text-sm font-semibold text-blue-700">
          Supermercado seleccionado:{' '}
          {stores.find((store) => store.id === selectedId)?.name}
        </p>
      )}
      <button
        className="mt-5 min-h-11 w-full rounded-xl border border-blue-200 px-4 py-3 font-semibold text-blue-700 hover:bg-blue-50"
        onClick={() => {
          setEditingId(null);
          setForm(emptyForm);
          setOpenForm(true);
          setMessage('');
        }}
        type="button"
      >
        + Agregar supermercado
      </button>
      {openForm && (
        <form
          className="mt-4 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4"
          onSubmit={saveStore}
        >
          <h3 className="font-semibold text-slate-900">
            {editingId ? 'Editar supermercado' : 'Agregar supermercado'}
          </h3>
          <label className="block text-sm font-medium text-slate-700">
            Nombre *
            <input
              className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3"
              onChange={(event) => setField('name', event.target.value)}
              required
              value={form.name}
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Sucursal
            <input
              className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3"
              onChange={(event) => setField('branchName', event.target.value)}
              value={form.branchName ?? ''}
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Dirección
            <input
              className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3"
              onChange={(event) => setField('address', event.target.value)}
              value={form.address ?? ''}
            />
          </label>
          <div className="flex gap-3">
            <button
              className="min-h-11 flex-1 rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white"
              type="submit"
            >
              Guardar
            </button>
            <button
              className="min-h-11 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700"
              onClick={() => setOpenForm(false)}
              type="button"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
      {message && (
        <p className="mt-3 text-sm text-rose-700" role="alert">
          {message}
        </p>
      )}
    </section>
  );
}
