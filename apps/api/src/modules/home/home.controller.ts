import { ok, validated } from '../../lib/http.js';
import { getHomeFeed } from './home.service.js';

export const feed = validated({}, async (_input, req, res) => {
  ok(res, await getHomeFeed(req.auth?.userId));
});
