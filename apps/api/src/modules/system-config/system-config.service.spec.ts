import { NotFoundException } from '@nestjs/common';
import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { SystemConfigService } from './system-config.service';

describe('SystemConfigService', () => {
  let service: SystemConfigService;

  const prismaMock = {
    systemConfig: { findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    $transaction: jest.fn(),
  };

  const interestConfig = {
    key: 'interest_rate_percent',
    value: '2.5',
    description: 'Porcentaje de interés por mora',
    updatedBy: null,
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [SystemConfigService, { provide: PrismaService, useValue: prismaMock }],
    }).compile();
    service = moduleRef.get(SystemConfigService);
    jest.clearAllMocks();
  });

  it('reads a numeric parameter (golden rule #3: nothing hardcoded)', async () => {
    prismaMock.systemConfig.findUnique.mockResolvedValueOnce(interestConfig);
    await expect(service.getNumber('interest_rate_percent')).resolves.toBe(2.5);
  });

  it('rejects unknown keys instead of silently creating them', async () => {
    prismaMock.systemConfig.findUnique.mockResolvedValueOnce(null);
    await expect(service.findOne('typo_key')).rejects.toThrow(NotFoundException);
  });

  it('update returns previous value for the audit trail', async () => {
    prismaMock.systemConfig.findUnique.mockResolvedValueOnce(interestConfig);
    prismaMock.systemConfig.update.mockResolvedValueOnce({
      ...interestConfig,
      value: '3.0',
      updatedBy: 'admin-1',
    });

    const { config, previous } = await service.update('interest_rate_percent', '3.0', 'admin-1');

    expect(previous.value).toBe('2.5');
    expect(config.value).toBe('3.0');
    expect(config.updatedBy).toBe('admin-1');
  });

  it('updates validated billing policies together and returns the previous policy values', async () => {
    const values: Record<string, string> = {
      cut_off_day_start: '1',
      cut_off_day_end: '10',
      interest_rate_percent: '2.5',
      double_payment_enabled: 'true',
    };
    prismaMock.systemConfig.findUnique.mockImplementation(({ where }) =>
      Promise.resolve({
        key: where.key,
        value: values[where.key],
        description: where.key,
        updatedBy: null,
        updatedAt: new Date(),
      }),
    );
    prismaMock.systemConfig.update.mockImplementation(({ where, data }) =>
      Promise.resolve({
        key: where.key,
        value: data.value,
        description: where.key,
        updatedBy: data.updatedBy,
        updatedAt: new Date(),
      }),
    );
    prismaMock.$transaction.mockImplementation((updates) => Promise.all(updates));

    const result = await service.updateBillingPolicies(
      {
        cutOffDayStart: 2,
        cutOffDayEnd: 12,
        interestRatePercent: 3,
        doublePaymentEnabled: false,
      },
      'admin-1',
    );

    expect(result.previous).toEqual({
      cutOffDayStart: 1,
      cutOffDayEnd: 10,
      interestRatePercent: 2.5,
      doublePaymentEnabled: true,
    });
    expect(result.configs).toHaveLength(4);
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
  });

  it('rejects a cut-off range whose start day is after its end day', async () => {
    await expect(
      service.updateBillingPolicies(
        {
          cutOffDayStart: 15,
          cutOffDayEnd: 10,
          interestRatePercent: 2.5,
          doublePaymentEnabled: true,
        },
        'admin-1',
      ),
    ).rejects.toThrow(BadRequestException);
    expect(prismaMock.systemConfig.findUnique).not.toHaveBeenCalled();
  });
});
