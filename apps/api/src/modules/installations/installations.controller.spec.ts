import { ConflictException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ClientStatus, ServiceType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { InstallationsController } from './installations.controller';
import { INSTALLATION_EXTRA_COSTS_APPLIED_EVENT } from './installation-extra-costs-applied.event';

describe('InstallationsController', () => {
  let controller: InstallationsController;

  const tx = {
    client: { findUnique: jest.fn(), update: jest.fn() },
    networkDevice: { findUnique: jest.fn() },
    networkAccess: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
    installationRecord: { create: jest.fn() },
  };
  const prismaMock = {
    $transaction: jest.fn((callback: (transaction: typeof tx) => unknown) => callback(tx)),
  };
  const eventEmitterMock = { emit: jest.fn() };
  const dto = {
    clientId: 'client-1',
    deviceId: 'device-1',
    serviceType: ServiceType.FIBER,
    macAddress: 'AA:BB:CC:DD:EE:FF',
    ipAddress: '192.168.10.25',
    aplicarCostosExtra: true,
    equipmentList: [{ item: 'Equipo de acceso', quantity: 1 }],
    installationDate: '2026-11-08T12:00:00.000Z',
  };
  const technician = { id: 'tech-1' } as AuthenticatedUser;

  beforeEach(() => {
    controller = new InstallationsController(
      prismaMock as unknown as PrismaService,
      eventEmitterMock as unknown as EventEmitter2,
    );
    jest.clearAllMocks();
    tx.client.findUnique.mockResolvedValue({ id: 'client-1', status: ClientStatus.SUSPENDED });
    tx.networkDevice.findUnique.mockResolvedValue({ id: 'device-1', isActive: true });
    tx.networkAccess.findFirst.mockResolvedValue(null);
    tx.installationRecord.create.mockResolvedValue({ id: 'installation-1', clientId: 'client-1' });
    tx.networkAccess.create.mockResolvedValue({
      id: 'access-1',
      clientId: 'client-1',
      deviceId: 'device-1',
      macAddress: dto.macAddress,
      ipAssigned: dto.ipAddress,
    });
    tx.client.update.mockResolvedValue({ status: ClientStatus.ACTIVE });
  });

  it('creates the installation and network access atomically before activating the client', async () => {
    const result = await controller.create(dto, technician);

    expect(tx.installationRecord.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          clientId: dto.clientId,
          technicianId: technician.id,
          extraCostsApplied: true,
        }),
      }),
    );
    expect(tx.networkAccess.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          clientId: dto.clientId,
          deviceId: dto.deviceId,
          macAddress: dto.macAddress,
          ipAssigned: dto.ipAddress,
          isEnabled: true,
        }),
      }),
    );
    expect(tx.client.update).toHaveBeenCalledWith({
      where: { id: dto.clientId },
      data: { status: ClientStatus.ACTIVE },
      select: { status: true },
    });
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(eventEmitterMock.emit).toHaveBeenCalledWith(
      INSTALLATION_EXTRA_COSTS_APPLIED_EVENT,
      expect.objectContaining({ clientId: dto.clientId, technicianId: technician.id }),
    );
    expect(result.clientStatus).toBe(ClientStatus.ACTIVE);
  });

  it('rejects an IP or MAC already assigned to another client', async () => {
    tx.networkAccess.findFirst.mockResolvedValueOnce({ clientId: 'another-client' });

    await expect(controller.create(dto, technician)).rejects.toThrow(ConflictException);
    expect(tx.installationRecord.create).not.toHaveBeenCalled();
    expect(tx.client.update).not.toHaveBeenCalled();
    expect(eventEmitterMock.emit).not.toHaveBeenCalled();
  });
});
