import { AlertTriangle } from 'lucide-react';

interface InactivityModalProps {
  onLogout: () => void;
  onExtendSession: () => void;
  isExtending?: boolean;
  errorMessage?: string;
}

export default function InactivityModal({
  onLogout,
  onExtendSession,
  isExtending = false,
  errorMessage,
}: InactivityModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <section
        aria-describedby="inactivity-modal-description"
        aria-labelledby="inactivity-modal-title"
        aria-modal="true"
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
        role="dialog"
      >
        <header className="flex items-center gap-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-300 text-slate-900">
            <AlertTriangle aria-hidden="true" className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-base font-bold text-slate-900" id="inactivity-modal-title">
              Control de Inactividad Detectado
            </h2>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              HU-02 — ALERTA DE CADUCIDAD
            </p>
          </div>
        </header>

        <div className="my-5 border-t border-slate-200" />

        <p className="text-sm font-semibold text-slate-900">
          Su sesión está pausada por inactividad.
        </p>
        <p
          className="mt-2 text-sm leading-relaxed text-slate-500"
          id="inactivity-modal-description"
        >
          Por motivos de seguridad, confirme si desea salir o extender su sesión para continuar
          trabajando.
        </p>
        {errorMessage && (
          <p className="mt-3 text-sm text-red-600" role="alert">
            {errorMessage}
          </p>
        )}

        <footer className="mt-5 flex justify-end gap-3">
          <button
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2"
            disabled={isExtending}
            onClick={onLogout}
            type="button"
          >
            Salir
          </button>
          <button
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2"
            disabled={isExtending}
            onClick={onExtendSession}
            type="button"
          >
            {isExtending ? 'Extendiendo…' : 'Extender sesión'}
          </button>
        </footer>
      </section>
    </div>
  );
}
