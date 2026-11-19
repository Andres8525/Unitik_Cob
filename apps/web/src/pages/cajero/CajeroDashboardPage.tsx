import { useQuery } from '@tanstack/react-query';
import { LoaderCircle, RefreshCw, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatCop, type DailyClose } from '@unitik/shared-types';
import { api } from '../../api/http';
import DashboardShell from '../../components/DashboardShell';
import { CASHIER_NAV_ITEMS } from '../../components/navigation';

function formatTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
}

export default function CajeroDashboardPage() {
  const dailyClose = useQuery({
    queryKey: ['cashier', 'daily-close'],
    queryFn: () => api<DailyClose>('/cashier/daily-close'),
    refetchInterval: 60_000,
  });

  const data = dailyClose.data;
  const lastPayment = data?.payments.at(-1);
  const cards = data
    ? [
        { label: 'Recaudo hoy', value: formatCop(data.totalReceived), detail: `Cierre del ${data.date}` },
        {
          label: 'Pagos procesados',
          value: data.paymentsCount.toLocaleString('es-CO'),
          detail: 'Recibos en efectivo emitidos',
        },
        {
          label: 'Pago promedio',
          value: formatCop(data.paymentsCount ? data.totalReceived / data.paymentsCount : 0),
          detail: 'Valor medio por recibo',
        },
        {
          label: 'Último recaudo',
          value: lastPayment ? formatTime(lastPayment.receiptTime) : '—',
          detail: lastPayment ? lastPayment.clientName : 'Sin pagos registrados hoy',
        },
      ]
    : [];

  return (
    <DashboardShell title="Cajero" subtitle="Cobranza y validación de pagos" navItems={CASHIER_NAV_ITEMS}>
      {dailyClose.isPending && (
        <p aria-busy="true" className="flex items-center gap-2 text-sm text-slate-500">
          <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
          Cargando cierre del día…
        </p>
      )}

      {dailyClose.isError && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          <span>No se pudo cargar el cierre del día: {dailyClose.error.message}</span>
          <button
            type="button"
            onClick={() => void dailyClose.refetch()}
            className="inline-flex items-center gap-2 rounded-lg border border-red-300 bg-white px-3 py-1.5 font-semibold hover:bg-red-100"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Reintentar
          </button>
        </div>
      )}

      {data && (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => (
            <div key={card.label} className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <p className="text-sm text-slate-500">{card.label}</p>
              <p className="mt-3 text-2xl font-bold text-slate-900">{card.value}</p>
              <p className="mt-2 truncate text-xs text-slate-400">{card.detail}</p>
            </div>
          ))}
        </section>
      )}

      <Link
        className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-emerald-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-700"
        to="/cajero/pagos"
      >
        <Search className="h-4 w-4" aria-hidden="true" />
        Buscar cliente y registrar pago
      </Link>

      {data && (
        <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <h3 className="mb-3 font-semibold text-slate-700">Últimos recaudos</h3>
          {data.payments.length === 0 ? (
            <p className="text-sm text-slate-500">Aún no hay pagos en efectivo registrados hoy.</p>
          ) : (
            <div className="space-y-3 text-sm text-slate-600">
              {[...data.payments]
                .reverse()
                .slice(0, 5)
                .map((payment) => (
                  <div
                    key={`${payment.invoiceNumber}-${payment.receiptTime}`}
                    className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-900">{payment.clientName}</p>
                      <p className="text-xs text-slate-500">
                        {payment.invoiceNumber} · {formatTime(payment.receiptTime)}
                      </p>
                    </div>
                    <span className="shrink-0 font-semibold text-emerald-600">
                      {formatCop(payment.amount)}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </section>
      )}
    </DashboardShell>
  );
}
