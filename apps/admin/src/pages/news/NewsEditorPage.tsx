import {
  NEWS_CATEGORIES,
  newsInputSchema,
  newsUpdateSchema,
  type AdminNewsDTO,
  type NewsCategory,
} from '@techcapsule/contracts';
import { useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { StatusActions } from '@/components/StatusActions';
import {
  Banner,
  Button,
  Card,
  Checkbox,
  ErrorBanner,
  optionsOf,
  PageHeader,
  SelectField,
  Spinner,
  StatusBadge,
  TextAreaField,
  TextField,
} from '@/components/ui';
import { apiFormErrors, blankToUndefined, validate, type FieldErrors } from '@/lib/forms';
import { categoryLabel, formatDateTime } from '@/lib/format';
import { errorMessage } from '@/lib/http';
import { useArticle, useArticleStatus, useSaveArticle, type StatusAction } from '@/lib/queries';
import { useUnsavedChanges } from '@/lib/useUnsavedChanges';

interface NewsFormValues {
  title: string;
  slug: string;
  summary: string;
  body: string;
  category: NewsCategory;
  sourceName: string;
  sourceUrl: string;
  imageUrl: string;
  isSample: boolean;
}

const EMPTY: NewsFormValues = {
  title: '',
  slug: '',
  summary: '',
  body: '',
  category: 'ai-tools',
  sourceName: '',
  sourceUrl: '',
  imageUrl: '',
  isSample: false,
};

const toForm = (n: AdminNewsDTO): NewsFormValues => ({
  title: n.title,
  slug: n.slug,
  summary: n.summary,
  body: n.body,
  category: n.category,
  sourceName: n.sourceName,
  sourceUrl: n.sourceUrl,
  imageUrl: n.imageUrl ?? '',
  isSample: n.isSample,
});

export function NewsEditorRoute() {
  const { id } = useParams();
  return <NewsEditorPage key={id ?? 'new'} id={id} />;
}

function NewsEditorPage({ id }: { id: string | undefined }) {
  const article = useArticle(id);
  if (!id) return <NewsForm article={null} />;
  if (article.isPending) return <Spinner />;
  if (article.isError) {
    return (
      <>
        <PageHeader title="Article" actions={<Link to="/news">Back to news</Link>} />
        <ErrorBanner error={article.error} onRetry={() => void article.refetch()} />
      </>
    );
  }
  return <NewsForm article={article.data} />;
}

function NewsPreview({ v }: { v: NewsFormValues }) {
  return (
    <article className="preview" aria-label="Learner preview">
      <span className="pv-meta">
        {categoryLabel(v.category)}
        {v.isSample ? <span className="badge badge-sample">Sample</span> : null}
      </span>
      <h2 className="pv-title">{v.title || 'Untitled article'}</h2>
      {v.summary ? <p className="pv-summary">{v.summary}</p> : null}
      {v.body
        .split(/\n\s*\n/)
        .filter((p) => p.trim())
        .map((p, i) => (
          <p key={i} className="pv-p">
            {p.trim()}
          </p>
        ))}
      <p className="pv-source">
        Source: {v.sourceName || '—'}
        {v.sourceUrl ? <span className="muted mono"> · {v.sourceUrl}</span> : null}
      </p>
    </article>
  );
}

function NewsForm({ article }: { article: AdminNewsDTO | null }) {
  const navigate = useNavigate();
  const isEdit = article !== null;
  const save = useSaveArticle(article?.id);
  const statusMutation = useArticleStatus(article?.id ?? '');
  const [pendingStatus, setPendingStatus] = useState<StatusAction | null>(null);

  const [baseline, setBaseline] = useState<NewsFormValues>(() =>
    article ? toForm(article) : EMPTY,
  );
  const [values, setValues] = useState<NewsFormValues>(baseline);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const dirty = useMemo(
    () => JSON.stringify(values) !== JSON.stringify(baseline),
    [values, baseline],
  );
  const allowNavigation = useUnsavedChanges(dirty);
  const set = <K extends keyof NewsFormValues>(key: K, value: NewsFormValues[K]) =>
    setValues((v) => ({ ...v, [key]: value }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSaved(false);
    const image = blankToUndefined(values.imageUrl);
    const input = {
      ...values,
      slug: blankToUndefined(values.slug),
      imageUrl: image ?? (isEdit ? null : undefined),
    };
    const result = validate(isEdit ? newsUpdateSchema : newsInputSchema, input);
    if (result.errors) {
      setErrors(result.errors);
      setFormError('Fix the highlighted fields before saving.');
      return;
    }
    setErrors({});
    try {
      const savedArticle = await save.mutateAsync(result.data);
      const next = toForm(savedArticle);
      setBaseline(next);
      setValues(next);
      setSaved(true);
      if (!isEdit) {
        allowNavigation();
        navigate(`/news/${savedArticle.id}`, { replace: true });
      }
    } catch (err) {
      const { fields, message } = apiFormErrors(err);
      setErrors(fields);
      setFormError(message);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <PageHeader
        title={isEdit ? article.title : 'New article'}
        subtitle={isEdit ? <span className="mono">/{article.slug}</span> : 'Saved as a draft.'}
        actions={
          <>
            <Link to="/news" className="btn btn-ghost btn-md">
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
              <StatusBadge status={article.status} />
              <span className="muted small">
                updated {formatDateTime(article.updatedAt)}
                {article.publishedAt ? ` · published ${formatDateTime(article.publishedAt)}` : ''}
              </span>
            </div>
            <StatusActions
              status={article.status}
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

      <div className="split">
        <Card title="Article">
          <TextField
            label="Title"
            value={values.title}
            onChange={(e) => set('title', e.target.value)}
            error={errors.title}
          />
          <div className="grid-2">
            <TextField
              label="Slug (optional)"
              value={values.slug}
              onChange={(e) => set('slug', e.target.value.toLowerCase())}
              error={errors.slug}
            />
            <SelectField
              label="Category"
              options={optionsOf(NEWS_CATEGORIES, categoryLabel)}
              value={values.category}
              onValueChange={(v) => set('category', v)}
            />
          </div>
          <TextAreaField
            label="Summary"
            rows={2}
            value={values.summary}
            onChange={(e) => set('summary', e.target.value)}
            error={errors.summary}
          />
          <TextAreaField
            label="Body"
            rows={12}
            value={values.body}
            onChange={(e) => set('body', e.target.value)}
            error={errors.body}
            hint="Plain text. Separate paragraphs with a blank line. Summarize in your own words."
          />
          <div className="grid-2">
            <TextField
              label="Source name"
              value={values.sourceName}
              onChange={(e) => set('sourceName', e.target.value)}
              error={errors.sourceName}
            />
            <TextField
              label="Source URL"
              type="url"
              value={values.sourceUrl}
              onChange={(e) => set('sourceUrl', e.target.value)}
              error={errors.sourceUrl}
            />
          </div>
          <TextField
            label="Image URL (optional)"
            type="url"
            value={values.imageUrl}
            onChange={(e) => set('imageUrl', e.target.value)}
            error={errors.imageUrl}
          />
          <Checkbox
            label="Sample article"
            hint="Shown with a visible “Sample” label in every client. Use for placeholder content."
            checked={values.isSample}
            onChange={(c) => set('isSample', c)}
          />
        </Card>
        <Card title="Preview">
          <NewsPreview v={values} />
        </Card>
      </div>
    </form>
  );
}
