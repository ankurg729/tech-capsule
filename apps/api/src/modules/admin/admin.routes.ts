import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import * as c from './admin.controller.js';

/** Every route here is server-side restricted to active admins (role re-checked in MongoDB). */
export function adminRoutes(): Router {
  const r = Router();
  r.use('/admin', requireAuth, requireRole('admin'));

  r.get('/admin/overview', c.overview);

  r.get('/admin/lessons', c.listLessons);
  r.post('/admin/lessons', c.createLesson);
  r.get('/admin/lessons/:id', c.getLesson);
  r.patch('/admin/lessons/:id', c.updateLesson);
  r.post('/admin/lessons/:id/:action', c.setLessonStatus);

  r.get('/admin/learning-paths', c.listPaths);
  r.post('/admin/learning-paths', c.createPath);
  r.get('/admin/learning-paths/:id', c.getPath);
  r.patch('/admin/learning-paths/:id', c.updatePath);
  r.post('/admin/learning-paths/:id/:action', c.setPathStatus);

  r.get('/admin/news', c.listNews);
  r.post('/admin/news', c.createNews);
  r.get('/admin/news/:id', c.getNews);
  r.patch('/admin/news/:id', c.updateNews);
  r.post('/admin/news/:id/:action', c.setNewsStatus);

  r.get('/admin/reports', c.listReports);
  r.post('/admin/reports/:id/resolve', c.resolveReport);

  r.get('/admin/audit-logs', c.auditLogs);
  return r;
}
