import { Router } from 'express';
import { optionalAuth } from '../../middleware/auth.js';
import * as c from './news.controller.js';

export function newsRoutes(): Router {
  const r = Router();
  r.get('/news', c.list);
  // Registered before /news/:slug so "daily-capsule" isn't treated as a slug.
  r.get('/news/daily-capsule', optionalAuth, c.dailyCapsule);
  r.get('/news/:slug', optionalAuth, c.detail);
  return r;
}
