import type { z } from 'zod';
import { ApiError } from './http';

export type FieldErrors = Record<string, string>;

export function issuesToFieldErrors(issues: readonly z.core.$ZodIssue[]): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of issues) {
    const key = issue.path.map(String).join('.');
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}

/** Runs a shared contract schema locally so admins see the same rules the API enforces. */
export function validate<S extends z.ZodType>(
  schema: S,
  values: unknown,
): { data: z.output<S>; errors: null } | { data: null; errors: FieldErrors } {
  const result = schema.safeParse(values);
  return result.success
    ? { data: result.data, errors: null }
    : { data: null, errors: issuesToFieldErrors(result.error.issues) };
}

export function apiFormErrors(err: unknown): { fields: FieldErrors; message: string } {
  if (err instanceof ApiError) return { fields: err.fieldErrors(), message: err.message };
  return { fields: {}, message: 'Something went wrong' };
}

/** Errors whose path starts with `prefix.`, re-keyed relative to it. */
export function scopeErrors(errors: FieldErrors, prefix: string): FieldErrors {
  const out: FieldErrors = {};
  const p = `${prefix}.`;
  for (const [key, message] of Object.entries(errors)) {
    if (key === prefix) out[''] = message;
    else if (key.startsWith(p)) out[key.slice(p.length)] = message;
  }
  return out;
}

/** Turns blank optional inputs into `undefined` so they are omitted from the request. */
export function blankToUndefined(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}
