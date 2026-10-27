import { AuditTable } from '@/components/AuditTable';
import {
  ErrorBanner,
  FilterBar,
  PageHeader,
  Pagination,
  SearchField,
  SelectField,
  Spinner,
} from '@/components/ui';
import { useAudit } from '@/lib/queries';
import { useListParams } from '@/lib/useListParams';

const TARGET_TYPES = [
  { value: '', label: 'All targets' },
  { value: 'lesson', label: 'Lessons' },
  { value: 'learning-path', label: 'Learning paths' },
  { value: 'news', label: 'News' },
  { value: 'question', label: 'Questions' },
  { value: 'answer', label: 'Answers' },
  { value: 'comment', label: 'Comments' },
] as const;

export function AuditPage() {
  const { values, page, setFilter, setPage } = useListParams(['action', 'targetType'] as const);
  const audit = useAudit({
    page,
    limit: 30,
    action: values.action || undefined,
    targetType: values.targetType || undefined,
  });

  return (
    <>
      <PageHeader
        title="Audit log"
        subtitle="Every admin write (content changes, status changes, moderation) is recorded."
      />
      <FilterBar>
        <SearchField
          label="Action"
          placeholder="e.g. lesson.publish"
          value={values.action}
          onCommit={(v) => setFilter('action', v)}
        />
        <SelectField
          label="Target"
          options={TARGET_TYPES}
          value={values.targetType as (typeof TARGET_TYPES)[number]['value']}
          onValueChange={(v) => setFilter('targetType', v)}
        />
      </FilterBar>
      {audit.isPending ? (
        <Spinner />
      ) : audit.isError ? (
        <ErrorBanner error={audit.error} onRetry={() => void audit.refetch()} />
      ) : (
        <>
          <AuditTable entries={audit.data.items} />
          <Pagination meta={audit.data.meta} onPage={setPage} />
        </>
      )}
    </>
  );
}
