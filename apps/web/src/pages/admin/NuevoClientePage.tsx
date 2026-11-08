import { useAuthStore } from '../../stores/auth';
import DashboardShell, { type DashboardNavItem } from '../../components/DashboardShell';
import FormularioNuevoCliente from './FormularioNuevoCliente';

const adminNavItems: DashboardNavItem[] = [
  { label: 'Resumen', to: '/admin/dashboard' },
  { label: 'Registrar cliente', to: '/clientes/nuevo' },
  { label: 'Planes', to: '/admin/planes' },
  { label: 'Políticas', to: '/admin/politicas' },
  { label: 'Facturación', to: '/admin/facturacion' },
];

const technicianNavItems: DashboardNavItem[] = [
  { label: 'Resumen', to: '/tecnico/dashboard' },
  { label: 'Registrar cliente', to: '/clientes/nuevo' },
  { label: 'Clientes', to: '/tecnico/clientes' },
  { label: 'Tickets', to: '/tecnico/tickets' },
];

export default function NuevoClientePage() {
  const role = useAuthStore((state) => state.user?.role);
  const isAdmin = role === 'ADMIN';
  return (
    <DashboardShell
      title="Alta de clientes"
      subtitle="Registro interno para personal autorizado."
      navItems={isAdmin ? adminNavItems : technicianNavItems}
    >
      <FormularioNuevoCliente />
    </DashboardShell>
  );
}
