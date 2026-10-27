import { reportCreateSchema } from '@techcapsule/contracts';
import { created, validated } from '../../lib/http.js';
import { getAuth } from '../../middleware/auth.js';
import * as reports from './reports.service.js';

export const create = validated({ body: reportCreateSchema }, async ({ body }, req, res) => {
  created(res, await reports.createReport(getAuth(req).userId, body));
});
