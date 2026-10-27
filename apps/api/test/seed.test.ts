import { describe, expect, it } from 'vitest';
import { Answer } from '../src/modules/answers/answer.model.js';
import { LearningPath } from '../src/modules/learning-paths/learningPath.model.js';
import { Lesson } from '../src/modules/lessons/lesson.model.js';
import { NewsArticle } from '../src/modules/news/newsArticle.model.js';
import { Question } from '../src/modules/questions/question.model.js';
import { User } from '../src/modules/users/user.model.js';
import { Vote } from '../src/modules/votes/vote.model.js';
import { runSeed } from '../src/scripts/runSeed.js';
import { PASSWORD, api } from './helpers.js';

async function counts() {
  return {
    lessons: await Lesson.countDocuments(),
    paths: await LearningPath.countDocuments(),
    news: await NewsArticle.countDocuments(),
    questions: await Question.countDocuments(),
    answers: await Answer.countDocuments(),
    users: await User.countDocuments(),
  };
}

describe('seed', () => {
  it('is idempotent and seeds real, validated content without fake engagement', async () => {
    const first = await runSeed({ adminEmail: 'Admin@Example.com', adminPassword: PASSWORD });
    const afterFirst = await counts();
    const second = await runSeed({ adminEmail: 'admin@example.com', adminPassword: PASSWORD });
    const afterSecond = await counts();

    expect(afterSecond).toEqual(afterFirst);
    expect(first.lessons.created).toBeGreaterThanOrEqual(8);
    expect(second.lessons).toMatchObject({ created: 0, updated: 0 });
    expect(first.admin).toBe('created');
    expect(second.admin).toBe('updated');
    expect(afterFirst.paths).toBeGreaterThanOrEqual(2);

    const languages = await Lesson.distinct('language');
    expect(languages.sort()).toEqual(['en', 'hinglish']);
    expect(await NewsArticle.countDocuments({ isSample: false })).toBe(0);
    expect(await Vote.countDocuments()).toBe(0);
    expect(await Lesson.countDocuments({ ratingCount: { $gt: 0 } })).toBe(0);

    // Seeded content is reachable through the public API.
    const paths = await api.get('/api/v1/learning-paths').expect(200);
    expect(paths.body.data.every((p: { lessonCount: number }) => p.lessonCount >= 3)).toBe(true);
    await api
      .post('/api/v1/auth/login')
      .send({ email: 'admin@example.com', password: PASSWORD })
      .expect(200);
    // Sample authors cannot be logged into.
    await api
      .post('/api/v1/auth/login')
      .send({ email: 'priya.sample@seed.techcapsule.invalid', password: PASSWORD })
      .expect(401);
  });
});
