import { Schema, model, type Types } from 'mongoose';

export type AuthCodePurpose = 'verify-email' | 'reset-password';

/** Short-lived one-time codes for email verification and password reset (stored as HMAC). */
export interface AuthCodeDoc {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  purpose: AuthCodePurpose;
  codeHash: string;
  attempts: number;
  expiresAt: Date;
  consumedAt: Date | null;
  createdAt: Date;
}

const authCodeSchema = new Schema<AuthCodeDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    purpose: { type: String, enum: ['verify-email', 'reset-password'], required: true },
    codeHash: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true },
    consumedAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

authCodeSchema.index({ userId: 1, purpose: 1, createdAt: -1 });
authCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const AuthCode = model<AuthCodeDoc>('AuthCode', authCodeSchema);
