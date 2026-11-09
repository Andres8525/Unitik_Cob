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

  @ApiPropertyOptional({ description: 'La instalación requiere costos adicionales de equipo/cableado' })
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

  @ApiPropertyOptional({ description: 'URL de la firma digital del cliente' })
  @IsOptional()
  @IsUrl()
  signedUrl?: string;
}
