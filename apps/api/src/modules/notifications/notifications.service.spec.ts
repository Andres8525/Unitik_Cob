import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotificationChannel, NotificationStatus, Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RouterReconnectionFailedEvent } from '../network/events/router-reconnection-failed.event';
import { NotificationsService } from './notifications.service';

describe('NotificationsService router reconnection alerts', () => {
  let service: NotificationsService;

  const prismaMock = {
    user: { findMany: jest.fn() },
    notification: { createMany: jest.fn() },
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: ConfigService, useValue: { get: jest.fn() } },
      ],
    }).compile();

    service = moduleRef.get(NotificationsService);
    jest.clearAllMocks();
  });

  it('persists an in-app alert for active technicians only', async () => {
    prismaMock.user.findMany.mockResolvedValue([{ id: 'tech-1' }, { id: 'tech-2' }]);
    prismaMock.notification.createMany.mockResolvedValue({ count: 2 });
    const failedAt = new Date();

    await service.notifyTechniciansOfReconnectionFailure(
      new RouterReconnectionFailedEvent(
        'client-1',
        'access-1',
        'payment-1',
        'device-1',
        '192.0.2.10',
        'AA:BB:CC:DD:EE:FF',
        5,
        'RouterBoard timeout',
        failedAt,
      ),
    );

    expect(prismaMock.user.findMany).toHaveBeenCalledWith({
      where: { role: Role.TECHNICIAN, isActive: true },
      select: { id: true },
    });
    expect(prismaMock.notification.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({
          userId: 'tech-1',
          channel: NotificationChannel.IN_APP,
          type: 'ROUTER_RECONNECTION_FAILED',
          status: NotificationStatus.SENT,
          sentAt: failedAt,
        }),
        expect.objectContaining({
          userId: 'tech-2',
          channel: NotificationChannel.IN_APP,
          type: 'ROUTER_RECONNECTION_FAILED',
          status: NotificationStatus.SENT,
          sentAt: failedAt,
        }),
      ]),
    });
  });
});
