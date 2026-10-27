import { CONTENT_STATUSES, type ContentStatus } from '@techcapsule/contracts';
import { Link } from 'react-router';
import {
  EmptyState,
  ErrorBanner,
  FilterBar,
  optionsOf,
  PageHeader,
  Pagination,
  SelectField,
  Spinner,
  StatusBadge,
} from '@/components/ui';
import { capitalize, formatDateTime, technologyLabel } from '@/lib/format';
import { usePaths } from '@/lib/queries';
import { useListParams } from '@/lib/useListParams';

export function PathsPage() {
  const { values, page, setFilter, setPage } = useListParams(['status'] as const);
  const paths = usePaths({ page, limit: 20, status: values.status || undefined });

  return (
    <>
      <PageHeader
        title="Learning paths"
        subtitle="Ordered sequences of lessons. Only published lessons are shown to learners."
        actions={
          <Link className="btn btn-primary btn-md" to="/paths/new">
            New path
          </Link>
        }
      />
      <FilterBar>
        <SelectField
          label="Status"
          options={optionsOf<ContentStatus>(CONTENT_STATUSES, capitalize, 'Any status')}
          value={values.status as ContentStatus | ''}
          onValueChange={(v) => setFilter('status', v)}
        />
      </FilterBar>
      {paths.isPending ? (
        <Spinner />
      ) : paths.isError ? (
        <ErrorBanner error={paths.error} onRetry={() => void paths.refetch()} />
      ) : paths.data.items.length === 0 ? (
        <EmptyState title="No learning paths yet" />
      ) : (
        <>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Status</th>
                  <th>Technology</th>
                  <th>Level</th>
                  <th>Lessons</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {paths.data.items.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <Link to={`/paths/${p.id}`} className="strong">
                        {p.title}
                      </Link>
                      <small className="muted mono block">{p.slug}</small>
                    </td>
                    <td>
                      <StatusBadge status={p.status} />
                    </td>
                    <td>{technologyLabel(p.technology)}</td>
                    <td>{capitalize(p.difficulty)}</td>
                    <td className="nowrap">
                      {p.lessonCount} live / {p.lessonIds.length} total
                    </td>
                    <td className="nowrap">{formatDateTime(p.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination meta={paths.data.meta} onPage={setPage} />
        </>
      )}
    </>
  );
}
