import {
  CONTENT_LANGUAGES,
  DIFFICULTIES,
  TECHNOLOGIES,
  USER_ROLES,
  type ContentLanguage,
  type Difficulty,
  type Technology,
  type UserRole,
} from '@techcapsule/contracts';
import { Schema, model, type Types } from 'mongoose';

export interface UserDoc {
  _id: Types.ObjectId;
  email: string;
  passwordHash: string;
  displayName: string;
  role: UserRole;
  status: 'active' | 'suspended';
  emailVerifiedAt: Date | null;
  preferences: {
    language: ContentLanguage;
    interests: Technology[];
    experienceLevel: Difficulty;
    dailyGoalMinutes: number;
    timezone: string;
  };
  passwordChangedAt: Date | null;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<UserDoc>(
  {
    // Always stored normalised (trimmed + lowercased) by the auth service; the unique index
    // therefore enforces case-insensitive uniqueness.
    email: { type: String, required: true, lowercase: true, trim: true, maxlength: 254 },
    passwordHash: { type: String, required: true, select: false },
    displayName: { type: String, required: true, trim: true, minlength: 2, maxlength: 50 },
    role: { type: String, enum: USER_ROLES, default: 'user', required: true },
    status: { type: String, enum: ['active', 'suspended'], default: 'active' },
    emailVerifiedAt: { type: Date, default: null },
    preferences: {
      language: { type: String, enum: CONTENT_LANGUAGES, default: 'en' },
      interests: { type: [{ type: String, enum: TECHNOLOGIES }], default: [] },
      experienceLevel: { type: String, enum: DIFFICULTIES, default: 'beginner' },
      dailyGoalMinutes: { type: Number, default: 10, min: 5, max: 30 },
      timezone: { type: String, default: 'UTC', maxlength: 64 },
    },
    passwordChangedAt: { type: Date, default: null },
    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true },
);

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ role: 1 });

export const User = model<UserDoc>('User', userSchema);
