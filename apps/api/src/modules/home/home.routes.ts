import { Router } from 'express';
import { optionalAuth } from '../../middleware/auth.js';
import * as c from './home.controller.js';

export function homeRoutes(): Router {
  const r = Router();
  r.get('/home', optionalAuth, c.feed);
  return r;
}
