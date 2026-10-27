import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import type { RateLimiters } from '../../middleware/rateLimit.js';
import * as c from './reports.controller.js';

export function reportsRoutes(limits: RateLimiters): Router {
  const r = Router();
  r.post('/reports', requireAuth, limits.reports, c.create);
  return r;
}
