import { LogOut, ShieldCheck } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth';

export interface DashboardNavItem {
  label: string;
  to: string;
  icon?: React.ReactNode;
}

interface DashboardShellProps {
  title: string;
  subtitle?: string;
  navItems: DashboardNavItem[];
  children: React.ReactNode;
}

export default function DashboardShell({ title, subtitle, navItems, children }: DashboardShellProps) {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  return (
    <div className="flex min-h-screen bg-slate-100">
      <aside className="w-72 bg-slate-900 p-5 text-slate-100">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-unitik-500/20 text-unitik-300">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Unitik</p>
            <h1 className="text-lg font-bold">{title}</h1>
          </div>
        </div>

        <nav className="space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                  isActive ? 'bg-unitik-500/20 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="mt-8 rounded-lg border border-slate-700 bg-slate-800 p-3">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Sesión</p>
          <p className="mt-2 text-sm font-medium text-white">{user?.firstName} {user?.lastName}</p>
          <p className="text-xs text-slate-400">{user?.role}</p>
        </div>

        <button
          onClick={() => {
            logout();
            navigate('/login');
          }}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 transition hover:bg-slate-800"
        >
          <LogOut className="h-4 w-4" /> Cerrar sesión
        </button>
      </aside>

      <main className="flex-1 p-6 lg:p-8">
        <header className="mb-6 rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-unitik-600">Dashboard</p>
          <h2 className="mt-2 text-2xl font-bold text-slate-900">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
        </header>
        <div className="space-y-6">{children}</div>
      </main>
    </div>
  );
}
