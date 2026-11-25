import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InvoiceStatus, NotificationChannel } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { clientChannels } from './notification-channels';

/** HU-08 criterion 1: days before the due date for the preventive message. */
export const DUE_SOON_DAYS = 2;

export interface RemindersResult {
  dueSoon: number;
  overdue: number;
  promises: number;
}

/** Calendar day (YYYY-MM-DD) in America/Bogota. */
function bogotaDay(date: Date): string {
  return date.toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
}

/**
 * Automatic reminders (Human behaviour + Performance): clients are warned
 * before actions are taken against the service. Idempotent per day.
 */
@Injectable()
export class RemindersCron {
  private readonly logger = new Logger(RemindersCron.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Daily 08:00 America/Bogota. */
  @Cron('0 8 * * *', { timeZone: 'America/Bogota' })
  async run(): Promise<RemindersResult> {
    return this.sendReminders();
  }

  async sendReminders(now = new Date()): Promise<RemindersResult> {
    const dayStart = new Date(`${bogotaDay(now)}T00:00:00-05:00`);
    const dueSoon = await this.sendDueSoonReminders(dayStart);

    // 1. OVERDUE_REMINDER: one per client per day while invoices stay overdue
    const overdueInvoices = await this.prisma.invoice.findMany({
      where: { status: InvoiceStatus.OVERDUE },
      select: { clientId: true, invoiceNumber: true, total: true },
    });
    let overdueSent = 0;
    const seenClients = new Set<string>();
    for (const invoice of overdueInvoices) {
      if (seenClients.has(invoice.clientId)) continue;
      seenClients.add(invoice.clientId);

      const alreadyToday = await this.prisma.notification.findFirst({
        where: {
          clientId: invoice.clientId,
          type: 'OVERDUE_REMINDER',
          createdAt: { gte: dayStart },
        },
      });
      if (alreadyToday) continue;

      await this.prisma.notification.createMany({
        data: [NotificationChannel.IN_APP, NotificationChannel.WHATSAPP].map((channel) => ({
          clientId: invoice.clientId,
          channel,
          type: 'OVERDUE_REMINDER',
          content: `Su factura ${invoice.invoiceNumber} está vencida. Evite la suspensión del servicio pagando o solicitando una promesa de pago.`,
        })),
      });
      overdueSent += 1;
    }

    // 2. PROMISE_REMINDER: promises expiring within 24 hours
    const expiring = await this.prisma.paymentPromise.findMany({
      where: {
        fulfilled: false,
        promiseDate: { gte: now, lte: new Date(now.getTime() + 86_400_000) },
      },
    });
    let promiseSent = 0;
    for (const promise of expiring) {
      const alreadyToday = await this.prisma.notification.findFirst({
        where: {
          clientId: promise.clientId,
          type: 'PROMISE_REMINDER',
          createdAt: { gte: dayStart },
        },
      });
      if (alreadyToday) continue;

      await this.prisma.notification.create({
        data: {
          clientId: promise.clientId,
          channel: NotificationChannel.IN_APP,
          type: 'PROMISE_REMINDER',
          content: `Su promesa de pago vence el ${promise.promiseDate.toLocaleDateString('es-CO')}. Cúmplala para evitar la suspensión.`,
        },
      });
      promiseSent += 1;
    }

    if (dueSoon + overdueSent + promiseSent > 0) {
      this.logger.log(
        `Recordatorios: ${dueSoon} preventivos, ${overdueSent} de mora, ${promiseSent} de promesa`,
      );
    }
    return { dueSoon, overdue: overdueSent, promises: promiseSent };
  }

  /**
   * HU-08 criterion 1: preventive message DUE_SOON_DAYS before the due date,
   * once per invoice, through the channels the client can receive.
   */
  private async sendDueSoonReminders(todayStart: Date): Promise<number> {
    const from = new Date(todayStart.getTime() + DUE_SOON_DAYS * 86_400_000);
    const to = new Date(from.getTime() + 86_400_000);
    const invoices = await this.prisma.invoice.findMany({
      where: { status: InvoiceStatus.PENDING, dueDate: { gte: from, lt: to } },
      include: { client: { include: { user: true } } },
    });

    let sent = 0;
    for (const invoice of invoices) {
      const already = await this.prisma.notification.findFirst({
        where: {
          clientId: invoice.clientId,
          type: 'DUE_SOON_REMINDER',
          content: { contains: invoice.invoiceNumber },
        },
      });
      if (already) continue;

      const total = Number(invoice.total).toLocaleString('es-CO');
      const due = invoice.dueDate.toLocaleDateString('es-CO', { timeZone: 'America/Bogota' });
      await this.prisma.notification.createMany({
        data: clientChannels(invoice.client.user).map((channel) => ({
          clientId: invoice.clientId,
          channel,
          type: 'DUE_SOON_REMINDER',
          content:
            `Recordatorio UNITIK: tu factura ${invoice.invoiceNumber} por COP ${total} ` +
            `vence el ${due}. Paga a tiempo y evita la suspensión del servicio.`,
        })),
      });
      sent += 1;
    }
    return sent;
  }
}
