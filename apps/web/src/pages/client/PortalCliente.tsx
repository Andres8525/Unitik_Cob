import { useEffect, useMemo, useState } from 'react';
import { Bell, CalendarDays, CheckCircle2, Clock3, Download, FileText, LogOut, Wifi, WifiOff } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { formatCop } from '@unitik/shared-types';
import BrandLogo from '../../components/BrandLogo';
import { useAuthStore } from '../../stores/auth';
import {
  getPortalServiceStatus,
  useClientePortalStore,
  type PortalInvoice,
} from '../../stores/clientePortal';
import { useNotificacionesStore } from '../../stores/notificaciones';
import FormularioReportePago from './FormularioReportePago';

const serviceStatusStyles = {
  ACTIVO: {
    label: 'Servicio activo',
    description: 'Tu conexión está habilitada.',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    dotClassName: 'bg-emerald-500',
    Icon: CheckCircle2,
  },
  POR_VENCER: {
    label: 'Pago próximo a vencer',
    description: 'Realiza tu pago para mantener el servicio activo.',
    className: 'border-amber-200 bg-amber-50 text-amber-950',
    dotClassName: 'bg-amber-500',
    Icon: Clock3,
  },
  SUSPENDIDO: {
    label: 'Servicio suspendido',
    description: 'Comunícate con UNITIK después de reportar tu pago.',
    className: 'border-red-200 bg-red-50 text-red-900',
    dotClassName: 'bg-red-500',
    Icon: WifiOff,
  },
} as const;

const invoiceStatusLabels: Record<PortalInvoice['status'], string> = {
  PENDING: 'Pendiente',
  PAID: 'Pagada',
  OVERDUE: 'Vencida',
  CANCELLED: 'Anulada',
  PROMISE_TO_PAY: 'Promesa de pago',
};

const EMPTY_INVOICES: PortalInvoice[] = [];

function downloadInvoice(invoice: PortalInvoice) {
  const url = invoice.electronicInvoiceUrl;
  if (url && /^https:\/\//i.test(url)) {
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }
  console.info(`La factura ${invoice.invoiceNumber} aún no tiene PDF disponible.`);
}

