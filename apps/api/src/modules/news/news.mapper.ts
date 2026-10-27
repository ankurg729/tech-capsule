import type { AdminNewsDTO, NewsSummaryDTO } from '@techcapsule/contracts';
import { iso } from '../../lib/dates.js';
import type { NewsArticleDoc } from './newsArticle.model.js';

export const NEWS_SUMMARY_FIELDS =
  'slug title summary category sourceName sourceUrl imageUrl isSample publishedAt';

export function toNewsSummary(n: NewsArticleDoc): NewsSummaryDTO {
  return {
    id: n._id.toString(),
    slug: n.slug,
    title: n.title,
    summary: n.summary,
    category: n.category,
    sourceName: n.sourceName,
    sourceUrl: n.sourceUrl,
    imageUrl: n.imageUrl ?? null,
    isSample: n.isSample,
    publishedAt: iso(n.publishedAt),
  };
}

export function toAdminNews(n: NewsArticleDoc): AdminNewsDTO {
  return {
    ...toNewsSummary(n),
    body: n.body,
    status: n.status,
    createdAt: n.createdAt.toISOString(),
    updatedAt: n.updatedAt.toISOString(),
  };
}
