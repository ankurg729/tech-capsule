import { Link } from 'react-router';
import { AuditTable } from '@/components/AuditTable';
import { Card, ErrorBanner, PageHeader, Spinner } from '@/components/ui';
import { useOverview } from '@/lib/queries';

function StatusCounts({
  title,
  to,
  counts,
}: {
  title: string;
  to: string;
  counts: { draft: number; published: number; archived: number };
}) {
  return (
    <Link to={to} className="stat-card">
      <span className="stat-title">{title}</span>
      <span className="stat-value">{counts.published}</span>
      <span className="muted small">
        published · {counts.draft} draft · {counts.archived} archived
      </span>
    </Link>
  );
}

export function OverviewPage() {
  const overview = useOverview();

  return (
    <>
      <PageHeader title="Overview" subtitle="Live counts from the database." />
      {overview.isPending ? (
        <Spinner />
      ) : overview.isError ? (
        <ErrorBanner error={overview.error} onRetry={() => void overview.refetch()} />
      ) : (
        <>
          <div className="stat-grid">
            <StatusCounts title="Lessons" to="/lessons" counts={overview.data.counts.lessons} />
            <StatusCounts title="Learning paths" to="/paths" counts={overview.data.counts.paths} />
            <StatusCounts title="News" to="/news" counts={overview.data.counts.news} />
            <Link to="/reports" className="stat-card">
              <span className="stat-title">Open reports</span>
              <span
                className={`stat-value ${overview.data.counts.openReports ? 'text-warning' : ''}`}
              >
                {overview.data.counts.openReports}
              </span>
              <span className="muted small">awaiting moderation</span>
            </Link>
            <div className="stat-card">
              <span className="stat-title">Users</span>
              <span className="stat-value">{overview.data.counts.users}</span>
              <span className="muted small">{overview.data.counts.verifiedUsers} verified</span>
            </div>
            <div className="stat-card">
              <span className="stat-title">Community</span>
              <span className="stat-value">{overview.data.counts.questions}</span>
              <span className="muted small">
                questions · {overview.data.counts.answers} answers
              </span>
            </div>
          </div>
          <Card title="Recent admin activity" actions={<Link to="/audit">Full audit log</Link>}>
            <AuditTable entries={overview.data.recentAudit} />
          </Card>
        </>
      )}
    </>
  );
}
