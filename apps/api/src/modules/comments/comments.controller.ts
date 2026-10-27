import { commentCreateSchema, commentListQuerySchema } from '@techcapsule/contracts';
import { created, paginated, validated } from '../../lib/http.js';
import { getAuth } from '../../middleware/auth.js';
import * as comments from './comments.service.js';

export const create = validated({ body: commentCreateSchema }, async ({ body }, req, res) => {
  created(res, await comments.createComment(getAuth(req).userId, body));
});

export const list = validated({ query: commentListQuerySchema }, async ({ query }, _req, res) => {
  paginated(res, await comments.listComments(query.targetType, query.targetId, query));
});
