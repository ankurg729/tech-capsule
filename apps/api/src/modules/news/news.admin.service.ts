import type {
  AdminNewsDTO,
  ContentStatus,
  NewsCategory,
  NewsInput,
  NewsUpdateInput,
} from '@techcapsule/contracts';
import { Types, type Model, type QueryFilter } from 'mongoose';
import { notFound } from '../../lib/errors.js';
import { pageMeta, type PageResult } from '../../lib/http.js';
import { resolveSlug } from '../../lib/slugs.js';
import { recordAudit, type AuditActor } from '../admin/audit.service.js';
import { toAdminNews } from './news.mapper.js';
import { NewsArticle, type NewsArticleDoc } from './newsArticle.model.js';

const slugModel = NewsArticle as unknown as Model<{ slug: string }>;

async function load(id: string): Promise<NewsArticleDoc> {
  if (!Types.ObjectId.isValid(id)) throw notFound('Article');
  const doc = await NewsArticle.findById(id).lean<NewsArticleDoc>();
  if (!doc) throw notFound('Article');
  return doc;
}

export async function adminListNews(query: {
  page: number;
  limit: number;
  status?: ContentStatus | undefined;
  category?: NewsCategory | undefined;
}): Promise<PageResult<AdminNewsDTO>> {
  const filter: QueryFilter<NewsArticleDoc> = {};
  if (query.status) filter.status = query.status;
  if (query.category) filter.category = query.category;
  const [docs, total] = await Promise.all([
    NewsArticle.find(filter)
      .sort({ updatedAt: -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .lean<NewsArticleDoc[]>(),
    NewsArticle.countDocuments(filter),
  ]);
  return { items: docs.map(toAdminNews), meta: pageMeta(query.page, query.limit, total) };
}

export async function adminGetNews(id: string): Promise<AdminNewsDTO> {
  return toAdminNews(await load(id));
}

export async function adminCreateNews(input: NewsInput, actor: AuditActor): Promise<AdminNewsDTO> {
  const slug = await resolveSlug(slugModel, input.title, input.slug);
  const doc = await NewsArticle.create({
    ...input,
    slug,
    imageUrl: input.imageUrl ?? null,
    status: 'draft',
    createdBy: new Types.ObjectId(actor.userId),
  });
  await recordAudit(actor, 'news.create', 'news', doc._id, { slug, isSample: input.isSample });
  return toAdminNews(doc.toObject());
}

export async function adminUpdateNews(
  id: string,
  input: NewsUpdateInput,
  actor: AuditActor,
): Promise<AdminNewsDTO> {
  const doc = await load(id);
  const $set: Record<string, unknown> = { ...input };
  if (input.slug !== undefined) {
    $set.slug = await resolveSlug(slugModel, input.title ?? doc.title, input.slug, doc._id);
  }
  const updated = await NewsArticle.findByIdAndUpdate(
    doc._id,
    { $set },
    { returnDocument: 'after', runValidators: true },
  ).lean<NewsArticleDoc>();
  await recordAudit(actor, 'news.update', 'news', doc._id, { fields: Object.keys(input) });
  return toAdminNews(updated!);
}

export async function adminSetNewsStatus(
  id: string,
  action: 'publish' | 'unpublish' | 'archive',
  actor: AuditActor,
): Promise<AdminNewsDTO> {
  const doc = await load(id);
  const now = new Date();
  const $set =
    action === 'publish'
      ? { status: 'published', publishedAt: doc.publishedAt ?? now, archivedAt: null }
      : action === 'archive'
        ? { status: 'archived', archivedAt: now }
        : { status: 'draft' };
  const updated = await NewsArticle.findByIdAndUpdate(
    doc._id,
    { $set },
    { returnDocument: 'after' },
  ).lean<NewsArticleDoc>();
  await recordAudit(actor, `news.${action}`, 'news', doc._id, { from: doc.status });
  return toAdminNews(updated!);
}
