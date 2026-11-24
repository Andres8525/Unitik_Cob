import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export const PAYMENT_ACCOUNT_METHODS = ['NEQUI', 'BANK_TRANSFER'] as const;
export const BANK_ACCOUNT_TYPES = ['AHORROS', 'CORRIENTE'] as const;

export class PaymentAccountDto {
  @ApiProperty({ enum: PAYMENT_ACCOUNT_METHODS })
  @IsIn(PAYMENT_ACCOUNT_METHODS, { message: 'El medio debe ser NEQUI o BANK_TRANSFER' })
  method!: (typeof PAYMENT_ACCOUNT_METHODS)[number];

  @ApiProperty({ example: 'Bancolombia' })
  @IsString()
  @IsNotEmpty({ message: 'Indica el banco o la billetera' })
  @MaxLength(60)
  bank!: string;

  @ApiPropertyOptional({ enum: BANK_ACCOUNT_TYPES })
  @IsOptional()
  @IsIn(BANK_ACCOUNT_TYPES, { message: 'El tipo de cuenta debe ser AHORROS o CORRIENTE' })
  accountType?: (typeof BANK_ACCOUNT_TYPES)[number];

  @ApiProperty({ example: '000-000000-00', description: 'Número de cuenta o celular Nequi' })
  @IsString()
  @Matches(/^[0-9 -]{6,30}$/, {
    message: 'El número de cuenta solo admite dígitos, espacios y guiones',
  })
  accountNumber!: string;

  @ApiProperty({ example: 'UNITIK Internet Sin Límite S.A.S.' })
  @IsString()
  @IsNotEmpty({ message: 'Indica el titular de la cuenta' })
  @MaxLength(100)
  holderName!: string;

  @ApiPropertyOptional({ example: 'NIT 900.000.000-0' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  holderDocument?: string;

  @ApiPropertyOptional({ example: 'Usa tu código de cliente como referencia' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  instructions?: string;
}

export class UpdatePaymentAccountsDto {
  @ApiProperty({ type: [PaymentAccountDto] })
  @IsArray()
  @ArrayMaxSize(6, { message: 'Registra máximo 6 cuentas de recaudo' })
  @ValidateNested({ each: true })
  @Type(() => PaymentAccountDto)
  accounts!: PaymentAccountDto[];
}
