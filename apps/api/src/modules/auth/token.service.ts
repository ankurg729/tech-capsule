import type { UserRole } from '@techcapsule/contracts';
import jwt from 'jsonwebtoken';
import type { Types } from 'mongoose';
import { env } from '../../config/env.js';
import { AppError } from '../../lib/errors.js';
import { randomToken, sha256 } from '../../lib/crypto.js';
import { RefreshSession } from './refreshSession.model.js';

const ISSUER = 'techcapsule-api';
const AUDIENCE = 'techcapsule-clients';

export interface AccessClaims {
  userId: string;
  role: UserRole;
}

export interface IssuedTokens {
  accessToken: string;
  accessTokenExpiresAt: Date;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
}

export interface SessionContext {
  userAgent?: string | undefined;
  ip?: string | undefined;
}

export function signAccessToken(claims: AccessClaims): { token: string; expiresAt: Date } {
  const expiresAt = new Date(Date.now() + env.ACCESS_TOKEN_TTL_SECONDS * 1000);
  const token = jwt.sign({ role: claims.role }, env.JWT_ACCESS_SECRET, {
    algorithm: 'HS256',
    subject: claims.userId,
    issuer: ISSUER,
    audience: AUDIENCE,
    expiresIn: env.ACCESS_TOKEN_TTL_SECONDS,
  });
  return { token, expiresAt };
}

export function verifyAccessToken(token: string): AccessClaims {
  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET, {
      algorithms: ['HS256'],
      issuer: ISSUER,
      audience: AUDIENCE,
    });
    if (typeof payload === 'string' || !payload.sub || typeof payload.role !== 'string') {
      throw new AppError(401, 'INVALID_TOKEN', 'Invalid access token');
    }
    return { userId: payload.sub, role: payload.role as UserRole };
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      throw new AppError(401, 'TOKEN_EXPIRED', 'Access token expired');
    }
    if (err instanceof AppError) throw err;
    throw new AppError(401, 'INVALID_TOKEN', 'Invalid access token');
  }
}

async function createSession(
  userId: Types.ObjectId,
  familyId: string,
  ctx: SessionContext,
): Promise<{ id: Types.ObjectId; token: string; expiresAt: Date }> {
  const token = randomToken(48);
  const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 86_400_000);
  const session = await RefreshSession.create({
    userId,
    familyId,
    tokenHash: sha256(token),
    expiresAt,
    userAgent: ctx.userAgent?.slice(0, 300) ?? null,
    ip: ctx.ip ?? null,
  });
  return { id: session._id, token, expiresAt };
}

export async function issueTokens(
  user: { _id: Types.ObjectId; role: UserRole },
  ctx: SessionContext,
  familyId = randomToken(16),
): Promise<IssuedTokens & { sessionId: Types.ObjectId }> {
  const access = signAccessToken({ userId: user._id.toString(), role: user.role });
  const refresh = await createSession(user._id, familyId, ctx);
  return {
    accessToken: access.token,
    accessTokenExpiresAt: access.expiresAt,
    refreshToken: refresh.token,
    refreshTokenExpiresAt: refresh.expiresAt,
    sessionId: refresh.id,
  };
}

const invalidRefresh = () =>
  new AppError(401, 'INVALID_TOKEN', 'Session expired. Please log in again.');

/**
 * Validates a refresh token and atomically marks it rotated. Presenting a token that was
 * already rotated is treated as theft: the entire token family is revoked.
 */
export async function consumeRefreshToken(token: string) {
  const tokenHash = sha256(token);
  const now = new Date();
  const session = await RefreshSession.findOneAndUpdate(
    { tokenHash, revokedAt: null, expiresAt: { $gt: now } },
    { $set: { revokedAt: now, revokedReason: 'rotated' } },
    { returnDocument: 'after' },
  ).lean();

  if (!session) {
    const existing = await RefreshSession.findOne({ tokenHash }).lean();
    if (existing?.revokedReason === 'rotated') {
      await revokeFamily(existing.familyId, 'reuse-detected');
    }
    throw invalidRefresh();
  }
  return session;
}

export async function linkReplacement(oldId: Types.ObjectId, newId: Types.ObjectId) {
  await RefreshSession.updateOne({ _id: oldId }, { $set: { replacedBy: newId } });
}

export async function revokeFamily(
  familyId: string,
  reason: 'logout' | 'reuse-detected',
): Promise<void> {
  await RefreshSession.updateMany(
    { familyId, revokedAt: null },
    { $set: { revokedAt: new Date(), revokedReason: reason } },
  );
}

export async function revokeByToken(token: string): Promise<void> {
  const session = await RefreshSession.findOne({ tokenHash: sha256(token) }).lean();
  if (session) await revokeFamily(session.familyId, 'logout');
}

export async function revokeAllForUser(userId: Types.ObjectId): Promise<void> {
  await RefreshSession.updateMany(
    { userId, revokedAt: null },
    { $set: { revokedAt: new Date(), revokedReason: 'password-reset' } },
  );
}
