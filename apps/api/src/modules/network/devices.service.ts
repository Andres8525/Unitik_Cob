import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { NetworkDevice } from '@prisma/client';
import { encryptSecret } from '../../common/utils/crypto.util';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDeviceDto } from './dto/create-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';
import { availableIps, AvailableIpsResult, defaultPoolFor, parseCidr } from './ip-pool.util';

/** Device shape returned by the API — the encrypted secret never leaves. */
export type PublicDevice = Omit<NetworkDevice, 'apiPasswordEnc'> & {
  status: 'online' | 'offline' | 'unknown';
};

/** A device is "online" if it answered a ping within this window. */
const ONLINE_WINDOW_MS = 5 * 60_000;

@Injectable()
export class DevicesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateDeviceDto): Promise<PublicDevice> {
    this.assertValidPool(dto.ipPool);
    const { apiPassword, ...rest } = dto;
    const device = await this.prisma.networkDevice.create({
      data: { ...rest, apiPasswordEnc: encryptSecret(apiPassword) },
    });
    return this.toPublic(device);
  }

  async findAll(): Promise<PublicDevice[]> {
    const devices = await this.prisma.networkDevice.findMany({ orderBy: { name: 'asc' } });
    return devices.map((device) => this.toPublic(device));
  }

  async findOne(id: string): Promise<PublicDevice> {
    const device = await this.prisma.networkDevice.findUnique({ where: { id } });
    if (!device) throw new NotFoundException('Dispositivo no encontrado');
    return this.toPublic(device);
  }

  async update(
    id: string,
    dto: UpdateDeviceDto,
  ): Promise<{ device: PublicDevice; previous: PublicDevice }> {
    const current = await this.prisma.networkDevice.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Dispositivo no encontrado');
    this.assertValidPool(dto.ipPool);

    const { apiPassword, ...rest } = dto;
    const device = await this.prisma.networkDevice.update({
      where: { id },
      data: { ...rest, ...(apiPassword ? { apiPasswordEnc: encryptSecret(apiPassword) } : {}) },
    });
    return { device: this.toPublic(device), previous: this.toPublic(current) };
  }

  /** Free client addresses of the device pool (router IP and assigned addresses excluded). */
  async availableIps(id: string, limit = 256): Promise<AvailableIpsResult> {
    const device = await this.prisma.networkDevice.findUnique({
      where: { id },
      select: { ipAddress: true, ipPool: true },
    });
    if (!device) throw new NotFoundException('Dispositivo no encontrado');

    const pool = device.ipPool ?? defaultPoolFor(device.ipAddress);
    if (!pool)
      throw new BadRequestException('El dispositivo no tiene un pool de direcciones válido');

    const assigned = await this.prisma.networkAccess.findMany({
      where: { deviceId: id, ipAssigned: { not: null } },
      select: { ipAssigned: true },
    });
    const result = availableIps(
      pool,
      assigned.map((access) => access.ipAssigned as string),
      [device.ipAddress],
      limit,
    );
    if (!result) throw new BadRequestException(`El pool ${pool} no es válido`);
    return result;
  }

  private assertValidPool(pool: string | undefined): void {
    if (pool && !parseCidr(pool)) {
      throw new BadRequestException('El pool debe ser un bloque CIDR válido entre /20 y /30');
    }
  }

  private toPublic(device: NetworkDevice): PublicDevice {
    const { apiPasswordEnc: _apiPasswordEnc, ...publicDevice } = device;
    const status = !device.lastPing
      ? ('unknown' as const)
      : Date.now() - device.lastPing.getTime() < ONLINE_WINDOW_MS
        ? ('online' as const)
        : ('offline' as const);
    return { ...publicDevice, status };
  }
}
