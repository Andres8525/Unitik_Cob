import {
  Banknote,
  BarChart3,
  CreditCard,
  FileText,
  Package,
  Search,
  Settings,
  Users,
  Wrench,
} from 'lucide-react';
import type { DashboardNavItem } from './DashboardShell';

const iconClassName = 'h-4 w-4';

/** Single source of truth for the administrator sidebar (every link maps to a real route). */
export const ADMIN_NAV_ITEMS: DashboardNavItem[] = [
  { label: 'Resumen', to: '/admin/dashboard', icon: <BarChart3 className={iconClassName} /> },
  { label: 'Clientes', to: '/admin/clientes', icon: <Users className={iconClassName} /> },
  { label: 'Planes', to: '/admin/planes', icon: <Package className={iconClassName} /> },
  { label: 'Políticas', to: '/admin/politicas', icon: <Settings className={iconClassName} /> },
  { label: 'Facturación', to: '/admin/facturacion', icon: <CreditCard className={iconClassName} /> },
  { label: 'Operación', to: '/admin/operacion', icon: <Wrench className={iconClassName} /> },
  { label: 'Informes', to: '/admin/informes', icon: <FileText className={iconClassName} /> },
];

/** Cashier sidebar: summary plus the cash collection panel. */
export const CASHIER_NAV_ITEMS: DashboardNavItem[] = [
  { label: 'Resumen', to: '/cajero/dashboard', icon: <Banknote className={iconClassName} /> },
  { label: 'Registrar pago', to: '/cajero/pagos', icon: <Search className={iconClassName} /> },
];
