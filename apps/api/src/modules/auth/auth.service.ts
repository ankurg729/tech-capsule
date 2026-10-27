import type {
  AuthSessionDTO,
  EmailDeliveryStatus,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
  VerifyEmailInput,
} from '@techcapsule/contracts';
import { Types } from 'mongoose';
import { env } from '../../config/env.js';
import {
  emailProvider,
  passwordResetEmail,
  verificationEmail,
  type EmailMessage,
} from '../../integrations/email/index.js';
import { AppError, conflict, notFound } from '../../lib/errors.js';
import { logger } from '../../lib/logger.js';
import { toUserDTO } from '../users/user.mapper.js';
import { User, type UserDoc } from '../users/user.model.js';
import { consumeCode, issueCode } from './authCode.service.js';
import { hashPassword, verifyAgainstDummy, verifyPassword } from './password.js';
import {
  consumeRefreshToken,
  issueTokens,
  linkReplacement,
  revokeAllForUser,
  revokeByToken,
  type IssuedTokens,
  type SessionContext,
} from './token.service.js';

export interface SessionResult {
  user: UserDoc;
  tokens: IssuedTokens;
}

export function toSessionDTO(result: SessionResult, includeRefreshToken: boolean): AuthSessionDTO {
  return {
    user: toUserDTO(result.user),
    tokens: {
      accessToken: result.tokens.accessToken,
      accessTokenExpiresAt: result.tokens.accessTokenExpiresAt.toISOString(),
      ...(includeRefreshToken ? { refreshToken: result.tokens.refreshToken } : {}),
      refreshTokenExpiresAt: result.tokens.refreshTokenExpiresAt.toISOString(),
    },
  };
}

async function deliver(message: EmailMessage): Promise<EmailDeliveryStatus> {
  try {
    return await emailProvider.send(message);
  } catch (err) {
    logger.error({ err, to: message.to, subject: message.subject }, 'Email delivery failed');
    return 'failed';
  }
}

const deepLink = (path: string, params: Record<string, string>) =>
  `${env.APP_DEEP_LINK_BASE}${path}?${new URLSearchParams(params).toString()}`;

async function sendVerification(user: UserDoc): Promise<EmailDeliveryStatus> {
  const { code, ttlMinutes } = await issueCode(user._id, 'verify-email');
  return deliver(
    verificationEmail({
      to: user.email,
      name: user.displayName,
      code,
      link: deepLink('verify-email', { email: user.email, code }),
      ttlHours: Math.round(ttlMinutes / 60),
    }),
  );
}

export async function register(input: RegisterInput, ctx: SessionContext) {
  const exists = await User.exists({ email: input.email });
  if (exists) throw conflict('An account with this email already exists');

  const passwordHash = await hashPassword(input.password);
  let user: UserDoc;
  try {
    // Role is never taken from input: new accounts are always plain users.
    const doc = await User.create({
      email: input.email,
      passwordHash,
      displayName: input.displayName,
      role: 'user',
    });
    user = doc.toObject();
  } catch (err) {
    if ((err as { code?: number }).code === 11000) {
      throw conflict('An account with this email already exists');
    }
    throw err;
  }

  const verificationStatus = await sendVerification(user);
  const tokens = await issueTokens(user, ctx);
  return { user, tokens, verificationStatus };
}

export async function login(input: LoginInput, ctx: SessionContext): Promise<SessionResult> {
  const user = await User.findOne({ email: input.email }).select('+passwordHash').lean();
  if (!user) {
    await verifyAgainstDummy(input.password);
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Incorrect email or password');
  }
  const valid = await verifyPassword(user.passwordHash, input.password);
  if (!valid) throw new AppError(401, 'INVALID_CREDENTIALS', 'Incorrect email or password');
  if (user.status !== 'active') throw new AppError(403, 'FORBIDDEN', 'This account is suspended');

  await User.updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date() } });
  const tokens = await issueTokens(user, ctx);
  return { user, tokens };
}

export async function refresh(refreshToken: string, ctx: SessionContext): Promise<SessionResult> {
  const old = await consumeRefreshToken(refreshToken);
  const user = await User.findById(old.userId).lean();
  if (!user || user.status !== 'active') {
    throw new AppError(401, 'INVALID_TOKEN', 'Session expired. Please log in again.');
  }
  const tokens = await issueTokens(user, ctx, old.familyId);
  await linkReplacement(old._id, tokens.sessionId);
  return { user, tokens };
}

export async function logout(refreshToken: string | undefined): Promise<void> {
  if (refreshToken) await revokeByToken(refreshToken);
}

export async function verifyEmail(input: VerifyEmailInput): Promise<UserDoc> {
  const user = await User.findOne({ email: input.email }).lean();
  if (!user) throw new AppError(400, 'INVALID_CODE', 'The code is invalid or has expired');
  if (user.emailVerifiedAt) return user;
  await consumeCode(user._id, 'verify-email', input.code);
  const updated = await User.findByIdAndUpdate(
    user._id,
    { $set: { emailVerifiedAt: new Date() } },
    { returnDocument: 'after' },
  ).lean();
  return updated!;
}

export async function resendVerification(
  userId: string,
): Promise<EmailDeliveryStatus | 'already-verified'> {
  const user = await User.findById(userId).lean();
  if (!user) throw notFound('User');
  if (user.emailVerifiedAt) return 'already-verified';
  return sendVerification(user);
}

/** Always resolves the same way so callers can't learn whether an account exists. */
export async function forgotPassword(email: string): Promise<void> {
  const user = await User.findOne({ email, status: 'active' }).lean();
  if (!user) return;
  const { code, ttlMinutes } = await issueCode(user._id, 'reset-password');
  // Not awaited: keeps response timing independent of the email provider.
  void deliver(
    passwordResetEmail({
      to: user.email,
      name: user.displayName,
      code,
      link: deepLink('reset-password', { email: user.email, code }),
      ttlMinutes,
    }),
  );
}

export async function resetPassword(input: ResetPasswordInput): Promise<void> {
  const user = await User.findOne({ email: input.email, status: 'active' }).lean();
  if (!user) throw new AppError(400, 'INVALID_CODE', 'The code is invalid or has expired');
  await consumeCode(user._id, 'reset-password', input.code);
  const passwordHash = await hashPassword(input.password);
  await User.updateOne(
    { _id: user._id },
    // A successful reset also proves ownership of the mailbox.
    {
      $set: {
        passwordHash,
        passwordChangedAt: new Date(),
        emailVerifiedAt: user.emailVerifiedAt ?? new Date(),
      },
    },
  );
  await revokeAllForUser(user._id);
}

export async function getMe(userId: string): Promise<UserDoc> {
  if (!Types.ObjectId.isValid(userId)) throw notFound('User');
  const user = await User.findById(userId).lean();
  if (!user) throw notFound('User');
  return user;
}
