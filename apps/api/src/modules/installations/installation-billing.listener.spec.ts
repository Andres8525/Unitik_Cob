import { NotificationChannel, NotificationStatus, Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { InstallationBillingListener } from './installation-billing.listener';
import { InstallationExtraCostsAppliedEvent } from './installation-extra-costs-applied.event';

describe('InstallationBillingListener', () => {
  const prismaMock = {
    user: { findMany: jest.fn() },
    notification: { createMany: jest.fn() },
  };
  let listener: InstallationBillingListener;

  beforeEach(() => {
    listener = new InstallationBillingListener(prismaMock as unknown as PrismaService);
    jest.clearAllMocks();
  });

  it('creates an in-app billing review notification for each active administrator', async () => {
    const appliedAt = new Date();
    prismaMock.user.findMany.mockResolvedValue([{ id: 'admin-1' }, { id: 'admin-2' }]);
    prismaMock.notification.createMany.mockResolvedValue({ count: 2 });

    await listener.notifyBillingStaff(
      new InstallationExtraCostsAppliedEvent('installation-1', 'client-1', 'tech-1', appliedAt),
    );

    expect(prismaMock.user.findMany).toHaveBeenCalledWith({
      where: { role: Role.ADMIN, isActive: true },
      select: { id: true },
    });
    expect(prismaMock.notification.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({
          userId: 'admin-1',
          channel: NotificationChannel.IN_APP,
          type: 'INSTALLATION_EXTRA_COSTS',
          status: NotificationStatus.SENT,
          sentAt: appliedAt,
        }),
        expect.objectContaining({
          userId: 'admin-2',
          type: 'INSTALLATION_EXTRA_COSTS',
        }),
      ]),
    });
  });
});
