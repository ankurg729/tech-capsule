import {
  CONTENT_LANGUAGES,
  DIFFICULTIES,
  estimateReadingMinutes,
  lessonInputSchema,
  lessonUpdateSchema,
  TECHNOLOGIES,
  type AdminLessonDTO,
} from '@techcapsule/contracts';
import { useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { StatusActions } from '@/components/StatusActions';
import {
  Banner,
  Button,
  Card,
  ErrorBanner,
  optionsOf,
  PageHeader,
  SelectField,
  Spinner,
  StatusBadge,
  TextAreaField,
  TextField,
} from '@/components/ui';
import { BlockEditor } from '@/features/blocks/BlockEditor';
import { BlockPreview } from '@/features/blocks/BlockPreview';
import { apiFormErrors, validate, type FieldErrors } from '@/lib/forms';
import { capitalize, formatDateTime, languageLabel, technologyLabel } from '@/lib/format';
import { errorMessage } from '@/lib/http';
import { useLesson, useLessonStatus, useSaveLesson, type StatusAction } from '@/lib/queries';
import { useUnsavedChanges } from '@/lib/useUnsavedChanges';
import { EMPTY_LESSON, formToLessonInput, lessonToForm, type LessonFormValues } from './lessonForm';

export function LessonEditorRoute() {
  const { id } = useParams();
  return <LessonEditorPage key={id ?? 'new'} id={id} />;
}

function LessonEditorPage({ id }: { id: string | undefined }) {
  const lesson = useLesson(id);
  if (!id) return <LessonForm lesson={null} />;
  if (lesson.isPending) return <Spinner />;
  if (lesson.isError) {
    return (
      <>
        <PageHeader title="Lesson" actions={<Link to="/lessons">Back to lessons</Link>} />
        <ErrorBanner error={lesson.error} onRetry={() => void lesson.refetch()} />
      </>
    );
  }
  return <LessonForm lesson={lesson.data} />;
}

function LessonStatusBar({ lesson, dirty }: { lesson: AdminLessonDTO; dirty: boolean }) {
  const status = useLessonStatus(lesson.id);
  const [pending, setPending] = useState<StatusAction | null>(null);
  return (
    <Card>
      <div className="status-bar">
        <div className="row gap-sm">
          <StatusBadge status={lesson.status} />
          <span className="muted small">
            v{lesson.contentVersion} · updated {formatDateTime(lesson.updatedAt)}
            {lesson.publishedAt ? ` · first published ${formatDateTime(lesson.publishedAt)}` : ''}
          </span>
        </div>
        <StatusActions
          status={lesson.status}
          pending={pending}
          disabled={dirty}
          onAction={(action) => {
            setPending(action);
            status.mutate(action, { onSettled: () => setPending(null) });
          }}
        />
      </div>
      {dirty ? <p className="muted small">Save your changes before changing the status.</p> : null}
      {status.isError ? <Banner>{errorMessage(status.error)}</Banner> : null}
    </Card>
  );
}

function LessonForm({ lesson }: { lesson: AdminLessonDTO | null }) {
  const navigate = useNavigate();
  const isEdit = lesson !== null;
  const save = useSaveLesson(lesson?.id);

  const [baseline, setBaseline] = useState<LessonFormValues>(() =>
    lesson ? lessonToForm(lesson) : EMPTY_LESSON,
  );
  const [values, setValues] = useState<LessonFormValues>(baseline);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [tab, setTab] = useState<'edit' | 'preview'>('edit');

  const dirty = useMemo(
    () => JSON.stringify(values) !== JSON.stringify(baseline),
    [values, baseline],
  );
  const allowNavigation = useUnsavedChanges(dirty);

  const set = <K extends keyof LessonFormValues>(key: K, value: LessonFormValues[K]) =>
    setValues((v) => ({ ...v, [key]: value }));

  const minutes = useMemo(() => {
    try {
      return estimateReadingMinutes(values.blocks);
    } catch {
      return null;
    }
  }, [values.blocks]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSavedAt(null);
    const input = formToLessonInput(values, isEdit);
    const result = validate(isEdit ? lessonUpdateSchema : lessonInputSchema, input);
    if (result.errors) {
      setErrors(result.errors);
      setFormError('Fix the highlighted fields before saving.');
      setTab('edit');
      return;
    }
    setErrors({});
    try {
      const saved = await save.mutateAsync(result.data);
      const next = lessonToForm(saved);
      setBaseline(next);
      setValues(next);
      setSavedAt(Date.now());
      if (!isEdit) {
        allowNavigation();
        navigate(`/lessons/${saved.id}`, { replace: true });
      }
    } catch (err) {
      const { fields, message } = apiFormErrors(err);
      setErrors(fields);
      setFormError(message);
    }
  }

  const tagError = Object.entries(errors).find(([k]) => k === 'tags' || k.startsWith('tags.'))?.[1];

  return (
    <form onSubmit={onSubmit} noValidate>
      <PageHeader
        title={isEdit ? lesson.title : 'New lesson'}
        subtitle={
          isEdit ? (
            <span className="mono">/{lesson.slug}</span>
          ) : (
            'New lessons are saved as drafts. Publish when ready.'
          )
        }
        actions={
          <>
            <Link to="/lessons" className="btn btn-ghost btn-md">
              Back
            </Link>
            <Button
              type="submit"
              variant="primary"
              busy={save.isPending}
              disabled={!dirty && isEdit}
            >
              {isEdit ? 'Save changes' : 'Create draft'}
            </Button>
          </>
        }
      />

      {isEdit ? <LessonStatusBar lesson={lesson} dirty={dirty} /> : null}
      {formError ? <Banner>{formError}</Banner> : null}
      {savedAt && !dirty ? <Banner tone="success">Saved.</Banner> : null}

      <Card title="Details">
        <div className="grid-2">
          <TextField
            label="Title"
            value={values.title}
            onChange={(e) => set('title', e.target.value)}
            error={errors.title}
            maxLength={150}
          />
          <TextField
            label="Slug (optional)"
            value={values.slug}
            onChange={(e) => set('slug', e.target.value.toLowerCase())}
            error={errors.slug}
            hint={
              isEdit
                ? 'Changing the slug breaks existing shared links.'
                : 'Generated from the title when left blank.'
            }
          />
        </div>
        <TextAreaField
          label="Summary"
          rows={2}
          value={values.summary}
          onChange={(e) => set('summary', e.target.value)}
          error={errors.summary}
          maxLength={500}
        />
        <div className="grid-4">
          <SelectField
            label="Technology"
            options={optionsOf(TECHNOLOGIES, technologyLabel)}
            value={values.technology}
            onValueChange={(v) => set('technology', v)}
            error={errors.technology}
          />
          <SelectField
            label="Difficulty"
            options={optionsOf(DIFFICULTIES, capitalize)}
            value={values.difficulty}
            onValueChange={(v) => set('difficulty', v)}
          />
          <SelectField
            label="Language"
            options={optionsOf(CONTENT_LANGUAGES, languageLabel)}
            value={values.language}
            onValueChange={(v) => set('language', v)}
          />
          <TextField
            label="Tags"
            value={values.tags}
            onChange={(e) => set('tags', e.target.value)}
            error={tagError}
            hint="Comma-separated, up to 10."
          />
        </div>
        <TextField
          label="Cover image URL (optional)"
          type="url"
          value={values.coverImageUrl}
          onChange={(e) => set('coverImageUrl', e.target.value)}
          error={errors.coverImageUrl}
        />
      </Card>

      <Card
        title="Content"
        actions={
          <div className="row gap-sm">
            {minutes !== null ? <span className="muted small">≈ {minutes} min read</span> : null}
            <div className="tabs" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'edit'}
                className={tab === 'edit' ? 'active' : ''}
                onClick={() => setTab('edit')}
              >
                Edit
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'preview'}
                className={tab === 'preview' ? 'active' : ''}
                onClick={() => setTab('preview')}
              >
                Preview
              </button>
            </div>
          </div>
        }
      >
        {tab === 'edit' ? (
          <BlockEditor
            blocks={values.blocks}
            onChange={(blocks) => set('blocks', blocks)}
            errors={errors}
          />
        ) : (
          <BlockPreview
            title={values.title}
            summary={values.summary}
            blocks={values.blocks}
            meta={`${technologyLabel(values.technology)} · ${capitalize(values.difficulty)} · ${languageLabel(values.language)}`}
          />
        )}
      </Card>
    </form>
  );
}
