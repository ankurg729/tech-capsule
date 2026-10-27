import { z } from 'zod';
import {
  contentLanguageSchema,
  difficultySchema,
  technologySchema,
  type ContentLanguage,
  type Difficulty,
  type Technology,
  type UserRole,
} from './common.js';

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254)
  .pipe(z.email({ message: 'Enter a valid email address' }));

export const passwordSchema = z
  .string()
  .min(10, 'Password must be at least 10 characters')
  .max(128, 'Password must be at most 128 characters')
  .refine((p) => /[A-Za-z]/.test(p) && /\d/.test(p), 'Password must contain letters and numbers');

export const displayNameSchema = z.string().trim().min(2).max(50);

/** One-time codes are sent by email for verification and password reset. */
export const oneTimeCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9]{8}$/, 'Code must be 8 letters or digits');

// Deliberately has no `role` field: unknown keys are stripped, so a client can never self-assign a role.
export const registerInputSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  displayName: displayNameSchema,
});
export type RegisterInput = z.infer<typeof registerInputSchema>;

export const loginInputSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
});
export type LoginInput = z.infer<typeof loginInputSchema>;

/** Mobile sends the refresh token in the body; the admin web app uses an httpOnly cookie. */
export const refreshInputSchema = z.object({
  refreshToken: z.string().min(20).max(200).optional(),
});
export type RefreshInput = z.infer<typeof refreshInputSchema>;

export const logoutInputSchema = refreshInputSchema;

export const forgotPasswordInputSchema = z.object({ email: emailSchema });
export type ForgotPasswordInput = z.infer<typeof forgotPasswordInputSchema>;

export const resetPasswordInputSchema = z.object({
  email: emailSchema,
  code: oneTimeCodeSchema,
  password: passwordSchema,
});
export type ResetPasswordInput = z.infer<typeof resetPasswordInputSchema>;

export const verifyEmailInputSchema = z.object({
  email: emailSchema,
  code: oneTimeCodeSchema,
});
export type VerifyEmailInput = z.infer<typeof verifyEmailInputSchema>;

export const EXPERIENCE_LEVELS = ['beginner', 'intermediate', 'advanced'] as const;
export const DAILY_GOALS = [5, 10, 15, 20, 30] as const;

export const timezoneSchema = z
  .string()
  .max(64)
  .refine((tz) => {
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: tz });
      return true;
    } catch {
      return false;
    }
  }, 'Unknown timezone');

export const preferencesSchema = z.object({
  language: contentLanguageSchema,
  interests: z.array(technologySchema).max(15),
  experienceLevel: difficultySchema,
  dailyGoalMinutes: z
    .number()
    .int()
    .refine((g) => (DAILY_GOALS as readonly number[]).includes(g), {
      message: `Daily goal must be one of ${DAILY_GOALS.join(', ')} minutes`,
    }),
  timezone: timezoneSchema,
});
export type Preferences = z.infer<typeof preferencesSchema>;

export const updateProfileInputSchema = z
  .object({
    displayName: displayNameSchema.optional(),
    preferences: preferencesSchema.partial().optional(),
  })
  .refine((v) => v.displayName !== undefined || v.preferences !== undefined, {
    message: 'Nothing to update',
  });
export type UpdateProfileInput = z.infer<typeof updateProfileInputSchema>;

export interface UserDTO {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  emailVerified: boolean;
  preferences: {
    language: ContentLanguage;
    interests: Technology[];
    experienceLevel: Difficulty;
    dailyGoalMinutes: number;
    timezone: string;
  };
  createdAt: string;
}

export interface AuthTokensDTO {
  accessToken: string;
  accessTokenExpiresAt: string;
  /** Omitted for web clients, which receive it as an httpOnly cookie. */
  refreshToken?: string;
  refreshTokenExpiresAt: string;
}

export interface AuthSessionDTO {
  user: UserDTO;
  tokens: AuthTokensDTO;
}

export interface MessageDTO {
  message: string;
}

/**
 * `sent` = accepted by the email provider; `dev-outbox` = development mode, NOT delivered
 * (read it from the API console or GET /api/v1/dev/emails); `failed` = provider error.
 */
export type EmailDeliveryStatus = 'sent' | 'dev-outbox' | 'failed';

export interface RegisterResultDTO extends AuthSessionDTO {
  verificationEmail: EmailDeliveryStatus;
}

export interface ResendVerificationDTO extends MessageDTO {
  delivery: EmailDeliveryStatus;
}
