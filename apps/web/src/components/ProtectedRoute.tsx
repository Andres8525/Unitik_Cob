import { Navigate, Outlet } from 'react-router-dom';
import type { Role } from '@unitik/shared-types';
import { ROLE_DASHBOARD_PATHS, useAuthStore } from '../stores/auth';
import InactivitySessionGuard from './InactivitySessionGuard';

/** Redirects to /login when unauthenticated, or to the role's dashboard when the role mismatches. */
export default function ProtectedRoute({ roles }: { roles?: Role[] }) {
  const user = useAuthStore((state) => state.user);
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) {
    return <Navigate to={ROLE_DASHBOARD_PATHS[user.role]} replace />;
  }
  return (
    <>
      <Outlet />
      <InactivitySessionGuard />
    </>
  );
}
