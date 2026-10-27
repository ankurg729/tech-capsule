import {
  lessonIdParamSchema,
  progressInputSchema,
  progressListQuerySchema,
} from '@techcapsule/contracts';
import { ok, paginated, validated } from '../../lib/http.js';
import { getAuth } from '../../middleware/auth.js';
import { getLearningStats } from './activity.service.js';
import * as progress from './progress.service.js';

export const update = validated(
  { params: lessonIdParamSchema, body: progressInputSchema },
  async ({ params, body }, req, res) => {
    ok(res, await progress.updateProgress(getAuth(req).userId, params.id, body));
  },
);

export const complete = validated({ params: lessonIdParamSchema }, async ({ params }, req, res) => {
  ok(res, await progress.completeLesson(getAuth(req).userId, params.id));
});

export const list = validated({ query: progressListQuerySchema }, async ({ query }, req, res) => {
  paginated(res, await progress.listProgress(getAuth(req).userId, query));
});

export const stats = validated({}, async (_input, req, res) => {
  ok(res, await getLearningStats(getAuth(req).userId));
});
