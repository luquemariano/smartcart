'use client';

import { useCallback, useState } from 'react';
import { BarcodeScanner } from '@/components/barcode-scanner';
import {
  createLocalProduct,
  listLocalProducts,
  type LocalProduct,
} from '@/lib/local-product-repository';
import { addLocalShoppingItem } from '@/lib/local-shopping-item-repository';
import {
  findProductByBarcode,
  DEFAULT_SCANNED_QUANTITY,
} from '@/lib/barcode-product-flow';
import { productInputSchema } from '@/lib/product-validation';
import { shoppingItemInputSchema } from '@/lib/shopping-item-validation';

type Mode = 'guest' | 'authenticated';
type ProductView = Pick<
  LocalProduct,
  'id' | 'name' | 'brand' | 'barcode' | 'quantityValue' | 'quantityUnit'
>;

type FormState = {
  name: string;
  brand: string;
  quantityValue: string;
  quantityUnit: '' | 'g' | 'kg' | 'ml' | 'l' | 'unit';
  quantity: string;
  unitPrice: string;
};

const initialForm: FormState = {
  name: '',
  brand: '',
  quantityValue: '',
  quantityUnit: '',
  quantity: DEFAULT_SCANNED_QUANTITY,
  unitPrice: '',
};

function snapshot(product: ProductView) {
  return {
    id: product.id,
    name: product.name,
    brand: product.brand,
    barcode: product.barcode,
    quantityValue: product.quantityValue,
    quantityUnit: product.quantityUnit,
  };
}

