import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { ALLOW_PENDING_PASSWORD_KEY } from '../decorators/allow-pending-password.decorator';
import { AuthenticatedUser } from '../decorators/current-user.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  const parentCanActivate = jest.spyOn(
    Object.getPrototypeOf(JwtAuthGuard.prototype) as { canActivate: () => Promise<boolean> },
    'canActivate',
  );

  const contextFor = (user: AuthenticatedUser | undefined): ExecutionContext =>
    ({
      getHandler: () => function handler() {},
      getClass: () => class Controller {},
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    }) as unknown as ExecutionContext;

  const guardWith = (metadata: Record<string, boolean>) => {
    const reflector = {
      getAllAndOverride: (key: string) => metadata[key] ?? false,
    } as unknown as Reflector;
    return new JwtAuthGuard(reflector);
  };

  const client: AuthenticatedUser = { id: 'u1', email: 'c@x.co', role: Role.CLIENT };

  beforeEach(() => parentCanActivate.mockResolvedValue(true));
  afterAll(() => parentCanActivate.mockRestore());

  it('lets public routes through without checking the token', async () => {
    await expect(
      guardWith({ [IS_PUBLIC_KEY]: true }).canActivate(contextFor(undefined)),
    ).resolves.toBe(true);
    expect(parentCanActivate).not.toHaveBeenCalled();
  });

  it('allows a user that already changed the initial password', async () => {
    await expect(guardWith({}).canActivate(contextFor(client))).resolves.toBe(true);
  });

  it('blocks other routes while the initial password is pending (HU-01)', async () => {
    const pending = { ...client, mustChangePassword: true };
    const error = await guardWith({})
      .canActivate(contextFor(pending))
      .catch((e) => e);
    expect(error).toBeInstanceOf(ForbiddenException);
    expect((error as ForbiddenException).getResponse()).toEqual(
      expect.objectContaining({ code: 'PASSWORD_CHANGE_REQUIRED' }),
    );
  });

  it('keeps change-password reachable while the password is pending', async () => {
    const pending = { ...client, mustChangePassword: true };
    await expect(
      guardWith({ [ALLOW_PENDING_PASSWORD_KEY]: true }).canActivate(contextFor(pending)),
    ).resolves.toBe(true);
  });
});
