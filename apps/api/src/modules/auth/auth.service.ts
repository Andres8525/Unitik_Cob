import {
  BadRequestException,
  HttpException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuthResult, JwtPayload, RefreshPayload, TokenPair } from './auth.types';
import { ChangePasswordDto } from './dto/change-password.dto';

/** HU-01: the account is locked after this many consecutive failed logins. */
export const MAX_FAILED_LOGINS = 5;
/** HU-01: how long the temporary lock lasts. */
export const LOGIN_LOCK_MINUTES = 15;

interface RequestMeta {
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Login with email or documentId. Every attempt outcome is audited (LOGIN).
   * After MAX_FAILED_LOGINS consecutive failures the account is locked for
   * LOGIN_LOCK_MINUTES (HU-01, criterion 4).
   */
  async login(identifier: string, password: string, meta: RequestMeta): Promise<AuthResult> {
    const user = await this.prisma.user.findFirst({
      where: { OR: [{ email: identifier }, { documentId: identifier }], isActive: true },
    });

    const now = new Date();
    if (user?.lockedUntil && user.lockedUntil > now) {
      await this.auditService.record({
        userId: user.id,
        action: 'LOGIN_BLOCKED',
        entity: 'User',
        entityId: user.id,
        newValues: { lockedUntil: user.lockedUntil.toISOString() },
        ...meta,
      });
      throw this.lockedError(user.lockedUntil, now);
    }

    const passwordOk = user !== null && (await bcrypt.compare(password, user.passwordHash));
    if (!user || !passwordOk) {
      const lockedUntil = user ? await this.registerFailure(user, now) : null;
      await this.auditService.record({
        action: 'LOGIN_FAILED',
        entity: 'User',
        entityId: user?.id,
        newValues: {
          identifier,
          ...(lockedUntil ? { lockedUntil: lockedUntil.toISOString() } : {}),
        },
        ...meta,
      });
      if (user && lockedUntil) {
        await this.auditService.record({
          userId: user.id,
          action: 'ACCOUNT_LOCKED',
          entity: 'User',
          entityId: user.id,
          newValues: { attempts: MAX_FAILED_LOGINS, lockedUntil: lockedUntil.toISOString() },
          policyRef: 'ISO/IEC 38500 - Responsabilidad',
          ...meta,
        });
        throw this.lockedError(lockedUntil, now);
      }
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    if (user.failedLoginAttempts > 0 || user.lockedUntil) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: 0, lockedUntil: null },
      });
    }

    await this.auditService.record({
      userId: user.id,
      action: 'LOGIN',
      entity: 'User',
      entityId: user.id,
      ...meta,
    });

    return { ...(await this.issueTokens(user)), user: this.publicUser(user) };
  }

  /** Counts a failed attempt; returns the lock expiry when the limit is reached. */
  private async registerFailure(user: User, now: Date): Promise<Date | null> {
    const attempts = user.failedLoginAttempts + 1;
    const lockedUntil =
      attempts >= MAX_FAILED_LOGINS ? new Date(now.getTime() + LOGIN_LOCK_MINUTES * 60_000) : null;
    await this.prisma.user.update({
      where: { id: user.id },
      data: lockedUntil
        ? { failedLoginAttempts: 0, lockedUntil }
        : { failedLoginAttempts: attempts },
    });
    return lockedUntil;
  }

  private lockedError(lockedUntil: Date, now: Date): HttpException {
    const minutes = Math.max(1, Math.ceil((lockedUntil.getTime() - now.getTime()) / 60_000));
    return new HttpException(
      `Cuenta bloqueada temporalmente por ${MAX_FAILED_LOGINS} intentos fallidos. ` +
        `Intenta de nuevo en ${minutes} minuto${minutes === 1 ? '' : 's'}.`,
      423, // Locked (RFC 4918)
    );
  }

  /** Exchanges a valid refresh token for a new token pair. */
  async refresh(refreshToken: string, meta: RequestMeta): Promise<AuthResult> {
    let payload: RefreshPayload;
    try {
      payload = await this.jwtService.verifyAsync<RefreshPayload>(refreshToken, {
        secret: this.refreshSecret(),
      });
    } catch {
      throw new UnauthorizedException('Refresh token inválido o vencido');
    }
    if (payload.tokenType !== 'refresh') {
      throw new UnauthorizedException('Refresh token inválido o vencido');
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Usuario inactivo o inexistente');
    }

    await this.auditService.record({
      userId: user.id,
      action: 'TOKEN_REFRESH',
      entity: 'User',
      entityId: user.id,
      ...meta,
    });

    return { ...(await this.issueTokens(user)), user: this.publicUser(user) };
  }

  /**
   * Replaces the password (HU-01 business rule: clients created by staff start
   * with their document id and must change it on first login).
   */
  async changePassword(
    userId: string,
    dto: ChangePasswordDto,
    meta: RequestMeta,
  ): Promise<{ changed: true }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive) throw new NotFoundException('Usuario no encontrado');

    if (!(await bcrypt.compare(dto.currentPassword, user.passwordHash))) {
      throw new BadRequestException('La contraseña actual no es correcta');
    }
    if (dto.newPassword === dto.currentPassword) {
      throw new BadRequestException('La nueva contraseña debe ser distinta de la actual');
    }
    if (dto.newPassword === user.documentId) {
      throw new BadRequestException('La nueva contraseña no puede ser tu número de documento');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await bcrypt.hash(dto.newPassword, 10),
        mustChangePassword: false,
        passwordChangedAt: new Date(),
      },
    });
    await this.auditService.record({
      userId: user.id,
      action: 'PASSWORD_CHANGED',
      entity: 'User',
      entityId: user.id,
      newValues: { forced: user.mustChangePassword },
      policyRef: 'ISO/IEC 38500 - Responsabilidad',
      ...meta,
    });
    return { changed: true };
  }

  private async issueTokens(user: User): Promise<TokenPair> {
    const accessPayload: JwtPayload = { sub: user.id, email: user.email, role: user.role };
    const refreshPayload: RefreshPayload = { sub: user.id, tokenType: 'refresh' };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(accessPayload),
      this.jwtService.signAsync(refreshPayload, {
        secret: this.refreshSecret(),
        expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES', '7d'),
      }),
    ]);
    return { accessToken, refreshToken };
  }

  private refreshSecret(): string {
    return this.configService.get<string>('JWT_REFRESH_SECRET', 'change-me-refresh-secret');
  }

  private publicUser(user: User): AuthResult['user'] {
    return {
      id: user.id,
      documentId: user.documentId,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
    };
  }
}
