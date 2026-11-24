import { BadRequestException, ForbiddenException, PayloadTooLargeException } from '@nestjs/common';
import { FilePurpose, Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { detectMimeType, FilesService, MAX_UPLOAD_BYTES } from './files.service';

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00]);
const PDF = Buffer.from('%PDF-1.7\n');

const technician = { id: 'tech-1', email: 't@unitik.co', role: Role.TECHNICIAN };
const client = { id: 'client-user-1', email: 'c@unitik.co', role: Role.CLIENT };
const admin = { id: 'admin-1', email: 'a@unitik.co', role: Role.ADMIN };

describe('FilesService', () => {
  const prismaMock = { storedFile: { create: jest.fn(), findUnique: jest.fn() } };
  const service = new FilesService(prismaMock as unknown as PrismaService);

  beforeEach(() => {
    jest.clearAllMocks();
    prismaMock.storedFile.create.mockImplementation(({ data }) =>
      Promise.resolve({ id: 'file-1', createdAt: new Date(), ...data, data: undefined }),
    );
  });

  it('detects file types from their signature', () => {
    expect(detectMimeType(PNG)).toBe('image/png');
    expect(detectMimeType(JPEG)).toBe('image/jpeg');
    expect(detectMimeType(PDF)).toBe('application/pdf');
    expect(detectMimeType(Buffer.from('MZ executable'))).toBeNull();
  });

  it('stores a technician installation photo using the detected MIME type', async () => {
    const result = await service.store(
      { originalname: 'poste.png', mimetype: 'image/jpeg', size: PNG.length, buffer: PNG },
      FilePurpose.INSTALLATION_SITE,
      technician,
    );

    expect(prismaMock.storedFile.create.mock.calls[0][0].data).toMatchObject({
      purpose: FilePurpose.INSTALLATION_SITE,
      mimeType: 'image/png',
      uploadedById: 'tech-1',
    });
    expect(result.url).toBe('/api/files/file-1');
  });

  it('rejects roles that cannot upload a purpose', async () => {
    await expect(
      service.store(
        { originalname: 'promo.png', mimetype: 'image/png', size: PNG.length, buffer: PNG },
        FilePurpose.PROMOTION,
        technician,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects disguised or oversized files', async () => {
    await expect(
      service.store(
        {
          originalname: 'virus.png',
          mimetype: 'image/png',
          size: 13,
          buffer: Buffer.from('MZ executable'),
        },
        FilePurpose.INSTALLATION_EQUIPMENT,
        technician,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.store(
        {
          originalname: 'big.jpg',
          mimetype: 'image/jpeg',
          size: MAX_UPLOAD_BYTES + 1,
          buffer: JPEG,
        },
        FilePurpose.PAYMENT_PROOF,
        client,
      ),
    ).rejects.toBeInstanceOf(PayloadTooLargeException);
  });

  it('accepts PDF only for payment proofs', async () => {
    await expect(
      service.store(
        {
          originalname: 'extracto.pdf',
          mimetype: 'application/pdf',
          size: PDF.length,
          buffer: PDF,
        },
        FilePurpose.PAYMENT_PROOF,
        client,
      ),
    ).resolves.toMatchObject({ mimeType: 'application/pdf' });
    await expect(
      service.store(
        { originalname: 'acta.pdf', mimetype: 'application/pdf', size: PDF.length, buffer: PDF },
        FilePurpose.INSTALLATION_SITE,
        technician,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('applies read rules: owner, admin and public promotions', () => {
    const proof = { purpose: FilePurpose.PAYMENT_PROOF, uploadedById: 'client-user-1' };
    expect(service.canRead(proof, client)).toBe(true);
    expect(service.canRead(proof, admin)).toBe(true);
    expect(service.canRead(proof, technician)).toBe(false);
    expect(
      service.canRead({ purpose: FilePurpose.PROMOTION, uploadedById: 'admin-1' }, client),
    ).toBe(true);
  });

  it('refuses to link files of another purpose or another user', async () => {
    prismaMock.storedFile.findUnique.mockResolvedValueOnce({
      purpose: FilePurpose.PROMOTION,
      uploadedById: 'client-user-1',
    });
    await expect(
      service.assertOwnedFile('f', FilePurpose.PAYMENT_PROOF, client),
    ).rejects.toBeInstanceOf(BadRequestException);

    prismaMock.storedFile.findUnique.mockResolvedValueOnce({
      purpose: FilePurpose.PAYMENT_PROOF,
      uploadedById: 'someone-else',
    });
    await expect(
      service.assertOwnedFile('f', FilePurpose.PAYMENT_PROOF, client),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
