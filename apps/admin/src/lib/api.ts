import type { PaginationMeta } from '@techcapsule/contracts';
import { ApiError, rawRequest, type QueryValue, type RawRequestOptions } from './http';
import { session } from './session';

type Options = Omit<RawRequestOptions, 'accessToken'>;

async function request<T>(path: string, options: Options = {}) {
  const token = await session.getAccessToken();
  try {
    return await rawRequest<T>(path, { ...options, accessToken: token });
  } catch (err) {
    if (!(err instanceof ApiError)) throw err;
    if (err.code === 'TOKEN_EXPIRED' || err.code === 'INVALID_TOKEN') {
      await session.refresh();
      return rawRequest<T>(path, { ...options, accessToken: await session.getAccessToken() });
    }
    if (err.status === 403 && err.code === 'FORBIDDEN' && path.startsWith('/admin')) {
      session.revoked();
    }
    throw err;
  }
}

export interface Page<T> {
  items: T[];
  meta: PaginationMeta;
}

export const api = {
  async get<T>(path: string, query?: Record<string, QueryValue>, signal?: AbortSignal) {
    return (await request<T>(path, { query, signal })).data;
  },
  async page<T>(path: string, query?: Record<string, QueryValue>, signal?: AbortSignal) {
    const res = await request<T[]>(path, { query, signal });
    if (!res.meta) throw new ApiError(200, 'BAD_RESPONSE', 'Missing pagination metadata');
    return { items: res.data, meta: res.meta } satisfies Page<T>;
  },
  async post<T>(path: string, body: unknown = {}) {
    return (await request<T>(path, { method: 'POST', body })).data;
  },
  async patch<T>(path: string, body: unknown) {
    return (await request<T>(path, { method: 'PATCH', body })).data;
  },
};
