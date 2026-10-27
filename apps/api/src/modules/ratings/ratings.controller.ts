import { lessonIdParamSchema, ratingInputSchema } from '@techcapsule/contracts';
import { ok, validated } from '../../lib/http.js';
import { getAuth } from '../../middleware/auth.js';
import { rateLesson } from './ratings.service.js';

export const rate = validated(
  { params: lessonIdParamSchema, body: ratingInputSchema },
  async ({ params, body }, req, res) => {
    ok(res, await rateLesson(getAuth(req).userId, params.id, body.stars));
  },
);
