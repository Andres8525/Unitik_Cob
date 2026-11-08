import { create } from 'zustand';
import { api } from '../api/http';

export interface RegisteredClient {
  id: string;
  clientCode: string;
  address: string;
  serviceType: 'FIBER' | 'RADIO';
  paymentModality: 'PREPAID' | 'POSTPAID';
  status: string;
  user: {
    id: string;
    documentId: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    role: 'CLIENT';
  };
}

export interface RegisterClientInput {
  documentId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  serviceType: 'FIBER' | 'RADIO';
  paymentModality: 'PREPAID' | 'POSTPAID';
  installationDate: string;
}

interface ClientesState {
  clientes: RegisteredClient[];
  registrarCliente: (input: RegisterClientInput) => Promise<RegisteredClient>;
}

export const useClientesStore = create<ClientesState>((set) => ({
  clientes: [],
  registrarCliente: async (input) => {
    const client = await api<RegisteredClient>('/clients', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    set((state) => ({
      clientes: [client, ...state.clientes.filter((existing) => existing.id !== client.id)],
    }));
    return client;
  },
}));
