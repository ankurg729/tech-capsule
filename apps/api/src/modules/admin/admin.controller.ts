import {
  adminLessonListQuerySchema,
  adminNewsListQuerySchema,
  adminPathListQuerySchema,
  auditListQuerySchema,
  lessonInputSchema,
  lessonUpdateSchema,
  newsInputSchema,
  newsUpdateSchema,
  objectIdSchema,
  pathInputSchema,
  pathUpdateSchema,
  reportListQuerySchema,
  reportResolveSchema,
} from '@techcapsule/contracts';
import type { Request } from 'express';
import { z } from 'zod';
import { created, ok, paginated, validated } from '../../lib/http.js';
import { getAuth } from '../../middleware/auth.js';
import * as paths from '../learning-paths/learningPaths.admin.service.js';
import * as lessons from '../lessons/lessons.admin.service.js';
import * as news from '../news/news.admin.service.js';
import * as reports from '../reports/reports.service.js';
import { getOverview } from './admin.service.js';
import { listAudit, type AuditActor } from './audit.service.js';

const idParams = z.object({ id: objectIdSchema });
const statusParams = z.object({
  id: objectIdSchema,
  action: z.enum(['publish', 'unpublish', 'archive']),
});
const actor = (req: Request): AuditActor => ({ userId: getAuth(req).userId, ip: req.ip });

export const overview = validated({}, async (_i, _req, res) => ok(res, await getOverview()));

// Lessons
export const listLessons = validated(
  { query: adminLessonListQuerySchema },
  async ({ query }, _req, res) => paginated(res, await lessons.adminListLessons(query)),
);
export const getLesson = validated({ params: idParams }, async ({ params }, _req, res) =>
  ok(res, await lessons.adminGetLesson(params.id)),
);
export const createLesson = validated({ body: lessonInputSchema }, async ({ body }, req, res) =>
  created(res, await lessons.adminCreateLesson(body, actor(req))),
);
export const updateLesson = validated(
  { params: idParams, body: lessonUpdateSchema },
  async ({ params, body }, req, res) =>
    ok(res, await lessons.adminUpdateLesson(params.id, body, actor(req))),
);
export const setLessonStatus = validated({ params: statusParams }, async ({ params }, req, res) =>
  ok(res, await lessons.adminSetLessonStatus(params.id, params.action, actor(req))),
);

// Learning paths
export const listPaths = validated(
  { query: adminPathListQuerySchema },
  async ({ query }, _req, res) => paginated(res, await paths.adminListPaths(query)),
);
export const getPath = validated({ params: idParams }, async ({ params }, _req, res) =>
  ok(res, await paths.adminGetPath(params.id)),
);
export const createPath = validated({ body: pathInputSchema }, async ({ body }, req, res) =>
  created(res, await paths.adminCreatePath(body, actor(req))),
);
export const updatePath = validated(
  { params: idParams, body: pathUpdateSchema },
  async ({ params, body }, req, res) =>
    ok(res, await paths.adminUpdatePath(params.id, body, actor(req))),
);
export const setPathStatus = validated({ params: statusParams }, async ({ params }, req, res) =>
  ok(res, await paths.adminSetPathStatus(params.id, params.action, actor(req))),
);

// News
export const listNews = validated(
  { query: adminNewsListQuerySchema },
  async ({ query }, _req, res) => paginated(res, await news.adminListNews(query)),
);
export const getNews = validated({ params: idParams }, async ({ params }, _req, res) =>
  ok(res, await news.adminGetNews(params.id)),
);
export const createNews = validated({ body: newsInputSchema }, async ({ body }, req, res) =>
  created(res, await news.adminCreateNews(body, actor(req))),
);
export const updateNews = validated(
  { params: idParams, body: newsUpdateSchema },
  async ({ params, body }, req, res) =>
    ok(res, await news.adminUpdateNews(params.id, body, actor(req))),
);
export const setNewsStatus = validated({ params: statusParams }, async ({ params }, req, res) =>
  ok(res, await news.adminSetNewsStatus(params.id, params.action, actor(req))),
);

// Moderation
export const listReports = validated(
  { query: reportListQuerySchema },
  async ({ query }, _req, res) => paginated(res, await reports.listReports(query)),
);
export const resolveReport = validated(
  { params: idParams, body: reportResolveSchema },
  async ({ params, body }, req, res) =>
    ok(res, await reports.resolveReport(params.id, body, actor(req))),
);

// Audit
export const auditLogs = validated({ query: auditListQuerySchema }, async ({ query }, _req, res) =>
  paginated(res, await listAudit(query)),
);
