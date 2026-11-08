import { beforeEach, describe, expect, it } from 'vitest';
import { usePlanesStore, type ServicePlan } from './planes';

const initialPlans: ServicePlan[] = usePlanesStore.getState().planes.map((plan) => ({ ...plan }));

describe('planes store', () => {
  beforeEach(() => {
    usePlanesStore.setState({ planes: initialPlans.map((plan) => ({ ...plan })) });
  });

  it('creates and edits plans', () => {
    const newPlan = {
      name: 'Fibra 50 Megas',
      speedMbps: 50,
      technology: 'FIBER' as const,
      monthlyPrice: 85000,
      reuseRatio: '1:4',
    };

    usePlanesStore.getState().agregarPlan(newPlan);
    const created = usePlanesStore.getState().planes.find((plan) => plan.name === newPlan.name);

    expect(created).toMatchObject({ ...newPlan, status: 'ACTIVE' });
    expect(created?.id).toBeTruthy();

    usePlanesStore.getState().editarPlan(created!.id, { ...newPlan, monthlyPrice: 90000 });
    expect(
      usePlanesStore.getState().planes.find((plan) => plan.id === created!.id)?.monthlyPrice,
    ).toBe(90000);
  });

  it('inactivates a plan without removing it from the catalog', () => {
    const planToDeactivate = initialPlans[0];

    usePlanesStore.getState().cambiarEstadoPlan(planToDeactivate.id, 'INACTIVE');

    expect(usePlanesStore.getState().planes).toContainEqual({
      ...planToDeactivate,
      status: 'INACTIVE',
    });
  });
});
