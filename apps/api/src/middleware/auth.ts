import type { UserRole } from '@techcapsule/contracts';
import type { NextFunction, Request, Response } from 'express';
import { AppError, forbidden, unauthenticated } from '../lib/errors.js';
import { verifyAccessToken } from '../modules/auth/token.service.js';
import { User } from '../modules/users/user.model.js';

export interface AuthContext {
  userId: string;
  role: UserRole;
}

declare module 'express-serve-static-core' {
  interface Request {
    auth?: AuthContext;
  }
}

function bearer(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header) return null;
  const [scheme, token] = header.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    throw new AppError(401, 'INVALID_TOKEN', 'Malformed Authorization header');
  }
  return token;
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const token = bearer(req);
  if (!token) throw unauthenticated();
  req.auth = verifyAccessToken(token);
  next();
}

/** Attaches auth when a valid token is present; anonymous requests continue without it. */
export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const token = bearer(req);
  if (token) req.auth = verifyAccessToken(token);
  next();
}

export function getAuth(req: Request): AuthContext {
  if (!req.auth) throw unauthenticated();
  return req.auth;
}

/**
 * Role checks re-read the user from MongoDB instead of trusting the JWT claim, so a demotion
 * or suspension takes effect immediately rather than when the access token expires.
 */
export function requireRole(role: UserRole) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const auth = getAuth(req);
    const user = await User.findById(auth.userId).select('role status').lean();
    if (!user || user.status !== 'active' || user.role !== role) throw forbidden();
    req.auth = { userId: auth.userId, role: user.role };
    next();
  };
}

/** Community write actions require a verified email (basic anti-spam measure). */
export async function requireVerifiedEmail(req: Request, _res: Response, next: NextFunction) {
  const auth = getAuth(req);
  const user = await User.findById(auth.userId).select('emailVerifiedAt status').lean();
  if (!user || user.status !== 'active') throw forbidden();
  if (!user.emailVerifiedAt) {
    throw new AppError(
      403,
      'EMAIL_NOT_VERIFIED',
      'Verify your email address to post in the community',
    );
  }
  next();
}
