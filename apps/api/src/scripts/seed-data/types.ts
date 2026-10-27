import type { ContentBlockInput, LessonInput, NewsInput, PathInput } from '@techcapsule/contracts';

export type SeedLesson = Omit<LessonInput, 'blocks' | 'slug'> & {
  slug: string;
  blocks: ContentBlockInput[];
};

export type SeedPath = Omit<PathInput, 'lessonIds' | 'slug'> & {
  slug: string;
  lessonSlugs: string[];
};

export type SeedNews = Omit<NewsInput, 'slug'> & { slug: string; publishedDaysAgo: number };

export interface SeedQuestion {
  authorKey: string;
  title: string;
  body: string;
  tags: string[];
  answers: { authorKey: string; body: string }[];
}
