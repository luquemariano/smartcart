import { AccessPanel } from '@/components/access-panel';
import { isGoogleConfigured } from '@/lib/auth';

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-10">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
          SmartCart
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
          Asistente personal de compras
        </h1>
        <p className="mt-4 text-base leading-7 text-slate-600">
          Controlá cuánto llevás gastado mientras hacés tus compras.
        </p>
        <div className="mt-8 border-t border-slate-200 pt-6">
          <AccessPanel googleConfigured={isGoogleConfigured} />
        </div>
      </section>
    </main>
  );
}
