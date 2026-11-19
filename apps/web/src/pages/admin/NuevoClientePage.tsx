import { useAuthStore } from '../../stores/auth';
import DashboardShell from '../../components/DashboardShell';
import { ADMIN_NAV_ITEMS, TECHNICIAN_NAV_ITEMS } from '../../components/navigation';
import FormularioNuevoCliente from './FormularioNuevoCliente';

export default function NuevoClientePage() {
  const role = useAuthStore((state) => state.user?.role);
  const isAdmin = role === 'ADMIN';
  return (
    <DashboardShell
      title="Alta de clientes"
      subtitle="Registro interno para personal autorizado."
      navItems={isAdmin ? ADMIN_NAV_ITEMS : TECHNICIAN_NAV_ITEMS}
    >
      <FormularioNuevoCliente />
    </DashboardShell>
  );
}
