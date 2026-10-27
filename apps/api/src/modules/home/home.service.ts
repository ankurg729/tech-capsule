import type { HomeFeedDTO } from '@techcapsule/contracts';
import { recommendedPaths } from '../learning-paths/learningPaths.service.js';
import { getTrendingLessons } from '../lessons/lessons.service.js';
import { getDailyCapsule, viewerContext } from '../news/news.service.js';
import { getLearningStats } from '../progress/activity.service.js';
import { continueLearning } from '../progress/progress.service.js';
import { recentQuestions } from '../questions/questions.service.js';

/** Aggregates every Home section in parallel so clients make a single request. */
export async function getHomeFeed(viewerId?: string): Promise<HomeFeedDTO> {
  const ctx = await viewerContext(viewerId);
  const [dailyCapsule, continuing, paths, trending, questions, stats] = await Promise.all([
    getDailyCapsule(viewerId),
    viewerId ? continueLearning(viewerId, 5) : Promise.resolve([]),
    recommendedPaths([...ctx.interests], viewerId, 5),
    getTrendingLessons(8),
    recentQuestions(5),
    viewerId ? getLearningStats(viewerId) : Promise.resolve(null),
  ]);
  return {
    dailyCapsule,
    continueLearning: continuing,
    recommendedPaths: paths,
    trending,
    recentQuestions: questions,
    stats,
  };
}
