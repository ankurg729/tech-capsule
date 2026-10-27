import { Router } from 'express';
import { optionalAuth, requireAuth } from '../../middleware/auth.js';
import * as c from './lessons.controller.js';

export function lessonsRoutes(): Router {
  const r = Router();
  r.get('/lessons', c.list);
  r.get('/lessons/:slug', optionalAuth, c.detail);
  r.post('/lessons/:id/quiz/:blockId/answer', requireAuth, c.answerQuiz);
  return r;
}
