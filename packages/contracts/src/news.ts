import { z } from 'zod';
import {
  contentStatusSchema,
  httpsUrlSchema,
  paginationQuerySchema,
  slugSchema,
  type ContentStatus,
} from './common.js';
import type { LessonSummaryDTO } from './lessons.js';

export const NEWS_CATEGORIES = [
  'ai-models',
  'ai-tools',
  'web-dev',
  'cloud-devops',
  'open-source',
  'research',
  'industry',
] as const;
export const newsCategorySchema = z.enum(NEWS_CATEGORIES);
export type NewsCategory = z.infer<typeof newsCategorySchema>;

export const NEWS_CATEGORY_LABELS: Record<NewsCategory, string> = {
  'ai-models': 'AI Models',
  'ai-tools': 'AI Tools',
  'web-dev': 'Web Dev',
  'cloud-devops': 'Cloud & DevOps',
  'open-source': 'Open Source',
  research: 'Research',
  industry: 'Industry',
};

export const newsListQuerySchema = paginationQuerySchema.extend({
  category: newsCategorySchema.optional(),
});
export type NewsListQuery = z.infer<typeof newsListQuerySchema>;

const newsFields = z.object({
  title: z.string().trim().min(5).max(200),
  slug: slugSchema.optional(),
  summary: z.string().trim().min(10).max(600),
  /** Plain text; blank lines separate paragraphs. */
  body: z.string().trim().min(20).max(20_000),
  category: newsCategorySchema,
  sourceName: z.string().trim().min(2).max(100),
  sourceUrl: httpsUrlSchema,
  // `null` clears the image on update.
  imageUrl: httpsUrlSchema.nullable().optional(),
  /** Sample articles are shown with a visible "Sample" label in every client. */
  isSample: z.boolean(),
});

export const newsInputSchema = newsFields.extend({
  isSample: newsFields.shape.isSample.default(false),
});
export type NewsInput = z.infer<typeof newsInputSchema>;
// Built from the default-free fields so a partial update never resets omitted values.
export const newsUpdateSchema = newsFields.partial();
export type NewsUpdateInput = z.infer<typeof newsUpdateSchema>;

export const adminNewsListQuerySchema = paginationQuerySchema.extend({
  status: contentStatusSchema.optional(),
  category: newsCategorySchema.optional(),
});

export interface NewsSummaryDTO {
  id: string;
  slug: string;
  title: string;
  summary: string;
  category: NewsCategory;
  sourceName: string;
  sourceUrl: string;
  imageUrl: string | null;
  isSample: boolean;
  publishedAt: string | null;
}

export interface NewsDetailDTO extends NewsSummaryDTO {
  body: string;
  viewer: { bookmarked: boolean } | null;
}

export interface AdminNewsDTO extends NewsSummaryDTO {
  body: string;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface DailyCapsuleDTO {
  /** Calendar date (YYYY-MM-DD) in the viewer's timezone. */
  date: string;
  lesson: LessonSummaryDTO | null;
}
