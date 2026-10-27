import { env } from '../config/env.js';
import { connectDatabase, disconnectDatabase } from '../db/connection.js';
import { logger } from '../lib/logger.js';
import { runSeed } from './runSeed.js';

async function main() {
  await connectDatabase(env.MONGODB_URI);
  const summary = await runSeed({
    adminEmail: process.env.SEED_ADMIN_EMAIL || undefined,
    adminPassword: process.env.SEED_ADMIN_PASSWORD || undefined,
  });
  logger.info({ summary }, 'Seed complete');
  if (summary.admin === 'skipped') {
    logger.info(
      'No admin created. Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD, or run `npm run create-admin`.',
    );
  }
  await disconnectDatabase();
}

main().catch(async (err) => {
  logger.error({ err }, 'Seed failed');
  await disconnectDatabase();
  process.exit(1);
});
