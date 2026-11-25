import { EventEmitter2 } from '@nestjs/event-emitter';
import { Queue } from 'bullmq';
import { AuditService } from '../audit/audit.service';
import { ServiceContinuityPolicy } from '../governance/service-continuity.policy';
import { PaymentValidatedEvent } from '../payments/events/payment-validated.event';
import { PrismaService } from '../../prisma/prisma.service';
import { ROUTER_RECONNECTION_FAILED_EVENT } from './events/router-reconnection-failed.event';
import { NO_NETWORK_ACCESS_REASON, PaymentValidatedListener } from './payment-validated.listener';

describe('PaymentValidatedListener (Policies 1 and 4)', () => {
  const queue = { add: jest.fn() };
  const prisma = { networkAccess: { findFirst: jest.fn() } };
  const audit = { record: jest.fn() };
  const emitter = { emit: jest.fn() };
  const listener = new PaymentValidatedListener(
    queue as unknown as Queue,
    prisma as unknown as PrismaService,
    new ServiceContinuityPolicy(),
    audit as unknown as AuditService,
    emitter as unknown as EventEmitter2,
  );
  const event = new PaymentValidatedEvent('pay-1', 'inv-1', 'client-1', new Date());

  beforeEach(() => jest.clearAllMocks());

  it('queues one idempotent reconnection per payment with the continuity retries', async () => {
    prisma.networkAccess.findFirst.mockResolvedValueOnce({ id: 'access-1' });

    await listener.handle(event);

    expect(queue.add).toHaveBeenCalledWith(
      'reconnect',
      expect.objectContaining({ networkAccessId: 'access-1', paymentId: 'pay-1' }),
      expect.objectContaining({ jobId: 'reconnect-pay-1', attempts: 5 }),
    );
    expect(emitter.emit).not.toHaveBeenCalled();
  });

  it('audits and alerts technicians when the client has no network access', async () => {
    prisma.networkAccess.findFirst.mockResolvedValueOnce(null);

    await listener.handle(event);

    expect(queue.add).not.toHaveBeenCalled();
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'RECONNECT_NOT_POSSIBLE', entityId: 'pay-1' }),
    );
    expect(emitter.emit).toHaveBeenCalledWith(
      ROUTER_RECONNECTION_FAILED_EVENT,
      expect.objectContaining({
        clientId: 'client-1',
        networkAccessId: null,
        attempts: 0,
        reason: NO_NETWORK_ACCESS_REASON,
      }),
    );
  });
});
