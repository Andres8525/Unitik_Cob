import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationChannel, NotificationStatus, Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  INSTALLATION_EXTRA_COSTS_APPLIED_EVENT,
  InstallationExtraCostsAppliedEvent,
} from './installation-extra-costs-applied.event';

@Injectable()
export class InstallationBillingListener {
  private readonly logger = new Logger(InstallationBillingListener.name);

  constructor(private readonly prisma: PrismaService) {}

  @OnEvent(INSTALLATION_EXTRA_COSTS_APPLIED_EVENT)
  async notifyBillingStaff(event: InstallationExtraCostsAppliedEvent): Promise<void> {
    try {
      const administrators = await this.prisma.user.findMany({
        where: { role: Role.ADMIN, isActive: true },
        select: { id: true },
      });

      if (administrators.length === 0) {
        this.logger.warn(
          `Costos extra pendientes de revisar para acta=${event.installationId}; no hay administradores activos`,
        );
        return;
      }

      await this.prisma.notification.createMany({
        data: administrators.map(({ id }) => ({
          userId: id,
          channel: NotificationChannel.IN_APP,
          type: 'INSTALLATION_EXTRA_COSTS',
          content:
            `El acta ${event.installationId} del cliente ${event.clientId} registra costos extra. ` +
            'Revisar el cargo para su incorporación a facturación.',
          status: NotificationStatus.SENT,
          sentAt: event.appliedAt,
        })),
      });
    } catch (error) {
      this.logger.error(
        `No se pudo notificar costos extra del acta=${event.installationId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
