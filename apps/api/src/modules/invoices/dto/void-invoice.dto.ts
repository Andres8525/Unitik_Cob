import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

/** HU-05: only the administrator voids an issued invoice, always with a reason. */
export class VoidInvoiceDto {
  @ApiProperty({ description: 'Motivo de la anulación', example: 'Factura duplicada' })
  @IsString()
  @MinLength(5, { message: 'Describe el motivo de la anulación (mínimo 5 caracteres)' })
  @MaxLength(300)
  reason!: string;
}
