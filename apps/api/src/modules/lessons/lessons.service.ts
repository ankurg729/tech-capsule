import {
  toPublicBlock,
  type LessonDetailDTO,
  type LessonListQuery,
  type LessonSummaryDTO,
  type QuizAnswerResult,
  type Technology,
} from '@techcapsule/contracts';
import { Types, type QueryFilter } from 'mongoose';
import { daysSinceEpoch } from '../../lib/dates.js';
import { AppError, notFound } from '../../lib/errors.js';
import { pageMeta, type PageResult } from '../../lib/http.js';
import { escapeRegex } from '../../lib/text.js';
import { Bookmark } from '../bookmarks/bookmark.model.js';
import { recordQuizAnswer } from '../progress/progress.service.js';
import { UserProgress } from '../progress/userProgress.model.js';
import { LessonRating } from '../ratings/lessonRating.model.js';
import {
  LESSON_SUMMARY_FIELDS,
  toLessonSummary,
  type LessonSummarySource,
} from './lesson.mapper.js';
import { Lesson, type LessonDoc } from './lesson.model.js';
import { getPublishedLessonById } from './lesson.queries.js';

export { getPublishedLessonById };

const published = { status: 'published' as const };

export async function listLessons(query: LessonListQuery): Promise<PageResult<LessonSummaryDTO>> {
  const filter: QueryFilter<LessonDoc> = { ...published };
  if (query.technology) filter.technology = query.technology;
  if (query.difficulty) filter.difficulty = query.difficulty;
  if (query.language) filter.language = query.language;
  if (query.tag) filter.tags = query.tag;
  if (query.q) filter.$text = { $search: query.q };

  const sort: Record<string, 1 | -1 | { $meta: 'textScore' }> = query.q
    ? { score: { $meta: 'textScore' }, publishedAt: -1 }
    : query.sort === 'top-rated'
      ? { ratingCount: -1, ratingSum: -1, publishedAt: -1 }
      : { publishedAt: -1, _id: -1 };

  const [docs, total] = await Promise.all([
    Lesson.find(filter, query.q ? { score: { $meta: 'textScore' } } : {})
      .select(LESSON_SUMMARY_FIELDS)
      .sort(sort)
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .lean<LessonSummarySource[]>(),
    Lesson.countDocuments(filter),
  ]);
  return { items: docs.map(toLessonSummary), meta: pageMeta(query.page, query.limit, total) };
}

export async function getLessonDetail(slug: string, viewerId?: string): Promise<LessonDetailDTO> {
  const lesson = await Lesson.findOne({ slug, ...published }).lean<LessonDoc>();
  if (!lesson) throw notFound('Lesson');

  let viewer: LessonDetailDTO['viewer'] = null;
  if (viewerId) {
    const userId = new Types.ObjectId(viewerId);
    const [bookmark, rating, progress] = await Promise.all([
      Bookmark.exists({ userId, targetType: 'lesson', targetId: lesson._id }),
      LessonRating.findOne({ userId, lessonId: lesson._id }).select('stars').lean(),
      UserProgress.findOne({ userId, lessonId: lesson._id }).lean(),
    ]);
    viewer = {
      bookmarked: Boolean(bookmark),
      rating: rating?.stars ?? null,
      progress: progress
        ? {
            lastBlockId: progress.lastBlockId,
            completionPercent: progress.completionPercent,
            completedAt: progress.completedAt?.toISOString() ?? null,
          }
        : null,
      answeredQuizzes: (progress?.quizResults ?? []).map((q) => ({
        blockId: q.blockId,
        correct: q.correct,
      })),
    };
  }

  return {
    ...toLessonSummary(lesson),
    contentVersion: lesson.contentVersion,
    blocks: lesson.blocks.map(toPublicBlock),
    viewer,
  };
}

