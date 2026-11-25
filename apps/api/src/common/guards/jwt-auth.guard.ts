import { ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { ALLOW_PENDING_PASSWORD_KEY } from '../decorators/allow-pending-password.decorator';
import { AuthenticatedUser } from '../decorators/current-user.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/** Error code the web app uses to open the "change password" screen. */
export const PASSWORD_CHANGE_REQUIRED = 'PASSWORD_CHANGE_REQUIRED';

/**
 * Global JWT guard; routes marked with @Public() are exempt.
 * Users flagged mustChangePassword (HU-01) can only reach routes marked
 * with @AllowPendingPassword() until they replace the initial password.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets)) return true;

    const authenticated = (await super.canActivate(context)) as boolean;
    if (!authenticated) return false;

    const user = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>().user;
    const allowed = this.reflector.getAllAndOverride<boolean>(ALLOW_PENDING_PASSWORD_KEY, targets);
    if (user?.mustChangePassword && !allowed) {
      throw new ForbiddenException({
        statusCode: 403,
        code: PASSWORD_CHANGE_REQUIRED,
        message: 'Debes cambiar tu contraseña inicial antes de continuar',
      });
    }
    return true;
  }
}
