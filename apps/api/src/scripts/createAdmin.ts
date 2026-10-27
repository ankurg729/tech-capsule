import { emailSchema, passwordSchema } from '@techcapsule/contracts';
import { createInterface } from 'node:readline/promises';
import { env } from '../config/env.js';
import { connectDatabase, disconnectDatabase } from '../db/connection.js';
import { upsertAdmin } from './runSeed.js';

/**
 * Usage: npm run create-admin -- admin@example.com
 * The password is read from ADMIN_PASSWORD or prompted, so it never lands in shell history.
 */
async function main() {
  const email = emailSchema.parse(process.argv[2] ?? process.env.ADMIN_EMAIL);
  let password = process.env.ADMIN_PASSWORD;
  if (!password) {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    password = await rl.question('Admin password (min 10 chars, letters + numbers): ');
    rl.close();
  }
  passwordSchema.parse(password);

  await connectDatabase(env.MONGODB_URI);
  const result = await upsertAdmin(email, password);
  console.info(`Admin ${result}: ${email}`);
  await disconnectDatabase();
}

main().catch(async (err) => {
  console.error(err instanceof Error ? err.message : err);
  await disconnectDatabase();
  process.exit(1);
});
