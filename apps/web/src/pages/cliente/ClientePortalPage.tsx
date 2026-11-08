import { CreditCard, Download, FileText, Gauge, UserCircle } from 'lucide-react';
import DashboardShell, { type DashboardNavItem } from '../../components/DashboardShell';

const navItems: DashboardNavItem[] = [
  { label: 'Mi portal', to: '/cliente/portal', icon: <UserCircle className="h-4 w-4" /> },
  { label: 'Planes', to: '/cliente/planes', icon: <Gauge className="h-4 w-4" /> },
  { label: 'Pagos', to: '/cliente/pagos', icon: <CreditCard className="h-4 w-4" /> },
  { label: 'Facturas', to: '/cliente/facturas', icon: <Download className="h-4 w-4" /> },
  { label: 'Soporte', to: '/cliente/soporte', icon: <FileText className="h-4 w-4" /> },
];

const cards = [
  { label: 'Plan actual', value: 'Fibra 100 Mbps', detail: 'Activo desde 02/11/2026' },
  { label: 'Pago pendiente', value: '$ 180.000', detail: 'Vence 15/11/2026' },
  { label: 'Facturas', value: '03', detail: '2 descargadas' },
  { label: 'Estado', value: 'Conectado', detail: 'Servicio estable' },
];

export default function ClientePortalPage() {
  return (
    <DashboardShell title="Cliente" subtitle="Autogestión y consulta de servicios" navItems={navItems}>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm text-slate-500">{card.label}</p>
            <p className="mt-3 text-2xl font-bold text-slate-900">{card.value}</p>
            <p className="mt-2 text-xs text-slate-400">{card.detail}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <h3 className="mb-3 font-semibold text-slate-700">Últimas facturas</h3>
          <div className="space-y-3 text-sm text-slate-600">
            {[
              ['Factura Oct 2026', '$ 180.000', 'Pendiente'],
              ['Factura Sep 2026', '$ 180.000', 'Pagada'],
              ['Factura Ago 2026', '$ 180.000', 'Pagada'],
            ].map(([name, amount, status]) => (
              <div key={name} className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
                <div>
                  <p className="font-medium text-slate-900">{name}</p>
                  <p className="text-xs text-slate-500">{status}</p>
                </div>
                <span className="font-semibold text-slate-900">{amount}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <h3 className="mb-3 font-semibold text-slate-700">Dos puntos rápidos</h3>
          <div className="grid gap-3">
            {['Pago en línea', 'Descargar facturas', 'Ver historial de pagos', 'Solicitar soporte'].map((action) => (
              <button
                key={action}
                className="rounded-lg border border-slate-200 px-3 py-2 text-left text-sm text-slate-600 transition hover:border-unitik-200 hover:bg-unitik-50"
              >
                {action}
              </button>
            ))}
          </div>
        </div>
      </section>
    </DashboardShell>
  );
}
