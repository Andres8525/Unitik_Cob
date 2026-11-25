import { useQuery } from '@tanstack/react-query';
import {
  Banknote,
  LoaderCircle,
  RefreshCw,
  Router,
  Ticket,
  Users,
  UserRoundX,
  Wallet,
} from 'lucide-react';
import { formatCop, type DashboardKpis } from '@unitik/shared-types';
import { api } from '../../api/http';

export default function DashboardAdmin() {
  const kpis = useQuery({
    queryKey: ['dashboard', 'kpis'],
    queryFn: () => api<DashboardKpis>('/dashboard/kpis'),
    refetchInterval: 60_000,
  });

  if (kpis.isPending) {
    return (
      <section
        aria-busy="true"
        className="flex items-center gap-2 rounded-xl bg-white p-5 text-sm text-slate-500 shadow-sm ring-1 ring-slate-200"
      >
        <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
        Cargando indicadores…
      </section>
    );
  }

  if (kpis.isError) {
    return (
      <section
        role="alert"
        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800"
      >
        <span>No se pudieron cargar los indicadores: {kpis.error.message}</span>
        <button
          type="button"
          onClick={() => void kpis.refetch()}
          className="inline-flex items-center gap-2 rounded-lg border border-red-300 bg-white px-3 py-1.5 font-semibold hover:bg-red-100"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Reintentar
        </button>
      </section>
    );
  }

  const data = kpis.data;
  const cards = [
    {
      label: 'Clientes activos',
      value: data.activeClients.toLocaleString('es-CO'),
      detail: 'Servicios en operación',
      icon: Users,
      color: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    },
    {
      label: 'Clientes suspendidos',
      value: data.suspendedClients.toLocaleString('es-CO'),
      detail: 'Requieren seguimiento',
      icon: UserRoundX,
      color: 'bg-rose-50 text-rose-700 ring-rose-100',
    },
    {
      label: 'Recaudado del mes',
      value: formatCop(data.monthRevenue),
      detail: `Hoy: ${formatCop(data.todayRevenue)} en ${data.todayPayments.toLocaleString('es-CO')} pago${data.todayPayments === 1 ? '' : 's'}`,
      icon: Banknote,
      color: 'bg-sky-50 text-sky-700 ring-sky-100',
    },
    {
      label: 'Cartera vencida',
      value: formatCop(data.overdueAmount),
      detail: `${data.overdueClients.toLocaleString('es-CO')} clientes en mora`,
      icon: Wallet,
      color: 'bg-amber-50 text-amber-700 ring-amber-100',
    },
    {
      label: 'Tickets abiertos',
      value: data.openTickets.toLocaleString('es-CO'),
      detail: 'Abiertos o en progreso',
      icon: Ticket,
      color: 'bg-violet-50 text-violet-700 ring-violet-100',
    },
    {
      label: 'Equipos de red en línea',
      value: `${data.devicesOnline} / ${data.devicesTotal}`,
      detail: 'Ping en los últimos 5 minutos',
      icon: Router,
      color: 'bg-cyan-50 text-cyan-700 ring-cyan-100',
    },
  ];

  return (
    <section
      aria-label="Indicadores operativos"
      className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
    >
      {cards.map(({ label, value, detail, icon: Icon, color }) => (
        <article className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200" key={label}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-slate-500">{label}</p>
              <p className="mt-3 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
            </div>
            <span className={`rounded-lg p-2.5 ring-1 ${color}`}>
              <Icon aria-hidden="true" className="h-5 w-5" />
            </span>
          </div>
          <p className="mt-3 text-xs text-slate-500">{detail}</p>
        </article>
      ))}
    </section>
  );
}
