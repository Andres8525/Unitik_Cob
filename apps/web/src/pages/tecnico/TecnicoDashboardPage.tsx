import { ClipboardCheck, FileStack, MapPinned, Radio, Ticket } from 'lucide-react';
import { Link } from 'react-router-dom';
import DashboardShell, { type DashboardNavItem } from '../../components/DashboardShell';

const navItems: DashboardNavItem[] = [
  { label: 'Resumen', to: '/tecnico/dashboard', icon: <ClipboardCheck className="h-4 w-4" /> },
  { label: 'Instalaciones', to: '/tecnico/instalaciones', icon: <MapPinned className="h-4 w-4" /> },
  { label: 'Clientes', to: '/tecnico/clientes', icon: <FileStack className="h-4 w-4" /> },
  { label: 'Tickets', to: '/tecnico/tickets', icon: <Ticket className="h-4 w-4" /> },
  { label: 'Red', to: '/tecnico/red', icon: <Radio className="h-4 w-4" /> },
];

const cards = [
  { label: 'Instalaciones hoy', value: '08', detail: '2 pendientes por revisión' },
  { label: 'Actas abiertas', value: '12', detail: '5 con firma pendiente' },
  { label: 'Clientes nuevos', value: '05', detail: '2 en programación' },
  { label: 'Incidencias', value: '03', detail: '1 de prioridad alta' },
];

export default function TecnicoDashboardPage() {
  return (
    <DashboardShell title="Técnico" subtitle="Operación de campo y soporte" navItems={navItems}>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm text-slate-500">{card.label}</p>
            <p className="mt-3 text-2xl font-bold text-slate-900">{card.value}</p>
            <p className="mt-2 text-xs text-slate-400">{card.detail}</p>
          </div>
        ))}
      </section>

      <div>
        <Link
          className="inline-flex items-center gap-2 rounded-lg bg-unitik-600 px-4 py-2 text-sm font-semibold text-white hover:bg-unitik-700"
          to="/clientes/nuevo"
        >
          Registrar cliente
        </Link>
      </div>

      <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h3 className="mb-3 font-semibold text-slate-700">Agenda de trabajo</h3>
        <div className="space-y-3">
          {[
            ['09:00', 'Instalación Cliente 1478 - Barrio La Palma'],
            ['11:30', 'Revisión de radio enlace Sector Norte'],
            ['14:00', 'Soporte técnico ticket #321'],
          ].map(([time, task]) => (
            <div key={time} className="flex items-center justify-between rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
              <span className="font-medium text-slate-900">{time}</span>
              <span>{task}</span>
            </div>
          ))}
        </div>
      </section>
    </DashboardShell>
  );
}