/** Answer keys never leave the server: the client submits a choice and receives the verdict. */
export async function answerQuiz(
  lessonId: string,
  blockId: string,
  selectedOptionIds: string[],
  userId: string,
): Promise<QuizAnswerResult> {
  const lesson = await getPublishedLessonById(lessonId);
  const block = lesson.blocks.find((b) => b.id === blockId);
  if (!block || block.type !== 'quiz') throw notFound('Quiz');

  const validIds = new Set(block.options.map((o) => o.id));
  if (!selectedOptionIds.every((id) => validIds.has(id))) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Unknown option selected');
  }
  const selected = new Set(selectedOptionIds);
  const correct =
    selected.size === block.correctOptionIds.length &&
    block.correctOptionIds.every((id) => selected.has(id));

  await recordQuizAnswer(userId, lesson, blockId, correct);
  return {
    blockId,
    correct,
    correctOptionIds: block.correctOptionIds,
    explanation: block.explanation,
  };
}

/** Deterministic per-day pick, preferring the viewer's interests when any match. */
export async function getDailyCapsuleLesson(
  day: string,
  interests: Technology[] = [],
): Promise<LessonSummaryDTO | null> {
  let filter: QueryFilter<LessonDoc> = { ...published };
  if (interests.length) {
    const preferred = { ...published, technology: { $in: interests } };
    if (await Lesson.exists(preferred)) filter = preferred;
  }
  const count = await Lesson.countDocuments(filter);
  if (count === 0) return null;
  const doc = await Lesson.findOne(filter)
    .select(LESSON_SUMMARY_FIELDS)
    .sort({ publishedAt: 1, _id: 1 })
    .skip(daysSinceEpoch(day) % count)
    .lean<LessonSummarySource>();
  return doc ? toLessonSummary(doc) : null;
}

const TRENDING_WINDOW_DAYS = 14;
const TRENDING_MIN_LESSONS = 3;

export async function getTrendingLessons(
  limit = 8,
): Promise<{ basis: 'activity' | 'recent'; lessons: LessonSummaryDTO[] }> {
  const since = new Date(Date.now() - TRENDING_WINDOW_DAYS * 86_400_000);
  const ranked = await UserProgress.aggregate<{ _id: Types.ObjectId; learners: number }>([
    { $match: { startedAt: { $gte: since } } },
    { $group: { _id: '$lessonId', learners: { $sum: 1 } } },
    { $sort: { learners: -1, _id: 1 } },
    { $limit: limit * 2 },
  ]);
  if (ranked.length >= TRENDING_MIN_LESSONS) {
    const docs = await Lesson.find({ _id: { $in: ranked.map((r) => r._id) }, ...published })
      .select(LESSON_SUMMARY_FIELDS)
      .lean<LessonSummarySource[]>();
    const byId = new Map(docs.map((d) => [d._id.toString(), d]));
    const lessons = ranked
      .map((r) => byId.get(r._id.toString()))
      .filter((d): d is LessonSummarySource => Boolean(d))
      .slice(0, limit)
      .map(toLessonSummary);
    if (lessons.length >= TRENDING_MIN_LESSONS) return { basis: 'activity', lessons };
  }
  const recent = await Lesson.find(published)
    .select(LESSON_SUMMARY_FIELDS)
    .sort({ publishedAt: -1 })
    .limit(limit)
    .lean<LessonSummarySource[]>();
  return { basis: 'recent', lessons: recent.map(toLessonSummary) };
}

export async function searchLessons(q: string, limit: number): Promise<LessonSummaryDTO[]> {
  const textHits = await Lesson.find(
    { ...published, $text: { $search: q } },
    { score: { $meta: 'textScore' } },
  )
    .select(LESSON_SUMMARY_FIELDS)
    .sort({ score: { $meta: 'textScore' } })
    .limit(limit)
    .lean<LessonSummarySource[]>();
  if (textHits.length >= limit) return textHits.map(toLessonSummary);

  // Prefix/partial matches (e.g. "kube") that word-based text search misses.
  const rx = new RegExp(escapeRegex(q), 'i');
  const extra = await Lesson.find({
    ...published,
    _id: { $nin: textHits.map((h) => h._id) },
    $or: [{ title: rx }, { tags: rx }],
  })
    .select(LESSON_SUMMARY_FIELDS)
    .sort({ publishedAt: -1 })
    .limit(limit - textHits.length)
    .lean<LessonSummarySource[]>();
  return [...textHits, ...extra].map(toLessonSummary);
}
