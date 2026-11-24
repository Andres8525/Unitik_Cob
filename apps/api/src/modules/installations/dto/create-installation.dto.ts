import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ServiceType } from '@prisma/client';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIP,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  IsUrl,
  Length,
  Matches,
} from 'class-validator';

export class CreateInstallationDto {
  @ApiProperty()
  @IsUUID('4')
  clientId!: string;

  @ApiProperty({ description: 'RouterBoard o dispositivo de red donde se registra el acceso' })
  @IsUUID('4')
  deviceId!: string;

  @ApiProperty({ example: 'AA:BB:CC:DD:EE:FF' })
  @IsString()
  @Matches(/^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/, {
    message: 'La dirección MAC debe tener formato XX:XX:XX:XX:XX:XX',
  })
  macAddress!: string;

  @ApiProperty({
    description: 'Número de serie del equipo instalado (CPE)',
    example: 'HG8145V5-48575443A1B2',
  })
  @IsString()
  @Length(4, 60, { message: 'El serial debe tener entre 4 y 60 caracteres' })
  @Matches(/^[A-Za-z0-9._/-]+$/, {
    message: 'El serial solo admite letras, números, punto, guion y barra',
  })
  equipmentSerial!: string;

  @ApiProperty({ example: '192.168.10.25' })
  @IsIP('4', { message: 'La dirección IPv4 no es válida' })
  ipAddress!: string;

  @ApiProperty({ enum: ServiceType })
  @IsEnum(ServiceType)
  serviceType!: ServiceType;

  @ApiPropertyOptional({ description: 'Metros de cable usados (radio enlace)', example: 35.5 })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  cableMeters?: number;

  @ApiProperty({
    description: 'Equipos usados',
    example: [{ item: 'Antena LiteBeam', quantity: 1 }],
  })
  @IsArray()
  equipmentList!: Array<{ item: string; quantity: number }>;

  @ApiPropertyOptional({ description: 'El cliente pagó equipos adicionales', default: false })
  @IsOptional()
  @IsBoolean()
  clientPaidEquipment?: boolean;

  @ApiPropertyOptional({
    description: 'La instalación requiere costos adicionales de equipo/cableado',
  })
  @IsOptional()
  @IsBoolean()
  aplicarCostosExtra?: boolean;

  @ApiPropertyOptional({ example: 'Señal -58 dBm; se fijó mástil de 3 m' })
  @IsOptional()
  @IsString()
  observations?: string;

  @ApiProperty({ example: '2026-07-07' })
  @IsDateString()
  installationDate!: string;

  @ApiPropertyOptional({
    description: 'Id del archivo (POST /files, INSTALLATION_SITE) con la foto de la instalación',
  })
  @IsOptional()
  @IsUUID('4', { message: 'La foto de la instalación no es válida' })
  sitePhotoId?: string;

  @ApiPropertyOptional({
    description: 'Id del archivo (POST /files, INSTALLATION_EQUIPMENT) con la foto del equipo',
  })
  @IsOptional()
  @IsUUID('4', { message: 'La foto del equipo no es válida' })
  equipmentPhotoId?: string;

  @ApiPropertyOptional({ description: 'URL de la firma digital del cliente' })
  @IsOptional()
  @IsUrl()
  signedUrl?: string;
}
