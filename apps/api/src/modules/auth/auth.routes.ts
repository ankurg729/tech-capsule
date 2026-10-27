import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import type { RateLimiters } from '../../middleware/rateLimit.js';
import * as c from './auth.controller.js';

export function authRoutes(limits: RateLimiters): Router {
  const r = Router();
  r.post('/auth/register', limits.register, c.register);
  r.post('/auth/login', limits.login, c.login);
  r.post('/auth/refresh', limits.refresh, c.refresh);
  r.post('/auth/logout', c.logout);
  r.post('/auth/forgot-password', limits.passwordReset, c.forgotPassword);
  r.post('/auth/reset-password', limits.passwordReset, c.resetPassword);
  r.post('/auth/verify-email', limits.verification, c.verifyEmail);
  r.post('/auth/resend-verification', requireAuth, limits.verification, c.resendVerification);
  r.get('/auth/me', requireAuth, c.me);
  return r;
}
