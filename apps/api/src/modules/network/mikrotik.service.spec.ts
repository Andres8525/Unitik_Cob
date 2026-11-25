import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { encryptSecret } from '../../common/utils/crypto.util';
import { PrismaService } from '../../prisma/prisma.service';
import { MikrotikService, SUSPENDED_ADDRESS_LIST } from './mikrotik.service';

const write = jest.fn();
jest.mock('node-routeros', () => ({
  RouterOSAPI: jest.fn().mockImplementation(() => ({
    connect: jest.fn().mockResolvedValue(undefined),
    close: jest.fn().mockResolvedValue(undefined),
    write,
  })),
}));

describe('MikrotikService address-list mode (HU-09 without PPPoE)', () => {
  const previousKey = process.env.DEVICE_SECRET_KEY;
  let service: MikrotikService;

  beforeAll(() => {
    process.env.DEVICE_SECRET_KEY = 'a'.repeat(64);
  });
  afterAll(() => {
    process.env.DEVICE_SECRET_KEY = previousKey;
  });

  beforeEach(() => {
    write.mockReset();
    const prisma = {
      networkDevice: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'device-1',
          isActive: true,
          ipAddress: '10.0.0.1',
          apiPort: 8729,
          apiUsername: 'unitik-api',
          apiPasswordEnc: encryptSecret('secreto'),
        }),
      },
    };
    const config = {
      get: (key: string, fallback: string) => (key === 'MIKROTIK_MOCK' ? 'false' : fallback),
    };
    service = new MikrotikService(
      config as unknown as ConfigService,
      prisma as unknown as PrismaService,
    );
  });

  it('adds the client IP to the suspended list once', async () => {
    write.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

    await service.blockAddress('device-1', '10.20.0.15', 'Mora FCT-2026-011');

    expect(write).toHaveBeenLastCalledWith('/ip/firewall/address-list/add', [
      `=list=${SUSPENDED_ADDRESS_LIST}`,
      '=address=10.20.0.15',
      '=comment=Mora FCT-2026-011',
    ]);
  });

  it('does not duplicate an IP that is already suspended', async () => {
    write.mockResolvedValueOnce([{ '.id': '*1' }]);

    await service.blockAddress('device-1', '10.20.0.15', 'Mora');

    expect(write).toHaveBeenCalledTimes(1);
  });

  it('removes every entry of the IP when reconnecting', async () => {
    write.mockResolvedValueOnce([{ '.id': '*1' }, { '.id': '*7' }]).mockResolvedValue([]);

    await service.unblockAddress('device-1', '10.20.0.15');

    expect(write).toHaveBeenCalledWith('/ip/firewall/address-list/remove', ['=.id=*1']);
    expect(write).toHaveBeenCalledWith('/ip/firewall/address-list/remove', ['=.id=*7']);
  });

  it('refuses anything that is not a plain IPv4 address', async () => {
    await expect(service.unblockAddress('device-1', '10.20.0.15/24')).rejects.toThrow(
      BadRequestException,
    );
    await expect(service.blockAddress('device-1', '1.2.3.4 =list=x', 'x')).rejects.toThrow(
      BadRequestException,
    );
    expect(write).not.toHaveBeenCalled();
  });
});
