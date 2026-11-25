import { Role } from '@prisma/client';

/** Access-token payload. */
export interface JwtPayload {
  sub: string; // user id
  email: string;
  role: Role;
}

/** Refresh-token payload — signed with a separate secret. */
export interface RefreshPayload {
  sub: string;
  tokenType: 'refresh';
  /**
   * Password version: passwordChangedAt in ms (0 if never changed) when the
   * token was issued. JWT iat has 1-second precision, too coarse to tell a
   * token issued just before a password change from one issued just after.
   */
  pwv?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResult extends TokenPair {
  user: {
    id: string;
    documentId: string;
    firstName: string;
    lastName: string;
    email: string;
    role: Role;
    /** HU-01: the client still uses the initial password and must change it. */
    mustChangePassword: boolean;
  };
}
