import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Role } from '@unitik/shared-types';

export interface SessionUser {
  id: string;
  documentId: string;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
  /** HU-01: must replace the initial password before using the app. */
  mustChangePassword?: boolean;
}

/** Route of the forced password change (HU-01). */
export const CHANGE_PASSWORD_PATH = '/cambiar-contrasena';

/**
 * HU-02: tells the API the session ended so LOGOUT lands in the audit trail.
 * Fire-and-forget with keepalive: the local session is cleared regardless.
 */
function notifyLogout(accessToken: string | null): void {
  if (!accessToken || typeof fetch === 'undefined') return;
  if (import.meta.env.VITE_DEMO_MODE !== 'false') return;
  const baseUrl = import.meta.env.VITE_API_URL?.replace(/\/+$/, '') ?? '';
  void fetch(`${baseUrl}/api/auth/logout`, {
    method: 'POST',
    keepalive: true,
    headers: { Authorization: `Bearer ${accessToken}` },
  }).catch(() => undefined);
}

export const ROLE_DASHBOARD_PATHS: Record<Role, string> = {
  ADMIN: '/admin/dashboard',
  TECHNICIAN: '/tecnico/dashboard',
  CASHIER: '/cajero/dashboard',
  CLIENT: '/cliente/portal',
};

interface AuthState {
  user: SessionUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  setSession: (user: SessionUser, accessToken: string, refreshToken: string) => void;
  /** Marks the session as waiting for the initial password change. */
  requirePasswordChange: () => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      setSession: (user, accessToken, refreshToken) => set({ user, accessToken, refreshToken }),
      requirePasswordChange: () => {
        const user = get().user;
        if (user && !user.mustChangePassword) set({ user: { ...user, mustChangePassword: true } });
      },
      logout: () => {
        notifyLogout(get().accessToken);
        set({ user: null, accessToken: null, refreshToken: null });
        if (typeof window !== 'undefined') {
          window.sessionStorage.removeItem('unitik-auth');
          window.localStorage.removeItem('unitik-auth');
        }
      },
    }),
    {
      name: 'unitik-auth',
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
);
