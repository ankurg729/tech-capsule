import { pino } from 'pino';
import { env, isProduction } from '../config/env.js';

export const logger = pino({
  level: env.LOG_LEVEL,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'res.headers["set-cookie"]',
      '*.password',
      '*.refreshToken',
      '*.code',
    ],
    remove: true,
  },
  ...(isProduction || env.NODE_ENV === 'test'
    ? {}
    : {
        transport: { target: 'pino-pretty', options: { colorize: true, ignore: 'pid,hostname' } },
      }),
});
