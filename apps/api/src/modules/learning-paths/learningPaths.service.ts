import type {
  PathDetailDTO,
  PathListQuery,
  PathSummaryDTO,
  Technology,
} from '@techcapsule/contracts';
import type { Types } from 'mongoose';
import { type QueryFilter } from 'mongoose';
import { notFound } from '../../lib/errors.js';
import { pageMeta, type PageResult } from '../../lib/http.js';
import { escapeRegex } from '../../lib/text.js';
import {
  LESSON_SUMMARY_FIELDS,
  toLessonSummary,
  type LessonSummarySource,
} from '../lessons/lesson.mapper.js';
import { Lesson } from '../lessons/lesson.model.js';
import { progressByLesson } from '../progress/progress.service.js';
import type { UserProgressDoc } from '../progress/userProgress.model.js';
import { LearningPath, type LearningPathDoc } from './learningPath.model.js';

const published = { status: 'published' as const };

interface LessonMeta {
  _id: Types.ObjectId;
  estimatedMinutes: number;
}

/** Builds summaries for many paths with exactly two extra queries (lessons + viewer progress). */
async function toSummaries(paths: LearningPathDoc[], viewerId?: string): Promise<PathSummaryDTO[]> {
  const allIds = paths.flatMap((p) => p.lessonIds);
  const [lessons, progress] = await Promise.all([
    Lesson.find({ _id: { $in: allIds }, ...published })
      .select('estimatedMinutes')
      .lean<LessonMeta[]>(),
    viewerId
      ? progressByLesson(viewerId, allIds)
      : Promise.resolve(new Map<string, UserProgressDoc>()),
  ]);
  const lessonById = new Map(lessons.map((l) => [l._id.toString(), l]));

  return paths.map((p) => {
    const visible = p.lessonIds
      .map((id) => lessonById.get(id.toString()))
      .filter(Boolean) as LessonMeta[];
    const completedCount = visible.filter(
      (l) => progress.get(l._id.toString())?.completedAt,
    ).length;
    return {
      id: p._id.toString(),
      slug: p.slug,
      title: p.title,
      description: p.description,
      technology: p.technology,
      difficulty: p.difficulty,
      coverImageUrl: p.coverImageUrl ?? null,
      lessonCount: visible.length,
      estimatedMinutes: visible.reduce((n, l) => n + l.estimatedMinutes, 0),
      viewerProgress: viewerId
        ? {
            completedCount,
            percent: visible.length ? Math.round((completedCount / visible.length) * 100) : 0,
          }
        : null,
    };
  });
}

export async function listPaths(
  query: PathListQuery,
  viewerId?: string,
): Promise<PageResult<PathSummaryDTO>> {
  const filter: QueryFilter<LearningPathDoc> = { ...published };
  if (query.technology) filter.technology = query.technology;
  if (query.difficulty) filter.difficulty = query.difficulty;
  const [paths, total] = await Promise.all([
    LearningPath.find(filter)
      .sort({ publishedAt: -1, _id: -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .lean<LearningPathDoc[]>(),
    LearningPath.countDocuments(filter),
  ]);
  return {
    items: await toSummaries(paths, viewerId),
    meta: pageMeta(query.page, query.limit, total),
  };
}

export async function getPathDetail(slug: string, viewerId?: string): Promise<PathDetailDTO> {
  const path = await LearningPath.findOne({ slug, ...published }).lean<LearningPathDoc>();
  if (!path) throw notFound('Learning path');

  const [summary] = await toSummaries([path], viewerId);
  const [lessons, progress] = await Promise.all([
    Lesson.find({ _id: { $in: path.lessonIds }, ...published })
      .select(LESSON_SUMMARY_FIELDS)
      .lean<LessonSummarySource[]>(),
    viewerId
      ? progressByLesson(viewerId, path.lessonIds)
      : Promise.resolve(new Map<string, UserProgressDoc>()),
  ]);
  const byId = new Map(lessons.map((l) => [l._id.toString(), l]));
  const ordered = path.lessonIds
    .map((id) => byId.get(id.toString()))
    .filter((l): l is LessonSummarySource => Boolean(l))
    .map((l, i) => {
      const p = progress.get(l._id.toString());
      return {
        ...toLessonSummary(l),
        position: i + 1,
        completed: Boolean(p?.completedAt),
        completionPercent: p?.completionPercent ?? 0,
      };
    });

  return {
    ...summary!,
    lessons: ordered,
    resumeLessonSlug: ordered.find((l) => !l.completed)?.slug ?? null,
  };
}

/** Paths matching the viewer's interests first, then the newest others. */
export async function recommendedPaths(
  interests: Technology[],
  viewerId?: string,
  limit = 5,
): Promise<PathSummaryDTO[]> {
  const preferred = interests.length
    ? await LearningPath.find({ ...published, technology: { $in: interests } })
        .sort({ publishedAt: -1 })
        .limit(limit)
        .lean<LearningPathDoc[]>()
    : [];
  const rest =
    preferred.length < limit
      ? await LearningPath.find({ ...published, _id: { $nin: preferred.map((p) => p._id) } })
          .sort({ publishedAt: -1 })
          .limit(limit - preferred.length)
          .lean<LearningPathDoc[]>()
      : [];
  return toSummaries([...preferred, ...rest], viewerId);
}

export async function searchPaths(
  q: string,
  limit: number,
  viewerId?: string,
): Promise<PathSummaryDTO[]> {
  const hits = await LearningPath.find(
    { ...published, $text: { $search: q } },
    { score: { $meta: 'textScore' } },
  )
    .sort({ score: { $meta: 'textScore' } })
    .limit(limit)
    .lean<LearningPathDoc[]>();
  if (hits.length < limit) {
    const rx = new RegExp(escapeRegex(q), 'i');
    hits.push(
      ...(await LearningPath.find({
        ...published,
        _id: { $nin: hits.map((h) => h._id) },
        title: rx,
      })
        .limit(limit - hits.length)
        .lean<LearningPathDoc[]>()),
    );
  }
  return toSummaries(hits, viewerId);
}
