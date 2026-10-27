import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import * as c from './ratings.controller.js';

export function ratingsRoutes(): Router {
  const r = Router();
  r.put('/lessons/:id/rating', requireAuth, c.rate);
  return r;
}
