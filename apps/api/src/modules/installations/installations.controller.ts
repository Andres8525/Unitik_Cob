import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  NotFoundException,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ClientStatus, FilePurpose, InstallationRecord, Prisma, Role } from '@prisma/client';
import { Audited } from '../../common/decorators/audited.decorator';
import { AuthenticatedUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { FilesService } from '../files/files.service';
import { CreateInstallationDto } from './dto/create-installation.dto';
import {
  INSTALLATION_EXTRA_COSTS_APPLIED_EVENT,
  InstallationExtraCostsAppliedEvent,
} from './installation-extra-costs-applied.event';

/** Canonical MAC form used for storage and uniqueness (AA:BB:CC:DD:EE:FF). */
export function normalizeMac(mac: string): string {
  return mac.trim().toUpperCase().replace(/-/g, ':');
}

function isUniqueViolation(error: unknown, field: string): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002')
    return false;
  const target = error.meta?.target;
  return Array.isArray(target) ? target.includes(field) : String(target ?? '').includes(field);
}

/**
 * Installation records (acta del técnico con firma digital del cliente).
 * ISO/IEC 38500 — Responsibility: the record ties technician, equipment
 * and client signature to the installation.
 */
@ApiTags('installations')
@ApiBearerAuth()
@Controller('installations')
export class InstallationsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly filesService: FilesService,
  ) {}

  @Post()
  @Roles(Role.TECHNICIAN, Role.ADMIN)
  @Audited({ entity: 'InstallationRecord' })
  @ApiOperation({ summary: 'Registrar acta de instalación (equipos, cable, firma)' })
  async create(
    @Body() dto: CreateInstallationDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{
    installation: InstallationRecord;
    networkAccess: {
      id: string;
      clientId: string;
      deviceId: string;
      macAddress: string | null;
      ipAssigned: string | null;
      equipmentSerial: string | null;
    };
    clientStatus: ClientStatus;
  }> {
    const macAddress = normalizeMac(dto.macAddress);
    const equipmentSerial = dto.equipmentSerial.trim().toUpperCase();
    if (dto.sitePhotoId) {
      await this.filesService.assertOwnedFile(dto.sitePhotoId, FilePurpose.INSTALLATION_SITE, user);
    }
    if (dto.equipmentPhotoId) {
      await this.filesService.assertOwnedFile(
        dto.equipmentPhotoId,
        FilePurpose.INSTALLATION_EQUIPMENT,
        user,
      );
    }
    const result = await this.prisma
      .$transaction(async (tx) => {
        const client = await tx.client.findUnique({ where: { id: dto.clientId } });
        if (!client) throw new NotFoundException('Cliente no encontrado');
        if (client.status === ClientStatus.CUT || client.status === ClientStatus.CANCELLED) {
          throw new BadRequestException(
            'No se puede instalar un servicio para un cliente cortado o cancelado',
          );
        }

        const device = await tx.networkDevice.findUnique({ where: { id: dto.deviceId } });
        if (!device || !device.isActive) {
          throw new NotFoundException('Dispositivo de red no encontrado o inactivo');
        }

        // A CPE MAC identifies one physical device: it can never belong to two clients, on any router.
        const macOwner = await tx.networkAccess.findFirst({ where: { macAddress } });
        if (macOwner && macOwner.clientId !== dto.clientId) {
          const owner = await tx.client.findUnique({
            where: { id: macOwner.clientId },
            select: { clientCode: true },
          });
          throw new ConflictException(
            `La MAC ${macAddress} ya está registrada${owner?.clientCode ? ` para el cliente ${owner.clientCode}` : ' para otro cliente'}`,
          );
        }

        const ipOwner = await tx.networkAccess.findFirst({
          where: { deviceId: dto.deviceId, ipAssigned: dto.ipAddress },
        });
        if (ipOwner && ipOwner.clientId !== dto.clientId) {
          throw new ConflictException(
            `La IP ${dto.ipAddress} ya está asignada a otro cliente en este dispositivo`,
          );
        }

        const installation = await tx.installationRecord.create({
          data: {
            clientId: dto.clientId,
            technicianId: user.id,
            serviceType: dto.serviceType,
            cableMeters: dto.cableMeters,
            equipmentList: dto.equipmentList,
            clientPaidEquipment: dto.clientPaidEquipment ?? false,
            extraCostsApplied: dto.aplicarCostosExtra ?? false,
            observations: dto.observations,
            installationDate: new Date(dto.installationDate),
            signedUrl: dto.signedUrl,
            macAddress,
            ipAddress: dto.ipAddress,
            equipmentSerial,
            sitePhotoId: dto.sitePhotoId,
            equipmentPhotoId: dto.equipmentPhotoId,
          },
        });

        const currentAccess = await tx.networkAccess.findFirst({
          where: { clientId: dto.clientId },
        });
        const networkAccess = currentAccess
          ? await tx.networkAccess.update({
              where: { id: currentAccess.id },
              data: {
                deviceId: dto.deviceId,
                macAddress,
                ipAssigned: dto.ipAddress,
                equipmentSerial,
                isEnabled: true,
                lastAction: 'installation-registered',
                lastActionAt: new Date(),
              },
              select: {
                id: true,
                clientId: true,
                deviceId: true,
                macAddress: true,
                ipAssigned: true,
                equipmentSerial: true,
              },
            })
          : await tx.networkAccess.create({
              data: {
                clientId: dto.clientId,
                deviceId: dto.deviceId,
                macAddress,
                ipAssigned: dto.ipAddress,
                equipmentSerial,
                isEnabled: true,
                lastAction: 'installation-registered',
                lastActionAt: new Date(),
              },
              select: {
                id: true,
                clientId: true,
                deviceId: true,
                macAddress: true,
                ipAssigned: true,
                equipmentSerial: true,
              },
            });

        const updatedClient = await tx.client.update({
          where: { id: dto.clientId },
          data: { status: ClientStatus.ACTIVE },
          select: { status: true },
        });

        return { installation, networkAccess, clientStatus: updatedClient.status };
      })
      .catch((error: unknown) => {
        // Two actas submitted at the same time: the unique index is the final guard.
        if (isUniqueViolation(error, 'macAddress')) {
          throw new ConflictException(`La MAC ${macAddress} ya está registrada para otro cliente`);
        }
        throw error;
      });

    if (dto.aplicarCostosExtra) {
      this.eventEmitter.emit(
        INSTALLATION_EXTRA_COSTS_APPLIED_EVENT,
        new InstallationExtraCostsAppliedEvent(
          result.installation.id,
          dto.clientId,
          user.id,
          new Date(),
        ),
      );
    }

    return result;
  }

  @Get()
  @Roles(Role.TECHNICIAN, Role.ADMIN)
  @ApiOperation({ summary: 'Actas por cliente o técnico' })
  @ApiQuery({ name: 'clientId', required: false })
  @ApiQuery({ name: 'technicianId', required: false })
  findAll(
    @Query('clientId') clientId?: string,
    @Query('technicianId') technicianId?: string,
  ): Promise<InstallationRecord[]> {
    return this.prisma.installationRecord.findMany({
      where: {
        ...(clientId ? { clientId } : {}),
        ...(technicianId ? { technicianId } : {}),
      },
      orderBy: { installationDate: 'desc' },
      take: 200,
    });
  }
}
