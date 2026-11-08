import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminFacturacionPage from './pages/admin/AdminFacturacionPage';
import ListaPlanes from './pages/admin/ListaPlanes';
import ConfiguracionPoliticas from './pages/admin/ConfiguracionPoliticas';
import NuevoClientePage from './pages/admin/NuevoClientePage';
import CajeroDashboardPage from './pages/cajero/CajeroDashboardPage';
import PortalPage from './pages/client/PortalPage';
import PublicClientRegistrationPage from './pages/PublicClientRegistrationPage';
import TecnicoDashboardPage from './pages/tecnico/TecnicoDashboardPage';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/registro" element={<PublicClientRegistrationPage />} />
      <Route path="/estado" element={<HomePage />} />

      <Route element={<ProtectedRoute roles={['ADMIN']} />}>
        <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
        <Route path="/admin/facturacion" element={<AdminFacturacionPage />} />
        <Route path="/admin/planes" element={<ListaPlanes />} />
        <Route path="/admin/politicas" element={<ConfiguracionPoliticas />} />
      </Route>

      <Route element={<ProtectedRoute roles={['TECHNICIAN']} />}>
        <Route path="/tecnico/dashboard" element={<TecnicoDashboardPage />} />
      </Route>

      <Route element={<ProtectedRoute roles={['CASHIER']} />}>
        <Route path="/cajero/dashboard" element={<CajeroDashboardPage />} />
      </Route>

      <Route element={<ProtectedRoute roles={['CLIENT']} />}>
        <Route path="/cliente/portal" element={<PortalPage />} />
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
  );
}
