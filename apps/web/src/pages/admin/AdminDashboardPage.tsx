import { BarChart3, CreditCard, FileText, Package, Settings, UserPlus, Users, Wrench } from 'lucide-react';
import { Link } from 'react-router-dom';
import DashboardShell, { type DashboardNavItem } from '../../components/DashboardShell';
import DashboardAdmin from './DashboardAdmin';
import PanelFacturacion from './PanelFacturacion';

const navItems: DashboardNavItem[] = [
  { label: 'Resumen', to: '/admin/dashboard', icon: <BarChart3 className="h-4 w-4" /> },
  { label: 'Clientes', to: '/admin/clientes', icon: <Users className="h-4 w-4" /> },
  { label: 'Planes', to: '/admin/planes', icon: <Package className="h-4 w-4" /> },
  { label: 'Políticas', to: '/admin/politicas', icon: <Settings className="h-4 w-4" /> },
  { label: 'Facturación', to: '/admin/facturacion', icon: <CreditCard className="h-4 w-4" /> },
  { label: 'Operación', to: '/admin/operacion', icon: <Wrench className="h-4 w-4" /> },
  { label: 'Informes', to: '/admin/informes', icon: <FileText className="h-4 w-4" /> },
];

export default function AdminDashboardPage() {
  return (
    <DashboardShell
      title="Administrador"
      subtitle="Métricas operativas y facturación electrónica."
      navItems={navItems}
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
