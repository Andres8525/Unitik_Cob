import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotificationChannel, NotificationStatus, Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RouterReconnectionFailedEvent } from '../network/events/router-reconnection-failed.event';
import { PaymentReportedEvent } from '../payments/events/payment-reported.event';
import { PaymentValidatedEvent } from '../payments/events/payment-validated.event';
import { NotificationsService } from './notifications.service';

describe('NotificationsService router reconnection alerts', () => {
  let service: NotificationsService;

  const prismaMock = {
    user: { findMany: jest.fn() },
    notification: { createMany: jest.fn() },
    payment: { findUnique: jest.fn() },
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

  describe('payment receipt (HU-08 criterion 2)', () => {
    const paymentWith = (paymentMethod: string, phone: string) => ({
      id: 'pay-1',
      amount: 60000,
      paymentMethod,
      invoice: {
        invoiceNumber: 'FCT-2026-002',
        clientId: 'client-1',
        client: { user: { phone, email: 'laura@example.com' } },
      },
    });
    const event = new PaymentValidatedEvent(
      'pay-1',
      'inv-1',
      'client-1',
      new Date('2026-11-24T15:00:00Z'),
    );

    it('sends the receipt by inbox, e-mail and WhatsApp for a valid mobile', async () => {
      prismaMock.payment.findUnique.mockResolvedValueOnce(paymentWith('NEQUI', '3136543433'));

      await service.sendPaymentReceipt(event);

      const { data } = prismaMock.notification.createMany.mock.calls[0][0];
      expect(data.map((n: { channel: string }) => n.channel)).toEqual([
        NotificationChannel.IN_APP,
        NotificationChannel.EMAIL,
        NotificationChannel.WHATSAPP,
      ]);
      expect(data[0]).toMatchObject({ clientId: 'client-1', type: 'PAYMENT_CONFIRMED' });
      expect(data[0].content).toContain('FCT-2026-002');
    });

    it('skips WhatsApp without a valid phone and e-mail for cash (PDF already sent)', async () => {
      prismaMock.payment.findUnique.mockResolvedValueOnce(paymentWith('CASH', 'sin número'));

      await service.sendPaymentReceipt(event);

      const { data } = prismaMock.notification.createMany.mock.calls[0][0];
      expect(data.map((n: { channel: string }) => n.channel)).toEqual([NotificationChannel.IN_APP]);
    });
  });

  it('puts a reported proof in every active administrator inbox (HU-07)', async () => {
    prismaMock.user.findMany.mockResolvedValue([{ id: 'admin-1' }, { id: 'admin-2' }]);
    const reportedAt = new Date();

    await service.notifyAdminsOfReportedPayment(
      new PaymentReportedEvent(
        'pay-1',
        'inv-1',
        'FCT-2026-002',
        'client-1',
        50000,
        'NEQUI',
        reportedAt,
      ),
    );

    expect(prismaMock.user.findMany).toHaveBeenCalledWith({
      where: { role: Role.ADMIN, isActive: true },
      select: { id: true },
    });
    const { data } = prismaMock.notification.createMany.mock.calls[0][0];
    expect(data).toHaveLength(2);
    expect(data[0]).toMatchObject({
      userId: 'admin-1',
      type: 'PAYMENT_REPORTED',
      channel: NotificationChannel.IN_APP,
      sentAt: reportedAt,
    });
    expect(data[0].content).toContain('FCT-2026-002');
    expect(data[0].content).toContain('Gestión de Pagos');
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
