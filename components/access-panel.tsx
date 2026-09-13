'use client';

import { FormEvent, useState } from 'react';
import { authClient } from '@/lib/auth-client';
import {
  clearGuestIdentityAfterImport,
  getGuestIdentity,
} from '@/lib/guest-identity';
import { StoreManager } from '@/components/store-manager';
import { ProductManager } from '@/components/product-manager';

type EmailMode = 'signin' | 'signup';

export function AccessPanel({
  googleConfigured,
}: {
  googleConfigured: boolean;
}) {
  const { data: session, isPending } = authClient.useSession();
  const [guest, setGuest] = useState(false);
  const [guestId, setGuestId] = useState<string | null>(null);
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailMode, setEmailMode] = useState<EmailMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);

  function friendlyAuthError(
    error: { code?: string; message?: string } | null,
  ) {
    switch (error?.code) {
      case 'INVALID_EMAIL':
        return 'Ingresá un email válido.';
      case 'INVALID_PASSWORD':
      case 'INVALID_EMAIL_OR_PASSWORD':
        return 'El email o la contraseña no son correctos.';
      case 'USER_ALREADY_EXISTS':
      case 'EMAIL_ALREADY_EXISTS':
        return 'Ese email ya está registrado.';
      case 'PASSWORD_TOO_SHORT':
        return 'La contraseña debe tener al menos 8 caracteres.';
      default:
        return 'No pudimos completar la solicitud. Revisá los datos e intentá nuevamente.';
    }
  }

  async function handleEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage('');

    try {
      const result =
        emailMode === 'signup'
          ? await authClient.signUp.email({ name, email, password })
          : await authClient.signIn.email({ email, password });

      setMessage(
        result.error
          ? friendlyAuthError(result.error)
          : emailMode === 'signup'
            ? 'Cuenta creada correctamente.'
            : 'Sesión iniciada correctamente.',
      );
    } catch {
      setMessage('No pudimos completar la solicitud. Intentá nuevamente.');
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setGoogleBusy(true);
    setMessage('');
    try {
      const result = await authClient.signIn.social({ provider: 'google' });
      if (result?.error) setMessage(friendlyAuthError(result.error));
    } catch {
      setMessage('No pudimos continuar con Google. Intentá nuevamente.');
      setGoogleBusy(false);
    }
  }

  if (isPending)
    return <p className="text-sm text-slate-600">Cargando acceso…</p>;

  if (session?.user) {
    return (
      <div className="space-y-4" data-testid="authenticated-state">
        <div>
          <p className="text-sm font-semibold text-emerald-700">
            Estado autenticado
          </p>
          <div className="mt-2 flex items-center gap-3">
            {session.user.image && (
              <span
                aria-label="Avatar"
                className="h-10 w-10 rounded-full bg-cover bg-center"
                role="img"
                style={{ backgroundImage: `url(${session.user.image})` }}
              />
            )}
            <div>
              <p className="text-slate-700">
                {session.user.name || 'Sin nombre'}
              </p>
              <p className="text-sm text-slate-500">{session.user.email}</p>
            </div>
          </div>
        </div>
        <button
          className="min-h-11 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          onClick={() => authClient.signOut()}
          type="button"
        >
          Cerrar sesión
        </button>
        <StoreManager mode="authenticated" />
        <ProductManager mode="authenticated" />
      </div>
    );
  }

  if (guest) {
    return (
      <div className="space-y-4" data-testid="guest-state">
        <div>
          <p className="text-sm font-semibold text-blue-700">Modo invitado</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Tu identidad queda solo en este dispositivo. Todavía no hay datos de
            compra para sincronizar.
          </p>
        </div>
        <button
          className="min-h-11 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          onClick={() => {
            clearGuestIdentityAfterImport();
            setGuest(false);
          }}
          type="button"
        >
          Salir y borrar identidad local
        </button>
        <StoreManager guestId={guestId} mode="guest" />
        <ProductManager guestId={guestId} mode="guest" />
        <button
          className="min-h-11 w-full rounded-xl border border-blue-200 px-4 py-3 text-sm font-semibold text-blue-700 hover:bg-blue-50"
          onClick={() => setGuest(false)}
          type="button"
        >
          Volver a opciones de acceso
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="access-state">
      <button
        className="min-h-12 w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        disabled={!googleConfigured || googleBusy}
        onClick={handleGoogle}
        type="button"
      >
        {googleBusy ? 'Continuando…' : 'Continuar con Google'}
      </button>
      {!googleConfigured && (
        <p className="text-xs text-slate-500">
          Google queda pendiente de credenciales locales.
        </p>
      )}

      <button
        className="min-h-12 w-full rounded-xl border border-blue-200 px-4 py-3 font-semibold text-blue-700 hover:bg-blue-50"
        onClick={() => {
          setGuestId(getGuestIdentity());
          setGuest(true);
        }}
        type="button"
      >
        Usar sin registrarme
      </button>

      <div
        className="flex items-center gap-3 py-1 text-xs text-slate-400"
        aria-hidden="true"
      >
        <span className="h-px flex-1 bg-slate-200" />
        <span>o</span>
        <span className="h-px flex-1 bg-slate-200" />
      </div>

      <button
        className="text-sm font-semibold text-slate-700 underline decoration-slate-300 underline-offset-4 hover:text-blue-700"
        onClick={() => setEmailOpen((open) => !open)}
        type="button"
      >
        Entrar con email
      </button>

      {emailOpen && (
        <form
          className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4"
          onSubmit={handleEmail}
        >
          {emailMode === 'signup' && (
            <label className="block text-sm font-medium text-slate-700">
              Nombre
              <input
                className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3"
                onChange={(event) => setName(event.target.value)}
                required
                value={name}
              />
            </label>
          )}
          <label className="block text-sm font-medium text-slate-700">
            Email
            <input
              className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3"
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Contraseña
            <input
              className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3"
              minLength={8}
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </label>
          <button
            className="min-h-11 w-full rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
            disabled={busy}
            type="submit"
          >
            {busy
              ? emailMode === 'signup'
                ? 'Creando cuenta…'
                : 'Entrando…'
              : emailMode === 'signup'
                ? 'Crear cuenta'
                : 'Entrar'}
          </button>
          <button
            className="text-xs font-semibold text-blue-700"
            onClick={() =>
              setEmailMode(emailMode === 'signup' ? 'signin' : 'signup')
            }
            type="button"
          >
            {emailMode === 'signup'
              ? 'Ya tengo una cuenta'
              : 'Crear cuenta con email'}
          </button>
          {message && (
            <p className="text-xs text-slate-600" role="status">
              {message}
            </p>
          )}
        </form>
      )}
    </div>
  );
}
