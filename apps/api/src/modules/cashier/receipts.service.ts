import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PaymentStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ReceiptData, receiptNumberFor, renderReceiptPdf } from './receipt-pdf';

/**
 * Payment receipts (download, print and email). Only validated payments
 * get a receipt: a pending Nequi report is not proof of payment yet.
 */
@Injectable()
export class ReceiptsService {
  constructor(private readonly prisma: PrismaService) {}

  async buildReceipt(paymentId: string): Promise<ReceiptData> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { invoice: { include: { client: { include: { user: true } } } } },
    });
    if (!payment) throw new NotFoundException('Pago no encontrado');
    if (payment.status !== PaymentStatus.VALIDATED) {
      throw new ConflictException('Solo los pagos validados tienen recibo');
    }

    const validator = payment.validatedBy
      ? await this.prisma.user.findUnique({
          where: { id: payment.validatedBy },
          select: { firstName: true, lastName: true, email: true },
        })
      : null;
    const { client } = payment.invoice;
    const issuedAt = payment.validatedAt ?? payment.paidAt;

    return {
      receiptNumber: receiptNumberFor(payment.id, issuedAt),
      issuedAt,
      clientName: `${client.user.firstName} ${client.user.lastName}`,
      clientDocument: client.user.documentId,
      clientCode: client.clientCode,
      clientEmail: client.user.email,
      invoiceNumber: payment.invoice.invoiceNumber,
      period: payment.invoice.period,
      amount: Number(payment.amount),
      paymentMethod: payment.paymentMethod,
      receivedBy: validator
        ? `${validator.firstName} ${validator.lastName}`
        : 'Validación automática',
    };
  }

  async renderPdf(paymentId: string): Promise<{ receipt: ReceiptData; pdf: Buffer }> {
    const receipt = await this.buildReceipt(paymentId);
    return { receipt, pdf: await renderReceiptPdf(receipt) };
  }
}
