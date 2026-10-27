import { Router } from 'express';
import { requireAuth, requireVerifiedEmail } from '../../middleware/auth.js';
import type { RateLimiters } from '../../middleware/rateLimit.js';
import * as c from './votes.controller.js';

export function votesRoutes(limits: RateLimiters): Router {
  const r = Router();
  r.put('/votes/:targetType/:targetId', requireAuth, requireVerifiedEmail, limits.votes, c.vote);
  r.delete('/votes/:targetType/:targetId', requireAuth, limits.votes, c.unvote);
  return r;
}
