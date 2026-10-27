import type { PaginationMeta } from '@techcapsule/contracts';
import { session } from '../auth/session';
import { ApiError, rawRequest, type QueryValue, type RequestOptions } from './http';

type Options = Omit<RequestOptions, 'accessToken'>;

/** Attaches the access token and transparently retries once after a refresh on 401. */
async function request<T>(path: string, opts: Options = {}) {
  const token = await session.getAccessToken();
  try {
    return await rawRequest<T>(path, { ...opts, accessToken: token });
  } catch (err) {
    const authFailure =
      err instanceof ApiError &&
      err.status === 401 &&
      (err.code === 'TOKEN_EXPIRED' || err.code === 'INVALID_TOKEN');
    if (authFailure && token) {
      const fresh = await session.refresh();
      if (fresh) return rawRequest<T>(path, { ...opts, accessToken: fresh });
    }
    throw err;
  }
}

export interface Page<T> {
  items: T[];
  meta: PaginationMeta;
}

type Query = Record<string, QueryValue>;

export const api = {
  get: async <T>(path: string, query?: Query, signal?: AbortSignal) =>
    (await request<T>(path, { query, signal })).data,

  page: async <T>(path: string, query?: Query, signal?: AbortSignal): Promise<Page<T>> => {
    const res = await request<T[]>(path, { query, signal });
    if (!res.meta) throw new ApiError(200, 'BAD_RESPONSE', 'Missing pagination metadata');
    return { items: res.data, meta: res.meta };
  },

  post: async <T>(path: string, body?: unknown) =>
    (await request<T>(path, { method: 'POST', body: body ?? {} })).data,

  put: async <T>(path: string, body?: unknown) =>
    (await request<T>(path, { method: 'PUT', body: body ?? {} })).data,

  patch: async <T>(path: string, body: unknown) =>
    (await request<T>(path, { method: 'PATCH', body })).data,

  delete: async <T>(path: string) => (await request<T>(path, { method: 'DELETE' })).data,
};
