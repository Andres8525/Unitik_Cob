import {
  Banknote,
  BarChart3,
  ClipboardCheck,
  CreditCard,
  FileText,
  MapPinned,
  Megaphone,
  Package,
  ReceiptText,
  Search,
  Settings,
  UserPlus,
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
  {
    label: 'Facturación',
    to: '/admin/facturacion',
    icon: <CreditCard className={iconClassName} />,
  },
  {
    label: 'Gestión de Pagos',
    to: '/admin/pagos',
    icon: <ReceiptText className={iconClassName} />,
  },
  { label: 'Publicidad', to: '/admin/publicidad', icon: <Megaphone className={iconClassName} /> },
  { label: 'Operación', to: '/admin/operacion', icon: <Wrench className={iconClassName} /> },
  { label: 'Informes', to: '/admin/informes', icon: <FileText className={iconClassName} /> },
];

/** Cashier sidebar: summary plus the cash collection panel. */
export const CASHIER_NAV_ITEMS: DashboardNavItem[] = [
  { label: 'Resumen', to: '/cajero/dashboard', icon: <Banknote className={iconClassName} /> },
  { label: 'Registrar pago', to: '/cajero/pagos', icon: <Search className={iconClassName} /> },
];

/** Technician sidebar: summary, installation acta and client onboarding. */
export const TECHNICIAN_NAV_ITEMS: DashboardNavItem[] = [
  {
    label: 'Resumen',
    to: '/tecnico/dashboard',
    icon: <ClipboardCheck className={iconClassName} />,
  },
  {
    label: 'Acta de instalación',
    to: '/tecnico/instalaciones',
    icon: <MapPinned className={iconClassName} />,
  },
  {
    label: 'Registrar cliente',
    to: '/clientes/nuevo',
    icon: <UserPlus className={iconClassName} />,
  },
];
