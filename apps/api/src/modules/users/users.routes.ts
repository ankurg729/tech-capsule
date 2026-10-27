import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import * as c from './users.controller.js';

export function usersRoutes(): Router {
  const r = Router();
  r.get('/users/me', requireAuth, c.me);
  r.patch('/users/me', requireAuth, c.updateMe);
  return r;
}