export function BarcodeProductAdder({
  mode,
  guestId,
  sessionId,
}: {
  mode: Mode;
  guestId?: string | null;
  sessionId: string | null;
}) {
  const [scannerOpen, setScannerOpen] = useState(false);
  const [barcode, setBarcode] = useState('');
  const [knownProduct, setKnownProduct] = useState<ProductView | null>(null);
  const [form, setForm] = useState<FormState>(initialForm);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const setField = <K extends keyof FormState>(field: K, value: FormState[K]) =>
    setForm((current) => ({ ...current, [field]: value }));

  const lookup = useCallback(
    async (code: string) => {
      if (!sessionId) {
        setMessage('Primero iniciá una compra para agregar productos.');
        return;
      }
      setBarcode(code);
      setKnownProduct(null);
      setForm(initialForm);
      setMessage('Buscando producto…');
      try {
        let product: ProductView | undefined;
        if (mode === 'guest' && guestId) {
          product = findProductByBarcode(listLocalProducts(guestId), code);
        } else {
          const response = await fetch(
            `/api/products?q=${encodeURIComponent(code)}`,
          );
          const data = await response.json();
          if (!response.ok)
            throw new Error(data.error ?? 'No pudimos buscar el producto.');
          product = findProductByBarcode(data.products ?? [], code);
        }
        if (product) {
          setKnownProduct(product);
          setForm((current) => ({
            ...current,
            name: product.name,
            quantity: DEFAULT_SCANNED_QUANTITY,
          }));
          setMessage('Producto encontrado. Confirmá precio y cantidad.');
        } else {
          setMessage(
            'Producto no encontrado. Completá los datos para crearlo.',
          );
        }
      } catch (error) {
        setMessage(
          error instanceof Error
            ? error.message
            : 'No pudimos buscar el producto.',
        );
      }
    },
    [guestId, mode, sessionId],
  );

  async function addProduct() {
    if (!sessionId) {
      setMessage('Primero iniciá una compra para agregar productos.');
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      let product = knownProduct;
      if (!product) {
        const parsedProduct = productInputSchema.safeParse({
          name: form.name,
          brand: form.brand,
          barcode,
          quantityValue: form.quantityValue,
          quantityUnit: form.quantityUnit || null,
        });
        if (!parsedProduct.success)
          throw new Error(
            parsedProduct.error.issues[0]?.message ??
              'Los datos del producto no son válidos.',
          );
        if (mode === 'guest' && guestId) {
          product = createLocalProduct(guestId, parsedProduct.data);
        } else {
          const response = await fetch('/api/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(parsedProduct.data),
          });
          const data = await response.json();
          if (!response.ok)
            throw new Error(data.error ?? 'No pudimos crear el producto.');
          product = data.product;
        }
      }
      if (!product) throw new Error('No pudimos obtener el producto.');
      const parsedItem = shoppingItemInputSchema.safeParse({
        productId: product.id,
        quantity: form.quantity,
        unitPrice: form.unitPrice,
      });
      if (!parsedItem.success)
        throw new Error(
          parsedItem.error.issues[0]?.message ??
            'La cantidad o el precio no son válidos.',
        );
      if (mode === 'guest' && guestId) {
        addLocalShoppingItem(
          guestId,
          sessionId,
          parsedItem.data,
          snapshot(product),
        );
      } else {
        const response = await fetch(
          `/api/shopping-sessions/${sessionId}/items`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(parsedItem.data),
          },
        );
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.error ?? 'No pudimos agregar el producto.');
      }
      setMessage('Producto agregado a la compra.');
      setScannerOpen(false);
      setBarcode('');
      setKnownProduct(null);
      setForm(initialForm);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'No pudimos agregar el producto.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 rounded-lg border border-blue-200 bg-white p-3">
      <p className="font-semibold text-slate-800">
        Agregar por código de barras
      </p>
      <button
        className="mt-2 min-h-10 w-full rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
        disabled={!sessionId || busy}
        onClick={() => {
          setMessage('');
          setScannerOpen(true);
        }}
        type="button"
      >
        Escanear producto
      </button>
      {!sessionId && (
        <p className="mt-2 text-sm text-slate-600">
          Primero iniciá una compra.
        </p>
      )}
      <BarcodeScanner
        open={scannerOpen}
        onCancel={() => setScannerOpen(false)}
        onDetected={(code) => {
          setScannerOpen(false);
          void lookup(code);
        }}
      />
      {barcode && !scannerOpen && (
        <div className="mt-3 space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-sm font-semibold text-slate-800">
            Código: {barcode}
          </p>
          {knownProduct && (
            <p className="text-sm text-slate-600">
              {knownProduct.name}
              {knownProduct.brand ? ` · ${knownProduct.brand}` : ''}
            </p>
          )}
          {!knownProduct && (
            <input
              aria-label="Nombre del producto escaneado"
              className="min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3"
              onChange={(event) => setField('name', event.target.value)}
              placeholder="Nombre obligatorio"
              value={form.name}
            />
          )}
          {!knownProduct && (
            <input
              aria-label="Marca del producto escaneado"
              className="min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3"
              onChange={(event) => setField('brand', event.target.value)}
              placeholder="Marca (opcional)"
              value={form.brand}
            />
          )}
          {!knownProduct && (
            <div className="flex gap-2">
              <input
                aria-label="Presentación del producto escaneado"
                className="min-h-10 min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3"
                inputMode="decimal"
                onChange={(event) =>
                  setField('quantityValue', event.target.value)
                }
                placeholder="Presentación"
                value={form.quantityValue}
              />
              <select
                aria-label="Unidad del producto escaneado"
                className="min-h-10 rounded-lg border border-slate-300 bg-white px-2"
                onChange={(event) =>
                  setField(
                    'quantityUnit',
                    event.target.value as FormState['quantityUnit'],
                  )
                }
                value={form.quantityUnit}
              >
                <option value="">Unidad</option>
                <option value="g">g</option>
                <option value="kg">kg</option>
                <option value="ml">ml</option>
                <option value="l">l</option>
                <option value="unit">unidad</option>
              </select>
            </div>
          )}
          <input
            aria-label="Cantidad escaneada"
            className="min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3"
            inputMode="decimal"
            onChange={(event) => setField('quantity', event.target.value)}
            value={form.quantity}
          />
          <input
            aria-label="Precio del producto escaneado"
            className="min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3"
            inputMode="decimal"
            onChange={(event) => setField('unitPrice', event.target.value)}
            placeholder="Precio unitario obligatorio"
            value={form.unitPrice}
          />
          <button
            className="min-h-10 w-full rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
            disabled={busy}
            onClick={() => void addProduct()}
            type="button"
          >
            Agregar a la compra
          </button>
        </div>
      )}
      {message && (
        <p className="mt-2 text-sm text-slate-700" role="status">
          {message}
        </p>
      )}
    </div>
  );
}
