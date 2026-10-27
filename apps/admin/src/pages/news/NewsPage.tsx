import {
  CONTENT_STATUSES,
  NEWS_CATEGORIES,
  type ContentStatus,
  type NewsCategory,
} from '@techcapsule/contracts';
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
import { capitalize, categoryLabel, formatDateTime } from '@/lib/format';
import { useNewsList } from '@/lib/queries';
import { useListParams } from '@/lib/useListParams';

export function NewsPage() {
  const { values, page, setFilter, setPage } = useListParams(['status', 'category'] as const);
  const news = useNewsList({
    page,
    limit: 20,
    status: values.status || undefined,
    category: values.category || undefined,
  });

  return (
    <>
      <PageHeader
        title="News"
        subtitle="Only admin-published articles appear in the app. Always credit the original source."
        actions={
          <Link className="btn btn-primary btn-md" to="/news/new">
            New article
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
        <SelectField
          label="Category"
          options={optionsOf<NewsCategory>(NEWS_CATEGORIES, categoryLabel, 'All categories')}
          value={values.category as NewsCategory | ''}
          onValueChange={(v) => setFilter('category', v)}
        />
      </FilterBar>
      {news.isPending ? (
        <Spinner />
      ) : news.isError ? (
        <ErrorBanner error={news.error} onRetry={() => void news.refetch()} />
      ) : news.data.items.length === 0 ? (
        <EmptyState title="No articles match these filters" />
      ) : (
        <>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Status</th>
                  <th>Category</th>
                  <th>Source</th>
                  <th>Published</th>
                </tr>
              </thead>
              <tbody>
                {news.data.items.map((n) => (
                  <tr key={n.id}>
                    <td>
                      <Link to={`/news/${n.id}`} className="strong">
                        {n.title}
                      </Link>
                      {n.isSample ? <span className="badge badge-sample">Sample</span> : null}
                    </td>
                    <td>
                      <StatusBadge status={n.status} />
                    </td>
                    <td>{categoryLabel(n.category)}</td>
                    <td>{n.sourceName}</td>
                    <td className="nowrap">{formatDateTime(n.publishedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination meta={news.data.meta} onPage={setPage} />
        </>
      )}
    </>
  );
}
