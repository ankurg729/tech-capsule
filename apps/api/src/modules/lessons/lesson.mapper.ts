import type { AdminLessonDTO, LessonSummaryDTO } from '@techcapsule/contracts';
import { iso } from '../../lib/dates.js';
import type { LessonDoc } from './lesson.model.js';

/** Projection for list views: never loads lesson blocks. */
export const LESSON_SUMMARY_FIELDS =
  'slug title summary technology tags difficulty language estimatedMinutes coverImageUrl ratingSum ratingCount publishedAt';

export type LessonSummarySource = Pick<
  LessonDoc,
  | '_id'
  | 'slug'
  | 'title'
  | 'summary'
  | 'technology'
  | 'tags'
  | 'difficulty'
  | 'language'
  | 'estimatedMinutes'
  | 'coverImageUrl'
  | 'ratingSum'
  | 'ratingCount'
  | 'publishedAt'
>;

export function ratingAvg(sum: number, count: number): number | null {
  return count > 0 ? Math.round((sum / count) * 10) / 10 : null;
}

export function toLessonSummary(l: LessonSummarySource): LessonSummaryDTO {
  return {
    id: l._id.toString(),
    slug: l.slug,
    title: l.title,
    summary: l.summary,
    technology: l.technology,
    tags: l.tags,
    difficulty: l.difficulty,
    language: l.language,
    estimatedMinutes: l.estimatedMinutes,
    coverImageUrl: l.coverImageUrl ?? null,
    ratingAvg: ratingAvg(l.ratingSum, l.ratingCount),
    ratingCount: l.ratingCount,
    publishedAt: iso(l.publishedAt),
  };
}

export function toAdminLesson(l: LessonDoc): AdminLessonDTO {
  return {
    ...toLessonSummary(l),
    status: l.status,
    blocks: l.blocks,
    contentVersion: l.contentVersion,
    publishedAt: iso(l.publishedAt),
    archivedAt: iso(l.archivedAt),
    createdAt: l.createdAt.toISOString(),
    updatedAt: l.updatedAt.toISOString(),
  };
}
