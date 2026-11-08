import { useState } from 'react';
import { Banknote, BarChart3, CreditCard, FileText, Plus, Settings, Users, Wrench } from 'lucide-react';
import { formatCop } from '@unitik/shared-types';
import DashboardShell, { type DashboardNavItem } from '../../components/DashboardShell';
import {
  usePlanesStore,
  type NewServicePlan,
  type ServicePlan,
} from '../../stores/planes';
import FormularioPlan from './FormularioPlan';

const navItems: DashboardNavItem[] = [
  { label: 'Resumen', to: '/admin/dashboard', icon: <BarChart3 className="h-4 w-4" /> },
  { label: 'Clientes', to: '/admin/clientes', icon: <Users className="h-4 w-4" /> },
  { label: 'Planes', to: '/admin/planes', icon: <Banknote className="h-4 w-4" /> },
  { label: 'Políticas', to: '/admin/politicas', icon: <Settings className="h-4 w-4" /> },
  { label: 'Facturación', to: '/admin/facturacion', icon: <CreditCard className="h-4 w-4" /> },
  { label: 'Operación', to: '/admin/operacion', icon: <Wrench className="h-4 w-4" /> },
  { label: 'Informes', to: '/admin/informes', icon: <FileText className="h-4 w-4" /> },
];

export default function ListaPlanes() {
  const planes = usePlanesStore((state) => state.planes);
  const agregarPlan = usePlanesStore((state) => state.agregarPlan);
  const editarPlan = usePlanesStore((state) => state.editarPlan);
  const cambiarEstadoPlan = usePlanesStore((state) => state.cambiarEstadoPlan);
  const [formPlan, setFormPlan] = useState<ServicePlan | null | undefined>(undefined);

  const savePlan = (planData: NewServicePlan) => {
    if (formPlan) {
      editarPlan(formPlan.id, planData);
    } else {
      agregarPlan(planData);
    }
    setFormPlan(undefined);
  };

  return (
    <DashboardShell
      title="Planes de servicio"
      subtitle="Administra las tarifas y características de Fibra Óptica y Radio Enlace."
      navItems={navItems}
    >
      <section className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-5">
          <div>
            <h3 className="font-semibold text-slate-900">Planes registrados</h3>
            <p className="mt-1 text-sm text-slate-500">{planes.length} planes en el catálogo</p>
          </div>
          <button
            className="inline-flex items-center gap-2 rounded-lg bg-unitik-600 px-4 py-2 text-sm font-semibold text-white hover:bg-unitik-700"
            onClick={() => setFormPlan(null)}
            type="button"
          >
            <Plus className="h-4 w-4" />
            Crear plan
          </button>
        </header>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3 font-semibold">Nombre</th>
                <th className="px-5 py-3 font-semibold">Velocidad</th>
                <th className="px-5 py-3 font-semibold">Tecnología</th>
                <th className="px-5 py-3 font-semibold">Valor mensual</th>
                <th className="px-5 py-3 font-semibold">Reúso</th>
                <th className="px-5 py-3 font-semibold">Estado</th>
                <th className="px-5 py-3 text-right font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {planes.map((plan) => (
                <tr className="text-slate-700" key={plan.id}>
                  <td className="px-5 py-4 font-medium text-slate-900">{plan.name}</td>
                  <td className="px-5 py-4">{plan.speedMbps} Mbps</td>
                  <td className="px-5 py-4">{plan.technology === 'FIBER' ? 'Fibra Óptica' : 'Radio Enlace'}</td>
                  <td className="px-5 py-4">{formatCop(plan.monthlyPrice)}</td>
                  <td className="px-5 py-4">{plan.reuseRatio}</td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                        plan.status === 'ACTIVE'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {plan.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-2">
                      <button
                        className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        onClick={() => setFormPlan(plan)}
                        type="button"
                      >
                        Editar
                      </button>
                      {plan.status === 'ACTIVE' && (
                        <button
                          className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                          onClick={() => cambiarEstadoPlan(plan.id, 'INACTIVE')}
                          type="button"
                        >
                          Inactivar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {planes.length === 0 && (
                <tr>
                  <td className="px-5 py-10 text-center text-slate-500" colSpan={7}>
                    Aún no hay planes registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {formPlan !== undefined && (
        <FormularioPlan
          onCancel={() => setFormPlan(undefined)}
          onSave={savePlan}
          plan={formPlan ?? undefined}
        />
      )}
    </DashboardShell>
  );
}
