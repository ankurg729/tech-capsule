import {
  objectIdSchema,
  questionCreateSchema,
  questionListQuerySchema,
  questionUpdateSchema,
} from '@techcapsule/contracts';
import { z } from 'zod';
import { created, ok, paginated, validated } from '../../lib/http.js';
import { getAuth } from '../../middleware/auth.js';
import * as questions from './questions.service.js';

const idParams = z.object({ id: objectIdSchema });

export const list = validated({ query: questionListQuerySchema }, async ({ query }, req, res) => {
  paginated(res, await questions.listQuestions(query, req.auth?.userId));
});

export const create = validated({ body: questionCreateSchema }, async ({ body }, req, res) => {
  created(res, await questions.createQuestion(getAuth(req).userId, body));
});

export const detail = validated({ params: idParams }, async ({ params }, req, res) => {
  ok(res, await questions.getQuestionDetail(params.id, req.auth?.userId));
});

export const update = validated(
  { params: idParams, body: questionUpdateSchema },
  async ({ params, body }, req, res) => {
    ok(res, await questions.updateQuestion(params.id, getAuth(req).userId, body));
  },
);

export const accept = validated(
  { params: z.object({ id: objectIdSchema, answerId: objectIdSchema }) },
  async ({ params }, req, res) => {
    ok(res, await questions.acceptAnswer(params.id, params.answerId, getAuth(req).userId));
  },
);

export const unaccept = validated({ params: idParams }, async ({ params }, req, res) => {
  ok(res, await questions.unacceptAnswer(params.id, getAuth(req).userId));
});
