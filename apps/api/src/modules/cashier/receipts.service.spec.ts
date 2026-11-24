import { ConflictException } from '@nestjs/common';
import { NotificationChannel, NotificationStatus, PaymentStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { ReceiptsService } from './receipts.service';

const payment = {
  id: 'ab12cd34-0000-4000-8000-000000000000',
  status: PaymentStatus.VALIDATED,
  amount: '100000.00',
  paymentMethod: 'CASH',
  validatedBy: 'cashier-1',
  validatedAt: new Date('2026-11-24T15:00:00Z'),
  paidAt: new Date('2026-11-24T15:00:00Z'),
  invoice: {
    invoiceNumber: 'FCT-2026-11-001',
    period: '2026-11',
    clientId: 'client-1',
    client: {
      clientCode: 'CLI-1085123456',
      user: {
        firstName: 'María',
        lastName: 'López',
        documentId: '1085123456',
        email: 'maria@example.com',
      },
    },
  },
};

describe('ReceiptsService', () => {
  const prismaMock = {
    payment: { findUnique: jest.fn() },
    user: { findUnique: jest.fn() },
    notification: { create: jest.fn() },
  };
  const mailMock = { send: jest.fn() };
  const service = new ReceiptsService(
    prismaMock as unknown as PrismaService,
    mailMock as unknown as MailService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    prismaMock.payment.findUnique.mockResolvedValue(payment);
    prismaMock.user.findUnique.mockResolvedValue({
      firstName: 'Laura',
      lastName: 'Cajera',
      email: 'laura@example.com',
    });
  });

  it('builds receipt data from the payment, client and validator', async () => {
    await expect(service.buildReceipt(payment.id)).resolves.toMatchObject({
      receiptNumber: 'REC-20261124-AB12CD',
      clientName: 'María López',
      clientEmail: 'maria@example.com',
      amount: 100000,
      receivedBy: 'Laura Cajera',
    });
  });

  it('refuses receipts for payments that are not validated', async () => {
    prismaMock.payment.findUnique.mockResolvedValueOnce({
      ...payment,
      status: PaymentStatus.PENDING_VALIDATION,
    });
    await expect(service.buildReceipt(payment.id)).rejects.toBeInstanceOf(ConflictException);
  });

  it('emails the PDF to the registered address and logs a SENT notification', async () => {
    mailMock.send.mockResolvedValueOnce({ delivered: true, messageId: 'm-1' });

    const result = await service.emailToClient(payment.id);

    const message = mailMock.send.mock.calls[0][0];
    expect(message.to).toBe('maria@example.com');
    expect(message.attachments[0].filename).toBe('REC-20261124-AB12CD.pdf');
    expect(message.attachments[0].content.subarray(0, 5).toString()).toBe('%PDF-');
    expect(prismaMock.notification.create.mock.calls[0][0].data).toMatchObject({
      clientId: 'client-1',
      channel: NotificationChannel.EMAIL,
      type: 'PAYMENT_RECEIPT',
      status: NotificationStatus.SENT,
    });
    expect(result).toMatchObject({ delivered: true, sentTo: 'maria@example.com' });
  });

  it('reports and logs a failed delivery without throwing', async () => {
    mailMock.send.mockResolvedValueOnce({
      delivered: false,
      error: 'El servidor de correo (SMTP) no está configurado',
    });

    const result = await service.emailToClient(payment.id);

    expect(result.delivered).toBe(false);
    expect(result.message).toContain('SMTP');
    expect(prismaMock.notification.create.mock.calls[0][0].data.status).toBe(
      NotificationStatus.FAILED,
    );
  });
});
