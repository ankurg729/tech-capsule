import * as c from '@techcapsule/contracts';
import { z } from 'zod';
import { bookmarkListQuerySchema } from '../modules/bookmarks/bookmarks.controller.js';

type Auth = 'none' | 'optional' | 'user' | 'verified' | 'admin';
type Method = 'get' | 'post' | 'put' | 'patch' | 'delete';

interface RouteDoc {
  method: Method;
  path: string;
  tag: string;
  summary: string;
  auth: Auth;
  body?: z.ZodType;
  query?: z.ZodObject;
  success?: number;
}

const routes: RouteDoc[] = [
  {
    method: 'get',
    path: '/health',
    tag: 'System',
    summary: 'Liveness and database status',
    auth: 'none',
  },

  {
    method: 'post',
    path: '/auth/register',
    tag: 'Auth',
    summary: 'Create an account (role is always "user")',
    auth: 'none',
    body: c.registerInputSchema,
    success: 201,
  },
  {
    method: 'post',
    path: '/auth/login',
    tag: 'Auth',
    summary: 'Log in with email and password',
    auth: 'none',
    body: c.loginInputSchema,
  },
  {
    method: 'post',
    path: '/auth/refresh',
    tag: 'Auth',
    summary:
      'Rotate refresh token and get a new access token. Web clients send `X-Client: web` and use the httpOnly cookie.',
    auth: 'none',
    body: c.refreshInputSchema,
  },
  {
    method: 'post',
    path: '/auth/logout',
    tag: 'Auth',
    summary: 'Revoke the refresh-token family',
    auth: 'none',
    body: c.logoutInputSchema,
  },
  {
    method: 'post',
    path: '/auth/forgot-password',
    tag: 'Auth',
    summary: 'Request a reset code (response never reveals whether the email exists)',
    auth: 'none',
    body: c.forgotPasswordInputSchema,
  },
  {
    method: 'post',
    path: '/auth/reset-password',
    tag: 'Auth',
    summary: 'Reset password with an emailed code; revokes all sessions',
    auth: 'none',
    body: c.resetPasswordInputSchema,
  },
  {
    method: 'post',
    path: '/auth/verify-email',
    tag: 'Auth',
    summary: 'Verify email with an emailed code',
    auth: 'none',
    body: c.verifyEmailInputSchema,
  },
  {
    method: 'post',
    path: '/auth/resend-verification',
    tag: 'Auth',
    summary: 'Send a new verification code',
    auth: 'user',
  },
  { method: 'get', path: '/auth/me', tag: 'Auth', summary: 'Current user', auth: 'user' },

  { method: 'get', path: '/users/me', tag: 'Users', summary: 'Current user profile', auth: 'user' },
  {
    method: 'patch',
    path: '/users/me',
    tag: 'Users',
    summary: 'Update profile and preferences',
    auth: 'user',
    body: c.updateProfileInputSchema,
  },
  {
    method: 'get',
    path: '/users/me/bookmarks',
    tag: 'Users',
    summary: 'Saved lessons or news articles',
    auth: 'user',
    query: bookmarkListQuerySchema,
  },
  {
    method: 'get',
    path: '/users/me/progress',
    tag: 'Users',
    summary: 'Lesson progress',
    auth: 'user',
    query: c.progressListQuerySchema,
  },
  {
    method: 'get',
    path: '/users/me/stats',
    tag: 'Users',
    summary: 'Streak and weekly activity',
    auth: 'user',
  },

  {
    method: 'get',
    path: '/home',
    tag: 'Home',
    summary: 'Aggregated, personalised home feed',
    auth: 'optional',
  },
  {
    method: 'get',
    path: '/search',
    tag: 'Search',
    summary: 'Search published lessons, paths and questions',
    auth: 'optional',
    query: c.searchQuerySchema,
  },

  {
    method: 'get',
    path: '/lessons',
    tag: 'Lessons',
    summary: 'List published lessons',
    auth: 'none',
    query: c.lessonListQuerySchema,
  },
  {
    method: 'get',
    path: '/lessons/{slug}',
    tag: 'Lessons',
    summary: 'Lesson detail (quiz answer keys are stripped)',
    auth: 'optional',
  },
  {
    method: 'post',
    path: '/lessons/{id}/quiz/{blockId}/answer',
    tag: 'Lessons',
    summary: 'Submit a quiz answer; evaluated server-side',
    auth: 'user',
    body: c.quizAnswerInputSchema,
  },
  {
    method: 'put',
    path: '/lessons/{id}/bookmark',
    tag: 'Lessons',
    summary: 'Save lesson (idempotent)',
    auth: 'user',
  },
  {
    method: 'delete',
    path: '/lessons/{id}/bookmark',
    tag: 'Lessons',
    summary: 'Unsave lesson',
    auth: 'user',
  },
  {
    method: 'put',
    path: '/lessons/{id}/progress',
    tag: 'Lessons',
    summary: 'Record reading progress / last section',
    auth: 'user',
    body: c.progressInputSchema,
  },
  {
    method: 'post',
    path: '/lessons/{id}/complete',
    tag: 'Lessons',
    summary: 'Mark lesson completed',
    auth: 'user',
  },
  {
    method: 'put',
    path: '/lessons/{id}/rating',
    tag: 'Lessons',
    summary: 'Create or update your 1–5 star rating',
    auth: 'user',
    body: c.ratingInputSchema,
  },

  {
    method: 'get',
    path: '/learning-paths',
    tag: 'Learning paths',
    summary: 'List published paths',
    auth: 'optional',
    query: c.pathListQuerySchema,
  },
  {
    method: 'get',
    path: '/learning-paths/{slug}',
    tag: 'Learning paths',
    summary: 'Path detail with ordered lessons and progress',
    auth: 'optional',
  },

  {
    method: 'get',
    path: '/questions',
    tag: 'Community',
    summary: 'Browse/search questions',
    auth: 'optional',
    query: c.questionListQuerySchema,
  },
  {
    method: 'post',
    path: '/questions',
    tag: 'Community',
    summary: 'Ask a question',
    auth: 'verified',
    body: c.questionCreateSchema,
    success: 201,
  },
  {
    method: 'get',
    path: '/questions/{id}',
    tag: 'Community',
    summary: 'Question detail',
    auth: 'optional',
  },
  {
    method: 'patch',
    path: '/questions/{id}',
    tag: 'Community',
    summary: 'Edit own question',
    auth: 'verified',
    body: c.questionUpdateSchema,
  },
  {
    method: 'get',
    path: '/questions/{id}/answers',
    tag: 'Community',
    summary: 'Paginated answers (accepted first, then votes)',
    auth: 'optional',
    query: c.paginationQuerySchema,
  },
  {
    method: 'post',
    path: '/questions/{id}/answers',
    tag: 'Community',
    summary: 'Post an answer',
    auth: 'verified',
    body: c.answerCreateSchema,
    success: 201,
  },
  {
    method: 'patch',
    path: '/answers/{id}',
    tag: 'Community',
    summary: 'Edit own answer',
    auth: 'verified',
    body: c.answerUpdateSchema,
  },
  {
    method: 'put',
    path: '/questions/{id}/accept/{answerId}',
    tag: 'Community',
    summary: 'Accept an answer (question author only)',
    auth: 'user',
  },
  {
    method: 'delete',
    path: '/questions/{id}/accept',
    tag: 'Community',
    summary: 'Remove accepted answer (question author only)',
    auth: 'user',
  },
  {
    method: 'put',
    path: '/votes/{targetType}/{targetId}',
    tag: 'Community',
    summary: 'Upvote a question or answer (idempotent)',
    auth: 'verified',
  },
  {
    method: 'delete',
    path: '/votes/{targetType}/{targetId}',
    tag: 'Community',
    summary: 'Remove your vote',
    auth: 'user',
  },
  {
    method: 'get',
    path: '/comments',
    tag: 'Community',
    summary: 'Comments on a question or answer',
    auth: 'none',
    query: c.commentListQuerySchema,
  },
  {
    method: 'post',
    path: '/comments',
    tag: 'Community',
    summary: 'Add a comment',
    auth: 'verified',
    body: c.commentCreateSchema,
    success: 201,
  },
  {
    method: 'post',
    path: '/reports',
    tag: 'Community',
    summary: 'Report inappropriate content',
    auth: 'user',
    body: c.reportCreateSchema,
    success: 201,
  },

  {
    method: 'get',
    path: '/news',
    tag: 'News',
    summary: 'Published news (admin-curated)',
    auth: 'none',
    query: c.newsListQuerySchema,
  },
  {
    method: 'get',
    path: '/news/daily-capsule',
    tag: 'News',
    summary: "Today's Daily Capsule lesson",
    auth: 'optional',
  },
  { method: 'get', path: '/news/{slug}', tag: 'News', summary: 'Article detail', auth: 'optional' },
  {
    method: 'put',
    path: '/news/{id}/bookmark',
    tag: 'News',
    summary: 'Save article',
    auth: 'user',
  },
  {
    method: 'delete',
    path: '/news/{id}/bookmark',
    tag: 'News',
    summary: 'Unsave article',
    auth: 'user',
  },

  {
    method: 'get',
    path: '/admin/overview',
    tag: 'Admin',
    summary: 'Dashboard counts and recent audit entries',
    auth: 'admin',
  },
  {
    method: 'get',
    path: '/admin/lessons',
    tag: 'Admin',
    summary: 'All lessons (any status)',
    auth: 'admin',
    query: c.adminLessonListQuerySchema,
  },
  {
    method: 'post',
    path: '/admin/lessons',
    tag: 'Admin',
    summary: 'Create draft lesson',
    auth: 'admin',
    body: c.lessonInputSchema,
    success: 201,
  },
  {
    method: 'get',
    path: '/admin/lessons/{id}',
    tag: 'Admin',
    summary: 'Lesson with answer keys',
    auth: 'admin',
  },
  {
    method: 'patch',
    path: '/admin/lessons/{id}',
    tag: 'Admin',
    summary: 'Edit lesson (content changes bump contentVersion)',
    auth: 'admin',
    body: c.lessonUpdateSchema,
  },
  {
    method: 'post',
    path: '/admin/lessons/{id}/{action}',
    tag: 'Admin',
    summary: 'action = publish | unpublish | archive',
    auth: 'admin',
  },
  {
    method: 'get',
    path: '/admin/learning-paths',
    tag: 'Admin',
    summary: 'All paths',
    auth: 'admin',
    query: c.adminPathListQuerySchema,
  },
  {
    method: 'post',
    path: '/admin/learning-paths',
    tag: 'Admin',
    summary: 'Create path',
    auth: 'admin',
    body: c.pathInputSchema,
    success: 201,
  },
  {
    method: 'get',
    path: '/admin/learning-paths/{id}',
    tag: 'Admin',
    summary: 'Path detail',
    auth: 'admin',
  },
  {
    method: 'patch',
    path: '/admin/learning-paths/{id}',
    tag: 'Admin',
    summary: 'Edit path',
    auth: 'admin',
    body: c.pathUpdateSchema,
  },
  {
    method: 'post',
    path: '/admin/learning-paths/{id}/{action}',
    tag: 'Admin',
    summary: 'action = publish | unpublish | archive',
    auth: 'admin',
  },
  {
    method: 'get',
    path: '/admin/news',
    tag: 'Admin',
    summary: 'All news',
    auth: 'admin',
    query: c.adminNewsListQuerySchema,
  },
  {
    method: 'post',
    path: '/admin/news',
    tag: 'Admin',
    summary: 'Create draft article',
    auth: 'admin',
    body: c.newsInputSchema,
    success: 201,
  },
  {
    method: 'get',
    path: '/admin/news/{id}',
    tag: 'Admin',
    summary: 'Article detail',
    auth: 'admin',
  },
  {
    method: 'patch',
    path: '/admin/news/{id}',
    tag: 'Admin',
    summary: 'Edit article',
    auth: 'admin',
    body: c.newsUpdateSchema,
  },
  {
    method: 'post',
    path: '/admin/news/{id}/{action}',
    tag: 'Admin',
    summary: 'action = publish | unpublish | archive',
    auth: 'admin',
  },
  {
    method: 'get',
    path: '/admin/reports',
    tag: 'Admin',
    summary: 'Moderation queue',
    auth: 'admin',
    query: c.reportListQuerySchema,
  },
  {
    method: 'post',
    path: '/admin/reports/{id}/resolve',
    tag: 'Admin',
    summary: 'Dismiss, hide or restore reported content',
    auth: 'admin',
    body: c.reportResolveSchema,
  },
  {
    method: 'get',
    path: '/admin/audit-logs',
    tag: 'Admin',
    summary: 'Audit trail',
    auth: 'admin',
    query: c.auditListQuerySchema,
  },

  {
    method: 'get',
    path: '/dev/emails',
    tag: 'Development',
    summary: 'Dev outbox (only when EMAIL_PROVIDER=log, never in production)',
    auth: 'none',
  },
];

