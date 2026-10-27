import { Schema, model, type Types } from 'mongoose';

/**
 * One row per issued refresh token. Only a SHA-256 hash of the token is stored.
 * Tokens rotate on every refresh; all tokens descending from one login share a `familyId`
 * so that replay of an already-rotated token revokes the whole family.
 */
export interface RefreshSessionDoc {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  familyId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
  revokedReason: 'rotated' | 'logout' | 'reuse-detected' | 'password-reset' | null;
  replacedBy: Types.ObjectId | null;
  userAgent: string | null;
  ip: string | null;
  createdAt: Date;
}

const refreshSessionSchema = new Schema<RefreshSessionDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    familyId: { type: String, required: true },
    tokenHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
    revokedReason: { type: String, default: null },
    replacedBy: { type: Schema.Types.ObjectId, default: null },
    userAgent: { type: String, default: null, maxlength: 300 },
    ip: { type: String, default: null, maxlength: 64 },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

refreshSessionSchema.index({ tokenHash: 1 }, { unique: true });
refreshSessionSchema.index({ userId: 1, revokedAt: 1 });
refreshSessionSchema.index({ familyId: 1 });
// MongoDB purges expired sessions automatically.
refreshSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RefreshSession = model<RefreshSessionDoc>('RefreshSession', refreshSessionSchema);
