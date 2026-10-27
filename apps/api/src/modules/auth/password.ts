import argon2 from 'argon2';
import { env } from '../../config/env.js';

// OWASP-recommended argon2id baseline: m=19 MiB, t=2, p=1.
const options = {
  type: argon2.argon2id,
  memoryCost: env.ARGON2_MEMORY_KIB,
  timeCost: 2,
  parallelism: 1,
} as const;

export function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, options);
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}

let dummyHash: Promise<string> | null = null;

/** Burns the same CPU as a real verification so login timing doesn't reveal unknown emails. */
export async function verifyAgainstDummy(password: string): Promise<void> {
  dummyHash ??= hashPassword('dummy-password-for-timing-1');
  await verifyPassword(await dummyHash, password);
}
