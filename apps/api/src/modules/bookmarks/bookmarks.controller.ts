import { objectIdSchema, paginationQuerySchema } from '@techcapsule/contracts';
import { z } from 'zod';
import { ok, paginated, validated } from '../../lib/http.js';
import { getAuth } from '../../middleware/auth.js';
import type { BookmarkTarget } from './bookmark.model.js';
import * as bookmarks from './bookmarks.service.js';

const idParams = z.object({ id: objectIdSchema });

export const add = (type: BookmarkTarget) =>
  validated({ params: idParams }, async ({ params }, req, res) => {
    ok(res, await bookmarks.addBookmark(getAuth(req).userId, type, params.id));
  });

export const remove = (type: BookmarkTarget) =>
  validated({ params: idParams }, async ({ params }, req, res) => {
    ok(res, await bookmarks.removeBookmark(getAuth(req).userId, type, params.id));
  });

export const bookmarkListQuerySchema = paginationQuerySchema.extend({
  type: z.enum(['lesson', 'news']).default('lesson'),
});

export const list = validated({ query: bookmarkListQuerySchema }, async ({ query }, req, res) => {
  paginated(res, await bookmarks.listBookmarks(getAuth(req).userId, query.type, query));
});
