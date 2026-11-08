import { BarChart3, CreditCard, FileText, Package, Settings, Users, Wrench } from 'lucide-react';
import DashboardShell, { type DashboardNavItem } from '../../components/DashboardShell';
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

export default function AdminFacturacionPage() {
  return (
    <DashboardShell
      title="Facturación electrónica"
      subtitle="Consulta y gestiona las facturas del mes."
      navItems={navItems}
    >
      <PanelFacturacion />
    </DashboardShell>
  );
}
