import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { NotificationChannel, NotificationStatus, PaymentStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { formatCop, ReceiptData, receiptNumberFor, renderReceiptPdf } from './receipt-pdf';

export interface ReceiptEmailResult {
  receiptNumber: string;
  sentTo: string;
  delivered: boolean;
  message: string;
}

/**
 * Payment receipts (download, print and email). Only validated payments
 * get a receipt: a pending Nequi report is not proof of payment yet.
 */
@Injectable()
export class ReceiptsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

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

  /** Emails the PDF receipt to the client's registered address and logs the attempt. */
  async emailToClient(paymentId: string): Promise<ReceiptEmailResult> {
    const { receipt, pdf } = await this.renderPdf(paymentId);
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      select: { invoice: { select: { clientId: true } } },
    });

    const result = await this.mailService.send({
      to: receipt.clientEmail,
      subject: `Recibo de pago ${receipt.receiptNumber} — UNITIK`,
      text:
        `Hola ${receipt.clientName},

` +
        `Recibimos tu pago de ${formatCop(receipt.amount)} para la factura ${receipt.invoiceNumber}. ` +
        `Adjuntamos el recibo ${receipt.receiptNumber}.

UNITIK Internet Sin Límite`,
      attachments: [
        { filename: `${receipt.receiptNumber}.pdf`, content: pdf, contentType: 'application/pdf' },
      ],
    });

    await this.prisma.notification.create({
      data: {
        clientId: payment?.invoice.clientId,
        channel: NotificationChannel.EMAIL,
        type: 'PAYMENT_RECEIPT',
        content: `Recibo ${receipt.receiptNumber} por ${formatCop(receipt.amount)} enviado a ${receipt.clientEmail}`,
        status: result.delivered ? NotificationStatus.SENT : NotificationStatus.FAILED,
        sentAt: result.delivered ? new Date() : null,
        error: result.error,
      },
    });

    return {
      receiptNumber: receipt.receiptNumber,
      sentTo: receipt.clientEmail,
      delivered: result.delivered,
      message: result.delivered
        ? `Recibo enviado a ${receipt.clientEmail}`
        : `No se pudo enviar el recibo: ${result.error ?? 'error desconocido'}`,
    };
  }
}
