import type { ApiErrorBody, ErrorCode, PaginationMeta } from '@techcapsule/contracts';
import { API_URL, REQUEST_TIMEOUT_MS } from '@/config';

export type ClientErrorCode = ErrorCode | 'NETWORK_ERROR' | 'TIMEOUT' | 'BAD_RESPONSE';

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

  get isNetwork() {
    return this.code === 'NETWORK_ERROR' || this.code === 'TIMEOUT';
  }

  /** Field-level messages from a VALIDATION_ERROR response, keyed by the first path segment. */
  fieldErrors(): Record<string, string> {
    const out: Record<string, string> = {};
    if (this.code !== 'VALIDATION_ERROR' || !Array.isArray(this.details)) return out;
    for (const issue of this.details as { path?: string; message?: string }[]) {
      const key = issue.path?.split('.')[0];
      if (key && issue.message && !out[key]) out[key] = issue.message;
    }
    return out;
  }
}

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
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

export function buildUrl(path: string, query?: Record<string, QueryValue>): string {
  const params = Object.entries(query ?? {})
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return `${API_URL}${path}${params.length ? `?${params.join('&')}` : ''}`;
}

/** Unauthenticated transport: envelopes, timeouts and error normalisation. */
export async function rawRequest<T>(path: string, opts: RequestOptions = {}): Promise<Envelope<T>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  opts.signal?.addEventListener('abort', () => controller.abort());

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  if (opts.accessToken) headers.Authorization = `Bearer ${opts.accessToken}`;

  let res: Response;
  try {
    res = await fetch(buildUrl(path, opts.query), {
      method: opts.method ?? 'GET',
      headers,
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
      signal: controller.signal,
    });
  } catch (err) {
    if (controller.signal.aborted && !opts.signal?.aborted) {
      throw new ApiError(0, 'TIMEOUT', 'The server took too long to respond.');
    }
    if (opts.signal?.aborted) throw err;
    throw new ApiError(0, 'NETWORK_ERROR', `Can't reach the TechCapsule server at ${API_URL}.`);
  } finally {
    clearTimeout(timer);
  }

  const text = await res.text();
  let json: unknown = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      throw new ApiError(res.status, 'BAD_RESPONSE', 'The server sent an unexpected response.');
    }
  }

  if (!res.ok) {
    const err = (json as Partial<ApiErrorBody> | null)?.error;
    throw new ApiError(
      res.status,
      err?.code ?? 'INTERNAL_ERROR',
      err?.message ?? `Request failed (${res.status})`,
      err?.details,
      err?.requestId,
    );
  }
  if (!json || typeof json !== 'object' || !('data' in json)) {
    throw new ApiError(res.status, 'BAD_RESPONSE', 'The server sent an unexpected response.');
  }
  return json as Envelope<T>;
}

export function errorMessage(err: unknown, fallback = 'Something went wrong. Please try again.') {
  if (err instanceof ApiError) return err.message;
  return fallback;
}
