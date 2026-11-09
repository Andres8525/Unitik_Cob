import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class RegisterCashPaymentDto {
  @ApiProperty({ description: 'Factura a pagar completamente en efectivo' })
  @IsUUID('4', { message: 'invoiceId debe ser un UUID válido' })
  invoiceId!: string;
}
