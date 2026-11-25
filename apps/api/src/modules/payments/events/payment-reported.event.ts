import { PaymentMethod } from '@prisma/client';

export const PAYMENT_REPORTED_EVENT = 'payment.reported';

/**
 * HU-07: a client uploaded a Nequi/transfer proof. Administrators must be
 * alerted at once so the proof is validated by a person (never automatically).
 */
export class PaymentReportedEvent {
  constructor(
    readonly paymentId: string,
    readonly invoiceId: string,
    readonly invoiceNumber: string,
    readonly clientId: string,
    readonly amount: number,
    readonly paymentMethod: PaymentMethod,
    readonly reportedAt: Date,
  ) {}
}
