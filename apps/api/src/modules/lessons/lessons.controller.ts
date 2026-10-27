import {
  blockIdSchema,
  lessonListQuerySchema,
  objectIdSchema,
  quizAnswerInputSchema,
  slugSchema,
} from '@techcapsule/contracts';
import { z } from 'zod';
import { ok, paginated, validated } from '../../lib/http.js';
import { getAuth } from '../../middleware/auth.js';
import * as lessons from './lessons.service.js';

export const list = validated({ query: lessonListQuerySchema }, async ({ query }, _req, res) => {
  paginated(res, await lessons.listLessons(query));
});

export const detail = validated(
  { params: z.object({ slug: slugSchema }) },
  async ({ params }, req, res) => {
    ok(res, await lessons.getLessonDetail(params.slug, req.auth?.userId));
  },
);

export const answerQuiz = validated(
  {
    params: z.object({ id: objectIdSchema, blockId: blockIdSchema }),
    body: quizAnswerInputSchema,
  },
  async ({ params, body }, req, res) => {
    ok(
      res,
      await lessons.answerQuiz(
        params.id,
        params.blockId,
        body.selectedOptionIds,
        getAuth(req).userId,
      ),
    );
  },
);
