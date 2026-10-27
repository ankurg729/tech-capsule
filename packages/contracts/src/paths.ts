import { z } from 'zod';
import {
  contentStatusSchema,
  difficultySchema,
  httpsUrlSchema,
  objectIdSchema,
  paginationQuerySchema,
  slugSchema,
  technologySchema,
  type ContentStatus,
  type Difficulty,
  type Technology,
} from './common.js';
import type { LessonSummaryDTO } from './lessons.js';

export const pathListQuerySchema = paginationQuerySchema.extend({
  technology: technologySchema.optional(),
  difficulty: difficultySchema.optional(),
});
export type PathListQuery = z.infer<typeof pathListQuerySchema>;

export const pathInputSchema = z.object({
  title: z.string().trim().min(5).max(150),
  slug: slugSchema.optional(),
  description: z.string().trim().min(10).max(1000),
  technology: technologySchema,
  difficulty: difficultySchema,
  // `null` clears the image on update.
  coverImageUrl: httpsUrlSchema.nullable().optional(),
  lessonIds: z
    .array(objectIdSchema)
    .min(1)
    .max(50)
    .refine((ids) => new Set(ids).size === ids.length, 'A lesson can appear only once in a path'),
});
export type PathInput = z.infer<typeof pathInputSchema>;

export const pathUpdateSchema = pathInputSchema.partial();
export type PathUpdateInput = z.infer<typeof pathUpdateSchema>;

export const adminPathListQuerySchema = paginationQuerySchema.extend({
  status: contentStatusSchema.optional(),
});

export interface PathViewerProgressDTO {
  completedCount: number;
  percent: number;
}

export interface PathSummaryDTO {
  id: string;
  slug: string;
  title: string;
  description: string;
  technology: Technology;
  difficulty: Difficulty;
  coverImageUrl: string | null;
  lessonCount: number;
  estimatedMinutes: number;
  viewerProgress: PathViewerProgressDTO | null;
}

export interface PathLessonDTO extends LessonSummaryDTO {
  position: number;
  completed: boolean;
  completionPercent: number;
}

export interface PathDetailDTO extends PathSummaryDTO {
  lessons: PathLessonDTO[];
  /** The first unfinished lesson; null when the path is complete or empty. */
  resumeLessonSlug: string | null;
}

export interface AdminPathDTO extends Omit<PathSummaryDTO, 'viewerProgress'> {
  status: ContentStatus;
  lessonIds: string[];
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
