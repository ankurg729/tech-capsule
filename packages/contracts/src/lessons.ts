import { z } from 'zod';
import { contentBlocksSchema, type ContentBlock, type PublicContentBlock } from './blocks.js';
import {
  contentLanguageSchema,
  contentStatusSchema,
  difficultySchema,
  httpsUrlSchema,
  objectIdSchema,
  paginationQuerySchema,
  slugSchema,
  tagSchema,
  technologySchema,
  type ContentLanguage,
  type ContentStatus,
  type Difficulty,
  type Technology,
} from './common.js';

export const lessonListQuerySchema = paginationQuerySchema.extend({
  technology: technologySchema.optional(),
  difficulty: difficultySchema.optional(),
  language: contentLanguageSchema.optional(),
  tag: tagSchema.optional(),
  q: z.string().trim().min(1).max(100).optional(),
  sort: z.enum(['newest', 'top-rated']).default('newest'),
});
export type LessonListQuery = z.infer<typeof lessonListQuerySchema>;

// No defaults here: `.partial()` in Zod 4 would still apply them and turn PATCHes into resets.
const lessonFields = z.object({
  title: z.string().trim().min(5).max(150),
  slug: slugSchema.optional(),
  summary: z.string().trim().min(10).max(500),
  technology: technologySchema,
  tags: z.array(tagSchema).max(10),
  difficulty: difficultySchema,
  language: contentLanguageSchema,
  // `null` clears the image on update.
  coverImageUrl: httpsUrlSchema.nullable().optional(),
  blocks: contentBlocksSchema,
});

export const lessonInputSchema = lessonFields.extend({
  tags: lessonFields.shape.tags.default([]),
});
export type LessonInput = z.infer<typeof lessonInputSchema>;

export const lessonUpdateSchema = lessonFields.partial();
export type LessonUpdateInput = z.infer<typeof lessonUpdateSchema>;

export const progressInputSchema = z.object({
  lastBlockId: z.string().min(1).max(40).optional(),
  completionPercent: z.number().int().min(0).max(100),
});
export type ProgressInput = z.infer<typeof progressInputSchema>;

export const ratingInputSchema = z.object({
  stars: z.number().int().min(1).max(5),
});
export type RatingInput = z.infer<typeof ratingInputSchema>;

export const lessonIdParamSchema = z.object({ id: objectIdSchema });

export interface LessonSummaryDTO {
  id: string;
  slug: string;
  title: string;
  summary: string;
  technology: Technology;
  tags: string[];
  difficulty: Difficulty;
  language: ContentLanguage;
  estimatedMinutes: number;
  coverImageUrl: string | null;
  ratingAvg: number | null;
  ratingCount: number;
  publishedAt: string | null;
}

export interface LessonViewerStateDTO {
  bookmarked: boolean;
  rating: number | null;
  progress: {
    lastBlockId: string | null;
    completionPercent: number;
    completedAt: string | null;
  } | null;
  answeredQuizzes: { blockId: string; correct: boolean }[];
}

export interface LessonDetailDTO extends LessonSummaryDTO {
  contentVersion: number;
  blocks: PublicContentBlock[];
  /** Present only for authenticated requests. */
  viewer: LessonViewerStateDTO | null;
}

export interface AdminLessonDTO extends Omit<LessonSummaryDTO, 'publishedAt'> {
  status: ContentStatus;
  blocks: ContentBlock[];
  contentVersion: number;
  publishedAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export const adminLessonListQuerySchema = paginationQuerySchema.extend({
  status: contentStatusSchema.optional(),
  technology: technologySchema.optional(),
  language: contentLanguageSchema.optional(),
  q: z.string().trim().min(1).max(100).optional(),
  /** Comma-separated lesson ids, e.g. to resolve the lessons of a learning path. */
  ids: z
    .string()
    .transform((s) =>
      s
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean),
    )
    .pipe(z.array(objectIdSchema).min(1).max(50))
    .optional(),
});
export type AdminLessonListQuery = z.infer<typeof adminLessonListQuerySchema>;

export interface ProgressDTO {
  lessonId: string;
  lastBlockId: string | null;
  completionPercent: number;
  completedAt: string | null;
  lastViewedAt: string;
}

export interface ProgressWithLessonDTO extends ProgressDTO {
  lesson: LessonSummaryDTO;
}

export const progressListQuerySchema = paginationQuerySchema.extend({
  status: z.enum(['in-progress', 'completed', 'all']).default('all'),
});
export type ProgressListQuery = z.infer<typeof progressListQuerySchema>;

export interface BookmarkResultDTO {
  targetType: 'lesson' | 'news';
  targetId: string;
  bookmarked: boolean;
}

/** Items returned by GET /users/me/bookmarks carry the time they were saved. */
export type SavedItem<T> = T & { savedAt: string };

export interface RatingDTO {
  lessonId: string;
  stars: number;
  ratingAvg: number | null;
  ratingCount: number;
}
