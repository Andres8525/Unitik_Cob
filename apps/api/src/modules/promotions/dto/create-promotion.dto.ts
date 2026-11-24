import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreatePromotionDto {
  @ApiProperty({ example: 'Sube a 100 Megas este mes' })
  @IsString()
  @IsNotEmpty({ message: 'El título es obligatorio' })
  @MaxLength(80, { message: 'El título admite máximo 80 caracteres' })
  title!: string;

  @ApiProperty({ example: 'Pasa a Fibra 100 Megas y recibe el primer mes con descuento.' })
  @IsString()
  @IsNotEmpty({ message: 'La descripción es obligatoria' })
  @MaxLength(500, { message: 'La descripción admite máximo 500 caracteres' })
  description!: string;

  @ApiPropertyOptional({ description: 'Imagen subida con POST /files (purpose PROMOTION)' })
  @IsOptional()
  @IsUUID('4', { message: 'La imagen no es válida' })
  imageFileId?: string;

  @ApiPropertyOptional({ example: '2026-12-01' })
  @IsOptional()
  @IsDateString({}, { message: 'La fecha de inicio no es válida' })
  startsAt?: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional()
  @IsDateString({}, { message: 'La fecha de fin no es válida' })
  endsAt?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdatePromotionDto extends PartialType(CreatePromotionDto) {}
