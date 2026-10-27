import type {
  AdminPathDTO,
  ContentStatus,
  PathInput,
  PathUpdateInput,
} from '@techcapsule/contracts';
import { Types, type Model, type QueryFilter } from 'mongoose';
import { iso } from '../../lib/dates.js';
import { badRequest, notFound } from '../../lib/errors.js';
import { pageMeta, type PageResult } from '../../lib/http.js';
import { resolveSlug } from '../../lib/slugs.js';
import { recordAudit, type AuditActor } from '../admin/audit.service.js';
import { Lesson } from '../lessons/lesson.model.js';
import { LearningPath, type LearningPathDoc } from './learningPath.model.js';

const slugModel = LearningPath as unknown as Model<{ slug: string }>;

async function toAdminPaths(paths: LearningPathDoc[]): Promise<AdminPathDTO[]> {
  const lessons = await Lesson.find({
    _id: { $in: paths.flatMap((p) => p.lessonIds) },
    status: 'published',
  })
    .select('estimatedMinutes')
    .lean();
  const minutes = new Map(lessons.map((l) => [l._id.toString(), l.estimatedMinutes]));
  return paths.map((p) => {
    const visible = p.lessonIds.filter((id) => minutes.has(id.toString()));
    return {
      id: p._id.toString(),
      slug: p.slug,
      title: p.title,
      description: p.description,
      technology: p.technology,
      difficulty: p.difficulty,
      coverImageUrl: p.coverImageUrl ?? null,
      lessonCount: visible.length,
      estimatedMinutes: visible.reduce((n, id) => n + (minutes.get(id.toString()) ?? 0), 0),
      status: p.status,
      lessonIds: p.lessonIds.map(String),
      publishedAt: iso(p.publishedAt),
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    };
  });
}

async function assertLessonsExist(ids: string[]) {
  const found = await Lesson.countDocuments({ _id: { $in: ids }, status: { $ne: 'archived' } });
  if (found !== ids.length)
    throw badRequest('Every lesson in a path must exist and not be archived');
}

async function load(id: string): Promise<LearningPathDoc> {
  if (!Types.ObjectId.isValid(id)) throw notFound('Learning path');
  const p = await LearningPath.findById(id).lean<LearningPathDoc>();
  if (!p) throw notFound('Learning path');
  return p;
}

export async function adminListPaths(query: {
  page: number;
  limit: number;
  status?: ContentStatus | undefined;
}): Promise<PageResult<AdminPathDTO>> {
  const filter: QueryFilter<LearningPathDoc> = query.status ? { status: query.status } : {};
  const [docs, total] = await Promise.all([
    LearningPath.find(filter)
      .sort({ updatedAt: -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .lean<LearningPathDoc[]>(),
    LearningPath.countDocuments(filter),
  ]);
  return { items: await toAdminPaths(docs), meta: pageMeta(query.page, query.limit, total) };
}

export async function adminGetPath(id: string): Promise<AdminPathDTO> {
  const [dto] = await toAdminPaths([await load(id)]);
  return dto!;
}

export async function adminCreatePath(input: PathInput, actor: AuditActor): Promise<AdminPathDTO> {
  await assertLessonsExist(input.lessonIds);
  const slug = await resolveSlug(slugModel, input.title, input.slug);
  const doc = await LearningPath.create({
    ...input,
    slug,
    coverImageUrl: input.coverImageUrl ?? null,
    lessonIds: input.lessonIds.map((id) => new Types.ObjectId(id)),
    createdBy: new Types.ObjectId(actor.userId),
  });
  await recordAudit(actor, 'path.create', 'learning-path', doc._id, { slug });
  return adminGetPath(doc._id.toString());
}

export async function adminUpdatePath(
  id: string,
  input: PathUpdateInput,
  actor: AuditActor,
): Promise<AdminPathDTO> {
  const path = await load(id);
  if (input.lessonIds) await assertLessonsExist(input.lessonIds);
  const $set: Record<string, unknown> = { ...input };
  if (input.slug !== undefined) {
    $set.slug = await resolveSlug(slugModel, input.title ?? path.title, input.slug, path._id);
  }
  if (input.lessonIds) $set.lessonIds = input.lessonIds.map((l) => new Types.ObjectId(l));
  await LearningPath.updateOne({ _id: path._id }, { $set }, { runValidators: true });
  await recordAudit(actor, 'path.update', 'learning-path', path._id, {
    fields: Object.keys(input),
  });
  return adminGetPath(id);
}

export async function adminSetPathStatus(
  id: string,
  action: 'publish' | 'unpublish' | 'archive',
  actor: AuditActor,
): Promise<AdminPathDTO> {
  const path = await load(id);
  const now = new Date();
  if (action === 'publish') {
    const publishedLessons = await Lesson.countDocuments({
      _id: { $in: path.lessonIds },
      status: 'published',
    });
    if (publishedLessons === 0) throw badRequest('Publish at least one lesson in this path first');
  }
  const $set =
    action === 'publish'
      ? { status: 'published', publishedAt: path.publishedAt ?? now, archivedAt: null }
      : action === 'archive'
        ? { status: 'archived', archivedAt: now }
        : { status: 'draft' };
  await LearningPath.updateOne({ _id: path._id }, { $set });
  await recordAudit(actor, `path.${action}`, 'learning-path', path._id, { from: path.status });
  return adminGetPath(id);
}
