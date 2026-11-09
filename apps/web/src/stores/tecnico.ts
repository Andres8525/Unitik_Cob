import { create } from 'zustand';
import { api } from '../api/http';
import type { ActaInstalacionFormValues } from '../schemas/actaInstalacion';

export interface TecnicoClient {
  id: string;
  clientCode: string;
  firstName?: string;
  lastName?: string;
  serviceType: 'FIBER' | 'RADIO';
  status: string;
  user: { firstName: string; lastName: string };
}

export interface NetworkDeviceOption {
  id: string;
  name: string;
  deviceType: string;
  isActive: boolean;
}

export interface SavedInstallation {
  installation: { id: string; clientId: string; extraCostsApplied: boolean };
  networkAccess: {
    id: string;
    clientId: string;
    deviceId: string;
    macAddress: string | null;
    ipAssigned: string | null;
  };
  clientStatus: 'ACTIVE' | 'SUSPENDED' | 'CUT' | 'CANCELLED';
}

interface TecnicoState {
  clientes: TecnicoClient[];
  dispositivos: NetworkDeviceOption[];
  catalogosLoading: boolean;
  catalogosError: string | null;
  actaGuardada: SavedInstallation | null;
  cargarCatalogos: () => Promise<void>;
  guardarActaInstalacion: (datos: ActaInstalacionFormValues) => Promise<SavedInstallation>;
  limpiarActaGuardada: () => void;
}

export const useTecnicoStore = create<TecnicoState>((set, get) => ({
  clientes: [],
  dispositivos: [],
  catalogosLoading: false,
  catalogosError: null,
  actaGuardada: null,

  cargarCatalogos: async () => {
    set({ catalogosLoading: true, catalogosError: null });
    try {
      const [clientes, dispositivos] = await Promise.all([
        api<TecnicoClient[]>('/clients'),
        api<NetworkDeviceOption[]>('/network/devices'),
      ]);
      set({
        clientes: clientes.filter((client) => !['CUT', 'CANCELLED'].includes(client.status)),
        dispositivos: dispositivos.filter((device) => device.isActive),
        catalogosLoading: false,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'No se pudieron cargar los datos de instalación.';
      set({ catalogosLoading: false, catalogosError: message });
      throw error;
    }
  },

  guardarActaInstalacion: async (datos) => {
    const client = get().clientes.find((candidate) => candidate.id === datos.clientId);
    if (!client) throw new Error('Selecciona un cliente válido antes de guardar el acta.');

    const payload = {
      clientId: datos.clientId,
      deviceId: datos.deviceId,
      serviceType: client.serviceType,
      macAddress: datos.macAddress,
      ipAddress: datos.ipAddress,
      aplicarCostosExtra: datos.aplicarCostosExtra,
      observations: datos.observaciones || undefined,
      equipmentList: [{ item: 'Equipo de acceso', quantity: 1 }],
      installationDate: new Date().toISOString(),
    };

    // When extra costs apply, the backend emits an event and stores a billing-review notification for admins.
    const result = await api<SavedInstallation>('/installations', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    set({ actaGuardada: result });
    return result;
  },

  limpiarActaGuardada: () => set({ actaGuardada: null }),
}));
