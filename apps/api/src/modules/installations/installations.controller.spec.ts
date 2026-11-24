import { ConflictException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ClientStatus, FilePurpose, Prisma, ServiceType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { FilesService } from '../files/files.service';
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
  const filesServiceMock = { assertOwnedFile: jest.fn() };
  const dto = {
    clientId: 'client-1',
    deviceId: 'device-1',
    serviceType: ServiceType.FIBER,
    macAddress: 'AA:BB:CC:DD:EE:FF',
    equipmentSerial: 'HG8145V5-0001',
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
      filesServiceMock as unknown as FilesService,
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
  it('normalizes the MAC and stores the serial on the acta and the network access', async () => {
    await controller.create(
      { ...dto, macAddress: 'aa-bb-cc-dd-ee-ff', equipmentSerial: ' hg8145v5-0001 ' },
      technician,
    );

    expect(tx.networkAccess.findFirst).toHaveBeenCalledWith({
      where: { macAddress: 'AA:BB:CC:DD:EE:FF' },
    });
    expect(tx.installationRecord.create.mock.calls[0][0].data).toMatchObject({
      macAddress: 'AA:BB:CC:DD:EE:FF',
      ipAddress: dto.ipAddress,
      equipmentSerial: 'HG8145V5-0001',
    });
    expect(tx.networkAccess.create.mock.calls[0][0].data).toMatchObject({
      macAddress: 'AA:BB:CC:DD:EE:FF',
      equipmentSerial: 'HG8145V5-0001',
    });
  });

  it('rejects a MAC registered to another client on any router and names that client', async () => {
    tx.networkAccess.findFirst.mockResolvedValueOnce({
      clientId: 'another-client',
      deviceId: 'other-router',
    });
    tx.client.findUnique
      .mockResolvedValueOnce({ id: 'client-1', status: ClientStatus.SUSPENDED })
      .mockResolvedValueOnce({ clientCode: 'CLI-0042' });

    await expect(controller.create(dto, technician)).rejects.toThrow(
      'La MAC AA:BB:CC:DD:EE:FF ya está registrada para el cliente CLI-0042',
    );
    expect(tx.installationRecord.create).not.toHaveBeenCalled();
  });

  it('maps a concurrent unique-index violation on the MAC to a conflict', async () => {
    (prismaMock.$transaction as jest.Mock).mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '5.22.0',
        meta: { target: ['macAddress'] },
      }),
    );

    await expect(controller.create(dto, technician)).rejects.toThrow(ConflictException);
  });

  it('validates and links the site and equipment photos', async () => {
    await controller.create(
      {
        ...dto,
        sitePhotoId: '11111111-1111-4111-8111-111111111111',
        equipmentPhotoId: '22222222-2222-4222-8222-222222222222',
      },
      technician,
    );

    expect(filesServiceMock.assertOwnedFile).toHaveBeenCalledWith(
      '11111111-1111-4111-8111-111111111111',
      FilePurpose.INSTALLATION_SITE,
      technician,
    );
    expect(filesServiceMock.assertOwnedFile).toHaveBeenCalledWith(
      '22222222-2222-4222-8222-222222222222',
      FilePurpose.INSTALLATION_EQUIPMENT,
      technician,
    );
    expect(tx.installationRecord.create.mock.calls[0][0].data).toMatchObject({
      sitePhotoId: '11111111-1111-4111-8111-111111111111',
      equipmentPhotoId: '22222222-2222-4222-8222-222222222222',
    });
  });

  it('does not open the transaction when a photo is not valid', async () => {
    filesServiceMock.assertOwnedFile.mockRejectedValueOnce(new Error('archivo inválido'));

    await expect(
      controller.create(
        { ...dto, sitePhotoId: '11111111-1111-4111-8111-111111111111' },
        technician,
      ),
    ).rejects.toThrow('archivo inválido');
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });
});
