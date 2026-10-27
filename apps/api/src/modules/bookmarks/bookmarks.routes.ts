import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import * as c from './bookmarks.controller.js';

export function bookmarksRoutes(): Router {
  const r = Router();
  r.put('/lessons/:id/bookmark', requireAuth, c.add('lesson'));
  r.delete('/lessons/:id/bookmark', requireAuth, c.remove('lesson'));
  r.put('/news/:id/bookmark', requireAuth, c.add('news'));
  r.delete('/news/:id/bookmark', requireAuth, c.remove('news'));
  r.get('/users/me/bookmarks', requireAuth, c.list);
  return r;
}
