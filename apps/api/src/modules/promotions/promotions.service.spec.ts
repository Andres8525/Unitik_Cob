import { BadRequestException, NotFoundException } from '@nestjs/common';
import { FilePurpose, Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { FilesService } from '../files/files.service';
import { endOfWindow, PromotionsService, startOfWindow } from './promotions.service';

const admin = { id: 'admin-1', email: 'admin@example.com', role: Role.ADMIN };

describe('PromotionsService', () => {
  const prismaMock = {
    promotion: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };
  const filesMock = { assertOwnedFile: jest.fn() };
  const service = new PromotionsService(
    prismaMock as unknown as PrismaService,
    filesMock as unknown as FilesService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    prismaMock.promotion.create.mockImplementation(({ data }) =>
      Promise.resolve({ id: 'promo-1', ...data }),
    );
  });

  it('interprets date-only windows as whole days in Bogotá', () => {
    expect(startOfWindow('2026-12-01').toISOString()).toBe('2026-12-01T05:00:00.000Z');
    expect(endOfWindow('2026-12-31').toISOString()).toBe('2027-01-01T04:59:59.999Z');
  });

  it('creates a promotion with its banner and exposes the image URL', async () => {
    const imageFileId = '44444444-4444-4444-8444-444444444444';

    const promotion = await service.create(
      { title: ' Fibra 100 ', description: ' Descuento ', imageFileId, endsAt: '2026-12-31' },
      admin,
    );

    expect(filesMock.assertOwnedFile).toHaveBeenCalledWith(
      imageFileId,
      FilePurpose.PROMOTION,
      admin,
    );
    expect(prismaMock.promotion.create.mock.calls[0][0].data).toMatchObject({
      title: 'Fibra 100',
      description: 'Descuento',
      isActive: true,
      createdById: 'admin-1',
    });
    expect(promotion.imageUrl).toBe(`/api/files/${imageFileId}`);
  });

  it('rejects a window that ends before it starts', async () => {
    await expect(
      service.create(
        { title: 'X', description: 'Y', startsAt: '2026-12-10', endsAt: '2026-12-01' },
        admin,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prismaMock.promotion.create).not.toHaveBeenCalled();
  });

  it('only returns active promotions inside their validity window to clients', async () => {
    prismaMock.promotion.findMany.mockResolvedValueOnce([]);
    const now = new Date('2026-11-24T12:00:00Z');

    await service.findActive(now);

    expect(prismaMock.promotion.findMany).toHaveBeenCalledWith({
      where: {
        isActive: true,
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
  });

  it('pauses a promotion and returns the previous values for the audit trail', async () => {
    const previous = { id: 'promo-1', isActive: true, startsAt: null, endsAt: null };
    prismaMock.promotion.findUnique.mockResolvedValueOnce(previous);
    prismaMock.promotion.update.mockResolvedValueOnce({
      ...previous,
      isActive: false,
      imageFileId: null,
    });

    const result = await service.update('promo-1', { isActive: false }, admin);

    expect(prismaMock.promotion.update).toHaveBeenCalledWith({
      where: { id: 'promo-1' },
      data: { isActive: false },
    });
    expect(result.previous).toBe(previous);
    expect(result.promotion.isActive).toBe(false);
  });

  it('fails clearly when deleting an unknown promotion', async () => {
    prismaMock.promotion.findUnique.mockResolvedValueOnce(null);
    await expect(service.remove('missing')).rejects.toBeInstanceOf(NotFoundException);
  });
});
