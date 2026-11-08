import { Banknote, ClipboardList, Search, WalletCards } from 'lucide-react';
import DashboardShell, { type DashboardNavItem } from '../../components/DashboardShell';

const navItems: DashboardNavItem[] = [
  { label: 'Resumen', to: '/cajero/dashboard', icon: <Banknote className="h-4 w-4" /> },
  { label: 'Buscar cliente', to: '/cajero/buscar', icon: <Search className="h-4 w-4" /> },
  { label: 'Recaudos', to: '/cajero/recibos', icon: <WalletCards className="h-4 w-4" /> },
  { label: 'Agenda', to: '/cajero/agenda', icon: <ClipboardList className="h-4 w-4" /> },
];

const cards = [
  { label: 'Recaudo hoy', value: '$ 4.250.000', detail: '42 pagos procesados' },
  { label: 'Clientes pendientes', value: '18', detail: '2 con reserva económica' },
  { label: 'Efectivo en caja', value: '$ 1.850.000', detail: 'Disponible para cierre' },
  { label: 'Validaciones', value: '07', detail: '1 en revisión' },
];

export default function CajeroDashboardPage() {
  return (
    <DashboardShell title="Cajero" subtitle="Cobranza y validación de pagos" navItems={navItems}>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm text-slate-500">{card.label}</p>
            <p className="mt-3 text-2xl font-bold text-slate-900">{card.value}</p>
            <p className="mt-2 text-xs text-slate-400">{card.detail}</p>
          </div>
        ))}
      </section>

      <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h3 className="mb-3 font-semibold text-slate-700">Últimos recaudos</h3>
        <div className="space-y-3 text-sm text-slate-600">
          {[
            ['Cliente 2112', '$ 250.000', 'Pago de servicio'],
            ['Cliente 1855', '$ 180.000', 'Pago de tarifa de instalación'],
            ['Cliente 998', '$ 310.000', 'Cuota mensual'],
          ].map(([name, amount, description]) => (
            <div key={name} className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
              <div>
                <p className="font-medium text-slate-900">{name}</p>
                <p className="text-xs text-slate-500">{description}</p>
              </div>
              <span className="font-semibold text-emerald-600">{amount}</span>
            </div>
          ))}
        </div>
      </section>
    </DashboardShell>
  );
}
