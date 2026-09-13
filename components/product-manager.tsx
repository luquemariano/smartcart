'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  createLocalProduct,
  deleteLocalProduct,
  listLocalProducts,
  updateLocalProduct,
  type LocalProduct,
} from '@/lib/local-product-repository';
import {
  productInputSchema,
  quantityUnitLabels,
  quantityUnits,
  type ProductInput,
  type QuantityUnit,
} from '@/lib/product-validation';

type ProductView = Pick<
  LocalProduct,
  | 'id'
  | 'name'
  | 'brand'
  | 'barcode'
  | 'quantityValue'
  | 'quantityUnit'
  | 'createdAt'
  | 'updatedAt'
>;
type Mode = 'guest' | 'authenticated';
type ProductForm = {
  name: string;
  brand: string;
  barcode: string;
  quantityValue: string;
  quantityUnit: QuantityUnit | '';
};

const emptyForm: ProductForm = {
  name: '',
  brand: '',
  barcode: '',
  quantityValue: '',
  quantityUnit: '',
};

function displayQuantity(product: ProductView) {
  if (!product.quantityValue || !product.quantityUnit) return null;
  return `${product.quantityValue} ${product.quantityUnit === 'unit' ? 'unidades' : product.quantityUnit}`;
}

function toInput(form: ProductForm): ProductInput {
  return {
    name: form.name,
    brand: form.brand,
    barcode: form.barcode,
    quantityValue: form.quantityValue,
    quantityUnit: form.quantityUnit || null,
  };
}

