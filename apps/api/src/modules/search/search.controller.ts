import { searchQuerySchema } from '@techcapsule/contracts';
import { ok, validated } from '../../lib/http.js';
import { search } from './search.service.js';

export const run = validated({ query: searchQuerySchema }, async ({ query }, req, res) => {
  ok(res, await search(query, req.auth?.userId));
});
