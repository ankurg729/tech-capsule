import { Router } from 'express';
import { optionalAuth, requireAuth, requireVerifiedEmail } from '../../middleware/auth.js';
import type { RateLimiters } from '../../middleware/rateLimit.js';
import * as c from './questions.controller.js';

export function questionsRoutes(limits: RateLimiters): Router {
  const r = Router();
  r.get('/questions', optionalAuth, c.list);
  r.post('/questions', requireAuth, requireVerifiedEmail, limits.questions, c.create);
  r.get('/questions/:id', optionalAuth, c.detail);
  r.patch('/questions/:id', requireAuth, requireVerifiedEmail, c.update);
  r.put('/questions/:id/accept/:answerId', requireAuth, c.accept);
  r.delete('/questions/:id/accept', requireAuth, c.unaccept);
  return r;
}
