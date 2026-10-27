import type { PaginationMeta } from '@techcapsule/contracts';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { z } from 'zod';

export function ok<T>(res: Response, data: T, status = 200) {
  res.status(status).json({ data });
}

export function created<T>(res: Response, data: T) {
  ok(res, data, 201);
}

export interface PageResult<T> {
  items: T[];
  meta: PaginationMeta;
}

export function paginated<T>(res: Response, result: PageResult<T>) {
  res.status(200).json({ data: result.items, meta: result.meta });
}

export function pageMeta(page: number, limit: number, total: number): PaginationMeta {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return { page, limit, total, totalPages, hasNextPage: page < totalPages };
}

type Out<S> = S extends z.ZodType ? z.output<S> : undefined;

interface Schemas<B, Q, P> {
  body?: B;
  query?: Q;
  params?: P;
}

export interface ValidatedInput<B, Q, P> {
  body: Out<B>;
  query: Out<Q>;
  params: Out<P>;
}

/**
 * Wraps a controller so its body/query/params are parsed with Zod before it runs.
 * Validation failures reach the central error handler as ZodErrors (400 VALIDATION_ERROR).
 */
export function validated<
  B extends z.ZodType | undefined = undefined,
  Q extends z.ZodType | undefined = undefined,
  P extends z.ZodType | undefined = undefined,
>(
  schemas: Schemas<B, Q, P>,
  handler: (input: ValidatedInput<B, Q, P>, req: Request, res: Response) => Promise<void> | void,
): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = {
        body: schemas.body ? schemas.body.parse(req.body ?? {}) : undefined,
        query: schemas.query ? schemas.query.parse(req.query) : undefined,
        params: schemas.params ? schemas.params.parse(req.params) : undefined,
      } as ValidatedInput<B, Q, P>;
      await handler(input, req, res);
    } catch (err) {
      next(err);
    }
  };
}
