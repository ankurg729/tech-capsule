import {
  CONTENT_LANGUAGES,
  CONTENT_STATUSES,
  TECHNOLOGIES,
  type ContentLanguage,
  type ContentStatus,
  type Technology,
} from '@techcapsule/contracts';
import { Link } from 'react-router';
import {
  EmptyState,
  ErrorBanner,
  FilterBar,
  optionsOf,
  PageHeader,
  Pagination,
  SearchField,
  SelectField,
  Spinner,
  StatusBadge,
} from '@/components/ui';
import { capitalize, formatDateTime, languageLabel, technologyLabel } from '@/lib/format';
import { useLessons } from '@/lib/queries';
import { useListParams } from '@/lib/useListParams';

export function LessonsPage() {
  const { values, page, setFilter, setPage } = useListParams([
    'q',
    'status',
    'technology',
    'language',
  ] as const);
  const lessons = useLessons({
    page,
    limit: 20,
    q: values.q || undefined,
    status: values.status || undefined,
    technology: values.technology || undefined,
    language: values.language || undefined,
  });

  return (
    <>
      <PageHeader
        title="Lessons"
        subtitle="Drafts are never visible through public lesson APIs."
        actions={
          <Link className="btn btn-primary btn-md" to="/lessons/new">
            New lesson
          </Link>
        }
      />
      <FilterBar>
        <SearchField
          label="Search titles"
          value={values.q}
          onCommit={(v) => setFilter('q', v)}
          placeholder="e.g. MCP"
        />
        <SelectField
          label="Status"
          options={optionsOf<ContentStatus>(CONTENT_STATUSES, capitalize, 'Any status')}
          value={values.status as ContentStatus | ''}
          onValueChange={(v) => setFilter('status', v)}
        />
        <SelectField
          label="Technology"
          options={optionsOf<Technology>(TECHNOLOGIES, technologyLabel, 'All technologies')}
          value={values.technology as Technology | ''}
          onValueChange={(v) => setFilter('technology', v)}
        />
        <SelectField
          label="Language"
          options={optionsOf<ContentLanguage>(CONTENT_LANGUAGES, languageLabel, 'All languages')}
          value={values.language as ContentLanguage | ''}
          onValueChange={(v) => setFilter('language', v)}
        />
      </FilterBar>

      {lessons.isPending ? (
        <Spinner />
      ) : lessons.isError ? (
        <ErrorBanner error={lessons.error} onRetry={() => void lessons.refetch()} />
      ) : lessons.data.items.length === 0 ? (
        <EmptyState title="No lessons match these filters">
          Clear the filters or create a new lesson.
        </EmptyState>
      ) : (
        <>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Status</th>
                  <th>Technology</th>
                  <th>Language</th>
                  <th>Level</th>
                  <th>Read</th>
                  <th>Rating</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {lessons.data.items.map((l) => (
                  <tr key={l.id}>
                    <td>
                      <Link to={`/lessons/${l.id}`} className="strong">
                        {l.title}
                      </Link>
                      <small className="muted mono block">{l.slug}</small>
                    </td>
                    <td>
                      <StatusBadge status={l.status} />
                    </td>
                    <td>{technologyLabel(l.technology)}</td>
                    <td>{languageLabel(l.language)}</td>
                    <td>{capitalize(l.difficulty)}</td>
                    <td className="nowrap">{l.estimatedMinutes} min</td>
                    <td className="nowrap">
                      {l.ratingAvg === null ? '—' : `${l.ratingAvg.toFixed(1)} (${l.ratingCount})`}
                    </td>
                    <td className="nowrap">{formatDateTime(l.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination meta={lessons.data.meta} onPage={setPage} />
        </>
      )}
    </>
  );
}
