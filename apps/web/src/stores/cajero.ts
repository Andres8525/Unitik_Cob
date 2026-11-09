import { create } from 'zustand';
import { api } from '../api/http';

export interface ClienteCajero {
  id: string;
  clientCode: string;
  address: string;
  status: string;
  user: {
    documentId: string;
    firstName: string;
    lastName: string;
  };
}

export interface FacturaPendienteCajero {
  id: string;
  invoiceNumber: string;
  period: string;
  dueDate: string;
  total: number | string;
  status: 'PENDING' | 'OVERDUE' | 'PROMISE_TO_PAY';
}

export interface PagoEfectivoRegistrado {
  id: string;
  invoiceId: string;
  amount: number | string;
  paymentMethod: 'CASH';
  status: 'VALIDATED';
}

interface CajeroState {
  clientesEncontrados: ClienteCajero[];
  clienteBuscado: ClienteCajero | null;
  facturasPendientes: FacturaPendienteCajero[];
  isSearching: boolean;
  hasSearched: boolean;
  isLoadingInvoices: boolean;
  isRegistering: boolean;
  registeringInvoiceId: string | null;
  error: string | null;
  successMessage: string | null;
  buscarCliente: (query: string) => Promise<void>;
  seleccionarCliente: (client: ClienteCajero) => Promise<void>;
  registrarPagoEfectivo: (idFactura: string) => Promise<PagoEfectivoRegistrado>;
  limpiarBusqueda: () => void;
}

const pendingStatuses = new Set(['PENDING', 'OVERDUE', 'PROMISE_TO_PAY']);

export const useCajeroStore = create<CajeroState>((set, get) => ({
  clientesEncontrados: [],
  clienteBuscado: null,
  facturasPendientes: [],
  isSearching: false,
  hasSearched: false,
  isLoadingInvoices: false,
  isRegistering: false,
  registeringInvoiceId: null,
  error: null,
  successMessage: null,

  buscarCliente: async (query) => {
    const term = query.trim();
    if (!term) {
      set({ error: 'Ingresa nombre, cédula o código de contrato para buscar.' });
      return;
    }

    set({
      isSearching: true,
      clientesEncontrados: [],
      clienteBuscado: null,
      facturasPendientes: [],
      error: null,
      successMessage: null,
    });

    try {
      const clients = await api<ClienteCajero[]>(`/clients?search=${encodeURIComponent(term)}`);
      set({ clientesEncontrados: clients, isSearching: false, hasSearched: true });
      if (clients.length === 1) {
        await get().seleccionarCliente(clients[0]);
      }
    } catch (error) {
      set({
        isSearching: false,
        error: error instanceof Error ? error.message : 'No se pudo buscar el cliente.',
      });
    }
  },

  seleccionarCliente: async (client) => {
    set({
      clienteBuscado: client,
      facturasPendientes: [],
      isLoadingInvoices: true,
      error: null,
      successMessage: null,
    });
    try {
      const invoices = await api<FacturaPendienteCajero[]>(
        `/invoices?clientId=${encodeURIComponent(client.id)}`,
      );
      set({
        facturasPendientes: invoices.filter((invoice) => pendingStatuses.has(invoice.status)),
        isLoadingInvoices: false,
      });
    } catch (error) {
      set({
        isLoadingInvoices: false,
        error: error instanceof Error ? error.message : 'No se pudieron cargar las facturas.',
      });
    }
  },

  registrarPagoEfectivo: async (idFactura) => {
    set({
      isRegistering: true,
      registeringInvoiceId: idFactura,
      error: null,
      successMessage: null,
    });
    try {
      // The backend settles the CASH payment, emits payment.validated, and enqueues the HU-09 reconnection.
      const payment = await api<PagoEfectivoRegistrado>('/payments/cash', {
        method: 'POST',
        body: JSON.stringify({ invoiceId: idFactura }),
      });
      set((state) => ({
        facturasPendientes: state.facturasPendientes.filter((invoice) => invoice.id !== idFactura),
        isRegistering: false,
        registeringInvoiceId: null,
        successMessage: `Pago registrado. Reconexión del servicio en proceso. Recibo: ${payment.id}`,
      }));
      return payment;
    } catch (error) {
      set({
        isRegistering: false,
        registeringInvoiceId: null,
        error: error instanceof Error ? error.message : 'No se pudo registrar el pago en efectivo.',
      });
      throw error;
    }
  },

  limpiarBusqueda: () =>
    set({
      clientesEncontrados: [],
      clienteBuscado: null,
      facturasPendientes: [],
      hasSearched: false,
      error: null,
      successMessage: null,
    }),
}));
