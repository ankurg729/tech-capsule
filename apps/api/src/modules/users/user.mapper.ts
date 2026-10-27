import type { AuthorDTO, UserDTO } from '@techcapsule/contracts';
import type { Types } from 'mongoose';
import type { UserDoc } from './user.model.js';

export function toUserDTO(user: UserDoc): UserDTO {
  return {
    id: user._id.toString(),
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    emailVerified: user.emailVerifiedAt !== null,
    preferences: {
      language: user.preferences.language,
      interests: [...user.preferences.interests],
      experienceLevel: user.preferences.experienceLevel,
      dailyGoalMinutes: user.preferences.dailyGoalMinutes,
      timezone: user.preferences.timezone,
    },
    createdAt: user.createdAt.toISOString(),
  };
}

export type AuthorLookup = Map<string, AuthorDTO>;

const DELETED_AUTHOR: AuthorDTO = { id: '', displayName: 'Deleted user' };

export function authorFrom(lookup: AuthorLookup, id: Types.ObjectId | string): AuthorDTO {
  return lookup.get(id.toString()) ?? DELETED_AUTHOR;
}
