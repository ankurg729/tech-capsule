import {
  REPORT_STATUSES,
  type ReportDTO,
  type ReportResolveInput,
  type ReportStatus,
} from '@techcapsule/contracts';
import { useState } from 'react';
import {
  Banner,
  Button,
  EmptyState,
  ErrorBanner,
  FilterBar,
  optionsOf,
  PageHeader,
  Pagination,
  SelectField,
  Spinner,
  StatusBadge,
  TextField,
} from '@/components/ui';
import { capitalize, formatDateTime } from '@/lib/format';
import { errorMessage } from '@/lib/http';
import { useReports, useResolveReport } from '@/lib/queries';
import { useListParams } from '@/lib/useListParams';

type Action = ReportResolveInput['action'];

const ACTION_LABELS: Record<Action, string> = {
  dismiss: 'Dismiss report',
  'hide-content': 'Hide content',
  'restore-content': 'Restore content',
};

function ReportCard({ report }: { report: ReportDTO }) {
  const resolve = useResolveReport();
  const [note, setNote] = useState('');
  const [pending, setPending] = useState<Action | null>(null);

  const moderate: Action =
    report.target?.moderation === 'hidden' ? 'restore-content' : 'hide-content';
  // Settled reports can still be reversed, but dismissing them again would be a no-op.
  const actions: Action[] = report.status === 'open' ? [moderate, 'dismiss'] : [moderate];

  return (
    <article className="report card">
      <header className="report-head">
        <div className="row gap-sm">
          <StatusBadge status={report.status} />
          <span className="badge">{report.targetType}</span>
          <strong>{capitalize(report.reason)}</strong>
        </div>
        <span className="muted small">
          by {report.reporter.displayName} · {formatDateTime(report.createdAt)}
        </span>
      </header>
      {report.details ? <p className="report-details">“{report.details}”</p> : null}

      {report.target ? (
        <blockquote className="report-excerpt">
          <p>{report.target.excerpt}</p>
          <footer className="muted small">
            {report.target.author.displayName} · content is currently{' '}
            <strong>{report.target.moderation}</strong>
          </footer>
        </blockquote>
      ) : (
        <p className="muted">The reported content no longer exists.</p>
      )}

      {report.resolution ? (
        <p className="muted small">
          Resolved: <code>{report.resolution.action}</code> on{' '}
          {formatDateTime(report.resolution.resolvedAt)}
          {report.resolution.note ? ` — “${report.resolution.note}”` : ''}
        </p>
      ) : null}

      {report.target ? (
        <div className="report-actions">
          <TextField
            label="Moderator note (optional, recorded in the audit log)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={1000}
          />
          <div className="row gap-sm">
            {actions.map((action) => (
              <Button
                key={action}
                variant={action === 'hide-content' ? 'danger' : 'secondary'}
                busy={pending === action}
                disabled={pending !== null}
                onClick={() => {
                  setPending(action);
                  resolve.mutate(
                    { id: report.id, action, note: note.trim() || undefined },
                    { onSettled: () => setPending(null) },
                  );
                }}
              >
                {ACTION_LABELS[action]}
              </Button>
            ))}
          </div>
          {resolve.isError ? <Banner>{errorMessage(resolve.error)}</Banner> : null}
        </div>
      ) : null}
    </article>
  );
}

export function ReportsPage() {
  const { values, page, setFilter, setPage } = useListParams(['status'] as const);
  const status = (values.status || 'open') as ReportStatus;
  const reports = useReports({ page, limit: 20, status });

  return (
    <>
      <PageHeader
        title="Reports"
        subtitle="Hiding content removes it from every public listing; related open reports are settled together."
      />
      <FilterBar>
        <SelectField
          label="Status"
          options={optionsOf<ReportStatus>(REPORT_STATUSES, capitalize)}
          value={status}
          onValueChange={(v) => setFilter('status', v === 'open' ? '' : v)}
        />
      </FilterBar>
      {reports.isPending ? (
        <Spinner />
      ) : reports.isError ? (
        <ErrorBanner error={reports.error} onRetry={() => void reports.refetch()} />
      ) : reports.data.items.length === 0 ? (
        <EmptyState title={status === 'open' ? 'Queue is clear' : `No ${status} reports`} />
      ) : (
        <>
          <div className="stack">
            {reports.data.items.map((r) => (
              <ReportCard key={r.id} report={r} />
            ))}
          </div>
          <Pagination meta={reports.data.meta} onPage={setPage} />
        </>
      )}
    </>
  );
}
