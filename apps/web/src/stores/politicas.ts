import { create } from 'zustand';
import { api } from '../api/http';

export interface BillingPolicies {
  cutOffDayStart: number;
  cutOffDayEnd: number;
  interestRatePercent: number;
  doublePaymentEnabled: boolean;
}

export interface ActivePaymentPromise {
  id: string;
  promiseDate: string;
  daysExtension: number;
  client: {
    clientCode: string;
    user: { firstName: string; lastName: string; documentId: string };
  };
  invoice: { invoiceNumber: string; dueDate: string; status: string };
}

interface PoliticasState {
  rangoFechasCorte: { inicio: number; fin: number };
  porcentajeMora: number;
  dobleMensualidadActiva: boolean;
  promesasDePago: ActivePaymentPromise[];
  politicasCargadas: boolean;
  cargarPoliticas: () => Promise<void>;
  actualizarPoliticas: (policies: BillingPolicies) => Promise<void>;
  cargarPromesas: () => Promise<void>;
  registrarPromesa: (invoiceId: string, daysExtension: 7 | 15) => Promise<void>;
}

export const usePoliticasStore = create<PoliticasState>((set) => ({
  rangoFechasCorte: { inicio: 1, fin: 10 },
  porcentajeMora: 2.5,
  dobleMensualidadActiva: true,
  promesasDePago: [],
  politicasCargadas: false,

  cargarPoliticas: async () => {
    const data = await api<BillingPolicies>('/system-config/policies');
    set({
      rangoFechasCorte: { inicio: data.cutOffDayStart, fin: data.cutOffDayEnd },
      porcentajeMora: data.interestRatePercent,
      dobleMensualidadActiva: data.doublePaymentEnabled,
      politicasCargadas: true,
    });
  },

  actualizarPoliticas: async (policies) => {
    await api('/system-config/policies', {
      method: 'PATCH',
      body: JSON.stringify(policies),
    });
    set({
      rangoFechasCorte: { inicio: policies.cutOffDayStart, fin: policies.cutOffDayEnd },
      porcentajeMora: policies.interestRatePercent,
      dobleMensualidadActiva: policies.doublePaymentEnabled,
      politicasCargadas: true,
    });
  },

  cargarPromesas: async () => {
    const promesas = await api<ActivePaymentPromise[]>('/payment-promises/active');
    set({ promesasDePago: promesas });
  },

  registrarPromesa: async (invoiceId, daysExtension) => {
    await api('/payment-promises', {
      method: 'POST',
      body: JSON.stringify({ invoiceId, daysExtension }),
    });
    const promesas = await api<ActivePaymentPromise[]>('/payment-promises/active');
    set({ promesasDePago: promesas });
  },
}));
