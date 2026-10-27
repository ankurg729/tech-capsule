import type { AuthorDTO, UpdateProfileInput } from '@techcapsule/contracts';
import type { Types } from 'mongoose';
import { notFound } from '../../lib/errors.js';
import type { AuthorLookup } from './user.mapper.js';
import { User, type UserDoc } from './user.model.js';

export async function updateProfile(userId: string, input: UpdateProfileInput): Promise<UserDoc> {
  const $set: Record<string, unknown> = {};
  if (input.displayName !== undefined) $set.displayName = input.displayName;
  for (const [key, value] of Object.entries(input.preferences ?? {})) {
    if (value !== undefined) {
      $set[`preferences.${key}`] = key === 'interests' ? [...new Set(value as string[])] : value;
    }
  }
  const user = await User.findByIdAndUpdate(
    userId,
    { $set },
    { returnDocument: 'after', runValidators: true },
  ).lean();
  if (!user) throw notFound('User');
  return user;
}

/** Batch-loads public author info for a set of user ids (one query, no N+1). */
export async function loadAuthors(ids: (Types.ObjectId | string)[]): Promise<AuthorLookup> {
  const unique = [...new Set(ids.map(String))];
  if (!unique.length) return new Map();
  const users = await User.find({ _id: { $in: unique } })
    .select('displayName')
    .lean();
  return new Map<string, AuthorDTO>(
    users.map((u) => [u._id.toString(), { id: u._id.toString(), displayName: u.displayName }]),
  );
}
