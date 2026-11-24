import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Audited } from '../../common/decorators/audited.decorator';
import { AuthenticatedUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CashierService, CashReceipt, DailyClose } from './cashier.service';
import { ReceiveCashDto } from './dto/receive-cash.dto';
import { ReceiptEmailResult, ReceiptsService } from './receipts.service';

@ApiTags('cashier')
@ApiBearerAuth()
@Roles(Role.CASHIER, Role.ADMIN)
@Controller('cashier')
export class CashierController {
  constructor(
    private readonly cashierService: CashierService,
    private readonly receiptsService: ReceiptsService,
  ) {}

  @Post('payments')
  @Audited({ entity: 'Payment', action: 'CASH_RECEIVED' })
  @ApiOperation({ summary: 'Recibir pago en efectivo (valida al instante y genera recibo)' })
  receiveCash(
    @Body() dto: ReceiveCashDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CashReceipt> {
    return this.cashierService.receiveCash(dto, user);
  }

  @Get('daily-close')
  @ApiOperation({ summary: 'Cierre de caja del día (recaudo del cajero autenticado)' })
  @ApiQuery({ name: 'date', required: false, description: 'YYYY-MM-DD; por defecto hoy' })
  dailyClose(
    @CurrentUser() user: AuthenticatedUser,
    @Query('date') date?: string,
  ): Promise<DailyClose> {
    return this.cashierService.dailyClose(user, date);
  }

  @Get('account-status/:clientId')
  @ApiOperation({ summary: 'Estado de cuenta de un cliente (deuda y últimos pagos)' })
  accountStatus(@Param('clientId', ParseUUIDPipe) clientId: string) {
    return this.cashierService.accountStatus(clientId);
  }

  @Get('receipts/:paymentId/pdf')
  @ApiOperation({ summary: 'Descargar el recibo de un pago validado (PDF)' })
  async receiptPdf(
    @Param('paymentId', ParseUUIDPipe) paymentId: string,
    @Res() response: Response,
  ): Promise<void> {
    const { receipt, pdf } = await this.receiptsService.renderPdf(paymentId);
    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader('Content-Length', String(pdf.length));
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${receipt.receiptNumber}.pdf"`,
    );
    response.setHeader('Cache-Control', 'private, no-store');
    response.end(pdf);
  }

  @Post('receipts/:paymentId/email')
  @Audited({ entity: 'Payment', action: 'RECEIPT_EMAILED' })
  @ApiOperation({ summary: 'Enviar el recibo en PDF al correo registrado del cliente' })
  emailReceipt(@Param('paymentId', ParseUUIDPipe) paymentId: string): Promise<ReceiptEmailResult> {
    return this.receiptsService.emailToClient(paymentId);
  }
}
