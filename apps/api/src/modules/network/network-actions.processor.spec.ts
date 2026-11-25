import { Test } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Job } from 'bullmq';
import { ServiceContinuityPolicy } from '../governance/service-continuity.policy';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../../prisma/prisma.service';
import { MikrotikService } from './mikrotik.service';
import { NetworkActionsProcessor } from './network-actions.processor';

describe('NetworkActionsProcessor (Políticas 1, 2 y 4)', () => {
  let processor: NetworkActionsProcessor;

  const prismaMock = {
    networkAccess: { findUnique: jest.fn(), update: jest.fn() },
    client: { update: jest.fn() },
    operationalMetric: { create: jest.fn() },
    $transaction: jest.fn().mockResolvedValue([]),
  };
  const mikrotikMock = {
    enableClient: jest.fn(),
    disableClient: jest.fn(),
    changeUserProfile: jest.fn(),
    blockAddress: jest.fn(),
    unblockAddress: jest.fn(),
  };
  const auditMock = { record: jest.fn() };
  const eventEmitterMock = { emit: jest.fn() };

  const access = {
    id: 'access-1',
    clientId: 'client-1',
    deviceId: 'device-1',
    pppoeUser: 'cliente001',
    isEnabled: true,
    lastAction: 'enabled',
    device: { id: 'device-1' },
  };

  const jobOf = (name: string, data: object, attemptsMade = 0) =>
    ({ name, data, attemptsMade, opts: { attempts: 5 } }) as Job;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        NetworkActionsProcessor,
        ServiceContinuityPolicy,
        { provide: PrismaService, useValue: prismaMock },
        { provide: MikrotikService, useValue: mikrotikMock },
        { provide: AuditService, useValue: auditMock },
        { provide: EventEmitter2, useValue: eventEmitterMock },
      ],
    }).compile();
    processor = moduleRef.get(NetworkActionsProcessor);
    jest.clearAllMocks();
    prismaMock.$transaction.mockResolvedValue([]);
  });

  it('reconnect: habilita PPPoE, audita RECONNECT y registra la métrica del SLA', async () => {
    prismaMock.networkAccess.findUnique.mockResolvedValueOnce({ ...access, isEnabled: false });
    prismaMock.operationalMetric.create.mockResolvedValueOnce({});

    await processor.process(
      jobOf('reconnect', {
        networkAccessId: 'access-1',
        clientId: 'client-1',
        paymentId: 'pay-1',
        validatedAt: new Date(Date.now() - 60_000).toISOString(),
      }),
    );

    expect(mikrotikMock.enableClient).toHaveBeenCalledWith('device-1', 'cliente001');
    expect(auditMock.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'RECONNECT',
        policyRef: 'ISO/IEC 38500 - Responsabilidad',
      }),
    );
    expect(prismaMock.operationalMetric.create).toHaveBeenCalled();
  });

  it('suspend: deshabilita PPPoE, suspende al cliente y audita SUSPEND con motivo', async () => {
    prismaMock.networkAccess.findUnique.mockResolvedValueOnce(access);

    await processor.process(
      jobOf('suspend', {
        networkAccessId: 'access-1',
        clientId: 'client-1',
        invoiceId: 'inv-1',
        reason: 'Mora: factura FCT-X vencida hace más de 7 días',
      }),
    );

    expect(mikrotikMock.disableClient).toHaveBeenCalledWith('device-1', 'cliente001');
    expect(auditMock.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'SUSPEND',
        newValues: expect.objectContaining({ reason: expect.stringContaining('Mora') }),
      }),
    );
  });

  describe('clientes registrados por acta (MAC/IP, sin PPPoE) — HU-09', () => {
    const actaAccess = {
      ...access,
      pppoeUser: null,
      ipAssigned: '10.20.0.15',
      macAddress: 'AA:BB:CC:11:22:33',
    };

    it('reconnect: saca la IP de la address-list y registra la métrica', async () => {
      prismaMock.networkAccess.findUnique.mockResolvedValueOnce({
        ...actaAccess,
        isEnabled: false,
      });

      await processor.process(
        jobOf('reconnect', {
          networkAccessId: 'access-1',
          clientId: 'client-1',
          paymentId: 'pay-1',
          validatedAt: new Date().toISOString(),
        }),
      );

      expect(mikrotikMock.unblockAddress).toHaveBeenCalledWith('device-1', '10.20.0.15');
      expect(mikrotikMock.enableClient).not.toHaveBeenCalled();
      expect(auditMock.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'RECONNECT',
          newValues: expect.objectContaining({ mode: 'address-list' }),
        }),
      );
      expect(prismaMock.operationalMetric.create).toHaveBeenCalled();
    });

    it('suspend: agrega la IP a la address-list con el motivo', async () => {
      prismaMock.networkAccess.findUnique.mockResolvedValueOnce(actaAccess);

      await processor.process(
        jobOf('suspend', {
          networkAccessId: 'access-1',
          clientId: 'client-1',
          invoiceId: 'inv-1',
          reason: 'Mora: factura FCT-2026-011',
        }),
      );

      expect(mikrotikMock.blockAddress).toHaveBeenCalledWith(
        'device-1',
        '10.20.0.15',
        'Mora: factura FCT-2026-011',
      );
      expect(mikrotikMock.disableClient).not.toHaveBeenCalled();
    });

    it('change-profile: se omite y audita porque requiere PPPoE', async () => {
      prismaMock.networkAccess.findUnique.mockResolvedValueOnce(actaAccess);

      await processor.process(
        jobOf('change-profile', {
          networkAccessId: 'access-1',
          clientId: 'client-1',
          newProfile: 'fibra-100',
        }),
      );

      expect(mikrotikMock.changeUserProfile).not.toHaveBeenCalled();
      expect(auditMock.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'NETWORK_ACTION_SKIPPED' }),
      );
    });
  });

  it('change-profile: cambia el perfil PPPoE y audita CHANGE_PROFILE', async () => {
    prismaMock.networkAccess.findUnique.mockResolvedValueOnce(access);
    prismaMock.networkAccess.update.mockResolvedValueOnce({});

    await processor.process(
      jobOf('change-profile', {
        networkAccessId: 'access-1',
        clientId: 'client-1',
        newProfile: 'Plan 3 Fibra',
      }),
    );

    expect(mikrotikMock.changeUserProfile).toHaveBeenCalledWith(
      'device-1',
      'cliente001',
      'Plan 3 Fibra',
    );
    expect(auditMock.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'CHANGE_PROFILE' }),
    );
  });

  it('audita NETWORK_ACTION_SKIPPED cuando el acceso no existe (sin reintentos)', async () => {
    prismaMock.networkAccess.findUnique.mockResolvedValueOnce(null);
    await processor.process(
      jobOf('suspend', { networkAccessId: 'ghost', clientId: 'c', invoiceId: 'i', reason: 'x' }),
    );
    expect(mikrotikMock.disableClient).not.toHaveBeenCalled();
    expect(auditMock.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'NETWORK_ACTION_SKIPPED' }),
    );
  });

  it('propaga fallas de MikroTik para que BullMQ reintente (política de continuidad)', async () => {
    prismaMock.networkAccess.findUnique.mockResolvedValueOnce(access);
    mikrotikMock.disableClient.mockRejectedValueOnce(new Error('RouterBoard caída'));
    await expect(
      processor.process(
        jobOf('suspend', {
          networkAccessId: 'access-1',
          clientId: 'client-1',
          invoiceId: 'inv-1',
          reason: 'Mora',
        }),
      ),
    ).rejects.toThrow('RouterBoard caída');
    expect(eventEmitterMock.emit).not.toHaveBeenCalled();
  });

  it('audita y notifica al técnico solo al agotarse los reintentos de reconexión', async () => {
    prismaMock.networkAccess.findUnique.mockResolvedValueOnce({
      ...access,
      ipAssigned: '192.0.2.10',
      macAddress: 'AA:BB:CC:DD:EE:FF',
    });
    mikrotikMock.enableClient.mockRejectedValueOnce(new Error('RouterBoard timeout'));

    await expect(
      processor.process(
        jobOf(
          'reconnect',
          {
            networkAccessId: 'access-1',
            clientId: 'client-1',
            paymentId: 'pay-1',
            validatedAt: new Date().toISOString(),
          },
          4,
        ),
      ),
    ).rejects.toThrow('RouterBoard timeout');

    expect(auditMock.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'RECONNECT_FAILED',
        entity: 'NetworkAccess',
        entityId: 'access-1',
        newValues: expect.objectContaining({
          clientId: 'client-1',
          paymentId: 'pay-1',
          attempts: 5,
          reason: 'RouterBoard timeout',
        }),
      }),
    );
    expect(eventEmitterMock.emit).toHaveBeenCalledWith(
      'router.reconexion.fallida',
      expect.objectContaining({
        clientId: 'client-1',
        networkAccessId: 'access-1',
        attempts: 5,
      }),
    );
  });
});
