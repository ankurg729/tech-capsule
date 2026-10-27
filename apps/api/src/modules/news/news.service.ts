import type {
  DailyCapsuleDTO,
  NewsDetailDTO,
  NewsListQuery,
  NewsSummaryDTO,
} from '@techcapsule/contracts';
import type { QueryFilter } from 'mongoose';
import { dayKey } from '../../lib/dates.js';
import { notFound } from '../../lib/errors.js';
import { pageMeta, type PageResult } from '../../lib/http.js';
import { isBookmarked } from '../bookmarks/bookmarks.service.js';
import { getDailyCapsuleLesson } from '../lessons/lessons.service.js';
import { User } from '../users/user.model.js';
import { NEWS_SUMMARY_FIELDS, toNewsSummary } from './news.mapper.js';
import { NewsArticle, type NewsArticleDoc } from './newsArticle.model.js';

const published = { status: 'published' as const };

export async function listNews(query: NewsListQuery): Promise<PageResult<NewsSummaryDTO>> {
  const filter: QueryFilter<NewsArticleDoc> = { ...published };
  if (query.category) filter.category = query.category;
  const [docs, total] = await Promise.all([
    NewsArticle.find(filter)
      .select(NEWS_SUMMARY_FIELDS)
      .sort({ publishedAt: -1, _id: -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .lean<NewsArticleDoc[]>(),
    NewsArticle.countDocuments(filter),
  ]);
  return { items: docs.map(toNewsSummary), meta: pageMeta(query.page, query.limit, total) };
}

export async function getNewsDetail(slug: string, viewerId?: string): Promise<NewsDetailDTO> {
  const doc = await NewsArticle.findOne({ slug, ...published }).lean<NewsArticleDoc>();
  if (!doc) throw notFound('Article');
  return {
    ...toNewsSummary(doc),
    body: doc.body,
    viewer: viewerId ? { bookmarked: await isBookmarked(viewerId, 'news', doc._id) } : null,
  };
}

export async function viewerContext(viewerId?: string) {
  if (!viewerId) return { timezone: 'UTC', interests: [] as const };
  const user = await User.findById(viewerId).select('preferences').lean();
  return {
    timezone: user?.preferences.timezone ?? 'UTC',
    interests: user?.preferences.interests ?? [],
  };
}

export async function getDailyCapsule(
  viewerId?: string,
  now = new Date(),
): Promise<DailyCapsuleDTO> {
  const ctx = await viewerContext(viewerId);
  const date = dayKey(now, ctx.timezone);
  return { date, lesson: await getDailyCapsuleLesson(date, [...ctx.interests]) };
}
