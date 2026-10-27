import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';

const envFile = resolve(process.cwd(), '.env');
if (process.env.NODE_ENV !== 'test' && existsSync(envFile)) {
  process.loadEnvFile(envFile);
}

const bool = z.enum(['true', 'false', '1', '0']).transform((v) => v === 'true' || v === '1');

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(4000),
    HOST: z.string().default('0.0.0.0'),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
    TRUST_PROXY: z.coerce.number().int().min(0).max(10).default(0),

    MONGODB_URI: z.string().default('mongodb://127.0.0.1:27017/techcapsule'),

    JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
    AUTH_CODE_SECRET: z.string().min(32, 'AUTH_CODE_SECRET must be at least 32 characters'),
    ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().min(60).max(3600).default(900),
    REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(30),
    ARGON2_MEMORY_KIB: z.coerce.number().int().min(1024).default(19_456),

    CORS_ORIGINS: z
      .string()
      .default('http://localhost:5173')
      .transform((s) =>
        s
          .split(',')
          .map((o) => o.trim())
          .filter(Boolean),
      ),

    EMAIL_PROVIDER: z.enum(['log', 'smtp', 'resend']).default('log'),
    EMAIL_FROM: z.string().default('TechCapsule <no-reply@techcapsule.dev>'),
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().int().default(587),
    SMTP_SECURE: bool.default(false),
    SMTP_USER: z.string().optional(),
    SMTP_PASSWORD: z.string().optional(),
    RESEND_API_KEY: z.string().optional(),
    APP_DEEP_LINK_BASE: z.string().default('techcapsule://'),

    RATE_LIMIT_ENABLED: bool.default(true),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === 'production' && env.EMAIL_PROVIDER === 'log') {
      ctx.addIssue({
        code: 'custom',
        path: ['EMAIL_PROVIDER'],
        message: 'EMAIL_PROVIDER=log is not allowed in production; configure smtp or resend',
      });
    }
    if (env.EMAIL_PROVIDER === 'smtp' && !env.SMTP_HOST) {
      ctx.addIssue({
        code: 'custom',
        path: ['SMTP_HOST'],
        message: 'SMTP_HOST is required for smtp',
      });
    }
    if (env.EMAIL_PROVIDER === 'resend' && !env.RESEND_API_KEY) {
      ctx.addIssue({
        code: 'custom',
        path: ['RESEND_API_KEY'],
        message: 'RESEND_API_KEY is required for resend',
      });
    }
    if (env.NODE_ENV === 'production' && env.JWT_ACCESS_SECRET.startsWith('change-me')) {
      ctx.addIssue({ code: 'custom', path: ['JWT_ACCESS_SECRET'], message: 'Set a real secret' });
    }
  });

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment configuration:');
  for (const issue of parsed.error.issues) {
    console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
  }
  console.error('Copy apps/api/.env.example to apps/api/.env and fill in the values.');
  process.exit(1);
}

export const env = parsed.data;
export const isProduction = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';