export default function PortalCliente() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const ownerUserId = useClientePortalStore((state) => state.ownerUserId);
  const cachedClient = useClientePortalStore((state) => state.client);
  const cachedSubscription = useClientePortalStore((state) => state.subscription);
  const cachedInvoices = useClientePortalStore((state) => state.invoices);
  const cachedLastUpdated = useClientePortalStore((state) => state.lastUpdated);
  const clearPortalData = useClientePortalStore((state) => state.clearPortalData);
  const clearNotifications = useNotificacionesStore((state) => state.clear);
  const hasCurrentUserData = !!user && ownerUserId === user.id;
  const client = hasCurrentUserData ? cachedClient : null;
  const subscription = hasCurrentUserData ? cachedSubscription : null;
  const invoices = hasCurrentUserData ? cachedInvoices : EMPTY_INVOICES;
  const lastUpdated = hasCurrentUserData ? cachedLastUpdated : null;
  const isLoading = useClientePortalStore((state) => state.isLoading);
  const error = useClientePortalStore((state) => state.error);
  const refresh = useClientePortalStore((state) => state.refresh);
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    void refresh();
    const handleOnline = () => {
      setIsOnline(true);
      void refresh();
    };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [refresh]);

  const serviceStatus = useMemo(
    () => getPortalServiceStatus(client?.status, invoices),
    [client?.status, invoices],
  );
  const status = serviceStatusStyles[serviceStatus];
  const unpaidInvoices = invoices.filter(
    (invoice) => invoice.status === 'PENDING' || invoice.status === 'OVERDUE',
  );

  const handleLogout = () => {
    clearPortalData();
    clearNotifications();
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <main className="min-h-screen bg-slate-100 px-3 py-4 sm:px-5 sm:py-8">
      <div className="mx-auto max-w-md space-y-4">
        <header className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 shadow-sm">
          <div className="flex min-w-0 items-center gap-3">
            <BrandLogo className="h-10 w-auto shrink-0" />
            <div className="min-w-0">
              <h1 className="truncate text-sm font-bold text-slate-900">Portal del cliente</h1>
              <p className="truncate text-xs text-slate-500">
                {client ? `${client.user.firstName} ${client.user.lastName}` : 'UNITIK Internet'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="flex min-h-11 shrink-0 items-center gap-1 rounded-xl px-3 text-sm font-semibold text-slate-600 hover:bg-slate-100"
            aria-label="Cerrar sesión"
          >
            <LogOut className="h-4 w-4" />
            Salir
          </button>
        </header>

        <div className="flex items-center justify-between px-1 text-xs text-slate-600" aria-live="polite">
          <span className="flex items-center gap-1.5">
            {isOnline ? <Wifi className="h-4 w-4 text-emerald-600" /> : <WifiOff className="h-4 w-4 text-amber-600" />}
            {isOnline ? 'Con conexión' : 'Sin conexión · mostrando datos guardados'}
          </span>
          {lastUpdated && (
            <span>Actualizado {new Date(lastUpdated).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</span>
          )}
        </div>

        {error && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="status">
            {error}
          </div>
        )}

        {isLoading && !client && (
          <div className="rounded-2xl bg-white p-5 text-sm text-slate-500 shadow-sm" role="status">
            Cargando tu información…
          </div>
        )}

        {!isLoading && !client && (
          <div className="rounded-2xl bg-white p-5 text-sm text-slate-600 shadow-sm">
            No fue posible cargar tu cuenta. Conéctate a internet e intenta actualizar.
            <button
              type="button"
              onClick={() => void refresh()}
              className="mt-4 min-h-11 w-full rounded-xl bg-unitik-600 px-4 font-semibold text-white hover:bg-unitik-700"
            >
              Intentar de nuevo
            </button>
          </div>
        )}

        {client && (
          <>
            <section className={`rounded-2xl border p-4 shadow-sm ${status.className}`} aria-live="polite">
              <div className="flex items-start gap-3">
                <span className={`mt-1 h-3 w-3 shrink-0 rounded-full ${status.dotClassName}`} aria-hidden="true" />
                <div>
                  <h2 className="text-base font-bold">{status.label}</h2>
                  <p className="mt-1 text-sm">{status.description}</p>
                </div>
              </div>
            </section>

            <section className="rounded-2xl bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Mi servicio</p>
                  <h2 className="mt-1 text-lg font-bold text-slate-900">
                    {subscription?.plan.name ?? 'Plan pendiente de asignación'}
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    {subscription
                      ? `${subscription.plan.speedMbps} Mbps · ${client.serviceType === 'FIBER' ? 'Fibra óptica' : 'Radio enlace'}`
                      : 'El equipo técnico asignará tu plan durante la instalación.'}
                  </p>
                </div>
                <Wifi className="h-6 w-6 shrink-0 text-unitik-600" aria-hidden="true" />
              </div>
              {subscription && (
                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
                  <span className="flex items-center gap-2 text-sm text-slate-600">
                    <CalendarDays className="h-4 w-4" />
                    Corte: día {subscription.cutOffDay}
                  </span>
                  {subscription.plan.includesTv && (
                    <span className="rounded-full bg-unitik-50 px-3 py-1 text-xs font-semibold text-unitik-700">
                      Incluye TV
                    </span>
                  )}
                </div>
              )}
            </section>

            <section className="rounded-2xl bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Mensualidad</p>
              <p className="mt-1 text-3xl font-bold text-slate-900">
                {subscription ? formatCop(Number(subscription.plan.monthlyPrice)) : '—'}
              </p>
              <p className="mt-1 text-sm text-slate-500">Valor de tu plan mensual</p>
              <button
                type="button"
                onClick={() => {
                  document.getElementById('reportar-pago')?.scrollIntoView({ behavior: 'smooth' });
                }}
                disabled={unpaidInvoices.length === 0 || !isOnline}
                className="mt-5 min-h-14 w-full rounded-xl bg-unitik-600 px-4 text-base font-bold text-white shadow-sm transition hover:bg-unitik-700 focus:outline-none focus:ring-4 focus:ring-unitik-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Reportar pago
              </button>
              {!isOnline && (
                <p className="mt-2 text-center text-xs text-slate-500">Necesitas conexión para reportar un pago.</p>
              )}
              {unpaidInvoices.length === 0 && isOnline && (
                <p className="mt-2 text-center text-xs text-slate-500">No tienes facturas pendientes de pago.</p>
              )}
            </section>

            <section id="reportar-pago" className="scroll-mt-4 rounded-2xl bg-white p-5 shadow-sm">
              <h2 className="text-base font-bold text-slate-900">Reportar un pago</h2>
              <p className="mt-1 text-sm text-slate-500">
                El reporte quedará pendiente hasta ser validado por el equipo.
              </p>
              {unpaidInvoices.length > 0 ? (
                <FormularioReportePago invoices={unpaidInvoices} />
              ) : (
                <p className="mt-3 text-sm text-slate-500">No hay facturas pendientes para reportar.</p>
              )}
            </section>

            <section className="rounded-2xl bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-900">Últimas facturas</h2>
                <FileText className="h-5 w-5 text-slate-400" aria-hidden="true" />
              </div>
              {invoices.length === 0 ? (
                <p className="py-2 text-sm text-slate-500">Aún no tienes facturas registradas.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {invoices.slice(0, 5).map((invoice) => (
                    <li key={invoice.id} className="flex min-h-[76px] items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">{invoice.invoiceNumber}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {invoice.period} · {invoiceStatusLabels[invoice.status]}
                        </p>
                        <p className="mt-1 text-sm font-bold text-slate-800">{formatCop(Number(invoice.total))}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => downloadInvoice(invoice)}
                        className="flex min-h-11 shrink-0 items-center gap-1 rounded-xl px-3 text-xs font-semibold text-unitik-700 hover:bg-unitik-50"
                        aria-label={`Descargar PDF de ${invoice.invoiceNumber}`}
                        title={invoice.electronicInvoiceUrl ? 'Descargar factura en PDF' : 'PDF aún no disponible'}
                      >
                        <Download className="h-4 w-4" />
                        PDF
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-2xl bg-white p-5 text-sm shadow-sm">
              <h2 className="font-bold text-slate-900">Mis datos</h2>
              <p className="mt-2 text-slate-600">{client.address}{client.neighborhood ? `, ${client.neighborhood}` : ''}</p>
              <p className="text-slate-600">{client.municipality} · Código {client.clientCode}</p>
              <p className="mt-1 text-slate-500">{client.user.email}</p>
            </section>

            <Link
              to="/cliente/notificaciones"
              className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              <Bell className="h-4 w-4" />
              Ver mis notificaciones
            </Link>
          </>
        )}

        <footer className="pb-4 text-center text-xs text-slate-500">
          UNITIK Internet Sin Límite
        </footer>
      </div>
    </main>
  );
}
