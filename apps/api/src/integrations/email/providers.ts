import nodemailer, { type Transporter } from 'nodemailer';
import { logger } from '../../lib/logger.js';
import type { DeliveryStatus, EmailMessage, EmailProvider } from './email.types.js';

export interface OutboxEntry extends EmailMessage {
  createdAt: string;
}

const OUTBOX_LIMIT = 50;

/** Development/test provider. Emails are never delivered; they're kept in memory and logged. */
export class LogEmailProvider implements EmailProvider {
  readonly name = 'log';
  private readonly outbox: OutboxEntry[] = [];

  async send(message: EmailMessage): Promise<DeliveryStatus> {
    this.outbox.unshift({ ...message, createdAt: new Date().toISOString() });
    this.outbox.length = Math.min(this.outbox.length, OUTBOX_LIMIT);
    logger.info(
      { to: message.to, subject: message.subject },
      `[email:log] NOT SENT (dev outbox). Preview:\n${message.text}`,
    );
    return 'dev-outbox';
  }

  list(): OutboxEntry[] {
    return [...this.outbox];
  }

  clear(): void {
    this.outbox.length = 0;
  }
}

export class SmtpEmailProvider implements EmailProvider {
  readonly name = 'smtp';
  private readonly transporter: Transporter;

  constructor(
    private readonly from: string,
    options: { host: string; port: number; secure: boolean; user?: string; password?: string },
  ) {
    this.transporter = nodemailer.createTransport({
      host: options.host,
      port: options.port,
      secure: options.secure,
      auth: options.user ? { user: options.user, pass: options.password } : undefined,
    });
  }

  async send(message: EmailMessage): Promise<DeliveryStatus> {
    await this.transporter.sendMail({ from: this.from, ...message });
    return 'sent';
  }
}

export class ResendEmailProvider implements EmailProvider {
  readonly name = 'resend';

  constructor(
    private readonly from: string,
    private readonly apiKey: string,
  ) {}

  async send(message: EmailMessage): Promise<DeliveryStatus> {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: this.from, ...message }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      throw new Error(`Resend rejected email: ${res.status} ${await res.text()}`);
    }
    return 'sent';
  }
}
