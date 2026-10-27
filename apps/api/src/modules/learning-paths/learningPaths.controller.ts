import { pathListQuerySchema, slugSchema } from '@techcapsule/contracts';
import { z } from 'zod';
import { ok, paginated, validated } from '../../lib/http.js';
import * as paths from './learningPaths.service.js';

export const list = validated({ query: pathListQuerySchema }, async ({ query }, req, res) => {
  paginated(res, await paths.listPaths(query, req.auth?.userId));
});

export const detail = validated(
  { params: z.object({ slug: slugSchema }) },
  async ({ params }, req, res) => {
    ok(res, await paths.getPathDetail(params.slug, req.auth?.userId));
  },
);