const jsonSchema = (schema: z.ZodType) =>
  z.toJSONSchema(schema, { io: 'input', unrepresentable: 'any', target: 'openapi-3.0' }) as Record<
    string,
    unknown
  >;

const AUTH_NOTES: Record<Auth, string> = {
  none: '',
  optional: ' Optional bearer token personalises the response.',
  user: ' Requires a bearer token.',
  verified: ' Requires a bearer token and a verified email.',
  admin: ' Requires an admin account (checked server-side on every request).',
};

export function buildOpenApiDocument() {
  const paths: Record<string, Record<string, unknown>> = {};
  for (const r of routes) {
    const pathParams = [...r.path.matchAll(/\{(\w+)\}/g)].map((m) => ({
      name: m[1],
      in: 'path',
      required: true,
      schema: { type: 'string' },
    }));
    const queryParams = r.query
      ? Object.entries(r.query.shape).map(([name, s]) => ({
          name,
          in: 'query',
          required: !(s as z.ZodType).safeParse(undefined).success,
          schema: jsonSchema(s as z.ZodType),
        }))
      : [];
    const success = String(r.success ?? 200);
    (paths[r.path] ??= {})[r.method] = {
      tags: [r.tag],
      summary: r.summary,
      description: `${r.summary}.${AUTH_NOTES[r.auth]}`,
      ...(r.auth === 'none'
        ? {}
        : { security: r.auth === 'optional' ? [{}, { bearerAuth: [] }] : [{ bearerAuth: [] }] }),
      parameters: [...pathParams, ...queryParams],
      ...(r.body
        ? {
            requestBody: {
              required: true,
              content: { 'application/json': { schema: jsonSchema(r.body) } },
            },
          }
        : {}),
      responses: {
        [success]: {
          description: 'Success',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Envelope' } } },
        },
        '400': { $ref: '#/components/responses/Error' },
        ...(r.auth !== 'none' && r.auth !== 'optional'
          ? { '401': { $ref: '#/components/responses/Error' } }
          : {}),
        ...(r.auth === 'admin' || r.auth === 'verified'
          ? { '403': { $ref: '#/components/responses/Error' } }
          : {}),
        '429': { $ref: '#/components/responses/Error' },
      },
    };
  }

  return {
    openapi: '3.0.3',
    info: {
      title: 'TechCapsule.dev API',
      version: '1.0.0',
      description:
        'REST API for the TechCapsule mobile app and admin panel. Successful responses are `{ data, meta? }`; errors are `{ error: { code, message, details?, requestId } }`.',
    },
    servers: [{ url: '/api/v1' }],
    tags: [...new Set(routes.map((r) => r.tag))].map((name) => ({ name })),
    paths,
    components: {
      securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
      schemas: {
        Envelope: {
          type: 'object',
          properties: {
            data: {},
            meta: {
              type: 'object',
              properties: {
                page: { type: 'integer' },
                limit: { type: 'integer' },
                total: { type: 'integer' },
                totalPages: { type: 'integer' },
                hasNextPage: { type: 'boolean' },
              },
            },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                code: { type: 'string', enum: [...c.ERROR_CODES] },
                message: { type: 'string' },
                details: {},
                requestId: { type: 'string' },
              },
              required: ['code', 'message'],
            },
          },
        },
      },
      responses: {
        Error: {
          description: 'Error',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
        },
      },
    },
  };
}

export const documentedRoutes = routes.map((r) => `${r.method.toUpperCase()} ${r.path}`);
