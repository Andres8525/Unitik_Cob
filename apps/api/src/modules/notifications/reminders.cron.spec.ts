import { NotificationChannel } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RemindersCron } from './reminders.cron';

describe('RemindersCron', () => {
  const prismaMock = {
    invoice: { findMany: jest.fn() },
    notification: { findFirst: jest.fn(), create: jest.fn(), createMany: jest.fn() },
    paymentPromise: { findMany: jest.fn() },
  };
  const cron = new RemindersCron(prismaMock as unknown as PrismaService);

  const dueSoonInvoice = {
    clientId: 'client-1',
    invoiceNumber: 'FCT-2026-011',
    total: 50000,
    dueDate: new Date('2026-11-26T05:00:00Z'),
    client: { user: { phone: '3136543433', email: 'laura@example.com' } },
  };

  beforeEach(() => {
    jest.resetAllMocks();
    prismaMock.paymentPromise.findMany.mockResolvedValue([]);
  });

  it('warns two days before the due date on every available channel (HU-08)', async () => {
    prismaMock.invoice.findMany
      .mockResolvedValueOnce([dueSoonInvoice]) // due soon
      .mockResolvedValueOnce([]); // overdue
    prismaMock.notification.findFirst.mockResolvedValue(null);

    // 2026-11-24 08:00 Bogotá → invoices due on 2026-11-26
    const result = await cron.sendReminders(new Date('2026-11-24T13:00:00Z'));

    expect(result).toEqual({ dueSoon: 1, overdue: 0, promises: 0 });
    const { where } = prismaMock.invoice.findMany.mock.calls[0][0];
    expect(where.dueDate.gte.toISOString()).toBe('2026-11-26T05:00:00.000Z');
    expect(where.dueDate.lt.toISOString()).toBe('2026-11-27T05:00:00.000Z');
    const { data } = prismaMock.notification.createMany.mock.calls[0][0];
    expect(data.map((n: { channel: string }) => n.channel)).toEqual([
      NotificationChannel.IN_APP,
      NotificationChannel.EMAIL,
      NotificationChannel.WHATSAPP,
    ]);
    expect(data[0].type).toBe('DUE_SOON_REMINDER');
    expect(data[0].content).toContain('FCT-2026-011');
  });

  it('does not repeat the preventive message for the same invoice', async () => {
    prismaMock.invoice.findMany.mockResolvedValueOnce([dueSoonInvoice]).mockResolvedValueOnce([]);
    prismaMock.notification.findFirst.mockResolvedValue({ id: 'already-sent' });

    const result = await cron.sendReminders(new Date('2026-11-24T13:00:00Z'));

    expect(result.dueSoon).toBe(0);
    expect(prismaMock.notification.createMany).not.toHaveBeenCalled();
  });
});
