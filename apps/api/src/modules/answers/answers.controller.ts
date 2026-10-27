import {
  answerCreateSchema,
  answerUpdateSchema,
  objectIdSchema,
  paginationQuerySchema,
} from '@techcapsule/contracts';
import { z } from 'zod';
import { created, ok, paginated, validated } from '../../lib/http.js';
import { getAuth } from '../../middleware/auth.js';
import * as answers from './answers.service.js';

const idParams = z.object({ id: objectIdSchema });

export const list = validated(
  { params: idParams, query: paginationQuerySchema },
  async ({ params, query }, req, res) => {
    paginated(res, await answers.listAnswers(params.id, query, req.auth?.userId));
  },
);

export const create = validated(
  { params: idParams, body: answerCreateSchema },
  async ({ params, body }, req, res) => {
    created(res, await answers.createAnswer(params.id, getAuth(req).userId, body.body));
  },
);

export const update = validated(
  { params: idParams, body: answerUpdateSchema },
  async ({ params, body }, req, res) => {
    ok(res, await answers.updateAnswer(params.id, getAuth(req).userId, body.body));
  },
);
