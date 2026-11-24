import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { FilePurpose, Promotion } from '@prisma/client';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { FilesService, fileUrl } from '../files/files.service';
import { CreatePromotionDto, UpdatePromotionDto } from './dto/create-promotion.dto';

export type PromotionView = Promotion & { imageUrl: string | null };

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** Date-only values cover the whole day in Bogotá (UTC-5): start at 00:00, end at 23:59:59. */
export function startOfWindow(value: string): Date {
  return new Date(DATE_ONLY.test(value) ? `${value}T00:00:00-05:00` : value);
}

export function endOfWindow(value: string): Date {
  return new Date(DATE_ONLY.test(value) ? `${value}T23:59:59.999-05:00` : value);
}

function toView(promotion: Promotion): PromotionView {
  return { ...promotion, imageUrl: promotion.imageFileId ? fileUrl(promotion.imageFileId) : null };
}

/** Offers and banners administrators publish in the client portal. */
@Injectable()
export class PromotionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly filesService: FilesService,
  ) {}

  async findAll(): Promise<PromotionView[]> {
    const promotions = await this.prisma.promotion.findMany({ orderBy: { createdAt: 'desc' } });
    return promotions.map(toView);
  }

  /** Promotions visible to clients right now: active and inside their validity window. */
  async findActive(now = new Date()): Promise<PromotionView[]> {
    const promotions = await this.prisma.promotion.findMany({
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
    return promotions.map(toView);
  }

  async create(dto: CreatePromotionDto, user: AuthenticatedUser): Promise<PromotionView> {
    this.assertWindow(dto.startsAt, dto.endsAt);
    if (dto.imageFileId) {
      await this.filesService.assertOwnedFile(dto.imageFileId, FilePurpose.PROMOTION, user);
    }
    const promotion = await this.prisma.promotion.create({
      data: {
        title: dto.title.trim(),
        description: dto.description.trim(),
        imageFileId: dto.imageFileId,
        startsAt: dto.startsAt ? startOfWindow(dto.startsAt) : null,
        endsAt: dto.endsAt ? endOfWindow(dto.endsAt) : null,
        isActive: dto.isActive ?? true,
        createdById: user.id,
      },
    });
    return toView(promotion);
  }

  async update(
    id: string,
    dto: UpdatePromotionDto,
    user: AuthenticatedUser,
  ): Promise<{ promotion: PromotionView; previous: Promotion }> {
    const previous = await this.prisma.promotion.findUnique({ where: { id } });
    if (!previous) throw new NotFoundException('Promoción no encontrada');
    this.assertWindow(
      dto.startsAt ?? previous.startsAt?.toISOString(),
      dto.endsAt ?? previous.endsAt?.toISOString(),
    );
    if (dto.imageFileId) {
      await this.filesService.assertOwnedFile(dto.imageFileId, FilePurpose.PROMOTION, user);
    }
    const promotion = await this.prisma.promotion.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(dto.description !== undefined ? { description: dto.description.trim() } : {}),
        ...(dto.imageFileId !== undefined ? { imageFileId: dto.imageFileId } : {}),
        ...(dto.startsAt !== undefined ? { startsAt: startOfWindow(dto.startsAt) } : {}),
        ...(dto.endsAt !== undefined ? { endsAt: endOfWindow(dto.endsAt) } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
    return { promotion: toView(promotion), previous };
  }

  async remove(id: string): Promise<Promotion> {
    const previous = await this.prisma.promotion.findUnique({ where: { id } });
    if (!previous) throw new NotFoundException('Promoción no encontrada');
    await this.prisma.promotion.delete({ where: { id } });
    return previous;
  }

  private assertWindow(startsAt?: string, endsAt?: string): void {
    if (startsAt && endsAt && endOfWindow(endsAt) < startOfWindow(startsAt)) {
      throw new BadRequestException('La fecha de fin debe ser posterior a la de inicio');
    }
  }
}
