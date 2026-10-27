import {
  estimateReadingMinutes,
  lessonInputSchema,
  newsInputSchema,
  pathInputSchema,
} from '@techcapsule/contracts';
import { isDeepStrictEqual } from 'node:util';
import type { Types } from 'mongoose';
import { randomToken } from '../lib/crypto.js';
import { Answer } from '../modules/answers/answer.model.js';
import { hashPassword } from '../modules/auth/password.js';
import { LearningPath } from '../modules/learning-paths/learningPath.model.js';
import { Lesson } from '../modules/lessons/lesson.model.js';
import { buildSearchText } from '../modules/lessons/lessons.admin.service.js';
import { enqueueIndexJob } from '../modules/lessons/lessonIndexing.js';
import { NewsArticle } from '../modules/news/newsArticle.model.js';
import { Question } from '../modules/questions/question.model.js';
import { User } from '../modules/users/user.model.js';
import {
  seedAuthors,
  seedLessons,
  seedNews,
  seedPaths,
  seedQuestions,
} from './seed-data/content.js';

export interface SeedSummary {
  lessons: { created: number; updated: number; unchanged: number };
  paths: number;
  news: number;
  questions: number;
  answers: number;
  admin: 'created' | 'updated' | 'skipped';
}

/**
 * Idempotent: every record is matched on a natural key (slug, email, author+title), so running
 * it repeatedly converges to the same state without duplicates. It never creates votes,
 * ratings or progress — engagement numbers must come from real users.
 */
export async function runSeed(
  opts: { adminEmail?: string; adminPassword?: string } = {},
): Promise<SeedSummary> {
  const summary: SeedSummary = {
    lessons: { created: 0, updated: 0, unchanged: 0 },
    paths: 0,
    news: 0,
    questions: 0,
    answers: 0,
    admin: 'skipped',
  };

  // Lessons: validated through the same schema the admin API uses.
  const lessonIds = new Map<string, Types.ObjectId>();
  for (const [i, raw] of seedLessons.entries()) {
    const input = lessonInputSchema.parse(raw);
    const content = {
      title: input.title,
      summary: input.summary,
      technology: input.technology,
      tags: input.tags,
      difficulty: input.difficulty,
      language: input.language,
      blocks: input.blocks,
      searchText: buildSearchText(input.blocks),
      estimatedMinutes: estimateReadingMinutes(input.blocks),
    };
    const existing = await Lesson.findOne({ slug: raw.slug }).select('+searchText').lean();
    if (!existing) {
      const doc = await Lesson.create({
        ...content,
        slug: raw.slug,
        status: 'published',
        // Stagger publish dates so ordering is deterministic.
        publishedAt: new Date(Date.UTC(2026, 0, 1 + i)),
        contentVersion: 1,
      });
      await enqueueIndexJob(doc, 'upsert');
      lessonIds.set(raw.slug, doc._id);
      summary.lessons.created++;
      continue;
    }
    lessonIds.set(raw.slug, existing._id);
    const changed = (Object.keys(content) as (keyof typeof content)[]).some(
      (k) => !isDeepStrictEqual(content[k], existing[k]),
    );
    if (!changed) {
      summary.lessons.unchanged++;
      continue;
    }
    const blocksChanged = !isDeepStrictEqual(content.blocks, existing.blocks);
    const updated = await Lesson.findByIdAndUpdate(
      existing._id,
      { $set: content, ...(blocksChanged ? { $inc: { contentVersion: 1 } } : {}) },
      { returnDocument: 'after' },
    ).lean();
    if (updated?.status === 'published') await enqueueIndexJob(updated, 'upsert');
    summary.lessons.updated++;
  }

  for (const [i, raw] of seedPaths.entries()) {
    const ids = raw.lessonSlugs.map((s) => {
      const id = lessonIds.get(s);
      if (!id) throw new Error(`Seed path ${raw.slug} references unknown lesson ${s}`);
      return id;
    });
    const input = pathInputSchema.parse({ ...raw, lessonIds: ids.map(String) });
    await LearningPath.updateOne(
      { slug: raw.slug },
      {
        $set: {
          title: input.title,
          description: input.description,
          technology: input.technology,
          difficulty: input.difficulty,
          lessonIds: ids,
        },
        $setOnInsert: { status: 'published', publishedAt: new Date(Date.UTC(2026, 1, 1 + i)) },
      },
      { upsert: true },
    );
    summary.paths++;
  }

  for (const raw of seedNews) {
    const input = newsInputSchema.parse(raw);
    await NewsArticle.updateOne(
      { slug: raw.slug },
      {
        $set: {
          title: input.title,
          summary: input.summary,
          body: input.body,
          category: input.category,
          sourceName: input.sourceName,
          sourceUrl: input.sourceUrl,
          isSample: true,
        },
        $setOnInsert: {
          status: 'published',
          publishedAt: new Date(Date.now() - raw.publishedDaysAgo * 86_400_000),
        },
      },
      { upsert: true },
    );
    summary.news++;
  }

  const authorIds = new Map<string, Types.ObjectId>();
  for (const a of seedAuthors) {
    const user = await User.findOneAndUpdate(
      { email: a.email },
      {
        $set: { displayName: a.displayName },
        // Random, never-disclosed password: sample authors cannot be logged into.
        $setOnInsert: {
          passwordHash: await hashPassword(randomToken(32)),
          role: 'user',
          emailVerifiedAt: new Date(),
        },
      },
      { upsert: true, returnDocument: 'after' },
    ).lean();
    authorIds.set(a.key, user!._id);
  }

  for (const sq of seedQuestions) {
    const authorId = authorIds.get(sq.authorKey)!;
    const question = await Question.findOneAndUpdate(
      { authorId, title: sq.title },
      { $set: { body: sq.body, tags: sq.tags }, $setOnInsert: { lastActivityAt: new Date() } },
      { upsert: true, returnDocument: 'after' },
    ).lean();
    summary.questions++;
    for (const sa of sq.answers) {
      await Answer.updateOne(
        { questionId: question!._id, authorId: authorIds.get(sa.authorKey)! },
        { $set: { body: sa.body } },
        { upsert: true },
      );
      summary.answers++;
    }
    const answerCount = await Answer.countDocuments({
      questionId: question!._id,
      moderation: 'visible',
    });
    await Question.updateOne({ _id: question!._id }, { $set: { answerCount } });
  }

  if (opts.adminEmail && opts.adminPassword) {
    summary.admin = await upsertAdmin(opts.adminEmail, opts.adminPassword);
  }
  return summary;
}

export async function upsertAdmin(
  emailRaw: string,
  password: string,
): Promise<'created' | 'updated'> {
  const email = emailRaw.trim().toLowerCase();
  const passwordHash = await hashPassword(password);
  const existing = await User.exists({ email });
  await User.updateOne(
    { email },
    {
      $set: { role: 'admin', passwordHash, status: 'active' },
      $setOnInsert: { displayName: 'TechCapsule Admin', emailVerifiedAt: new Date() },
    },
    { upsert: true },
  );
  return existing ? 'updated' : 'created';
}
