import {
  forgotPasswordInputSchema,
  loginInputSchema,
  logoutInputSchema,
  refreshInputSchema,
  registerInputSchema,
  resetPasswordInputSchema,
  verifyEmailInputSchema,
  type RegisterResultDTO,
  type ResendVerificationDTO,
} from '@techcapsule/contracts';
import type { CookieOptions, Request, Response } from 'express';
import { env, isProduction } from '../../config/env.js';
import { AppError } from '../../lib/errors.js';
import { created, ok, validated } from '../../lib/http.js';
import { getAuth } from '../../middleware/auth.js';
import { toUserDTO } from '../users/user.mapper.js';
import * as auth from './auth.service.js';
import type { SessionContext } from './token.service.js';

export const REFRESH_COOKIE = 'tc_refresh';

/**
 * Browser clients (the admin panel) send `X-Client: web`. They get the refresh token in an
 * httpOnly cookie instead of the body, and cookies are only honoured when that header is
 * present — a custom header can't be sent cross-site without a CORS preflight (CSRF guard).
 */
const isWebClient = (req: Request) => req.get('x-client') === 'web';

const cookieOptions = (): CookieOptions => ({
  httpOnly: true,
  secure: isProduction,
  sameSite: 'strict',
  path: '/api/v1/auth',
  maxAge: env.REFRESH_TOKEN_TTL_DAYS * 86_400_000,
});

const context = (req: Request): SessionContext => ({
  userAgent: req.get('user-agent'),
  ip: req.ip,
});

function sendSession(req: Request, res: Response, result: auth.SessionResult, status = 200) {
  const web = isWebClient(req);
  if (web) res.cookie(REFRESH_COOKIE, result.tokens.refreshToken, cookieOptions());
  return { status, body: auth.toSessionDTO(result, !web) };
}

function refreshTokenFrom(req: Request, bodyToken: string | undefined): string | undefined {
  if (bodyToken) return bodyToken;
  if (isWebClient(req)) {
    const cookie = (req.cookies as Record<string, string> | undefined)?.[REFRESH_COOKIE];
    if (cookie) return cookie;
  }
  return undefined;
}

export const register = validated({ body: registerInputSchema }, async ({ body }, req, res) => {
  const result = await auth.register(body, context(req));
  const { body: session } = sendSession(req, res, result);
  const dto: RegisterResultDTO = { ...session, verificationEmail: result.verificationStatus };
  created(res, dto);
});

export const login = validated({ body: loginInputSchema }, async ({ body }, req, res) => {
  const result = await auth.login(body, context(req));
  ok(res, sendSession(req, res, result).body);
});

export const refresh = validated({ body: refreshInputSchema }, async ({ body }, req, res) => {
  const token = refreshTokenFrom(req, body.refreshToken);
  if (!token) throw new AppError(401, 'INVALID_TOKEN', 'Refresh token missing');
  const result = await auth.refresh(token, context(req));
  ok(res, sendSession(req, res, result).body);
});

export const logout = validated({ body: logoutInputSchema }, async ({ body }, req, res) => {
  await auth.logout(refreshTokenFrom(req, body.refreshToken));
  if (isWebClient(req)) res.clearCookie(REFRESH_COOKIE, { ...cookieOptions(), maxAge: undefined });
  ok(res, { message: 'Logged out' });
});

export const forgotPassword = validated(
  { body: forgotPasswordInputSchema },
  async ({ body }, _req, res) => {
    await auth.forgotPassword(body.email);
    ok(res, {
      message:
        'If an account exists for that email, a reset code has been sent. It expires in 15 minutes.',
    });
  },
);

export const resetPassword = validated(
  { body: resetPasswordInputSchema },
  async ({ body }, _req, res) => {
    await auth.resetPassword(body);
    ok(res, { message: 'Password updated. Please log in with your new password.' });
  },
);

export const verifyEmail = validated(
  { body: verifyEmailInputSchema },
  async ({ body }, _req, res) => {
    const user = await auth.verifyEmail(body);
    ok(res, { user: toUserDTO(user) });
  },
);

export const resendVerification = validated({}, async (_input, req, res) => {
  const status = await auth.resendVerification(getAuth(req).userId);
  if (status === 'already-verified') {
    throw new AppError(409, 'CONFLICT', 'Email is already verified');
  }
  const dto: ResendVerificationDTO = {
    delivery: status,
    message:
      status === 'sent'
        ? 'Verification email sent.'
        : status === 'dev-outbox'
          ? 'Development mode: the email was not sent. Check the API console or /api/v1/dev/emails.'
          : 'We could not send the email right now. Please try again later.',
  };
  ok(res, dto);
});

export const me = validated({}, async (_input, req, res) => {
  const user = await auth.getMe(getAuth(req).userId);
  ok(res, toUserDTO(user));
});
