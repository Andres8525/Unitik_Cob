import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OnEvent } from '@nestjs/event-emitter';
import {
  Notification,
  NotificationChannel,
  NotificationStatus,
  Role,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ROUTER_RECONNECTION_FAILED_EVENT,
  RouterReconnectionFailedEvent,
} from '../network/events/router-reconnection-failed.event';

/**
 * Notification dispatcher. Channels run in MOCK mode until UNITIK contracts
 * the providers in Phase 4 (WhatsApp Cloud API, Twilio, SMTP) — risk R-09:
 * every channel is swappable behind sendThroughChannel().
 * IN_APP notifications are "sent" by definition (they live in the inbox).
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  /** Inbox for the client portal (and staff in-app alerts). */
  async myNotifications(userId: string): Promise<Notification[]> {
    const client = await this.prisma.client.findUnique({ where: { userId } });
    return this.prisma.notification.findMany({
      where: client ? { OR: [{ clientId: client.id }, { userId }] } : { userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async markRead(id: string, userId: string): Promise<Notification> {
    const client = await this.prisma.client.findUnique({ where: { userId } });
    const notification = await this.prisma.notification.findFirst({
      where: { id, ...(client ? { OR: [{ clientId: client.id }, { userId }] } : { userId }) },
    });
    if (!notification) throw new NotFoundException('Notificación no encontrada');
    return this.prisma.notification.update({
      where: { id },
      data: { status: NotificationStatus.READ },
    });
  }

  @OnEvent(ROUTER_RECONNECTION_FAILED_EVENT)
  async notifyTechniciansOfReconnectionFailure(
    event: RouterReconnectionFailedEvent,
  ): Promise<void> {
    try {
      const technicians = await this.prisma.user.findMany({
        where: { role: Role.TECHNICIAN, isActive: true },
        select: { id: true },
      });
      if (technicians.length === 0) {
        this.logger.warn(
          `Fallo de reconexión para cliente=${event.clientId}; no hay técnicos activos para notificar`,
        );
        return;
      }

      await this.prisma.notification.createMany({
        data: technicians.map(({ id }) => ({
          userId: id,
          channel: NotificationChannel.IN_APP,
          type: 'ROUTER_RECONNECTION_FAILED',
          content:
            `Falló la reconexión del cliente ${event.clientId} después de ${event.attempts} intentos. ` +
            `Acceso: ${event.networkAccessId}. IP: ${event.ipAssigned ?? 'sin asignar'}. ` +
            `MAC: ${event.macAddress ?? 'sin registrar'}. Motivo: ${event.reason}`,
          status: NotificationStatus.SENT,
          sentAt: event.failedAt,
        })),
      });
    } catch (error) {
      this.logger.error(
        `No se pudo guardar la notificación de reconexión fallida para cliente=${event.clientId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  /** Dispatches PENDING notifications (called by cron; mock channels). */
  async dispatchPending(): Promise<{ sent: number; failed: number }> {
    const pending = await this.prisma.notification.findMany({
      where: { status: NotificationStatus.PENDING },
      take: 100,
      orderBy: { createdAt: 'asc' },
    });

    let sent = 0;
    let failed = 0;
    for (const notification of pending) {
      try {
        await this.sendThroughChannel(notification);
        await this.prisma.notification.update({
          where: { id: notification.id },
          data: { status: NotificationStatus.SENT, sentAt: new Date() },
        });
        sent += 1;
      } catch (error) {
        failed += 1;
        await this.prisma.notification.update({
          where: { id: notification.id },
          data: {
            status: NotificationStatus.FAILED,
            error: error instanceof Error ? error.message : String(error),
          },
        });
      }
    }
    if (sent + failed > 0) this.logger.log(`Notificaciones: ${sent} enviadas, ${failed} fallidas`);
    return { sent, failed };
  }

  private async sendThroughChannel(notification: Notification): Promise<void> {
    if (notification.channel === NotificationChannel.IN_APP) return; // inbox delivery

    const mock = this.configService.get<string>('NOTIFICATIONS_MOCK', 'true') !== 'false';
    if (mock) {
      this.logger.log(
        `[MOCK ${notification.channel}] → ${notification.type}: ${notification.content.slice(0, 60)}…`,
      );
      return;
    }
    // Phase 4: WhatsApp Cloud API / Twilio / Nodemailer providers plug in here
    throw new Error(`Canal ${notification.channel} sin proveedor configurado (Fase 4, R-09)`);
  }
}
