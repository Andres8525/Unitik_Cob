import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiMock = vi.hoisted(() => vi.fn());
const uploadMock = vi.hoisted(() => vi.fn());
vi.mock('../api/http', () => ({ api: apiMock }));
vi.mock('../api/files', () => ({ uploadFile: uploadMock }));

import { useTecnicoStore } from './tecnico';

const acta = {
  clientId: 'client-1',
  deviceId: 'device-1',
  macAddress: 'AA:BB:CC:DD:EE:FF',
  equipmentSerial: 'HG8145V5-0001',
  ipAddress: '192.168.88.10',
  aplicarCostosExtra: false,
  observaciones: '',
};

describe('useTecnicoStore', () => {
  beforeEach(() => {
    apiMock.mockReset();
    uploadMock.mockReset();
    useTecnicoStore.setState({
      clientes: [
        {
          id: 'client-1',
          clientCode: 'CLI-1',
          serviceType: 'FIBER',
          status: 'ACTIVE',
          user: { firstName: 'Ana', lastName: 'Ruiz' },
        },
      ],
      actaGuardada: null,
      ipsDisponibles: null,
    });
  });

  it('loads the free IPs of the selected router', async () => {
    apiMock.mockResolvedValueOnce({
      pool: '192.168.88.0/24',
      total: 254,
      used: 2,
      available: ['192.168.88.2'],
    });

    await useTecnicoStore.getState().cargarIpsDisponibles('device-1');

    expect(apiMock).toHaveBeenCalledWith('/network/devices/device-1/available-ips?limit=256');
    expect(useTecnicoStore.getState().ipsDisponibles?.available).toEqual(['192.168.88.2']);
  });

  it('uploads both photos and sends their ids with serial, MAC and IP', async () => {
    uploadMock
      .mockResolvedValueOnce({ id: 'site-photo' })
      .mockResolvedValueOnce({ id: 'equipment-photo' });
    apiMock.mockResolvedValueOnce({ installation: { id: 'acta-1' } });
    const site = new File(['a'], 'poste.jpg', { type: 'image/jpeg' });
    const equipment = new File(['b'], 'onu.jpg', { type: 'image/jpeg' });

    await useTecnicoStore
      .getState()
      .guardarActaInstalacion(acta, { instalacion: site, equipo: equipment });

    expect(uploadMock).toHaveBeenCalledWith(site, 'INSTALLATION_SITE');
    expect(uploadMock).toHaveBeenCalledWith(equipment, 'INSTALLATION_EQUIPMENT');
    const [path, options] = apiMock.mock.calls[0] as [string, RequestInit];
    expect(path).toBe('/installations');
    expect(JSON.parse(String(options.body))).toMatchObject({
      macAddress: 'AA:BB:CC:DD:EE:FF',
      equipmentSerial: 'HG8145V5-0001',
      ipAddress: '192.168.88.10',
      sitePhotoId: 'site-photo',
      equipmentPhotoId: 'equipment-photo',
    });
  });

  it('saves an acta without photos', async () => {
    apiMock.mockResolvedValueOnce({ installation: { id: 'acta-2' } });

    await useTecnicoStore.getState().guardarActaInstalacion(acta);

    expect(uploadMock).not.toHaveBeenCalled();
    const body = JSON.parse(String((apiMock.mock.calls[0] as [string, RequestInit])[1].body));
    expect(body.sitePhotoId).toBeUndefined();
  });
});
