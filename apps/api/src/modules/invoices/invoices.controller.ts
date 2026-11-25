import {
  Body,
  Controller,
  Get,
  BadRequestException,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Invoice, InvoiceStatus, Role } from '@prisma/client';
import { Request, Response } from 'express';
import { Audited } from '../../common/decorators/audited.decorator';
import { AuthenticatedUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { BillingService, PortfolioSummary } from './billing.service';
import { ApplyDiscountDto } from './dto/apply-discount.dto';
import { VoidInvoiceDto } from './dto/void-invoice.dto';
import { invoicesToCsv } from './invoices-csv';

@ApiTags('invoices')
@ApiBearerAuth()
@Controller('invoices')
export class InvoicesController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly billingService: BillingService,
  ) {}

  @Get('my')
  @Roles(Role.CLIENT)
  @ApiOperation({ summary: 'Mis facturas con estado y fecha límite (portal cliente)' })
  async my(@CurrentUser() user: AuthenticatedUser): Promise<Invoice[]> {
    const client = await this.prisma.client.findUnique({ where: { userId: user.id } });
    if (!client) throw new NotFoundException('El usuario no tiene un cliente asociado');
    return this.prisma.invoice.findMany({
      where: { clientId: client.id },
      orderBy: { issueDate: 'desc' },
    });
  }

  @Get('portfolio')
  @Roles(Role.ADMIN, Role.CASHIER)
  @ApiOperation({ summary: 'Cartera y morosidad (totales y ranking de morosos)' })
  portfolio(): Promise<PortfolioSummary> {
    return this.billingService.portfolio();
  }

  @Get('export')
  @Roles(Role.ADMIN)
  @Audited({ entity: 'Invoice', action: 'EXPORT', omitResponse: true })
  @ApiOperation({ summary: 'Exportar en CSV las facturas de un período (HU-05)' })
  @ApiQuery({ name: 'period', required: true, description: 'YYYY-MM' })
  async export(
    @Query('period') period: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<string> {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period ?? '')) {
      throw new BadRequestException('El período debe tener el formato YYYY-MM');
    }
    const invoices = await this.prisma.invoice.findMany({
      where: { period },
      include: { client: { include: { user: true } } },
      orderBy: { invoiceNumber: 'asc' },
    });
    response.setHeader('Content-Type', 'text/csv; charset=utf-8');
    response.setHeader('Content-Disposition', `attachment; filename="facturas-${period}.csv"`);
    return invoicesToCsv(
      invoices.map((invoice) => ({
        invoiceNumber: invoice.invoiceNumber,
        clientCode: invoice.client.clientCode,
        clientName: `${invoice.client.user.firstName} ${invoice.client.user.lastName}`,
        documentId: invoice.client.user.documentId,
        period: invoice.period,
        issueDate: invoice.issueDate,
        dueDate: invoice.dueDate,
        subtotal: Number(invoice.subtotal),
        interest: Number(invoice.interest),
        discount: Number(invoice.discount),
        total: Number(invoice.total),
        status: invoice.status,
        electronicInvoiceCufe: invoice.electronicInvoiceCufe,
      })),
    );
  }

  @Get()
  @Roles(Role.ADMIN, Role.CASHIER)
  @ApiOperation({ summary: 'Facturas por cliente y estado' })
  @ApiQuery({ name: 'clientId', required: false })
  @ApiQuery({ name: 'status', enum: InvoiceStatus, required: false })
  findAll(
    @Query('clientId') clientId?: string,
    @Query('status') status?: InvoiceStatus,
  ): Promise<Invoice[]> {
    return this.prisma.invoice.findMany({
      where: { ...(clientId ? { clientId } : {}), ...(status ? { status } : {}) },
      orderBy: { issueDate: 'desc' },
      take: 200,
    });
  }

  @Post('generate')
  @Roles(Role.ADMIN)
  @Audited({ entity: 'Invoice', action: 'GENERATE_MONTHLY' })
  @ApiOperation({
    summary: 'Generar facturación del período (el cron del día 1 lo hace automático)',
  })
  @ApiQuery({ name: 'period', required: false, description: 'YYYY-MM; por defecto el actual' })
  generate(@Query('period') period?: string): Promise<{ created: number }> {
    return this.billingService.generateMonthlyInvoices(period);
  }

  @Patch(':id/discount')
  @Roles(Role.ADMIN)
  @Audited({ entity: 'Invoice', action: 'DISCOUNT' })
  @ApiOperation({ summary: 'Aprobar descuento con motivo (solo ADMIN, auditado)' })
  async discount(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApplyDiscountDto,
    @Req() request: Request & { auditOldValues?: unknown },
  ): Promise<Invoice> {
    const { invoice, previous } = await this.billingService.applyDiscount(
      id,
      dto.amount,
      dto.reason,
    );
    request.auditOldValues = {
      total: Number(previous.total),
      discount: Number(previous.discount),
      reason: dto.reason,
    };
    return invoice;
  }

  @Patch(':id/void')
  @Roles(Role.ADMIN)
  @Audited({ entity: 'Invoice', action: 'VOID' })
  @ApiOperation({ summary: 'Anular factura emitida con motivo (solo ADMIN, HU-05, auditado)' })
  async voidInvoice(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: VoidInvoiceDto,
    @Req() request: Request & { auditOldValues?: unknown },
  ): Promise<Invoice> {
    const { invoice, previous } = await this.billingService.voidInvoice(id);
    request.auditOldValues = { status: previous.status, reason: dto.reason };
    return invoice;
  }
}
