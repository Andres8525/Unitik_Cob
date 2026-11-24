import { create } from 'zustand';
import { uploadFile } from '../api/files';
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
    equipmentSerial?: string | null;
  };
  clientStatus: 'ACTIVE' | 'SUSPENDED' | 'CUT' | 'CANCELLED';
}

export interface FotosActa {
  instalacion: File | null;
  equipo: File | null;
}

export interface AvailableIps {
  pool: string;
  total: number;
  used: number;
  available: string[];
}

interface TecnicoState {
  clientes: TecnicoClient[];
  dispositivos: NetworkDeviceOption[];
  catalogosLoading: boolean;
  catalogosError: string | null;
  actaGuardada: SavedInstallation | null;
  ipsDisponibles: AvailableIps | null;
  ipsLoading: boolean;
  ipsError: string | null;
  cargarIpsDisponibles: (deviceId: string) => Promise<void>;
  cargarCatalogos: () => Promise<void>;
  guardarActaInstalacion: (
    datos: ActaInstalacionFormValues,
    fotos?: FotosActa,
  ) => Promise<SavedInstallation>;
  limpiarActaGuardada: () => void;
}

export const useTecnicoStore = create<TecnicoState>((set, get) => ({
  clientes: [],
  dispositivos: [],
  catalogosLoading: false,
  catalogosError: null,
  actaGuardada: null,
  ipsDisponibles: null,
  ipsLoading: false,
  ipsError: null,

  cargarIpsDisponibles: async (deviceId) => {
    if (!deviceId) {
      set({ ipsDisponibles: null, ipsError: null, ipsLoading: false });
      return;
    }
    set({ ipsLoading: true, ipsError: null });
    try {
      const ips = await api<AvailableIps>(
        `/network/devices/${encodeURIComponent(deviceId)}/available-ips?limit=256`,
      );
      set({ ipsDisponibles: ips, ipsLoading: false });
    } catch (error) {
      set({
        ipsDisponibles: null,
        ipsLoading: false,
        ipsError:
          error instanceof Error ? error.message : 'No se pudieron consultar las IP disponibles.',
      });
    }
  },

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

  guardarActaInstalacion: async (datos, fotos) => {
    const client = get().clientes.find((candidate) => candidate.id === datos.clientId);
    if (!client) throw new Error('Selecciona un cliente válido antes de guardar el acta.');

    // Photos are uploaded first; the acta only stores their ids.
    const [sitePhoto, equipmentPhoto] = await Promise.all([
      fotos?.instalacion ? uploadFile(fotos.instalacion, 'INSTALLATION_SITE') : null,
      fotos?.equipo ? uploadFile(fotos.equipo, 'INSTALLATION_EQUIPMENT') : null,
    ]);

    const payload = {
      clientId: datos.clientId,
      deviceId: datos.deviceId,
      serviceType: client.serviceType,
      macAddress: datos.macAddress,
      equipmentSerial: datos.equipmentSerial,
      ipAddress: datos.ipAddress,
      aplicarCostosExtra: datos.aplicarCostosExtra,
      observations: datos.observaciones || undefined,
      equipmentList: [{ item: 'Equipo de acceso', quantity: 1 }],
      installationDate: new Date().toISOString(),
      sitePhotoId: sitePhoto?.id,
      equipmentPhotoId: equipmentPhoto?.id,
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
