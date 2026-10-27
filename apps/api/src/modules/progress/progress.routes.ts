import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import * as c from './progress.controller.js';

export function progressRoutes(): Router {
  const r = Router();
  r.put('/lessons/:id/progress', requireAuth, c.update);
  r.post('/lessons/:id/complete', requireAuth, c.complete);
  r.get('/users/me/progress', requireAuth, c.list);
  r.get('/users/me/stats', requireAuth, c.stats);
  return r;
}
