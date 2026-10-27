import {
  DIFFICULTIES,
  pathInputSchema,
  pathUpdateSchema,
  TECHNOLOGIES,
  type AdminLessonDTO,
  type AdminPathDTO,
  type Difficulty,
  type Technology,
} from '@techcapsule/contracts';
import { useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { StatusActions } from '@/components/StatusActions';
import {
  Banner,
  Button,
  Card,
  EmptyState,
  ErrorBanner,
  optionsOf,
  PageHeader,
  SearchField,
  SelectField,
  Spinner,
  StatusBadge,
  TextAreaField,
  TextField,
} from '@/components/ui';
import { moveItem } from '@/features/blocks/blockModel';
import { apiFormErrors, blankToUndefined, validate, type FieldErrors } from '@/lib/forms';
import { capitalize, formatDateTime, technologyLabel } from '@/lib/format';
import { errorMessage } from '@/lib/http';
import {
  useLessons,
  useLessonsByIds,
  usePath,
  usePathStatus,
  useSavePath,
  type StatusAction,
} from '@/lib/queries';
import { useUnsavedChanges } from '@/lib/useUnsavedChanges';

interface PathFormValues {
  title: string;
  slug: string;
  description: string;
  technology: Technology;
  difficulty: Difficulty;
  coverImageUrl: string;
  lessonIds: string[];
}

const EMPTY: PathFormValues = {
  title: '',
  slug: '',
  description: '',
  technology: 'mcp',
  difficulty: 'beginner',
  coverImageUrl: '',
  lessonIds: [],
};

const toForm = (p: AdminPathDTO): PathFormValues => ({
  title: p.title,
  slug: p.slug,
  description: p.description,
  technology: p.technology,
  difficulty: p.difficulty,
  coverImageUrl: p.coverImageUrl ?? '',
  lessonIds: p.lessonIds,
});

export function PathEditorRoute() {
  const { id } = useParams();
  return <PathEditorPage key={id ?? 'new'} id={id} />;
}

function PathEditorPage({ id }: { id: string | undefined }) {
  const path = usePath(id);
  if (!id) return <PathForm path={null} />;
  if (path.isPending) return <Spinner />;
  if (path.isError) {
    return (
      <>
        <PageHeader title="Learning path" actions={<Link to="/paths">Back to paths</Link>} />
        <ErrorBanner error={path.error} onRetry={() => void path.refetch()} />
      </>
    );
  }
  return <PathForm path={path.data} />;
}

function LessonPicker({
  selected,
  onAdd,
}: {
  selected: string[];
  onAdd: (lesson: AdminLessonDTO) => void;
}) {
  const [q, setQ] = useState('');
  const results = useLessons({ q: q || undefined, limit: 10, page: 1 });
  const candidates = (results.data?.items ?? []).filter(
    (l) => l.status !== 'archived' && !selected.includes(l.id),
  );
  return (
    <div className="picker">
      <SearchField
        label="Find lessons to add"
        value={q}
        onCommit={setQ}
        placeholder="Search titles"
      />
      {results.isError ? <ErrorBanner error={results.error} /> : null}
      <ul className="picker-list">
        {candidates.map((l) => (
          <li key={l.id}>
            <span>
              {l.title} <StatusBadge status={l.status} />
            </span>
            <Button size="sm" onClick={() => onAdd(l)} disabled={selected.length >= 50}>
              Add
            </Button>
          </li>
        ))}
        {results.data && candidates.length === 0 ? (
          <li className="muted small">No matching lessons to add.</li>
        ) : null}
      </ul>
    </div>
  );
}

function PathForm({ path }: { path: AdminPathDTO | null }) {
  const navigate = useNavigate();
  const isEdit = path !== null;
  const save = useSavePath(path?.id);
  const statusMutation = usePathStatus(path?.id ?? '');
  const [pendingStatus, setPendingStatus] = useState<StatusAction | null>(null);

  const [baseline, setBaseline] = useState<PathFormValues>(() => (path ? toForm(path) : EMPTY));
  const [values, setValues] = useState<PathFormValues>(baseline);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  // Titles for lessons added in this session, so they render before the lookup refetches.
  const [known, setKnown] = useState<Record<string, AdminLessonDTO>>({});

  const dirty = useMemo(
    () => JSON.stringify(values) !== JSON.stringify(baseline),
    [values, baseline],
  );
  const allowNavigation = useUnsavedChanges(dirty);
  const resolved = useLessonsByIds(baseline.lessonIds);
  const lessonById = useMemo(() => {
    const map = new Map<string, AdminLessonDTO>(Object.entries(known));
    for (const l of resolved.data?.items ?? []) map.set(l.id, l);
    return map;
  }, [known, resolved.data]);

  const set = <K extends keyof PathFormValues>(key: K, value: PathFormValues[K]) =>
    setValues((v) => ({ ...v, [key]: value }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSaved(false);
    const cover = blankToUndefined(values.coverImageUrl);
    const input = {
      title: values.title,
      slug: blankToUndefined(values.slug),
      description: values.description,
      technology: values.technology,
      difficulty: values.difficulty,
      coverImageUrl: cover ?? (isEdit ? null : undefined),
      lessonIds: values.lessonIds,
    };
    const result = validate(isEdit ? pathUpdateSchema : pathInputSchema, input);
    if (result.errors) {
      setErrors(result.errors);
      setFormError('Fix the highlighted fields before saving.');
      return;
    }
    setErrors({});
    try {
      const savedPath = await save.mutateAsync(result.data);
      const next = toForm(savedPath);
      setBaseline(next);
      setValues(next);
      setSaved(true);
      if (!isEdit) {
        allowNavigation();
        navigate(`/paths/${savedPath.id}`, { replace: true });
      }
    } catch (err) {
      const { fields, message } = apiFormErrors(err);
      setErrors(fields);
      setFormError(message);
    }
  }

  const drafts = values.lessonIds.filter((id) => lessonById.get(id)?.status === 'draft').length;

  return (
    <form onSubmit={onSubmit} noValidate>
      <PageHeader
        title={isEdit ? path.title : 'New learning path'}
        subtitle={isEdit ? <span className="mono">/{path.slug}</span> : 'Saved as a draft.'}
        actions={
          <>
            <Link to="/paths" className="btn btn-ghost btn-md">
              Back
            </Link>
            <Button
              type="submit"
              variant="primary"
              busy={save.isPending}
              disabled={isEdit && !dirty}
            >
              {isEdit ? 'Save changes' : 'Create draft'}
            </Button>
          </>
        }
      />

      {isEdit ? (
        <Card>
          <div className="status-bar">
            <div className="row gap-sm">
              <StatusBadge status={path.status} />
              <span className="muted small">
                {path.lessonCount} published lessons · ≈ {path.estimatedMinutes} min · updated{' '}
                {formatDateTime(path.updatedAt)}
              </span>
            </div>
            <StatusActions
              status={path.status}
              pending={pendingStatus}
              disabled={dirty}
              onAction={(action) => {
                setPendingStatus(action);
                statusMutation.mutate(action, { onSettled: () => setPendingStatus(null) });
              }}
            />
          </div>
          {statusMutation.isError ? <Banner>{errorMessage(statusMutation.error)}</Banner> : null}
        </Card>
      ) : null}
      {formError ? <Banner>{formError}</Banner> : null}
      {saved && !dirty ? <Banner tone="success">Saved.</Banner> : null}

      <Card title="Details">
        <div className="grid-2">
          <TextField
            label="Title"
            value={values.title}
            onChange={(e) => set('title', e.target.value)}
            error={errors.title}
          />
          <TextField
            label="Slug (optional)"
            value={values.slug}
            onChange={(e) => set('slug', e.target.value.toLowerCase())}
            error={errors.slug}
          />
        </div>
        <TextAreaField
          label="Description"
          rows={3}
          value={values.description}
          onChange={(e) => set('description', e.target.value)}
          error={errors.description}
        />
        <div className="grid-3">
          <SelectField
            label="Technology"
            options={optionsOf(TECHNOLOGIES, technologyLabel)}
            value={values.technology}
            onValueChange={(v) => set('technology', v)}
          />
          <SelectField
            label="Difficulty"
            options={optionsOf(DIFFICULTIES, capitalize)}
            value={values.difficulty}
            onValueChange={(v) => set('difficulty', v)}
          />
          <TextField
            label="Cover image URL (optional)"
            type="url"
            value={values.coverImageUrl}
            onChange={(e) => set('coverImageUrl', e.target.value)}
            error={errors.coverImageUrl}
          />
        </div>
      </Card>

      <Card title={`Lessons (${values.lessonIds.length})`}>
        {errors.lessonIds ? <p className="field-error">{errors.lessonIds}</p> : null}
        {drafts > 0 ? (
          <Banner tone="info">
            {drafts} draft {drafts === 1 ? 'lesson is' : 'lessons are'} hidden from learners until
            published.
          </Banner>
        ) : null}
        {values.lessonIds.length === 0 ? (
          <EmptyState title="No lessons in this path">Add at least one lesson below.</EmptyState>
        ) : (
          <ol className="ordered-list">
            {values.lessonIds.map((lessonId, i) => {
              const l = lessonById.get(lessonId);
              return (
                <li key={lessonId}>
                  <span className="position">{i + 1}</span>
                  <span className="grow">
                    {l ? (
                      <>
                        <Link to={`/lessons/${l.id}`}>{l.title}</Link>{' '}
                        <StatusBadge status={l.status} />
                      </>
                    ) : resolved.isPending ? (
                      <span className="muted">Loading…</span>
                    ) : (
                      <span className="muted mono">{lessonId} (not found)</span>
                    )}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label="Move up"
                    disabled={i === 0}
                    onClick={() => set('lessonIds', moveItem(values.lessonIds, i, i - 1))}
                  >
                    ↑
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label="Move down"
                    disabled={i === values.lessonIds.length - 1}
                    onClick={() => set('lessonIds', moveItem(values.lessonIds, i, i + 1))}
                  >
                    ↓
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      set(
                        'lessonIds',
                        values.lessonIds.filter((x) => x !== lessonId),
                      )
                    }
                  >
                    Remove
                  </Button>
                </li>
              );
            })}
          </ol>
        )}
        <LessonPicker
          selected={values.lessonIds}
          onAdd={(lesson) => {
            setKnown((k) => ({ ...k, [lesson.id]: lesson }));
            set('lessonIds', [...values.lessonIds, lesson.id]);
          }}
        />
      </Card>
    </form>
  );
}
