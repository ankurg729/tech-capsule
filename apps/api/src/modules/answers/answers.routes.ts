import { Router } from 'express';
import { optionalAuth, requireAuth, requireVerifiedEmail } from '../../middleware/auth.js';
import type { RateLimiters } from '../../middleware/rateLimit.js';
import * as c from './answers.controller.js';

export function answersRoutes(limits: RateLimiters): Router {
  const r = Router();
  r.get('/questions/:id/answers', optionalAuth, c.list);
  r.post('/questions/:id/answers', requireAuth, requireVerifiedEmail, limits.answers, c.create);
  r.patch('/answers/:id', requireAuth, requireVerifiedEmail, c.update);
  return r;
}
