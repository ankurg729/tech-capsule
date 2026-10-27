import type {
  ProgressDTO,
  ProgressInput,
  ProgressListQuery,
  ProgressWithLessonDTO,
} from '@techcapsule/contracts';
import { Types, type QueryFilter } from 'mongoose';
import { badRequest } from '../../lib/errors.js';
import { pageMeta, type PageResult } from '../../lib/http.js';
import {
  LESSON_SUMMARY_FIELDS,
  toLessonSummary,
  type LessonSummarySource,
} from '../lessons/lesson.mapper.js';
import { Lesson, type LessonDoc } from '../lessons/lesson.model.js';
import { getPublishedLessonById } from '../lessons/lesson.queries.js';
import { recordActivity } from './activity.service.js';
import { UserProgress, type UserProgressDoc } from './userProgress.model.js';

export function toProgressDTO(p: UserProgressDoc): ProgressDTO {
  return {
    lessonId: p.lessonId.toString(),
    lastBlockId: p.lastBlockId,
    completionPercent: p.completionPercent,
    completedAt: p.completedAt?.toISOString() ?? null,
    lastViewedAt: p.lastViewedAt.toISOString(),
  };
}

/**
 * Applies a progress change and credits activity. Percent never decreases, so scrolling back
 * up doesn't undo progress; minutes are credited in proportion to new progress only.
 */
async function applyProgress(
  userIdStr: string,
  lesson: LessonDoc,
  update: { percent: number; lastBlockId?: string | undefined; complete: boolean },
): Promise<ProgressDTO> {
  const userId = new Types.ObjectId(userIdStr);
  const now = new Date();
  const existing = await UserProgress.findOne({ userId, lessonId: lesson._id }).lean();
  const oldPercent = existing?.completionPercent ?? 0;
  const newPercent = Math.max(oldPercent, update.complete ? 100 : update.percent);
  const justCompleted = !existing?.completedAt && (update.complete || newPercent === 100);

  const $set: Partial<UserProgressDoc> = { completionPercent: newPercent, lastViewedAt: now };
  if (update.lastBlockId) $set.lastBlockId = update.lastBlockId;
  if (justCompleted) $set.completedAt = now;

  const doc = await UserProgress.findOneAndUpdate(
    { userId, lessonId: lesson._id },
    { $set, $setOnInsert: { startedAt: now } },
    { upsert: true, returnDocument: 'after' },
  ).lean<UserProgressDoc>();

  const minutes = ((newPercent - oldPercent) / 100) * lesson.estimatedMinutes;
  await recordActivity(userId, { minutes, lessonsCompleted: justCompleted ? 1 : 0 }, now);
  return toProgressDTO(doc!);
}

export async function updateProgress(userId: string, lessonId: string, input: ProgressInput) {
  const lesson = await getPublishedLessonById(lessonId);
  if (input.lastBlockId && !lesson.blocks.some((b) => b.id === input.lastBlockId)) {
    throw badRequest('lastBlockId does not exist in this lesson');
  }
  return applyProgress(userId, lesson, {
    percent: input.completionPercent,
    lastBlockId: input.lastBlockId,
    complete: false,
  });
}

export async function completeLesson(userId: string, lessonId: string) {
  const lesson = await getPublishedLessonById(lessonId);
  return applyProgress(userId, lesson, { percent: 100, complete: true });
}

export async function recordQuizAnswer(
  userIdStr: string,
  lesson: LessonDoc,
  blockId: string,
  correct: boolean,
): Promise<void> {
  const userId = new Types.ObjectId(userIdStr);
  const now = new Date();
  await UserProgress.updateOne(
    { userId, lessonId: lesson._id },
    { $setOnInsert: { startedAt: now, completionPercent: 0 }, $set: { lastViewedAt: now } },
    { upsert: true },
  );
  // Replace any previous answer for this quiz so the array stays bounded.
  await UserProgress.updateOne(
    { userId, lessonId: lesson._id },
    { $pull: { quizResults: { blockId } } },
  );
  await UserProgress.updateOne(
    { userId, lessonId: lesson._id },
    { $push: { quizResults: { blockId, correct, answeredAt: now } } },
  );
  await recordActivity(userId, {}, now);
}

export async function listProgress(
  userIdStr: string,
  query: ProgressListQuery,
): Promise<PageResult<ProgressWithLessonDTO>> {
  const userId = new Types.ObjectId(userIdStr);
  const filter: QueryFilter<UserProgressDoc> = { userId };
  if (query.status === 'completed') filter.completedAt = { $ne: null };
  if (query.status === 'in-progress') filter.completedAt = null;

  const [rows, total] = await Promise.all([
    UserProgress.find(filter)
      .sort({ lastViewedAt: -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .lean<UserProgressDoc[]>(),
    UserProgress.countDocuments(filter),
  ]);
  return { items: await attachLessons(rows), meta: pageMeta(query.page, query.limit, total) };
}

export async function continueLearning(
  userIdStr: string,
  limit = 5,
): Promise<ProgressWithLessonDTO[]> {
  const rows = await UserProgress.find({ userId: new Types.ObjectId(userIdStr), completedAt: null })
    .sort({ lastViewedAt: -1 })
    .limit(limit)
    .lean<UserProgressDoc[]>();
  return attachLessons(rows);
}

/** Joins lesson summaries; progress on lessons that were since unpublished is omitted. */
async function attachLessons(rows: UserProgressDoc[]): Promise<ProgressWithLessonDTO[]> {
  const lessons = await Lesson.find({
    _id: { $in: rows.map((r) => r.lessonId) },
    status: 'published',
  })
    .select(LESSON_SUMMARY_FIELDS)
    .lean<LessonSummarySource[]>();
  const byId = new Map(lessons.map((l) => [l._id.toString(), l]));
  return rows.flatMap((r) => {
    const lesson = byId.get(r.lessonId.toString());
    return lesson ? [{ ...toProgressDTO(r), lesson: toLessonSummary(lesson) }] : [];
  });
}

export async function progressByLesson(
  userIdStr: string,
  lessonIds: Types.ObjectId[],
): Promise<Map<string, UserProgressDoc>> {
  const rows = await UserProgress.find({
    userId: new Types.ObjectId(userIdStr),
    lessonId: { $in: lessonIds },
  }).lean<UserProgressDoc[]>();
  return new Map(rows.map((r) => [r.lessonId.toString(), r]));
}
