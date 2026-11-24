import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Request } from 'express';
import { Audited } from '../../common/decorators/audited.decorator';
import { AuthenticatedUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CreatePromotionDto, UpdatePromotionDto } from './dto/create-promotion.dto';
import { PromotionsService, PromotionView } from './promotions.service';

@ApiTags('promotions')
@ApiBearerAuth()
@Controller('promotions')
export class PromotionsController {
  constructor(private readonly promotionsService: PromotionsService) {}

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Publicidad: todas las promociones (solo ADMIN)' })
  findAll(): Promise<PromotionView[]> {
    return this.promotionsService.findAll();
  }

  @Get('active')
  @ApiOperation({ summary: 'Promociones vigentes para el portal del cliente (cualquier usuario)' })
  findActive(): Promise<PromotionView[]> {
    return this.promotionsService.findActive();
  }

  @Post()
  @Roles(Role.ADMIN)
  @Audited({ entity: 'Promotion' })
  @ApiOperation({ summary: 'Publicar una oferta o imagen para los clientes' })
  create(
    @Body() dto: CreatePromotionDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PromotionView> {
    return this.promotionsService.create(dto, user);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @Audited({ entity: 'Promotion' })
  @ApiOperation({ summary: 'Editar, activar o pausar una promoción' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePromotionDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request & { auditOldValues?: unknown },
  ): Promise<PromotionView> {
    const { promotion, previous } = await this.promotionsService.update(id, dto, user);
    request.auditOldValues = previous;
    return promotion;
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @Audited({ entity: 'Promotion' })
  @ApiOperation({ summary: 'Eliminar una promoción' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: Request & { auditOldValues?: unknown },
  ): Promise<{ deleted: true }> {
    request.auditOldValues = await this.promotionsService.remove(id);
    return { deleted: true };
  }
}