export function ProductManager({
  mode,
  guestId,
}: {
  mode: Mode;
  guestId?: string | null;
}) {
  const [products, setProducts] = useState<ProductView[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [openForm, setOpenForm] = useState(false);
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setMessage('');
    if (mode === 'guest' && guestId) {
      setProducts(listLocalProducts(guestId, query));
      setLoading(false);
      return;
    }
    if (mode === 'authenticated') {
      try {
        const suffix = query.trim()
          ? `?q=${encodeURIComponent(query.trim())}`
          : '';
        const response = await fetch(`/api/products${suffix}`);
        const data = await response.json();
        setProducts(response.ok ? (data.products ?? []) : []);
        if (!response.ok)
          setMessage(data.error ?? 'No pudimos cargar tus productos.');
      } catch {
        setProducts([]);
        setMessage('No pudimos cargar tus productos.');
      }
    }
    setLoading(false);
  }, [guestId, mode, query]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadProducts(), 0);
    return () => window.clearTimeout(timer);
  }, [loadProducts]);

  function setField(field: keyof ProductForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function saveProduct(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = productInputSchema.safeParse(toInput(form));
    if (!parsed.success) {
      setMessage(
        parsed.error.issues[0]?.message ?? 'Revisá los datos del producto.',
      );
      return;
    }
    try {
      if (mode === 'guest' && guestId) {
        if (editingId) updateLocalProduct(guestId, editingId, parsed.data);
        else createLocalProduct(guestId, parsed.data);
      } else {
        const response = await fetch(
          editingId ? `/api/products/${editingId}` : '/api/products',
          {
            method: editingId ? 'PATCH' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(parsed.data),
          },
        );
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error ?? 'PRODUCT_ERROR');
        }
      }
      setForm(emptyForm);
      setEditingId(null);
      setOpenForm(false);
      await loadProducts();
    } catch (error) {
      setMessage(
        error instanceof Error && error.message.includes('DUPLICATE')
          ? 'Ese producto ya está guardado.'
          : error instanceof Error && error.message
            ? error.message
            : 'No pudimos guardar el producto.',
      );
    }
  }

  async function removeProduct(id: string) {
    try {
      if (mode === 'guest' && guestId) deleteLocalProduct(guestId, id);
      else {
        const response = await fetch(`/api/products/${id}`, {
          method: 'DELETE',
        });
        if (!response.ok) throw new Error('No pudimos eliminar el producto.');
      }
      if (selectedId === id) setSelectedId(null);
      await loadProducts();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'No pudimos eliminar el producto.',
      );
    }
  }

  function editProduct(product: ProductView) {
    setEditingId(product.id);
    setForm({
      name: product.name,
      brand: product.brand ?? '',
      barcode: product.barcode ?? '',
      quantityValue: product.quantityValue ?? '',
      quantityUnit: product.quantityUnit ?? '',
    });
    setOpenForm(true);
    setMessage('');
  }

  return (
    <section
      className="mt-8 border-t border-slate-200 pt-6"
      aria-labelledby="products-title"
    >
      <h2 id="products-title" className="text-xl font-bold text-slate-950">
        Mis productos
      </h2>
      <p className="mt-2 text-sm text-slate-600">
        {mode === 'guest'
          ? 'Guardados solo en este dispositivo.'
          : 'Tu catálogo personal de productos.'}
      </p>
      <label className="mt-4 block">
        <span className="sr-only">Buscar producto</span>
        <input
          aria-label="Buscar producto"
          className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar producto..."
          value={query}
        />
      </label>
      {loading ? (
        <p className="mt-5 text-sm text-slate-500">Cargando productos…</p>
      ) : products.length === 0 ? (
        <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
          {query
            ? 'No encontramos productos con esa búsqueda.'
            : 'Todavía no guardaste ningún producto.'}
        </p>
      ) : (
        <ul className="mt-5 space-y-3" aria-label="Productos">
          {products.map((product) => (
            <li
              key={product.id}
              className={`rounded-xl border p-4 ${selectedId === product.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white'}`}
            >
              <button
                aria-label={
                  product.brand
                    ? `${product.brand} ${product.name}`
                    : product.name
                }
                className="w-full text-left"
                onClick={() => setSelectedId(product.id)}
                type="button"
              >
                <span className="block font-semibold text-slate-900">
                  {product.brand
                    ? `${product.brand} ${product.name}`
                    : product.name}
                </span>
                {displayQuantity(product) && (
                  <span className="mt-1 block text-sm text-slate-600">
                    {displayQuantity(product)}
                  </span>
                )}
                {product.barcode && (
                  <span className="mt-1 block text-xs text-slate-500">
                    Código: {product.barcode}
                  </span>
                )}
              </button>
              <div className="mt-3 flex gap-3">
                <button
                  className="text-sm font-semibold text-blue-700"
                  onClick={() => editProduct(product)}
                  type="button"
                >
                  Editar
                </button>
                <button
                  className="text-sm font-semibold text-slate-600"
                  onClick={() => void removeProduct(product.id)}
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
          Producto seleccionado:{' '}
          {products.find((product) => product.id === selectedId)?.name}
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
        + Agregar producto
      </button>
      {openForm && (
        <form
          className="mt-4 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4"
          onSubmit={saveProduct}
        >
          <h3 className="font-semibold text-slate-900">
            {editingId ? 'Editar producto' : 'Agregar producto'}
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
            Marca
            <input
              className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3"
              onChange={(event) => setField('brand', event.target.value)}
              value={form.brand}
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Código de barras
            <input
              className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3"
              inputMode="numeric"
              onChange={(event) => setField('barcode', event.target.value)}
              value={form.barcode}
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm font-medium text-slate-700">
              Cantidad
              <input
                className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3"
                inputMode="decimal"
                onChange={(event) =>
                  setField('quantityValue', event.target.value)
                }
                value={form.quantityValue}
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Unidad
              <select
                className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3"
                onChange={(event) =>
                  setField('quantityUnit', event.target.value)
                }
                value={form.quantityUnit}
              >
                <option value="">Sin unidad</option>
                {quantityUnits.map((unit) => (
                  <option key={unit} value={unit}>
                    {quantityUnitLabels[unit]} ({unit})
                  </option>
                ))}
              </select>
            </label>
          </div>
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
