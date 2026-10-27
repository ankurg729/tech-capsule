import {
  estimateReadingMinutes,
  type AdminLessonDTO,
  type AdminLessonListQuery,
  type ContentBlock,
  type LessonInput,
  type LessonUpdateInput,
} from '@techcapsule/contracts';
import { Types, type Model, type QueryFilter } from 'mongoose';
import { badRequest, notFound } from '../../lib/errors.js';
import { pageMeta, type PageResult } from '../../lib/http.js';
import { resolveSlug } from '../../lib/slugs.js';
import { escapeRegex } from '../../lib/text.js';
import { recordAudit, type AuditActor } from '../admin/audit.service.js';
import { toAdminLesson } from './lesson.mapper.js';
import { Lesson, type LessonDoc } from './lesson.model.js';
import { enqueueIndexJob } from './lessonIndexing.js';

const slugModel = Lesson as unknown as Model<{ slug: string }>;

export function buildSearchText(blocks: ContentBlock[]): string {
  return blocks
    .flatMap((b) => {
      if (b.type === 'heading' || b.type === 'paragraph') return [b.text];
      if (b.type === 'callout') return [b.title ?? '', b.text];
      if (b.type === 'diagram') return b.nodes.map((n) => n.label);
      return [];
    })
    .join(' ')
    .slice(0, 20_000);
}

async function load(id: string): Promise<LessonDoc> {
  if (!Types.ObjectId.isValid(id)) throw notFound('Lesson');
  const lesson = await Lesson.findById(id).lean<LessonDoc>();
  if (!lesson) throw notFound('Lesson');
  return lesson;
}

export async function adminListLessons(
  query: AdminLessonListQuery,
): Promise<PageResult<AdminLessonDTO>> {
  const filter: QueryFilter<LessonDoc> = {};
  if (query.status) filter.status = query.status;
  if (query.technology) filter.technology = query.technology;
  if (query.language) filter.language = query.language;
  if (query.q) filter.title = new RegExp(escapeRegex(query.q), 'i');
  if (query.ids) filter._id = { $in: query.ids.map((id) => new Types.ObjectId(id)) };
  const [docs, total] = await Promise.all([
    Lesson.find(filter)
      .sort({ updatedAt: -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .lean<LessonDoc[]>(),
    Lesson.countDocuments(filter),
  ]);
  return { items: docs.map(toAdminLesson), meta: pageMeta(query.page, query.limit, total) };
}

export async function adminGetLesson(id: string): Promise<AdminLessonDTO> {
  return toAdminLesson(await load(id));
}

export async function adminCreateLesson(
  input: LessonInput,
  actor: AuditActor,
): Promise<AdminLessonDTO> {
  const slug = await resolveSlug(slugModel, input.title, input.slug);
  const doc = await Lesson.create({
    ...input,
    slug,
    coverImageUrl: input.coverImageUrl ?? null,
    searchText: buildSearchText(input.blocks),
    estimatedMinutes: estimateReadingMinutes(input.blocks),
    status: 'draft',
    contentVersion: 1,
    createdBy: new Types.ObjectId(actor.userId),
    updatedBy: new Types.ObjectId(actor.userId),
  });
  await recordAudit(actor, 'lesson.create', 'lesson', doc._id, { slug, title: input.title });
  return toAdminLesson(doc.toObject());
}

export async function adminUpdateLesson(
  id: string,
  input: LessonUpdateInput,
  actor: AuditActor,
): Promise<AdminLessonDTO> {
  const lesson = await load(id);
  const $set: Record<string, unknown> = { ...input, updatedBy: new Types.ObjectId(actor.userId) };
  if (input.slug !== undefined || input.title !== undefined) {
    $set.slug =
      input.slug !== undefined
        ? await resolveSlug(slugModel, input.title ?? lesson.title, input.slug, lesson._id)
        : lesson.slug; // keep existing URLs stable when only the title changes
  }
  const contentChanged = input.blocks !== undefined;
  if (input.blocks) {
    $set.searchText = buildSearchText(input.blocks);
    $set.estimatedMinutes = estimateReadingMinutes(input.blocks);
  }
  const updated = await Lesson.findByIdAndUpdate(
    lesson._id,
    { $set, ...(contentChanged ? { $inc: { contentVersion: 1 } } : {}) },
    { returnDocument: 'after', runValidators: true },
  ).lean<LessonDoc>();

  if (updated!.status === 'published' && (contentChanged || input.language || input.technology)) {
    await enqueueIndexJob(updated!, 'upsert');
  }
  await recordAudit(actor, 'lesson.update', 'lesson', lesson._id, {
    fields: Object.keys(input),
    contentVersion: updated!.contentVersion,
  });
  return toAdminLesson(updated!);
}

export async function adminSetLessonStatus(
  id: string,
  action: 'publish' | 'unpublish' | 'archive',
  actor: AuditActor,
): Promise<AdminLessonDTO> {
  const lesson = await load(id);
  const now = new Date();
  let $set: Partial<LessonDoc>;
  switch (action) {
    case 'publish':
      if (!lesson.blocks.length) throw badRequest('A lesson needs content before publishing');
      $set = { status: 'published', publishedAt: lesson.publishedAt ?? now, archivedAt: null };
      break;
    case 'unpublish':
      $set = { status: 'draft' };
      break;
    case 'archive':
      $set = { status: 'archived', archivedAt: now };
      break;
  }
  const updated = await Lesson.findByIdAndUpdate(
    lesson._id,
    { $set },
    { returnDocument: 'after' },
  ).lean<LessonDoc>();
  await enqueueIndexJob(updated!, action === 'publish' ? 'upsert' : 'delete');
  await recordAudit(actor, `lesson.${action}`, 'lesson', lesson._id, {
    from: lesson.status,
    to: updated!.status,
  });
  return toAdminLesson(updated!);
}
