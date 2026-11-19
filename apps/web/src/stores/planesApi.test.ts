import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiMock = vi.hoisted(() => vi.fn());
vi.mock('../api/http', () => ({ api: apiMock }));

import { usePlanesStore, type ApiPlan } from './planes';

const fiber20: ApiPlan = {
  id: 'plan-1',
  name: 'Fibra 20 Megas',
  description: 'Internet por fibra óptica 20 Mbps',
  serviceType: 'FIBER',
  speedMbps: 20,
  monthlyPrice: '50000.00',
  reusePercent: 25,
  isActive: true,
};

describe('planes store ↔ /api/plans', () => {
  beforeEach(() => {
    apiMock.mockReset();
    usePlanesStore.setState({ planes: [], isLoading: false, error: null });
  });

  it('loads the catalog from GET /plans', async () => {
    apiMock.mockResolvedValueOnce([fiber20]);

    await usePlanesStore.getState().cargarPlanes();

    expect(apiMock).toHaveBeenCalledWith('/plans');
    expect(usePlanesStore.getState()).toMatchObject({
      isLoading: false,
      error: null,
      planes: [{ id: 'plan-1', monthlyPrice: 50000, reuseRatio: '1:4', status: 'ACTIVE' }],
    });
  });

  it('creates a plan with POST /plans and appends the saved record', async () => {
    apiMock.mockResolvedValueOnce({ ...fiber20, id: 'plan-2', name: 'Fibra 50 Megas', speedMbps: 50 });

    await usePlanesStore.getState().agregarPlan({
      name: 'Fibra 50 Megas',
      speedMbps: 50,
      technology: 'FIBER',
      monthlyPrice: 85000,
      reuseRatio: '1:4',
    });

    const [path, options] = apiMock.mock.calls[0] as [string, RequestInit];
    expect(path).toBe('/plans');
    expect(options.method).toBe('POST');
    expect(JSON.parse(String(options.body))).toMatchObject({
      serviceType: 'FIBER',
      monthlyPrice: 85000,
      reusePercent: 25,
    });
    expect(usePlanesStore.getState().planes.map((plan) => plan.id)).toEqual(['plan-2']);
  });

  it('toggles status through PATCH /plans/:id with isActive', async () => {
    usePlanesStore.setState({
      planes: [
        {
          id: 'plan-1',
          name: 'Fibra 20 Megas',
          speedMbps: 20,
          technology: 'FIBER',
          monthlyPrice: 50000,
          reuseRatio: '1:4',
          status: 'ACTIVE',
        },
      ],
    });
    apiMock.mockResolvedValueOnce({ ...fiber20, isActive: false });

    await usePlanesStore.getState().cambiarEstadoPlan('plan-1', 'INACTIVE');

    expect(apiMock).toHaveBeenCalledWith('/plans/plan-1', {
      method: 'PATCH',
      body: JSON.stringify({ isActive: false }),
    });
    expect(usePlanesStore.getState().planes[0].status).toBe('INACTIVE');
  });

  it('keeps the catalog and exposes the backend message when saving fails', async () => {
    apiMock.mockRejectedValueOnce(new Error('El precio debe ser positivo'));

    await expect(
      usePlanesStore.getState().agregarPlan({
        name: 'Plan inválido',
        speedMbps: 10,
        technology: 'RADIO',
        monthlyPrice: 1,
        reuseRatio: '1:4',
      }),
    ).rejects.toThrow('El precio debe ser positivo');

    expect(usePlanesStore.getState()).toMatchObject({
      planes: [],
      error: 'El precio debe ser positivo',
    });
  });
});
