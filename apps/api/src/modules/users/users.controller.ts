import { updateProfileInputSchema } from '@techcapsule/contracts';
import { ok, validated } from '../../lib/http.js';
import { getAuth } from '../../middleware/auth.js';
import { getMe } from '../auth/auth.service.js';
import { toUserDTO } from './user.mapper.js';
import * as users from './users.service.js';

export const me = validated({}, async (_input, req, res) => {
  ok(res, toUserDTO(await getMe(getAuth(req).userId)));
});

export const updateMe = validated(
  { body: updateProfileInputSchema },
  async ({ body }, req, res) => {
    ok(res, toUserDTO(await users.updateProfile(getAuth(req).userId, body)));
  },
);
