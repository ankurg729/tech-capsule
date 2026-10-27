import type { RequestHandler } from 'express';
import { ipKeyGenerator, rateLimit } from 'express-rate-limit';
import { AppError } from '../lib/errors.js';

export interface RateLimiters {
  global: RequestHandler;
  login: RequestHandler;
  register: RequestHandler;
  passwordReset: RequestHandler;
  verification: RequestHandler;
  refresh: RequestHandler;
  questions: RequestHandler;
  answers: RequestHandler;
  comments: RequestHandler;
  votes: RequestHandler;
  reports: RequestHandler;
}

const passthrough: RequestHandler = (_req, _res, next) => next();

const ipKey = (req: Parameters<RequestHandler>[0]) => ipKeyGenerator(req.ip ?? '0.0.0.0');

function limiter(
  windowMinutes: number,
  limit: number,
  opts: { byUser?: boolean; skipSuccessfulRequests?: boolean } = {},
): RequestHandler {
  return rateLimit({
    windowMs: windowMinutes * 60_000,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skipSuccessfulRequests: opts.skipSuccessfulRequests ?? false,
    keyGenerator: (req) => (opts.byUser && req.auth ? `user:${req.auth.userId}` : ipKey(req)),
    handler: (_req, _res, next) =>
      next(new AppError(429, 'RATE_LIMITED', 'Too many requests. Please try again later.')),
  });
}

/**
 * In-memory stores are fine for a single API instance. When scaling horizontally, plug in a
 * shared store (e.g. rate-limit-redis) here.
 */
export function createRateLimiters(enabled: boolean): RateLimiters {
  if (!enabled) {
    return {
      global: passthrough,
      login: passthrough,
      register: passthrough,
      passwordReset: passthrough,
      verification: passthrough,
      refresh: passthrough,
      questions: passthrough,
      answers: passthrough,
      comments: passthrough,
      votes: passthrough,
      reports: passthrough,
    };
  }
  return {
    global: limiter(1, 300),
    // Only failed attempts count, so legitimate users aren't locked out by their own logins.
    login: limiter(15, 10, { skipSuccessfulRequests: true }),
    register: limiter(60, 10),
    passwordReset: limiter(60, 5),
    verification: limiter(15, 10),
    refresh: limiter(15, 60),
    questions: limiter(60, 10, { byUser: true }),
    answers: limiter(60, 30, { byUser: true }),
    comments: limiter(60, 60, { byUser: true }),
    votes: limiter(60, 300, { byUser: true }),
    reports: limiter(60, 20, { byUser: true }),
  };
}
