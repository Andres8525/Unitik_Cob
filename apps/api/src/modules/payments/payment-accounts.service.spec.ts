import { PrismaService } from '../../prisma/prisma.service';
import { PAYMENT_ACCOUNTS_KEY, PaymentAccountsService } from './payment-accounts.service';

describe('PaymentAccountsService', () => {
  const prismaMock = { systemConfig: { findUnique: jest.fn(), upsert: jest.fn() } };
  const service = new PaymentAccountsService(prismaMock as unknown as PrismaService);

  beforeEach(() => jest.clearAllMocks());

  it('returns an empty list when nothing is configured or the JSON is corrupt', async () => {
    prismaMock.systemConfig.findUnique.mockResolvedValueOnce(null);
    await expect(service.list()).resolves.toEqual([]);

    prismaMock.systemConfig.findUnique.mockResolvedValueOnce({ value: '{not json' });
    await expect(service.list()).resolves.toEqual([]);
  });

  it('stores trimmed accounts, drops the account type for Nequi and returns the previous list', async () => {
    const previous = [
      { method: 'NEQUI', bank: 'Nequi', accountNumber: '3000000000', holderName: 'X' },
    ];
    prismaMock.systemConfig.findUnique.mockResolvedValueOnce({ value: JSON.stringify(previous) });

    const result = await service.replace(
      [
        {
          method: 'NEQUI',
          bank: ' Nequi ',
          accountType: 'AHORROS',
          accountNumber: ' 300 000 0000 ',
          holderName: ' UNITIK ',
        },
      ],
      'admin-1',
    );

    expect(result.previous).toEqual(previous);
    expect(result.accounts[0]).toMatchObject({
      bank: 'Nequi',
      accountNumber: '300 000 0000',
      holderName: 'UNITIK',
      accountType: undefined,
    });
    const upsert = prismaMock.systemConfig.upsert.mock.calls[0][0];
    expect(upsert.where).toEqual({ key: PAYMENT_ACCOUNTS_KEY });
    expect(upsert.update.updatedBy).toBe('admin-1');
    expect(JSON.parse(upsert.update.value)).toHaveLength(1);
  });
});
