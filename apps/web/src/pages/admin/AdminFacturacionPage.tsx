import DashboardShell from '../../components/DashboardShell';
import { ADMIN_NAV_ITEMS } from '../../components/navigation';
import PanelFacturacion from './PanelFacturacion';

export default function AdminFacturacionPage() {
  return (
    <DashboardShell
      title="Facturación electrónica"
      subtitle="Consulta y gestiona las facturas del mes."
      navItems={ADMIN_NAV_ITEMS}
    >
      <PanelFacturacion />
    </DashboardShell>
  );
}
