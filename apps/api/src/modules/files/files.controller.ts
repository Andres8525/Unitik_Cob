import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { AuthenticatedUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { UploadFileDto } from './dto/upload-file.dto';
import { FilesService, MAX_UPLOAD_BYTES, StoredFileSummary } from './files.service';

@ApiTags('files')
@ApiBearerAuth()
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post()
  @UseInterceptors(
    // One extra byte lets the service answer with a clear 413 message instead of multer's generic error.
    FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_BYTES + 1, files: 1 } }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'purpose'],
      properties: {
        file: { type: 'string', format: 'binary' },
        purpose: {
          type: 'string',
          enum: ['INSTALLATION_SITE', 'INSTALLATION_EQUIPMENT', 'PAYMENT_PROOF', 'PROMOTION'],
        },
      },
    },
  })
  @ApiOperation({ summary: 'Subir imagen (acta, comprobante o publicidad) — máx. 5 MB' })
  upload(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: UploadFileDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<StoredFileSummary> {
    return this.filesService.store(file, dto.purpose, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Descargar un archivo según los permisos del rol' })
  async download(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res() response: Response,
  ): Promise<void> {
    const file = await this.filesService.read(id, user);
    response.setHeader('Content-Type', file.mimeType);
    response.setHeader('Content-Length', String(file.sizeBytes));
    response.setHeader('Cache-Control', 'private, max-age=3600');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(file.originalName)}"`,
    );
    response.end(Buffer.from(file.data));
  }
}
