import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { FilePurpose, Role, StoredFile } from '@prisma/client';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/** MIME types accepted per purpose (proofs may also be PDF bank statements). */
export const ALLOWED_TYPES: Record<FilePurpose, string[]> = {
  INSTALLATION_SITE: IMAGE_TYPES,
  INSTALLATION_EQUIPMENT: IMAGE_TYPES,
  PAYMENT_PROOF: [...IMAGE_TYPES, 'application/pdf'],
  PROMOTION: IMAGE_TYPES,
};

/** Roles allowed to upload each kind of file. */
export const UPLOAD_ROLES: Record<FilePurpose, Role[]> = {
  INSTALLATION_SITE: [Role.TECHNICIAN, Role.ADMIN],
  INSTALLATION_EQUIPMENT: [Role.TECHNICIAN, Role.ADMIN],
  PAYMENT_PROOF: [Role.CLIENT, Role.ADMIN],
  PROMOTION: [Role.ADMIN],
};

/** Roles that may read any file of a purpose (uploaders can always read their own files). */
const READ_ROLES: Record<FilePurpose, Role[] | 'ANY'> = {
  INSTALLATION_SITE: [Role.ADMIN, Role.TECHNICIAN],
  INSTALLATION_EQUIPMENT: [Role.ADMIN, Role.TECHNICIAN],
  PAYMENT_PROOF: [Role.ADMIN],
  PROMOTION: 'ANY',
};

export interface UploadedFileInput {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export type StoredFileSummary = Omit<StoredFile, 'data'> & { url: string };

/**
 * Detects the real type from the file signature so a renamed executable
 * cannot be stored as an "image" just by changing its declared MIME type.
 */
export function detectMimeType(buffer: Buffer): string | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }
  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return 'image/png';
  }
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'image/webp';
  }
  if (buffer.length >= 5 && buffer.subarray(0, 5).toString('ascii') === '%PDF-') {
    return 'application/pdf';
  }
  return null;
}

export function fileUrl(id: string): string {
  return `/api/files/${id}`;
}

@Injectable()
export class FilesService {
  constructor(private readonly prisma: PrismaService) {}

  async store(
    file: UploadedFileInput | undefined,
    purpose: FilePurpose,
    user: AuthenticatedUser,
  ): Promise<StoredFileSummary> {
    if (!UPLOAD_ROLES[purpose].includes(user.role)) {
      throw new ForbiddenException('Tu rol no puede subir este tipo de archivo');
    }
    if (!file || file.size === 0) throw new BadRequestException('Adjunta un archivo');
    if (file.size > MAX_UPLOAD_BYTES) {
      throw new PayloadTooLargeException('El archivo debe pesar 5 MB o menos');
    }

    const detected = detectMimeType(file.buffer);
    if (!detected || !ALLOWED_TYPES[purpose].includes(detected)) {
      throw new BadRequestException(
        purpose === FilePurpose.PAYMENT_PROOF
          ? 'El comprobante debe ser una imagen JPG, PNG, WEBP o un PDF'
          : 'La imagen debe estar en formato JPG, PNG o WEBP',
      );
    }

    const stored = await this.prisma.storedFile.create({
      data: {
        purpose,
        originalName: file.originalname.slice(0, 200),
        mimeType: detected,
        sizeBytes: file.size,
        data: file.buffer,
        uploadedById: user.id,
      },
      select: {
        id: true,
        purpose: true,
        originalName: true,
        mimeType: true,
        sizeBytes: true,
        uploadedById: true,
        createdAt: true,
      },
    });
    return { ...stored, url: fileUrl(stored.id) };
  }

  /** Ensures a referenced file exists, has the expected purpose and belongs to the caller. */
  async assertOwnedFile(id: string, purpose: FilePurpose, user: AuthenticatedUser): Promise<void> {
    const file = await this.prisma.storedFile.findUnique({
      where: { id },
      select: { purpose: true, uploadedById: true },
    });
    if (!file || file.purpose !== purpose) {
      throw new BadRequestException(
        'El archivo adjunto no existe o no corresponde a este registro',
      );
    }
    if (file.uploadedById !== user.id && user.role !== Role.ADMIN) {
      throw new ForbiddenException('Solo puedes adjuntar archivos que subiste tú');
    }
  }

  canRead(file: Pick<StoredFile, 'purpose' | 'uploadedById'>, user: AuthenticatedUser): boolean {
    if (file.uploadedById === user.id) return true;
    const allowed = READ_ROLES[file.purpose];
    return allowed === 'ANY' || allowed.includes(user.role);
  }

  async read(id: string, user: AuthenticatedUser): Promise<StoredFile> {
    const file = await this.prisma.storedFile.findUnique({ where: { id } });
    if (!file) throw new NotFoundException('Archivo no encontrado');
    if (!this.canRead(file, user)) throw new ForbiddenException('No tienes acceso a este archivo');
    return file;
  }
}
