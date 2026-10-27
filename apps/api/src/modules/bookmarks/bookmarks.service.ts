import type { LessonSummaryDTO, NewsSummaryDTO, PaginationQuery } from '@techcapsule/contracts';
import { Types } from 'mongoose';
import { notFound } from '../../lib/errors.js';
import { pageMeta, type PageResult } from '../../lib/http.js';
import {
  LESSON_SUMMARY_FIELDS,
  toLessonSummary,
  type LessonSummarySource,
} from '../lessons/lesson.mapper.js';
import { Lesson } from '../lessons/lesson.model.js';
import { NEWS_SUMMARY_FIELDS, toNewsSummary } from '../news/news.mapper.js';
import { NewsArticle, type NewsArticleDoc } from '../news/newsArticle.model.js';
import { Bookmark, type BookmarkTarget } from './bookmark.model.js';

async function assertTargetPublished(targetType: BookmarkTarget, targetId: string) {
  if (!Types.ObjectId.isValid(targetId))
    throw notFound(targetType === 'lesson' ? 'Lesson' : 'Article');
  const model = targetType === 'lesson' ? Lesson : NewsArticle;
  const exists = await (model as typeof Lesson).exists({ _id: targetId, status: 'published' });
  if (!exists) throw notFound(targetType === 'lesson' ? 'Lesson' : 'Article');
}

/** Idempotent: saving twice is a no-op thanks to the unique (user, type, target) index. */
export async function addBookmark(userId: string, targetType: BookmarkTarget, targetId: string) {
  await assertTargetPublished(targetType, targetId);
  await Bookmark.updateOne(
    { userId: new Types.ObjectId(userId), targetType, targetId: new Types.ObjectId(targetId) },
    { $setOnInsert: { createdAt: new Date() } },
    { upsert: true },
  );
  return { targetType, targetId, bookmarked: true };
}

export async function removeBookmark(userId: string, targetType: BookmarkTarget, targetId: string) {
  if (!Types.ObjectId.isValid(targetId)) throw notFound('Bookmark');
  await Bookmark.deleteOne({
    userId: new Types.ObjectId(userId),
    targetType,
    targetId: new Types.ObjectId(targetId),
  });
  return { targetType, targetId, bookmarked: false };
}

export async function listBookmarks(
  userId: string,
  targetType: BookmarkTarget,
  page: PaginationQuery,
): Promise<PageResult<(LessonSummaryDTO | NewsSummaryDTO) & { savedAt: string }>> {
  const filter = { userId: new Types.ObjectId(userId), targetType };
  const [rows, total] = await Promise.all([
    Bookmark.find(filter)
      .sort({ createdAt: -1 })
      .skip((page.page - 1) * page.limit)
      .limit(page.limit)
      .lean(),
    Bookmark.countDocuments(filter),
  ]);
  const ids = rows.map((r) => r.targetId);
  const items =
    targetType === 'lesson'
      ? await Lesson.find({ _id: { $in: ids }, status: 'published' })
          .select(LESSON_SUMMARY_FIELDS)
          .lean<LessonSummarySource[]>()
          .then((docs) => docs.map((d) => [d._id.toString(), toLessonSummary(d)] as const))
      : await NewsArticle.find({ _id: { $in: ids }, status: 'published' })
          .select(NEWS_SUMMARY_FIELDS)
          .lean<NewsArticleDoc[]>()
          .then((docs) => docs.map((d) => [d._id.toString(), toNewsSummary(d)] as const));
  const byId = new Map<string, LessonSummaryDTO | NewsSummaryDTO>(items);
  return {
    items: rows.flatMap((r) => {
      const item = byId.get(r.targetId.toString());
      return item ? [{ ...item, savedAt: r.createdAt.toISOString() }] : [];
    }),
    meta: pageMeta(page.page, page.limit, total),
  };
}

export async function isBookmarked(
  userId: string,
  targetType: BookmarkTarget,
  targetId: Types.ObjectId,
) {
  return Boolean(
    await Bookmark.exists({ userId: new Types.ObjectId(userId), targetType, targetId }),
  );
}
