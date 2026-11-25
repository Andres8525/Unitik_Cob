import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';

/** HU-01: new clients must replace the document-id password on first login. */
export class ChangePasswordDto {
  @ApiProperty({ description: 'Contraseña actual' })
  @IsString()
  @IsNotEmpty({ message: 'La contraseña actual es obligatoria' })
  currentPassword!: string;

  @ApiProperty({ description: 'Nueva contraseña: mínimo 8 caracteres con letras y números' })
  @IsString()
  @MinLength(8, { message: 'La nueva contraseña debe tener al menos 8 caracteres' })
  @MaxLength(72, { message: 'La nueva contraseña no puede superar 72 caracteres' })
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, {
    message: 'La nueva contraseña debe combinar letras y números',
  })
  newPassword!: string;
}
