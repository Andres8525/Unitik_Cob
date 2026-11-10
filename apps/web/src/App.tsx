import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminFacturacionPage from './pages/admin/AdminFacturacionPage';
import AdminClientesPage from './pages/admin/AdminClientesPage';
import AdminOperacionPage from './pages/admin/AdminOperacionPage';
import AdminInformesPage from './pages/admin/AdminInformesPage';
import ListaPlanes from './pages/admin/ListaPlanes';
import ConfiguracionPoliticas from './pages/admin/ConfiguracionPoliticas';
import NuevoClientePage from './pages/admin/NuevoClientePage';
import CajeroDashboardPage from './pages/cajero/CajeroDashboardPage';
import PanelCajero from './pages/cajero/PanelCajero';
import PortalCliente from './pages/client/PortalCliente';
import HistorialNotificaciones from './pages/client/HistorialNotificaciones';
import PublicClientRegistrationPage from './pages/PublicClientRegistrationPage';
import TecnicoDashboardPage from './pages/tecnico/TecnicoDashboardPage';
import ActaInstalacion from './pages/tecnico/ActaInstalacion';
import { isDemoMode, resetDemoData } from './api/demo';

export default function App() {
  return (
    <>
      {isDemoMode() && (
        <div className="flex flex-wrap items-center justify-between gap-2 bg-amber-100 px-4 py-2 text-xs text-amber-950">
          <p>
            <strong>Modo demo:</strong> las acciones y los datos son simulados en este navegador; no
            se conecta a servicios reales.
          </p>
          <button
            className="rounded border border-amber-400 px-2 py-1 font-semibold hover:bg-amber-200"
            onClick={() => {
              if (
                window.confirm('¿Restablecer todos los datos de demostración de este navegador?')
              ) {
                resetDemoData();
                window.location.assign('/login');
              }
            }}
            type="button"
          >
            Restablecer demo
          </button>
        </div>
      )}
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/registro" element={<PublicClientRegistrationPage />} />
        <Route path="/estado" element={<HomePage />} />

        <Route element={<ProtectedRoute roles={['ADMIN']} />}>
          <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
          <Route path="/admin/clientes" element={<AdminClientesPage />} />
          <Route path="/admin/facturacion" element={<AdminFacturacionPage />} />
          <Route path="/admin/operacion" element={<AdminOperacionPage />} />
          <Route path="/admin/informes" element={<AdminInformesPage />} />
          <Route path="/admin/planes" element={<ListaPlanes />} />
          <Route path="/admin/politicas" element={<ConfiguracionPoliticas />} />
        </Route>

        <Route element={<ProtectedRoute roles={['TECHNICIAN']} />}>
          <Route path="/tecnico/dashboard" element={<TecnicoDashboardPage />} />
          <Route path="/tecnico/instalaciones" element={<ActaInstalacion />} />
        </Route>

        <Route element={<ProtectedRoute roles={['CASHIER']} />}>
          <Route path="/cajero/dashboard" element={<CajeroDashboardPage />} />
          <Route path="/cajero/pagos" element={<PanelCajero />} />
        </Route>

        <Route element={<ProtectedRoute roles={['CLIENT']} />}>
          <Route path="/cliente/portal" element={<PortalCliente />} />
          <Route path="/cliente/notificaciones" element={<HistorialNotificaciones />} />
        </Route>

        <Route element={<ProtectedRoute roles={['ADMIN', 'TECHNICIAN']} />}>
          <Route path="/clientes/nuevo" element={<NuevoClientePage />} />
        </Route>

        <Route path="/portal" element={<Navigate to="/cliente/portal" replace />} />
        <Route path="/panel" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="/tecnico" element={<Navigate to="/tecnico/dashboard" replace />} />
        <Route path="/cajero" element={<Navigate to="/cajero/dashboard" replace />} />
        <Route path="/cliente" element={<Navigate to="/cliente/portal" replace />} />

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </>
  );
}
