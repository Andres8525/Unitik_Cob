import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test } from '@nestjs/testing';
import { InvoiceStatus, PaymentMethod, PaymentStatus, Role } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PaymentReconnectionPolicy } from '../governance/payment-reconnection.policy';
import { PromisesService } from '../promises/promises.service';
import { PrismaService } from '../../prisma/prisma.service';
import { PaymentsService } from './payments.service';

describe('PaymentsService (Policy 1 prototype)', () => {
  let service: PaymentsService;
  const emitterMock = { emit: jest.fn() };
  const promisesMock = { markFulfilled: jest.fn() };
  const auditMock = { record: jest.fn() };
  const prismaMock = {
    invoice: { findUnique: jest.fn(), update: jest.fn() },
    payment: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn(), findFirst: jest.fn() },
    notification: { create: jest.fn() },
    $transaction: jest.fn(),
  };
  const transactionMock = {
    invoice: { updateMany: jest.fn() },
    payment: { create: jest.fn() },
  };

  const admin = { id: 'admin-1', email: 'admin@unitik.com.co', role: Role.ADMIN };
  const technician = { id: 'tech-1', email: 'tech@unitik.com.co', role: Role.TECHNICIAN };
  const clientUser = { id: 'client-user-1', email: 'client@example.com', role: Role.CLIENT };
  const cashier = { id: 'cashier-1', email: 'cashier@unitik.com.co', role: Role.CASHIER };

  const pendingPayment = {
    id: 'pay-1',
    invoiceId: 'inv-1',
    amount: 60000,
    paymentMethod: PaymentMethod.NEQUI,
    reference: 'NQ-123',
    proofUrl: 'https://files.unitik.co/proof.jpg',
    validatedBy: null,
    validatedAt: null,
    status: PaymentStatus.PENDING_VALIDATION,
    autoValidated: false,
    paidAt: new Date(),
    createdAt: new Date(),
    invoice: { id: 'inv-1', clientId: 'client-1', status: InvoiceStatus.PENDING },
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        PaymentsService,
        PaymentReconnectionPolicy,
        { provide: PrismaService, useValue: prismaMock },
        { provide: EventEmitter2, useValue: emitterMock },
        { provide: PromisesService, useValue: promisesMock },
        { provide: AuditService, useValue: auditMock },
      ],
    }).compile();
    service = moduleRef.get(PaymentsService);
    jest.clearAllMocks();
  });

  it('registers Nequi payments as PENDING_VALIDATION (never auto-approved)', async () => {
    prismaMock.invoice.findUnique.mockResolvedValueOnce({
      id: 'inv-1',
      status: InvoiceStatus.PENDING,
      client: { userId: clientUser.id },
    });
    prismaMock.payment.create.mockImplementationOnce(({ data }) => Promise.resolve(data));

    const payment = await service.register({
      invoiceId: 'inv-1',
      amount: 60000,
      paymentMethod: PaymentMethod.NEQUI,
      reference: 'NQ-123',
    }, clientUser);

    expect(payment.status).toBe(PaymentStatus.PENDING_VALIDATION);
  });

  it('rejects cash payments through the generic pending-payment endpoint for clients', async () => {
    await expect(
      service.register(
        { invoiceId: 'inv-1', amount: 60000, paymentMethod: PaymentMethod.CASH },
        clientUser,
      ),
    ).rejects.toThrow(ForbiddenException);
    expect(prismaMock.payment.create).not.toHaveBeenCalled();
  });

  it('settles a cashier cash payment atomically and emits the reconnection event', async () => {
    const invoice = {
      id: 'inv-1',
      invoiceNumber: 'FCT-001',
      clientId: 'client-1',
      total: 60000,
      status: InvoiceStatus.OVERDUE,
    };
    const payment = {
      id: 'cash-payment-1',
      invoiceId: invoice.id,
      amount: invoice.total,
      paymentMethod: PaymentMethod.CASH,
      status: PaymentStatus.VALIDATED,
    };
    prismaMock.invoice.findUnique.mockResolvedValueOnce(invoice);
    transactionMock.invoice.updateMany.mockResolvedValueOnce({ count: 1 });
    transactionMock.payment.create.mockResolvedValueOnce(payment);
    prismaMock.$transaction.mockImplementationOnce((callback: (tx: typeof transactionMock) => unknown) =>
      callback(transactionMock),
    );

    await expect(service.registerCash('inv-1', cashier)).resolves.toEqual(payment);

    expect(transactionMock.invoice.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'inv-1',
        status: {
          in: [InvoiceStatus.PENDING, InvoiceStatus.OVERDUE, InvoiceStatus.PROMISE_TO_PAY],
        },
      },
      data: { status: InvoiceStatus.PAID },
    });
    expect(transactionMock.payment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        invoiceId: 'inv-1',
        amount: 60000,
        paymentMethod: PaymentMethod.CASH,
        status: PaymentStatus.VALIDATED,
        validatedBy: cashier.id,
      }),
    });
    expect(promisesMock.markFulfilled).toHaveBeenCalledWith('inv-1');
    expect(auditMock.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'CASH_PAYMENT', userId: cashier.id }),
    );
    expect(emitterMock.emit).toHaveBeenCalledWith(
      PaymentReconnectionPolicy.PAYMENT_VALIDATED_EVENT,
      expect.objectContaining({ paymentId: payment.id, clientId: 'client-1' }),
    );
  });

  it('rejects cash payment when invoice already paid or user is not cashier', async () => {
    await expect(service.registerCash('inv-1', technician)).rejects.toThrow(ForbiddenException);
    prismaMock.invoice.findUnique.mockResolvedValueOnce({
      id: 'inv-1',
      status: InvoiceStatus.PAID,
      total: 60000,
    });
    await expect(service.registerCash('inv-1', cashier)).rejects.toThrow(ConflictException);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
    expect(emitterMock.emit).not.toHaveBeenCalled();
  });

  it('prevents clients from reporting payments against another client invoice', async () => {
    prismaMock.invoice.findUnique.mockResolvedValueOnce({
      id: 'inv-1',
      status: InvoiceStatus.PENDING,
      client: { userId: 'other-client-user' },
    });

    await expect(
      service.register(
        { invoiceId: 'inv-1', amount: 60000, paymentMethod: PaymentMethod.NEQUI },
        clientUser,
      ),
    ).rejects.toThrow(ForbiddenException);
    expect(prismaMock.payment.create).not.toHaveBeenCalled();
  });

  it('forbids validation by roles other than ADMIN/CASHIER', async () => {
    await expect(
      service.validate('pay-1', { approve: true }, technician),
    ).rejects.toThrow(ForbiddenException);
  });

  it('rejects approving Nequi/transfer without an attached proof', async () => {
    prismaMock.payment.findUnique.mockResolvedValueOnce({ ...pendingPayment, proofUrl: null });
    await expect(service.validate('pay-1', { approve: true }, admin)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('refuses double processing of an already validated payment', async () => {
    prismaMock.payment.findUnique.mockResolvedValueOnce({
      ...pendingPayment,
      status: PaymentStatus.VALIDATED,
    });
    await expect(service.validate('pay-1', { approve: true }, admin)).rejects.toThrow(
      ConflictException,
    );
  });

  it('approval sets VALIDATED with validator info and emits payment.validated', async () => {
    prismaMock.payment.findUnique.mockResolvedValueOnce(pendingPayment);
    const validated = {
      ...pendingPayment,
      status: PaymentStatus.VALIDATED,
      validatedBy: admin.id,
    };
    prismaMock.$transaction.mockResolvedValueOnce([validated, {}]);

    const result = await service.validate('pay-1', { approve: true }, admin);

    expect(result.payment.status).toBe(PaymentStatus.VALIDATED);
    expect(result.previous.status).toBe(PaymentStatus.PENDING_VALIDATION);
    expect(emitterMock.emit).toHaveBeenCalledWith(
      PaymentReconnectionPolicy.PAYMENT_VALIDATED_EVENT,
      expect.objectContaining({ paymentId: 'pay-1', clientId: 'client-1' }),
    );
  });

  it('rejection stores REJECTED, notifies the client and never emits the event', async () => {
    prismaMock.payment.findUnique.mockResolvedValueOnce(pendingPayment);
    const rejected = { ...pendingPayment, status: PaymentStatus.REJECTED };
    prismaMock.$transaction.mockImplementationOnce((ops: unknown[]) =>
      Promise.resolve([rejected, {}].slice(0, ops.length)),
    );

    const result = await service.validate(
      'pay-1',
      { approve: false, reason: 'Comprobante ilegible' },
      admin,
    );

    expect(result.payment.status).toBe(PaymentStatus.REJECTED);
    expect(prismaMock.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: 'PAYMENT_REJECTED' }),
      }),
    );
    expect(emitterMock.emit).not.toHaveBeenCalled();
  });
});
