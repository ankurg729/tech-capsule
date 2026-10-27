import type { Types } from 'mongoose';
import { env } from '../../config/env.js';
import { hmacSha256, oneTimeCode, safeEqualHex } from '../../lib/crypto.js';
import { AppError } from '../../lib/errors.js';
import { AuthCode, type AuthCodePurpose } from './authCode.model.js';

const TTL_MINUTES: Record<AuthCodePurpose, number> = {
  'verify-email': 24 * 60,
  'reset-password': 15,
};
const MAX_ATTEMPTS = 5;

const hashCode = (userId: Types.ObjectId, purpose: AuthCodePurpose, code: string) =>
  hmacSha256(env.AUTH_CODE_SECRET, `${purpose}:${userId.toString()}:${code}`);

/** Creates a fresh code, invalidating any previous unused code for the same purpose. */
export async function issueCode(userId: Types.ObjectId, purpose: AuthCodePurpose) {
  await AuthCode.deleteMany({ userId, purpose, consumedAt: null });
  const code = oneTimeCode();
  const expiresAt = new Date(Date.now() + TTL_MINUTES[purpose] * 60_000);
  await AuthCode.create({ userId, purpose, codeHash: hashCode(userId, purpose, code), expiresAt });
  return { code, expiresAt, ttlMinutes: TTL_MINUTES[purpose] };
}

const invalidCode = () => new AppError(400, 'INVALID_CODE', 'The code is invalid or has expired');

/** Throws INVALID_CODE on any mismatch; each wrong guess counts toward a small attempt limit. */
export async function consumeCode(
  userId: Types.ObjectId,
  purpose: AuthCodePurpose,
  code: string,
): Promise<void> {
  const record = await AuthCode.findOne({
    userId,
    purpose,
    consumedAt: null,
    expiresAt: { $gt: new Date() },
  }).sort({ createdAt: -1 });

  if (!record || record.attempts >= MAX_ATTEMPTS) throw invalidCode();

  if (!safeEqualHex(record.codeHash, hashCode(userId, purpose, code))) {
    await AuthCode.updateOne({ _id: record._id }, { $inc: { attempts: 1 } });
    throw invalidCode();
  }

  const res = await AuthCode.updateOne(
    { _id: record._id, consumedAt: null },
    { $set: { consumedAt: new Date() } },
  );
  if (res.modifiedCount !== 1) throw invalidCode();
}
