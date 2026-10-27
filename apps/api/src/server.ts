import { createApp } from './app.js';
import { env } from './config/env.js';
import { connectDatabase, disconnectDatabase } from './db/connection.js';
import { logger } from './lib/logger.js';

async function main() {
  await connectDatabase(env.MONGODB_URI);
  const app = createApp();
  const server = app.listen(env.PORT, env.HOST, () => {
    logger.info(`TechCapsule API listening on http://${env.HOST}:${env.PORT}`);
    logger.info(`API docs: http://localhost:${env.PORT}/api/docs`);
    if (env.EMAIL_PROVIDER === 'log') {
      logger.warn(
        'EMAIL_PROVIDER=log: emails are NOT sent. Codes appear in this console and at /api/v1/dev/emails',
      );
    }
  });

  const shutdown = (signal: string) => {
    logger.info({ signal }, 'Shutting down');
    server.close(() => {
      void disconnectDatabase().finally(() => process.exit(0));
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err) => {
  logger.fatal({ err }, 'Failed to start API');
  process.exit(1);
});
