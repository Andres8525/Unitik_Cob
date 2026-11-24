import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseEnumPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Payment, PaymentStatus, Role } from '@prisma/client';
import { Request } from 'express';
import { Audited } from '../../common/decorators/audited.decorator';
import { AuthenticatedUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RegisterCashPaymentDto } from './dto/register-cash-payment.dto';
import { RegisterPaymentDto } from './dto/register-payment.dto';
import { ValidatePaymentDto } from './dto/validate-payment.dto';
import { PaymentsService } from './payments.service';
import { WompiEvent, WompiService } from './wompi.service';

@ApiTags('payments')
@ApiBearerAuth()
@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly wompiService: WompiService,
  ) {}

  @Public()
  @Post('webhook/wompi')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Webhook de Wompi (firma verificada; única vía de auto-validación)' })
  async wompiWebhook(@Body() event: WompiEvent): Promise<{ processed: boolean }> {
    if (!this.wompiService.verifySignature(event)) {
      throw new ForbiddenException('Firma del evento inválida');
    }
    return this.paymentsService.processWompiEvent(event);
  }

  @Post()
  @Roles(Role.ADMIN, Role.CASHIER, Role.CLIENT)
  @Audited({ entity: 'Payment' })
  @ApiOperation({ summary: 'Registrar un pago (queda pendiente de validación)' })
  register(
    @Body() dto: RegisterPaymentDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Payment> {
    return this.paymentsService.register(dto, user);
  }

  @Post('cash')
  @Roles(Role.CASHIER)
  @ApiOperation({
    summary: 'Registrar y validar un pago total en efectivo (solo cajero; encola reconexión)',
  })
  registerCash(
    @Body() dto: RegisterCashPaymentDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Payment> {
    return this.paymentsService.registerCash(dto.invoiceId, user);
  }

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Gestión de Pagos: comprobantes Nequi/transferencia por estado' })
  @ApiQuery({ name: 'status', enum: PaymentStatus, required: false })
  listForReview(
    @Query('status', new ParseEnumPipe(PaymentStatus, { optional: true })) status?: PaymentStatus,
  ) {
    return this.paymentsService.listForReview(status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consultar un pago' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Payment> {
    return this.paymentsService.findOne(id);
  }

  @Patch(':id/validate')
  @Roles(Role.ADMIN)
  @Audited({ entity: 'Payment', action: 'VALIDATION' })
  @ApiOperation({
    summary:
      'Gestión de Pagos: el administrador aprueba o rechaza el comprobante (al aprobar se encola la reconexión)',
  })
  async validate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ValidatePaymentDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request & { auditOldValues?: unknown },
  ): Promise<Payment> {
    const { payment, previous } = await this.paymentsService.validate(id, dto, user);
    request.auditOldValues = previous;
    return payment;
  }
}
