export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

/**
 * `sent`       = accepted by a real provider for delivery.
 * `dev-outbox` = NOT sent; captured locally for development (EMAIL_PROVIDER=log).
 */
export type DeliveryStatus = 'sent' | 'dev-outbox';

export interface EmailProvider {
  readonly name: string;
  send(message: EmailMessage): Promise<DeliveryStatus>;
}
