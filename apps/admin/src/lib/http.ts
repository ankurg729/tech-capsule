import type { ApiErrorBody, ErrorCode, PaginationMeta } from '@techcapsule/contracts';

export const API_BASE = '/api/v1';

export type ClientErrorCode = ErrorCode | 'NETWORK_ERROR' | 'BAD_RESPONSE';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ClientErrorCode,
    message: string,
    readonly details?: unknown,
    readonly requestId?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** Validation details from the API (`[{ path, message }]`) keyed by dotted path. */
  fieldErrors(): Record<string, string> {
    const out: Record<string, string> = {};
    if (!Array.isArray(this.details)) return out;
    for (const d of this.details as { path?: unknown; message?: unknown }[]) {
      if (typeof d.path === 'string' && typeof d.message === 'string' && !(d.path in out)) {
        out[d.path] = d.message;
      }
    }
    return out;
  }
}

export type QueryValue = string | number | boolean | null | undefined;

export interface RawRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, QueryValue>;
  accessToken?: string | null;
  signal?: AbortSignal;
}

export interface Envelope<T> {
  data: T;
  meta?: PaginationMeta;
}

export function buildPath(path: string, query?: Record<string, QueryValue>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
  }
  const qs = params.toString();
  return `${API_BASE}${path}${qs ? `?${qs}` : ''}`;
}

/**
 * Low-level fetch against the API. `X-Client: web` makes the API use the httpOnly refresh
 * cookie, and the API only honours that cookie when the header is present (CSRF guard).
 */
export async function rawRequest<T>(
  path: string,
  { method = 'GET', body, query, accessToken, signal }: RawRequestOptions = {},
): Promise<Envelope<T>> {
  const headers: Record<string, string> = { Accept: 'application/json', 'X-Client': 'web' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  let res: Response;
  try {
    res = await fetch(buildPath(path, query), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: 'same-origin',
      signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    throw new ApiError(0, 'NETWORK_ERROR', 'Cannot reach the API. Is it running on port 4000?');
  }

  const text = await res.text();
  let json: unknown = undefined;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      throw new ApiError(res.status, 'BAD_RESPONSE', `Unexpected response (HTTP ${res.status})`);
    }
  }

  if (!res.ok) {
    const error = (json as Partial<ApiErrorBody> | undefined)?.error;
    throw new ApiError(
      res.status,
      error?.code ?? 'BAD_RESPONSE',
      error?.message ?? `Request failed (HTTP ${res.status})`,
      error?.details,
      error?.requestId,
    );
  }
  if (!json || typeof json !== 'object' || !('data' in json)) {
    throw new ApiError(res.status, 'BAD_RESPONSE', 'Unexpected response from the API');
  }
  return json as Envelope<T>;
}

export function errorMessage(err: unknown, fallback = 'Something went wrong'): string {
  if (err instanceof ApiError) return err.message;
  return fallback;
}
