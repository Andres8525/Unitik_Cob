import { ApiProperty } from '@nestjs/swagger';
import { FilePurpose } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UploadFileDto {
  @ApiProperty({ enum: FilePurpose })
  @IsEnum(FilePurpose, { message: 'Tipo de archivo inválido' })
  purpose!: FilePurpose;
}
