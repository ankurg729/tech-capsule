import { voteParamsSchema } from '@techcapsule/contracts';
import { ok, validated } from '../../lib/http.js';
import { getAuth } from '../../middleware/auth.js';
import * as votes from './votes.service.js';

export const vote = validated({ params: voteParamsSchema }, async ({ params }, req, res) => {
  ok(res, await votes.vote(getAuth(req).userId, params.targetType, params.targetId));
});

export const unvote = validated({ params: voteParamsSchema }, async ({ params }, req, res) => {
  ok(res, await votes.unvote(getAuth(req).userId, params.targetType, params.targetId));
});
