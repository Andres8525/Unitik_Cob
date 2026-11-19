import { describe, expect, it } from 'vitest';
import { percentToRatio, ratioToPercent, toPlanPayload, toServicePlan } from './planes';

describe('plan API mapping', () => {
  it('converts reuse ratios to backend percentages and back', () => {
    expect(ratioToPercent('1:4')).toBe(25);
    expect(ratioToPercent('1:6')).toBe(16.67);
    expect(ratioToPercent('4')).toBeUndefined();
    expect(percentToRatio(25)).toBe('1:4');
    expect(percentToRatio(16.67)).toBe('1:6');
    expect(percentToRatio(null)).toBe('');
  });

  it('maps an API plan (Decimal as string) to the UI model', () => {
    expect(
      toServicePlan({
        id: 'p1',
        name: 'Fibra 100 Megas',
        description: 'Internet por fibra óptica 100 Mbps',
        serviceType: 'FIBER',
        speedMbps: 100,
        monthlyPrice: '100000.00',
        reusePercent: 50,
        isActive: false,
      }),
    ).toEqual({
      id: 'p1',
      name: 'Fibra 100 Megas',
      speedMbps: 100,
      technology: 'FIBER',
      monthlyPrice: 100000,
      reuseRatio: '1:2',
      status: 'INACTIVE',
    });
  });

  it('builds a CreatePlanDto-compatible payload', () => {
    expect(
      toPlanPayload({
        name: '  Radio 12 Megas ',
        speedMbps: 12,
        technology: 'RADIO',
        monthlyPrice: 50000,
        reuseRatio: '1:4',
      }),
    ).toEqual({
      name: 'Radio 12 Megas',
      description: 'Internet por radio enlace 12 Mbps',
      serviceType: 'RADIO',
      speedMbps: 12,
      monthlyPrice: 50000,
      reusePercent: 25,
    });
  });
});
