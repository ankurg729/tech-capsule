import { z } from 'zod';
import type { QuestionSummaryDTO } from './community.js';
import type { LessonSummaryDTO, ProgressWithLessonDTO } from './lessons.js';
import type { PathSummaryDTO } from './paths.js';

export interface DayActivityDTO {
  /** YYYY-MM-DD in the user's timezone. */
  date: string;
  minutes: number;
  lessonsCompleted: number;
  active: boolean;
}

export interface LearningStatsDTO {
  currentStreak: number;
  longestStreak: number;
  todayMinutes: number;
  dailyGoalMinutes: number;
  totalLessonsCompleted: number;
  /** Last 7 days, oldest first, ending today. */
  week: DayActivityDTO[];
}

export interface HomeFeedDTO {
  dailyCapsule: { date: string; lesson: LessonSummaryDTO | null };
  continueLearning: ProgressWithLessonDTO[];
  recommendedPaths: PathSummaryDTO[];
  /**
   * `activity` = ranked by learners starting the lesson in the last 14 days;
   * `recent` = not enough activity yet, so newest lessons are shown instead.
   */
  trending: { basis: 'activity' | 'recent'; lessons: LessonSummaryDTO[] };
  recentQuestions: QuestionSummaryDTO[];
  stats: LearningStatsDTO | null;
}

export const searchQuerySchema = z.object({
  q: z.string().trim().min(2, 'Type at least 2 characters').max(100),
  type: z.enum(['all', 'lessons', 'paths', 'questions']).default('all'),
  limit: z.coerce.number().int().min(1).max(20).default(10),
});
export type SearchQuery = z.infer<typeof searchQuerySchema>;

export interface SearchResultsDTO {
  query: string;
  lessons: LessonSummaryDTO[];
  paths: PathSummaryDTO[];
  questions: QuestionSummaryDTO[];
}
