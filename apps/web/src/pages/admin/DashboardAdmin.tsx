import { Banknote, Users, UserRoundX, Wallet } from 'lucide-react';
import { formatCop } from '@unitik/shared-types';
import { useFacturacionStore } from '../../stores/facturacion';

export default function DashboardAdmin() {
  const metrics = useFacturacionStore((state) => state.metrics);
  const cards = [
    {
      label: 'Clientes activos',
      value: metrics.activeClients.toLocaleString('es-CO'),
      detail: 'Servicios en operación',
      icon: Users,
      color: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    },
    {
      label: 'Clientes suspendidos',
      value: metrics.suspendedClients.toLocaleString('es-CO'),
      detail: 'Requieren seguimiento',
      icon: UserRoundX,
      color: 'bg-rose-50 text-rose-700 ring-rose-100',
    },
    {
      label: 'Recaudado hoy',
      value: formatCop(metrics.collectedToday),
      detail: 'Pagos registrados durante el día',
      icon: Banknote,
      color: 'bg-sky-50 text-sky-700 ring-sky-100',
    },
    {
      label: 'Cartera vencida',
      value: formatCop(metrics.overduePortfolio),
      detail: 'Facturas pendientes de pago',
      icon: Wallet,
      color: 'bg-amber-50 text-amber-700 ring-amber-100',
    },
  ];

  return (
    <section aria-label="Indicadores de facturación" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
