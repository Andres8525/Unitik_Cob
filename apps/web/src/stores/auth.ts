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
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      setSession: (user, accessToken, refreshToken) => set({ user, accessToken, refreshToken }),
      logout: () => set({ user: null, accessToken: null, refreshToken: null }),
    }),
    {
      name: 'unitik-auth',
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
);
