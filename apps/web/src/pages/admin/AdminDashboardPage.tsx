import { UserPlus } from 'lucide-react';
import { Link } from 'react-router-dom';
import DashboardShell from '../../components/DashboardShell';
import { ADMIN_NAV_ITEMS } from '../../components/navigation';
import DashboardAdmin from './DashboardAdmin';
import PanelFacturacion from './PanelFacturacion';

export default function AdminDashboardPage() {
  return (
    <DashboardShell
      title="Administrador"
      subtitle="Métricas operativas y facturación electrónica."
      navItems={ADMIN_NAV_ITEMS}
    >
      <DashboardAdmin />
      <div>
        <Link
          className="inline-flex items-center gap-2 rounded-lg bg-unitik-600 px-4 py-2 text-sm font-semibold text-white hover:bg-unitik-700"
          to="/clientes/nuevo"
        >
          <UserPlus className="h-4 w-4" />
          Registrar cliente
        </Link>
      </div>
      <PanelFacturacion />
    </DashboardShell>
  );
}
