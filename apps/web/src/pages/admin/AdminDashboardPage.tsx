import { Activity, BarChart3, CreditCard, FileText, Users, Wrench } from 'lucide-react';
import DashboardShell, { type DashboardNavItem } from '../../components/DashboardShell';

const navItems: DashboardNavItem[] = [
  { label: 'Resumen', to: '/admin/dashboard', icon: <BarChart3 className="h-4 w-4" /> },
  { label: 'Clientes', to: '/admin/clientes', icon: <Users className="h-4 w-4" /> },
  { label: 'Facturación', to: '/admin/facturacion', icon: <CreditCard className="h-4 w-4" /> },
  { label: 'Operación', to: '/admin/operacion', icon: <Wrench className="h-4 w-4" /> },
  { label: 'Informes', to: '/admin/informes', icon: <FileText className="h-4 w-4" /> },
];

const cards = [
  { label: 'Clientes activos', value: '1.284', detail: '+6.8% vs mes anterior' },
  { label: 'Ingresos del mes', value: '$ 18.430.000', detail: 'Cobranza consolidada' },
  { label: 'Tickets abiertos', value: '18', detail: '4 críticos' },
  { label: 'Dispositivos online', value: '96.3%', detail: 'Red y servicios' },
];

export default function AdminDashboardPage() {
  return (
    <DashboardShell title="Administrador" subtitle="Control total del negocio y operación" navItems={navItems}>
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
          <div className="mb-3 flex items-center gap-2 text-slate-700">
            <Activity className="h-4 w-4 text-unitik-600" />
            <h3 className="font-semibold">Estado operativo</h3>
          </div>
          <div className="space-y-3 text-sm text-slate-600">
            <div className="flex justify-between rounded-lg bg-slate-50 p-3">
              <span>Fibra óptica</span>
              <span className="font-semibold text-emerald-600">95% estable</span>
            </div>
            <div className="flex justify-between rounded-lg bg-slate-50 p-3">
              <span>Radio enlace</span>
              <span className="font-semibold text-amber-600">Monitoreo activo</span>
            </div>
            <div className="flex justify-between rounded-lg bg-slate-50 p-3">
              <span>Pagos</span>
              <span className="font-semibold text-sky-600">4 pendientes por validación</span>
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <h3 className="mb-3 font-semibold text-slate-700">Acciones rápidas</h3>
          <div className="grid gap-3">
            {['Crear cliente', 'Registrar pago', 'Generar informe mensual', 'Ver incidencias'].map((action) => (
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
