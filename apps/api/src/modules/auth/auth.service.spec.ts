import { BadRequestException, HttpException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuthService, MAX_FAILED_LOGINS } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: JwtService;

  const prismaMock = {
    user: { findFirst: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
  };
  const auditMock = { record: jest.fn() };
  const meta = { ipAddress: '127.0.0.1', userAgent: 'jest' };

  const buildUser = async () => ({
    id: 'user-1',
    documentId: '1085123456',
    firstName: 'Admin',
    lastName: 'UNITIK',
    email: 'admin@unitik.com.co',
    phone: '3000000000',
    passwordHash: await bcrypt.hash('Admin123*', 4),
    role: Role.ADMIN,
    isActive: true,
    failedLoginAttempts: 0,
    lockedUntil: null as Date | null,
    mustChangePassword: false,
    passwordChangedAt: null as Date | null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: new JwtService({ secret: 'test-secret', signOptions: { expiresIn: '15m' } }),
        },
        {
          provide: ConfigService,
          useValue: { get: (_key: string, fallback: string) => fallback },
        },
        { provide: PrismaService, useValue: prismaMock },
        { provide: AuditService, useValue: auditMock },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
    jwtService = moduleRef.get(JwtService);
    jest.clearAllMocks();
  });

  it('logs in with valid credentials, audits LOGIN and returns both tokens', async () => {
    prismaMock.user.findFirst.mockResolvedValueOnce(await buildUser());

    const result = await service.login('admin@unitik.com.co', 'Admin123*', meta);

    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).toBeDefined();
    expect(result.user.email).toBe('admin@unitik.com.co');
    expect(auditMock.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'LOGIN', entity: 'User', userId: 'user-1' }),
    );
  });

  it('rejects wrong password and audits LOGIN_FAILED', async () => {
    prismaMock.user.findFirst.mockResolvedValueOnce(await buildUser());

    await expect(service.login('admin@unitik.com.co', 'incorrecta1', meta)).rejects.toThrow(
      UnauthorizedException,
    );
    expect(auditMock.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'LOGIN_FAILED' }),
    );
  });

  it('counts a failed attempt without locking before the limit', async () => {
    prismaMock.user.findFirst.mockResolvedValueOnce({
      ...(await buildUser()),
      failedLoginAttempts: 1,
    });

    await expect(service.login('admin@unitik.com.co', 'incorrecta1', meta)).rejects.toThrow(
      UnauthorizedException,
    );
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { failedLoginAttempts: 2 },
    });
  });

  it(`locks the account on the ${MAX_FAILED_LOGINS}th failed attempt (HU-01)`, async () => {
    prismaMock.user.findFirst.mockResolvedValueOnce({
      ...(await buildUser()),
      failedLoginAttempts: MAX_FAILED_LOGINS - 1,
    });

    const error = await service.login('admin@unitik.com.co', 'incorrecta1', meta).catch((e) => e);

    expect(error).toBeInstanceOf(HttpException);
    expect((error as HttpException).getStatus()).toBe(423);
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { failedLoginAttempts: 0, lockedUntil: expect.any(Date) },
    });
    expect(auditMock.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'ACCOUNT_LOCKED', userId: 'user-1' }),
    );
  });

  it('rejects even the right password while the lock is active', async () => {
    prismaMock.user.findFirst.mockResolvedValueOnce({
      ...(await buildUser()),
      lockedUntil: new Date(Date.now() + 10 * 60_000),
    });

    const error = await service.login('admin@unitik.com.co', 'Admin123*', meta).catch((e) => e);

    expect((error as HttpException).getStatus()).toBe(423);
    expect(auditMock.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'LOGIN_BLOCKED' }),
    );
  });

  it('clears the failed counter after a successful login', async () => {
    prismaMock.user.findFirst.mockResolvedValueOnce({
      ...(await buildUser()),
      failedLoginAttempts: 3,
      lockedUntil: new Date(Date.now() - 60_000),
    });

    await service.login('admin@unitik.com.co', 'Admin123*', meta);

    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });
  });

  it('refreshes tokens for an active user with a valid refresh token', async () => {
    const user = await buildUser();
    prismaMock.user.findUnique.mockResolvedValueOnce(user);
    const refreshToken = await jwtService.signAsync(
      { sub: user.id, tokenType: 'refresh' },
      { secret: 'change-me-refresh-secret' },
    );

    const result = await service.refresh(refreshToken, meta);

    expect(result.accessToken).toBeDefined();
    expect(auditMock.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'TOKEN_REFRESH' }),
    );
  });

  it('rejects an access token used as refresh token', async () => {
    const accessLikeToken = await jwtService.signAsync(
      { sub: 'user-1', tokenType: 'access' },
      { secret: 'change-me-refresh-secret' },
    );
    await expect(service.refresh(accessLikeToken, meta)).rejects.toThrow(UnauthorizedException);
  });

  it('rejects refresh for a deactivated user', async () => {
    const user = await buildUser();
    prismaMock.user.findUnique.mockResolvedValueOnce({ ...user, isActive: false });
    const refreshToken = await jwtService.signAsync(
      { sub: user.id, tokenType: 'refresh' },
      { secret: 'change-me-refresh-secret' },
    );
    await expect(service.refresh(refreshToken, meta)).rejects.toThrow(UnauthorizedException);
  });

  it('audits LOGOUT for the current user (HU-02)', async () => {
    await expect(service.logout('user-1', meta)).resolves.toEqual({ loggedOut: true });
    expect(auditMock.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'LOGOUT', userId: 'user-1', ipAddress: '127.0.0.1' }),
    );
  });

  describe('changePassword (HU-01 first login)', () => {
    it('replaces the password, clears the flag and audits PASSWORD_CHANGED', async () => {
      prismaMock.user.findUnique.mockResolvedValueOnce({
        ...(await buildUser()),
        mustChangePassword: true,
      });

      await expect(
        service.changePassword(
          'user-1',
          { currentPassword: 'Admin123*', newPassword: 'Nueva2026x' },
          meta,
        ),
      ).resolves.toEqual({ changed: true });

      const update = prismaMock.user.update.mock.calls[0][0];
      expect(update.data.mustChangePassword).toBe(false);
      expect(update.data.passwordChangedAt).toBeInstanceOf(Date);
      expect(await bcrypt.compare('Nueva2026x', update.data.passwordHash)).toBe(true);
      expect(auditMock.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'PASSWORD_CHANGED', newValues: { forced: true } }),
      );
    });

    it('rejects a wrong current password', async () => {
      prismaMock.user.findUnique.mockResolvedValueOnce(await buildUser());
      await expect(
        service.changePassword(
          'user-1',
          { currentPassword: 'otra1234', newPassword: 'Nueva2026x' },
          meta,
        ),
      ).rejects.toThrow(BadRequestException);
      expect(prismaMock.user.update).not.toHaveBeenCalled();
    });

    it('does not accept the document id as the new password', async () => {
      prismaMock.user.findUnique.mockResolvedValueOnce({
        ...(await buildUser()),
        passwordHash: await bcrypt.hash('1085123456', 4),
      });
      await expect(
        service.changePassword(
          'user-1',
          { currentPassword: '1085123456', newPassword: '1085123456' },
          meta,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
