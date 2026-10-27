import { newsListQuerySchema, slugSchema } from '@techcapsule/contracts';
import { z } from 'zod';
import { ok, paginated, validated } from '../../lib/http.js';
import * as news from './news.service.js';

export const list = validated({ query: newsListQuerySchema }, async ({ query }, _req, res) => {
  paginated(res, await news.listNews(query));
});

export const detail = validated(
  { params: z.object({ slug: slugSchema }) },
  async ({ params }, req, res) => {
    ok(res, await news.getNewsDetail(params.slug, req.auth?.userId));
  },
);

export const dailyCapsule = validated({}, async (_input, req, res) => {
  ok(res, await news.getDailyCapsule(req.auth?.userId));
});
