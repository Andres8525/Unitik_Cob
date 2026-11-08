import { ApiProperty } from '@nestjs/swagger';
import { PaymentModality, ServiceType } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

const trimString = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class PublicClientRegistrationDto {
  @ApiProperty({ description: 'Cédula de ciudadanía', example: '1085123456' })
  @Transform(trimString)
  @Matches(/^\d{6,10}$/, { message: 'La cédula debe tener entre 6 y 10 dígitos' })
  documentId!: string;

  @ApiProperty({ example: 'Rosa' })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @MaxLength(100)
  firstName!: string;

  @ApiProperty({ example: 'Delgado' })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty({ message: 'El apellido es obligatorio' })
  @MaxLength(100)
  lastName!: string;

  @ApiProperty({ example: 'rosa@correo.com' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @ApiProperty({ description: 'Celular colombiano', example: '3151234567' })
  @Transform(trimString)
  @Matches(/^3\d{9}$/, { message: 'El celular debe tener 10 dígitos e iniciar en 3' })
  phone!: string;

  @ApiProperty({ description: 'Contraseña elegida para el portal', minLength: 8 })
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @MaxLength(72, { message: 'La contraseña no puede superar 72 caracteres' })
  password!: string;

  @ApiProperty({ example: 'Calle 3 # 4-21' })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty({ message: 'La dirección es obligatoria' })
  @MaxLength(255)
  address!: string;

  @ApiProperty({ enum: ServiceType, example: ServiceType.FIBER })
  @IsEnum(ServiceType, { message: 'Tipo de servicio inválido: FIBER o RADIO' })
  serviceType!: ServiceType;

  @ApiProperty({ enum: PaymentModality, example: PaymentModality.POSTPAID })
  @IsEnum(PaymentModality, { message: 'Modalidad inválida: PREPAID o POSTPAID' })
  paymentModality!: PaymentModality;
}
