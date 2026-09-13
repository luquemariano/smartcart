'use client';
import { useEffect, useState } from 'react';
import { hasPendingGuestImportData, importGuestData } from '@/lib/guest-import';

export function GuestImportPrompt() {
  const [pending, setPending] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => {
    const timer = window.setTimeout(
      () => setPending(hasPendingGuestImportData()),
      0,
    );
    return () => window.clearTimeout(timer);
  }, []);
  if (!pending || dismissed) return null;
  async function importNow() {
    setBusy(true);
    setMessage('');
    try {
      const result = await importGuestData();
      if (result.activeSessionConflict)
        setMessage(
          'Tu cuenta ya tiene una compra en curso. No importamos nada todavía; podés reintentar cuando finalice.',
        );
      else {
        setPending(false);
        setMessage(
          `Importamos ${result.stores?.imported ?? 0} tiendas, ${result.products?.imported ?? 0} productos, ${result.sessions?.imported ?? 0} compras y ${result.listsImported ?? 0} listas.`,
        );
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'No pudimos importar tus datos. Tus datos locales siguen intactos.',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <aside
      className="rounded-xl border border-blue-200 bg-blue-50 p-4"
      aria-label="Importación de datos guest"
    >
      <p className="font-semibold text-blue-950">
        Encontramos datos de tu uso como invitado
      </p>
      <p className="mt-1 text-sm leading-6 text-blue-900">
        Podemos sumarlos a tu cuenta para que no pierdas tus tiendas, productos,
        compras y listas.
      </p>
      <div className="mt-3 flex flex-wrap gap-3">
        <button
          className="min-h-10 rounded-lg bg-blue-600 px-3 text-sm font-semibold text-white disabled:opacity-50"
          disabled={busy}
          onClick={() => void importNow()}
          type="button"
        >
          {busy ? 'Importando…' : 'Importar mis datos'}
        </button>
        <button
          className="min-h-10 rounded-lg border border-blue-300 px-3 text-sm font-semibold text-blue-800"
          disabled={busy}
          onClick={() => setDismissed(true)}
          type="button"
        >
          Ahora no
        </button>
      </div>
      {message && (
        <p className="mt-3 text-sm text-blue-900" role="status">
          {message}
        </p>
      )}
    </aside>
  );
}
