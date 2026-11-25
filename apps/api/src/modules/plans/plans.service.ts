import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Plan, Prisma, ServiceType, SubscriptionStatus } from '@prisma/client';
import { SystemConfigService } from '../system-config/system-config.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';

@Injectable()
export class PlansService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly systemConfig: SystemConfigService,
  ) {}

  findAll(filters: { serviceType?: ServiceType; onlyActive?: boolean }): Promise<Plan[]> {
    const where: Prisma.PlanWhereInput = {};
    if (filters.serviceType) where.serviceType = filters.serviceType;
    if (filters.onlyActive) where.isActive = true;
    return this.prisma.plan.findMany({
      where,
      orderBy: [{ serviceType: 'asc' }, { speedMbps: 'asc' }],
    });
  }

  async findOne(id: string): Promise<Plan> {
    const plan = await this.prisma.plan.findUnique({ where: { id } });
    if (!plan) throw new NotFoundException('Plan no encontrado');
    return plan;
  }

  /** Defaults come from system_config, never hardcoded (golden rule #3). */
  async create(dto: CreatePlanDto): Promise<Plan> {
    const installationFee =
      dto.installationFee ?? (await this.systemConfig.getNumber('installation_fee_default'));
    const tvPrice =
      dto.tvPrice ??
      (dto.includesTv ? await this.systemConfig.getNumber('tv_service_price') : null);

    return this.prisma.plan.create({
      data: { ...dto, installationFee, tvPrice },
    });
  }

  /** No hard delete: plans with subscriptions are deactivated instead. */
  async update(id: string, dto: UpdatePlanDto): Promise<{ plan: Plan; previous: Plan }> {
    const previous = await this.findOne(id);
    const plan = await this.prisma.plan.update({ where: { id }, data: dto });
    return { plan, previous };
  }

  /**
   * HU-03 business rule: a plan with live subscriptions can't be deleted, only
   * set to inactive. A plan referenced only by cancelled subscriptions is
   * deactivated (history must keep pointing to it); an unused plan is deleted.
   */
  async remove(id: string): Promise<{ result: 'deleted' | 'deactivated'; previous: Plan }> {
    const previous = await this.findOne(id);
    const [live, total] = await Promise.all([
      this.prisma.subscription.count({
        where: { planId: id, status: { not: SubscriptionStatus.CANCELLED } },
      }),
      this.prisma.subscription.count({ where: { planId: id } }),
    ]);

    if (live > 0) {
      throw new ConflictException(
        `El plan tiene ${live} cliente${live === 1 ? '' : 's'} activo${live === 1 ? '' : 's'}: ` +
          'no se puede eliminar, cambia su estado a Inactivo',
      );
    }
    if (total > 0) {
      await this.prisma.plan.update({ where: { id }, data: { isActive: false } });
      return { result: 'deactivated', previous };
    }
    await this.prisma.plan.delete({ where: { id } });
    return { result: 'deleted', previous };
  }
}
