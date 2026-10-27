import { ApiError } from './api/http';

type Issues = { issues: readonly { path: readonly PropertyKey[]; message: string }[] };
type SafeParse<T> = { success: true; data: T } | { success: false; error: Issues };

export type FieldErrors = Record<string, string>;

/** Validates with a shared contracts schema; returns the parsed data or per-field messages. */
export function validate<T>(
  schema: { safeParse: (v: unknown) => SafeParse<T> },
  values: unknown,
): { data: T; errors: null } | { data: null; errors: FieldErrors } {
  const result = schema.safeParse(values);
  if (result.success) return { data: result.data, errors: null };
  const errors: FieldErrors = {};
  for (const issue of result.error.issues) {
    const key = String(issue.path[0] ?? 'form');
    if (!errors[key]) errors[key] = issue.message;
  }
  return { data: null, errors };
}

/** Splits an API failure into field errors (validation) and a general message. */
export function apiFormErrors(err: unknown): { fields: FieldErrors; message: string | null } {
  if (err instanceof ApiError) {
    const fields = err.fieldErrors();
    return { fields, message: Object.keys(fields).length ? null : err.message };
  }
  return { fields: {}, message: 'Something went wrong. Please try again.' };
}
