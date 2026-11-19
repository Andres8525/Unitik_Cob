import { LogOut, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth';
import BrandLogo from './BrandLogo';

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
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const sidebarContent = (
    <>
      <nav className="space-y-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={() => setMenuOpen(false)}
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
        <p className="mt-2 text-sm font-medium text-white">
          {user?.firstName} {user?.lastName}
        </p>
        <p className="text-xs text-slate-400">{user?.role}</p>
      </div>

      <button
        type="button"
        onClick={handleLogout}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 transition hover:bg-slate-800"
      >
        <LogOut className="h-4 w-4" /> Cerrar sesión
      </button>
    </>
  );

  return (
    <div className="min-h-screen bg-slate-100 lg:flex">
      {/* Mobile top bar: keeps the brand visible on field devices */}
      <div className="sticky top-0 z-30 bg-slate-900 text-slate-100 lg:hidden">
        <div className="flex items-center justify-between gap-3 px-4 py-2">
          <div className="flex min-w-0 items-center gap-3">
            <span className="rounded-lg bg-white p-0.5">
              <BrandLogo className="h-10 w-auto" alt="UNITIK Internet Sin Límite" />
            </span>
            <p className="truncate text-sm font-bold">{title}</p>
          </div>
          <button
            type="button"
            aria-expanded={menuOpen}
            aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
            onClick={() => setMenuOpen((open) => !open)}
            className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-200 hover:bg-slate-800"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
        {menuOpen && <div className="border-t border-slate-800 p-4">{sidebarContent}</div>}
      </div>

      <aside className="hidden w-72 shrink-0 bg-slate-900 p-5 text-slate-100 lg:block">
        <div className="mb-8 space-y-4">
          <div className="flex justify-center rounded-xl bg-white p-2 shadow-sm ring-1 ring-white/10">
            <BrandLogo className="h-28 w-auto" alt="UNITIK Internet Sin Límite" />
          </div>
          <div className="text-center">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Panel</p>
            <h1 className="text-lg font-bold">{title}</h1>
          </div>
        </div>
        {sidebarContent}
      </aside>

      <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
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
