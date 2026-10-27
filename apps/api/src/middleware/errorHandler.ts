import type { ApiErrorBody } from '@techcapsule/contracts';
import type { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import { ZodError } from 'zod';
import { AppError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';

function send(res: Response, status: number, body: ApiErrorBody) {
  res.status(status).json(body);
}

export function notFoundHandler(req: Request, res: Response) {
  send(res, 404, {
    error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.path} not found` },
  });
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  const requestId = String(req.id ?? '');

  if (err instanceof AppError) {
    return send(res, err.status, {
      error: { code: err.code, message: err.message, details: err.details, requestId },
    });
  }
  if (err instanceof ZodError) {
    return send(res, 400, {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: err.issues.map((i) => ({
          path: i.path.join('.'),
          message: i.message,
          code: i.code,
        })),
        requestId,
      },
    });
  }
  if (err instanceof mongoose.Error.CastError) {
    return send(res, 400, {
      error: { code: 'BAD_REQUEST', message: `Invalid ${err.path}`, requestId },
    });
  }
  if (err instanceof mongoose.Error.ValidationError) {
    return send(res, 400, {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: Object.values(err.errors).map((e) => ({ path: e.path, message: e.message })),
        requestId,
      },
    });
  }
  if ((err as { code?: number }).code === 11000) {
    return send(res, 409, {
      error: { code: 'CONFLICT', message: 'Resource already exists', requestId },
    });
  }
  const httpErr = err as { type?: string; status?: number };
  if (httpErr.type === 'entity.parse.failed') {
    return send(res, 400, {
      error: { code: 'BAD_REQUEST', message: 'Malformed JSON body', requestId },
    });
  }
  if (httpErr.type === 'entity.too.large') {
    return send(res, 413, {
      error: { code: 'BAD_REQUEST', message: 'Request body too large', requestId },
    });
  }

  logger.error({ err, requestId, path: req.path }, 'Unhandled error');
  return send(res, 500, {
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Something went wrong. Please try again.',
      requestId,
    },
  });
}
