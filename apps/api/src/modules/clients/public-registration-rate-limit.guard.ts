import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';

const MAX_REGISTRATIONS_PER_IP = 10;
const WINDOW_MS = 60 * 60 * 1000;

@Injectable()
export class PublicRegistrationRateLimitGuard implements CanActivate {
  private readonly windows = new Map<string, { count: number; expiresAt: number }>();
  private requestsSinceCleanup = 0;

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const ip = request.ip || request.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const current = this.windows.get(ip);

    if (!current || current.expiresAt <= now) {
      this.windows.set(ip, { count: 1, expiresAt: now + WINDOW_MS });
    } else if (current.count >= MAX_REGISTRATIONS_PER_IP) {
      throw new HttpException(
        'Se alcanzó el límite de registros desde esta conexión. Intenta nuevamente más tarde.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    } else {
      current.count += 1;
    }

    this.requestsSinceCleanup += 1;
    if (this.requestsSinceCleanup >= 100) {
      for (const [key, window] of this.windows) {
        if (window.expiresAt <= now) this.windows.delete(key);
      }
      this.requestsSinceCleanup = 0;
    }

    return true;
  }
}
