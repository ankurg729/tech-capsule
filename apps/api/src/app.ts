import { randomUUID } from 'node:crypto';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env.js';
import { isDatabaseReady } from './db/connection.js';
import { buildOpenApiDocument } from './docs/openapi.js';
import { logger } from './lib/logger.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { createRateLimiters } from './middleware/rateLimit.js';
import { adminRoutes } from './modules/admin/admin.routes.js';
import { answersRoutes } from './modules/answers/answers.routes.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { bookmarksRoutes } from './modules/bookmarks/bookmarks.routes.js';
import { commentsRoutes } from './modules/comments/comments.routes.js';
import { devRoutes } from './modules/dev/dev.routes.js';
import { homeRoutes } from './modules/home/home.routes.js';
import { learningPathsRoutes } from './modules/learning-paths/learningPaths.routes.js';
import { lessonsRoutes } from './modules/lessons/lessons.routes.js';
import { newsRoutes } from './modules/news/news.routes.js';
import { progressRoutes } from './modules/progress/progress.routes.js';
import { questionsRoutes } from './modules/questions/questions.routes.js';
import { ratingsRoutes } from './modules/ratings/ratings.routes.js';
import { reportsRoutes } from './modules/reports/reports.routes.js';
import { searchRoutes } from './modules/search/search.routes.js';
import { usersRoutes } from './modules/users/users.routes.js';
import { votesRoutes } from './modules/votes/votes.routes.js';

export interface AppOptions {
  rateLimit?: boolean;
}

export function createApp(options: AppOptions = {}): Express {
  const app = express();
  const limits = createRateLimiters(options.rateLimit ?? env.RATE_LIMIT_ENABLED);

  app.disable('x-powered-by');
  app.set('trust proxy', env.TRUST_PROXY);

  app.use(
    pinoHttp({
      logger,
      genReqId: (req, res) => {
        const id =
          (req.headers['x-request-id'] as string | undefined)?.slice(0, 64) ?? randomUUID();
        res.setHeader('x-request-id', id);
        return id;
      },
      autoLogging: { ignore: (req) => req.url === '/api/v1/health' },
    }),
  );
  app.use(helmet());
  // Native mobile apps don't send Origin headers, so CORS only governs browsers (admin panel).
  app.use(cors({ origin: env.CORS_ORIGINS, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  const openApi = buildOpenApiDocument();
  app.get('/api/docs/openapi.json', (_req, res) => {
    res.json(openApi);
  });
  app.use(
    '/api/docs',
    swaggerUi.serve,
    swaggerUi.setup(openApi, { customSiteTitle: 'TechCapsule API' }),
  );

  const api = express.Router();
  api.get('/health', (_req, res) => {
    const db = isDatabaseReady();
    res
      .status(db ? 200 : 503)
      .json({ data: { status: db ? 'ok' : 'degraded', database: db ? 'up' : 'down' } });
  });
  api.use(limits.global);

  for (const router of [
    authRoutes(limits),
    usersRoutes(),
    homeRoutes(),
    searchRoutes(),
    lessonsRoutes(),
    bookmarksRoutes(),
    progressRoutes(),
    ratingsRoutes(),
    learningPathsRoutes(),
    questionsRoutes(limits),
    answersRoutes(limits),
    commentsRoutes(limits),
    votesRoutes(limits),
    reportsRoutes(limits),
    newsRoutes(),
    adminRoutes(),
    devRoutes(),
  ]) {
    if (router) api.use(router);
  }

  app.use('/api/v1', api);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
