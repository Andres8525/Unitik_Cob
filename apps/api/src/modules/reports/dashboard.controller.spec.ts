import { DashboardController, startOfBogotaDay } from './dashboard.controller';

describe('DashboardController (HU-05)', () => {
  it('starts the day at midnight Bogotá even after 19:00 local time', () => {
    // 2026-11-25 01:30 UTC is still 2026-11-24 20:30 in Bogotá
    expect(startOfBogotaDay(new Date('2026-11-25T01:30:00Z')).toISOString()).toBe(
      '2026-11-24T05:00:00.000Z',
    );
  });

  it("reports today's collected amount next to the month totals", async () => {
    const prisma = {
      client: { count: jest.fn().mockResolvedValueOnce(120).mockResolvedValueOnce(8) },
      payment: {
        aggregate: jest
          .fn()
          .mockResolvedValueOnce({ _sum: { amount: 1_540_200 } })
          .mockResolvedValueOnce({ _sum: { amount: 150_000 }, _count: { _all: 3 } }),
      },
      invoice: {
        findMany: jest.fn().mockResolvedValue([
          { clientId: 'c1', total: 50000 },
          { clientId: 'c1', total: 60000 },
        ]),
      },
      ticket: { count: jest.fn().mockResolvedValue(2) },
      networkDevice: { count: jest.fn().mockResolvedValueOnce(3).mockResolvedValueOnce(2) },
    };
    const controller = new DashboardController(prisma as never);

    const kpis = await controller.kpis();

    expect(kpis).toMatchObject({
      activeClients: 120,
      suspendedClients: 8,
      monthRevenue: 1_540_200,
      todayRevenue: 150_000,
      todayPayments: 3,
      overdueClients: 1,
      overdueAmount: 110_000,
    });
  });
});
