import { Router } from 'express';
import { optionalAuth } from '../../middleware/auth.js';
import * as c from './learningPaths.controller.js';

export function learningPathsRoutes(): Router {
  const r = Router();
  r.get('/learning-paths', optionalAuth, c.list);
  r.get('/learning-paths/:slug', optionalAuth, c.detail);
  return r;
}
