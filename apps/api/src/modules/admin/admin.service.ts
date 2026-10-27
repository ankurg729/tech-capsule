import type { AdminOverviewDTO } from '@techcapsule/contracts';
import type { Model } from 'mongoose';
import { Answer } from '../answers/answer.model.js';
import { LearningPath } from '../learning-paths/learningPath.model.js';
import { Lesson } from '../lessons/lesson.model.js';
import { NewsArticle } from '../news/newsArticle.model.js';
import { Question } from '../questions/question.model.js';
import { Report } from '../reports/report.model.js';
import { User } from '../users/user.model.js';
import { recentAudit } from './audit.service.js';

async function statusCounts(model: Model<{ status: string }>) {
  const rows = await model.aggregate<{ _id: string; n: number }>([
    { $group: { _id: '$status', n: { $sum: 1 } } },
  ]);
  const get = (s: string) => rows.find((r) => r._id === s)?.n ?? 0;
  return { draft: get('draft'), published: get('published'), archived: get('archived') };
}

export async function getOverview(): Promise<AdminOverviewDTO> {
  const [users, verifiedUsers, lessons, paths, news, questions, answers, openReports, audit] =
    await Promise.all([
      User.countDocuments(),
      User.countDocuments({ emailVerifiedAt: { $ne: null } }),
      statusCounts(Lesson as unknown as Model<{ status: string }>),
      statusCounts(LearningPath as unknown as Model<{ status: string }>),
      statusCounts(NewsArticle as unknown as Model<{ status: string }>),
      Question.countDocuments(),
      Answer.countDocuments(),
      Report.countDocuments({ status: 'open' }),
      recentAudit(10),
    ]);
  return {
    counts: { users, verifiedUsers, lessons, paths, news, questions, answers, openReports },
    recentAudit: audit,
  };
}
