import { Router } from 'express';
import { requireAuth, requireVerifiedEmail } from '../../middleware/auth.js';
import type { RateLimiters } from '../../middleware/rateLimit.js';
import * as c from './comments.controller.js';

export function commentsRoutes(limits: RateLimiters): Router {
  const r = Router();
  r.get('/comments', c.list);
  r.post('/comments', requireAuth, requireVerifiedEmail, limits.comments, c.create);
  return r;
}
