import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { SystemConfig } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateBillingPoliciesDto } from './dto/update-billing-policies.dto';

export interface BillingPolicies {
  cutOffDayStart: number;
  cutOffDayEnd: number;
  interestRatePercent: number;
  doublePaymentEnabled: boolean;
}

const BILLING_POLICY_KEYS = {
  cutOffDayStart: 'cut_off_day_start',
  cutOffDayEnd: 'cut_off_day_end',
  interestRatePercent: 'interest_rate_percent',
  doublePaymentEnabled: 'double_payment_enabled',
} as const;

/**
 * Editable business parameters (golden rule #3: prices, rates and cut-off
 * days are never hardcoded — they live in system_config).
 * Keys are created by the seed; this service reads and updates values only,
 * so a typo can never silently create an unused parameter.
 */
@Injectable()
export class SystemConfigService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(): Promise<SystemConfig[]> {
    return this.prisma.systemConfig.findMany({ orderBy: { key: 'asc' } });
  }

  async findOne(key: string): Promise<SystemConfig> {
    const config = await this.prisma.systemConfig.findUnique({ where: { key } });
    if (!config) throw new NotFoundException(`Parámetro "${key}" no existe`);
    return config;
  }

  /** Typed helper for domain modules: reads a numeric parameter. */
  async getNumber(key: string): Promise<number> {
    const config = await this.findOne(key);
    const value = Number(config.value);
    if (Number.isNaN(value)) {
      throw new NotFoundException(`Parámetro "${key}" no es numérico: "${config.value}"`);
    }
    return value;
  }

  async getBoolean(key: string): Promise<boolean> {
    const config = await this.findOne(key);
    if (config.value !== 'true' && config.value !== 'false') {
      throw new NotFoundException(`Parámetro "${key}" no es booleano: "${config.value}"`);
    }
    return config.value === 'true';
  }

  async getBillingPolicies(): Promise<BillingPolicies> {
    const [cutOffDayStart, cutOffDayEnd, interestRatePercent, doublePaymentEnabled] =
      await Promise.all([
        this.getNumber(BILLING_POLICY_KEYS.cutOffDayStart),
        this.getNumber(BILLING_POLICY_KEYS.cutOffDayEnd),
        this.getNumber(BILLING_POLICY_KEYS.interestRatePercent),
        this.getBoolean(BILLING_POLICY_KEYS.doublePaymentEnabled),
      ]);
    return { cutOffDayStart, cutOffDayEnd, interestRatePercent, doublePaymentEnabled };
  }

  async updateBillingPolicies(
    values: UpdateBillingPoliciesDto,
    updatedBy: string,
  ): Promise<{ configs: SystemConfig[]; previous: BillingPolicies }> {
    if (values.cutOffDayStart > values.cutOffDayEnd) {
      throw new BadRequestException('El día inicial del corte no puede ser mayor que el día final');
    }

    const previous = await this.getBillingPolicies();
    const configUpdates = [
      [BILLING_POLICY_KEYS.cutOffDayStart, String(values.cutOffDayStart)],
      [BILLING_POLICY_KEYS.cutOffDayEnd, String(values.cutOffDayEnd)],
      [BILLING_POLICY_KEYS.interestRatePercent, String(values.interestRatePercent)],
      [BILLING_POLICY_KEYS.doublePaymentEnabled, String(values.doublePaymentEnabled)],
    ] as const;
    const updates = await this.prisma.$transaction(
      configUpdates.map(([key, value]) =>
        this.prisma.systemConfig.update({ where: { key }, data: { value, updatedBy } }),
      ),
    );
    return { configs: updates, previous };
  }

  async update(
    key: string,
    value: string,
    updatedBy: string,
  ): Promise<{ config: SystemConfig; previous: SystemConfig }> {
    const previous = await this.findOne(key);
    const config = await this.prisma.systemConfig.update({
      where: { key },
      data: { value, updatedBy },
    });
    return { config, previous };
  }
}
