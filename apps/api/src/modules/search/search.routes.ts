import { Router } from 'express';
import { optionalAuth } from '../../middleware/auth.js';
import * as c from './search.controller.js';

export function searchRoutes(): Router {
  const r = Router();
  r.get('/search', optionalAuth, c.run);
  return r;
}
