import { env } from '../../config/env.js';
import type { EmailProvider } from './email.types.js';
import { LogEmailProvider, ResendEmailProvider, SmtpEmailProvider } from './providers.js';

function createProvider(): EmailProvider {
  switch (env.EMAIL_PROVIDER) {
    case 'smtp':
      return new SmtpEmailProvider(env.EMAIL_FROM, {
        host: env.SMTP_HOST!,
        port: env.SMTP_PORT,
        secure: env.SMTP_SECURE,
        user: env.SMTP_USER,
        password: env.SMTP_PASSWORD,
      });
    case 'resend':
      return new ResendEmailProvider(env.EMAIL_FROM, env.RESEND_API_KEY!);
    case 'log':
      return new LogEmailProvider();
  }
}

export const emailProvider = createProvider();

export const devOutbox = emailProvider instanceof LogEmailProvider ? emailProvider : null;

export * from './email.types.js';
export * from './templates.js';
