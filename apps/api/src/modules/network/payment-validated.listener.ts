import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { Queue } from 'bullmq';
import { AuditService } from '../audit/audit.service';
import { ServiceContinuityPolicy } from '../governance/service-continuity.policy';
import { PaymentReconnectionPolicy } from '../governance/payment-reconnection.policy';
import { PrismaService } from '../../prisma/prisma.service';
import { NETWORK_ACTIONS_QUEUE } from '../../queues/queues.module';
import { PaymentValidatedEvent } from '../payments/events/payment-validated.event';
import {
  ROUTER_RECONNECTION_FAILED_EVENT,
  RouterReconnectionFailedEvent,
} from './events/router-reconnection-failed.event';
import { ReconnectionJobData } from './network-actions.processor';

export const NO_NETWORK_ACCESS_REASON =
  'El cliente no tiene equipo registrado (acta de instalación pendiente)';

/**
 * Bridges Policy 1 (payment → reconnection) with Policy 4 (continuity):
 * a validated payment NEVER calls the RouterBoard synchronously — it enqueues
 * a reconnection job with governance-defined retries (golden rule #4).
 */
@Injectable()
export class PaymentValidatedListener {
  private readonly logger = new Logger(PaymentValidatedListener.name);

  constructor(
    @InjectQueue(NETWORK_ACTIONS_QUEUE) private readonly networkQueue: Queue,
    private readonly prisma: PrismaService,
    private readonly continuityPolicy: ServiceContinuityPolicy,
    private readonly auditService: AuditService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @OnEvent(PaymentReconnectionPolicy.PAYMENT_VALIDATED_EVENT)
  async handle(event: PaymentValidatedEvent): Promise<void> {
    const access = await this.prisma.networkAccess.findFirst({
      where: { clientId: event.clientId },
    });
    if (!access) {
      // Traceability: the payment is applied but the service can't come back
      // on its own, so the case is audited and handed to the technicians.
      this.logger.warn(
        `Pago ${event.paymentId} validado pero el cliente ${event.clientId} no tiene acceso de red registrado`,
      );
      await this.auditService.record({
        action: 'RECONNECT_NOT_POSSIBLE',
        entity: 'Payment',
        entityId: event.paymentId,
        newValues: { clientId: event.clientId, reason: NO_NETWORK_ACCESS_REASON },
        policyRef: ServiceContinuityPolicy.POLICY_REF,
      });
      this.eventEmitter.emit(
        ROUTER_RECONNECTION_FAILED_EVENT,
        new RouterReconnectionFailedEvent(
          event.clientId,
          null,
          event.paymentId,
          null,
          null,
          null,
          0,
          NO_NETWORK_ACCESS_REASON,
          new Date(),
        ),
      );
      return;
    }

    const data: ReconnectionJobData = {
      networkAccessId: access.id,
      clientId: event.clientId,
      paymentId: event.paymentId,
      validatedAt: event.validatedAt.toISOString(),
    };

    await this.networkQueue.add('reconnect', data, {
      ...this.continuityPolicy.criticalJobOptions(),
      jobId: `reconnect-${event.paymentId}`, // idempotent per payment (BullMQ forbids ':' in ids)
    });
    this.logger.log(`Reconexión encolada para el pago ${event.paymentId}`);
  }
}
