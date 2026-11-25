import { SetMetadata } from '@nestjs/common';

export const ALLOW_PENDING_PASSWORD_KEY = 'allowPendingPassword';

/**
 * Routes reachable while the user still has to replace the initial password
 * (HU-01): changing the password itself and closing the session.
 */
export const AllowPendingPassword = () => SetMetadata(ALLOW_PENDING_PASSWORD_KEY, true);
