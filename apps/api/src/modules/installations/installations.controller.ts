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
import { ClientStatus, InstallationRecord, Role } from '@prisma/client';
import { Audited } from '../../common/decorators/audited.decorator';
import { AuthenticatedUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateInstallationDto } from './dto/create-installation.dto';
import {
  INSTALLATION_EXTRA_COSTS_APPLIED_EVENT,
  InstallationExtraCostsAppliedEvent,
} from './installation-extra-costs-applied.event';

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
    };
    clientStatus: ClientStatus;
  }> {
    const result = await this.prisma.$transaction(async (tx) => {
      const client = await tx.client.findUnique({ where: { id: dto.clientId } });
      if (!client) throw new NotFoundException('Cliente no encontrado');
      if (client.status === ClientStatus.CUT || client.status === ClientStatus.CANCELLED) {
        throw new BadRequestException('No se puede instalar un servicio para un cliente cortado o cancelado');
      }

      const device = await tx.networkDevice.findUnique({ where: { id: dto.deviceId } });
      if (!device || !device.isActive) {
        throw new NotFoundException('Dispositivo de red no encontrado o inactivo');
      }

      const conflictingAccess = await tx.networkAccess.findFirst({
        where: {
          deviceId: dto.deviceId,
          OR: [{ macAddress: dto.macAddress }, { ipAssigned: dto.ipAddress }],
        },
      });
      if (conflictingAccess && conflictingAccess.clientId !== dto.clientId) {
        throw new ConflictException('La dirección IP o MAC ya está asignada a otro cliente en este dispositivo');
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
              macAddress: dto.macAddress,
              ipAssigned: dto.ipAddress,
              isEnabled: true,
              lastAction: 'installation-registered',
              lastActionAt: new Date(),
            },
            select: { id: true, clientId: true, deviceId: true, macAddress: true, ipAssigned: true },
          })
        : await tx.networkAccess.create({
            data: {
              clientId: dto.clientId,
              deviceId: dto.deviceId,
              macAddress: dto.macAddress,
              ipAssigned: dto.ipAddress,
              isEnabled: true,
              lastAction: 'installation-registered',
              lastActionAt: new Date(),
            },
            select: { id: true, clientId: true, deviceId: true, macAddress: true, ipAssigned: true },
          });

      const updatedClient = await tx.client.update({
        where: { id: dto.clientId },
        data: { status: ClientStatus.ACTIVE },
        select: { status: true },
      });

      return { installation, networkAccess, clientStatus: updatedClient.status };
    });

    if (dto.aplicarCostosExtra) {
      this.eventEmitter.emit(
        INSTALLATION_EXTRA_COSTS_APPLIED_EVENT,
        new InstallationExtraCostsAppliedEvent(result.installation.id, dto.clientId, user.id, new Date()),
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
