import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { api } from '../api/http';
import { useAuthStore } from './auth';

export interface PortalClient {
  clientCode: string;
  address: string;
  neighborhood?: string;
  municipality: string;
  serviceType: 'FIBER' | 'RADIO';
  status: string;
  user: {
    firstName: string;
    lastName: string;
    documentId: string;
    email: string;
    phone: string;
  };
}

export interface PortalSubscription {
  status: string;
  cutOffDay: number;
  plan: {
    name: string;
    description: string;
    speedMbps: number;
    monthlyPrice: string;
    includesTv: boolean;
  };
}

export interface PortalInvoice {
  id: string;
  invoiceNumber: string;
  period: string;
  dueDate: string;
  total: string;
  status: 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED' | 'PROMISE_TO_PAY';
  electronicInvoiceUrl?: string | null;
}

export type PortalServiceStatus = 'ACTIVO' | 'POR_VENCER' | 'SUSPENDIDO';

interface PortalData {
  ownerUserId: string | null;
  client: PortalClient | null;
  subscription: PortalSubscription | null;
  invoices: PortalInvoice[];
  lastUpdated: string | null;
}

interface ClientePortalState extends PortalData {
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  clearPortalData: () => void;
}

const initialPortalData: PortalData = {
  ownerUserId: null,
  client: null,
  subscription: null,
  invoices: [],
  lastUpdated: null,
};

export function getPortalServiceStatus(
  clientStatus: string | undefined,
  invoices: PortalInvoice[],
  now = new Date(),
): PortalServiceStatus {
  if (clientStatus === 'SUSPENDED' || clientStatus === 'CUT' || clientStatus === 'CANCELLED') {
    return 'SUSPENDIDO';
  }

  const hasInvoiceDueSoon = invoices.some((invoice) => {
    if (invoice.status !== 'PENDING' && invoice.status !== 'OVERDUE') return false;
    const daysUntilDue = Math.ceil(
      (new Date(invoice.dueDate).getTime() - now.getTime()) / 86_400_000,
    );
    return invoice.status === 'OVERDUE' || daysUntilDue <= 3;
  });
  if (hasInvoiceDueSoon) return 'POR_VENCER';

  return 'ACTIVO';
}

export const useClientePortalStore = create<ClientePortalState>()(
  persist(
    (set) => ({
      ...initialPortalData,
      isLoading: false,
      error: null,
      refresh: async () => {
        const userId = useAuthStore.getState().user?.id;
        if (!userId) {
          set({ isLoading: false, error: 'Inicia sesión para consultar tu portal.' });
          return;
        }
        set({ isLoading: true, error: null });
        const [client, subscription, invoices] = await Promise.allSettled([
          api<PortalClient>('/clients/me'),
          api<PortalSubscription | null>('/subscriptions/my'),
          api<PortalInvoice[]>('/invoices/my'),
        ]);

        const fulfilled = [client, subscription, invoices].some((result) => result.status === 'fulfilled');
        const failed = [client, subscription, invoices].some((result) => result.status === 'rejected');

        set((state) => ({
          ownerUserId: fulfilled ? userId : state.ownerUserId,
          client:
            client.status === 'fulfilled'
              ? client.value
              : state.ownerUserId === userId
                ? state.client
                : null,
          subscription:
            subscription.status === 'fulfilled'
              ? subscription.value
              : state.ownerUserId === userId
                ? state.subscription
                : null,
          invoices:
            invoices.status === 'fulfilled'
              ? invoices.value
              : state.ownerUserId === userId
                ? state.invoices
                : [],
          lastUpdated:
            fulfilled
              ? new Date().toISOString()
              : state.ownerUserId === userId
                ? state.lastUpdated
                : null,
          isLoading: false,
          error: failed
            ? fulfilled || (state.ownerUserId === userId && state.client)
              ? 'Algunos datos no se actualizaron. Se muestran los últimos datos guardados.'
              : 'No fue posible conectar. Intenta nuevamente cuando tengas señal.'
            : null,
        }));
      },
      clearPortalData: () => {
        set({ ...initialPortalData, isLoading: false, error: null });
        if (typeof window !== 'undefined') {
          window.sessionStorage.removeItem('unitik-client-portal');
        }
      },
    }),
    {
      name: 'unitik-client-portal',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        ownerUserId: state.ownerUserId,
        client: state.client,
        subscription: state.subscription,
        invoices: state.invoices,
        lastUpdated: state.lastUpdated,
      }),
    },
  ),
);
