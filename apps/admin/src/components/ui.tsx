import type { ContentStatus, PaginationMeta } from '@techcapsule/contracts';
import {
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { ApiError } from '@/lib/http';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export function Button({
  variant = 'secondary',
  size = 'md',
  busy = false,
  className = '',
  children,
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: 'sm' | 'md';
  busy?: boolean;
}) {
  return (
    <button
      type="button"
      className={`btn btn-${variant} btn-${size} ${className}`}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      {...rest}
    >
      {busy ? <span className="spinner spinner-sm" aria-hidden /> : null}
      {children}
    </button>
  );
}

interface FieldProps {
  label: string;
  error?: string | undefined;
  hint?: ReactNode;
  children: (id: string, describedBy: string | undefined) => ReactNode;
  className?: string;
}

export function Field({ label, error, hint, children, className = '' }: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;
  return (
    <div className={`field ${error ? 'field-invalid' : ''} ${className}`}>
      <label htmlFor={id}>{label}</label>
      {children(id, describedBy)}
      {hint ? (
        <p className="field-hint" id={hintId}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p className="field-error" id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

type Labelled = { label: string; error?: string | undefined; hint?: ReactNode; className?: string };

export function TextField({
  label,
  error,
  hint,
  className,
  ...input
}: Labelled & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <Field label={label} error={error} hint={hint} className={className}>
      {(id, describedBy) => (
        <input id={id} aria-invalid={!!error} aria-describedby={describedBy} {...input} />
      )}
    </Field>
  );
}

export function TextAreaField({
  label,
  error,
  hint,
  className,
  ...input
}: Labelled & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <Field label={label} error={error} hint={hint} className={className}>
      {(id, describedBy) => (
        <textarea id={id} aria-invalid={!!error} aria-describedby={describedBy} {...input} />
      )}
    </Field>
  );
}

export function SelectField<V extends string>({
  label,
  error,
  hint,
  className,
  options,
  value,
  onValueChange,
  ...rest
}: Labelled &
  Omit<SelectHTMLAttributes<HTMLSelectElement>, 'value' | 'onChange'> & {
    options: readonly { value: V; label: string }[];
    value: V | '';
    onValueChange: (value: V) => void;
  }) {
  return (
    <Field label={label} error={error} hint={hint} className={className}>
      {(id, describedBy) => (
        <select
          id={id}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          value={value}
          onChange={(e) => onValueChange(e.target.value as V)}
          {...rest}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )}
    </Field>
  );
}

export function Checkbox({
  label,
  checked,
  onChange,
  hint,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  hint?: string;
}) {
  return (
    <label className="checkbox">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>
        {label}
        {hint ? <small>{hint}</small> : null}
      </span>
    </label>
  );
}

export function StatusBadge({ status }: { status: ContentStatus | string }) {
  return <span className={`badge badge-${status}`}>{status}</span>;
}

export function Banner({
  tone = 'error',
  children,
  action,
}: {
  tone?: 'error' | 'info' | 'success' | 'warning';
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className={`banner banner-${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      <div>{children}</div>
      {action}
    </div>
  );
}

export function ErrorBanner({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const message = error instanceof ApiError ? error.message : 'Something went wrong';
  const requestId = error instanceof ApiError ? error.requestId : undefined;
  return (
    <Banner
      action={
        onRetry ? (
          <Button size="sm" onClick={onRetry}>
            Retry
          </Button>
        ) : undefined
      }
    >
      {message}
      {requestId ? <small className="muted"> (request {requestId})</small> : null}
    </Banner>
  );
}

export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="loading" role="status">
      <span className="spinner" aria-hidden />
      <span>{label}</span>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="page-header">
      <div>
        <h1>{title}</h1>
        {subtitle ? <p className="muted">{subtitle}</p> : null}
      </div>
      {actions ? <div className="page-actions">{actions}</div> : null}
    </header>
  );
}

export function Pagination({
  meta,
  onPage,
}: {
  meta: PaginationMeta | undefined;
  onPage: (page: number) => void;
}) {
  if (!meta || meta.total === 0) return null;
  return (
    <nav className="pagination" aria-label="Pagination">
      <span className="muted">
        Page {meta.page} of {meta.totalPages} · {meta.total} total
      </span>
      <div>
        <Button size="sm" disabled={meta.page <= 1} onClick={() => onPage(meta.page - 1)}>
          Previous
        </Button>
        <Button size="sm" disabled={!meta.hasNextPage} onClick={() => onPage(meta.page + 1)}>
          Next
        </Button>
      </div>
    </nav>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <strong>{title}</strong>
      {children ? <p className="muted">{children}</p> : null}
    </div>
  );
}

export function Card({
  title,
  children,
  actions,
}: {
  title?: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <section className="card">
      {title || actions ? (
        <div className="card-head">
          {title ? <h2>{title}</h2> : <span />}
          {actions}
        </div>
      ) : null}
      {children}
    </section>
  );
}

/** Text filter that commits to the URL 300 ms after the admin stops typing. */
export function SearchField({
  label,
  value,
  onCommit,
  placeholder,
}: {
  label: string;
  value: string;
  onCommit: (value: string) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState(value);
  const commit = useRef(onCommit);
  useEffect(() => {
    commit.current = onCommit;
  });
  useEffect(() => setDraft(value), [value]);
  useEffect(() => {
    if (draft.trim() === value) return;
    const t = setTimeout(() => commit.current(draft.trim()), 300);
    return () => clearTimeout(t);
  }, [draft, value]);

  return (
    <TextField
      label={label}
      type="search"
      placeholder={placeholder}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
    />
  );
}

export function FilterBar({ children }: { children: ReactNode }) {
  return <div className="filter-bar">{children}</div>;
}

type Option<V> = { value: V; label: string };

export function optionsOf<V extends string>(
  values: readonly V[],
  label?: (v: V) => string,
): Option<V>[];
export function optionsOf<V extends string>(
  values: readonly V[],
  label: (v: V) => string,
  allLabel: string,
): Option<V | ''>[];
export function optionsOf<V extends string>(
  values: readonly V[],
  label: (v: V) => string = (v) => v,
  allLabel?: string,
): Option<V | ''>[] {
  const opts: Option<V | ''>[] = values.map((v) => ({ value: v, label: label(v) }));
  return allLabel ? [{ value: '', label: allLabel }, ...opts] : opts;
}
