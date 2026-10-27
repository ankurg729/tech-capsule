import { describe, expect, it } from 'vitest';
import { LearningPath } from '../src/modules/learning-paths/learningPath.model.js';
import { api, bearer, createLesson, registerUser } from './helpers.js';

describe('public lessons', () => {
  it('lists only published lessons with pagination meta', async () => {
    await createLesson({ title: 'Published one about MCP' });
    await createLesson({ title: 'Published two about MCP' });
    await createLesson({ title: 'Secret draft lesson', status: 'draft' });
    await createLesson({ title: 'Old archived lesson', status: 'archived' });

    const res = await api.get('/api/v1/lessons?limit=1').expect(200);
    expect(res.body.meta).toMatchObject({
      page: 1,
      limit: 1,
      total: 2,
      totalPages: 2,
      hasNextPage: true,
    });
    expect(res.body.data[0]).not.toHaveProperty('blocks');
  });

  it('hides drafts from detail', async () => {
    const draft = await createLesson({ status: 'draft' });
    await api.get(`/api/v1/lessons/${draft.slug}`).expect(404);
  });

  it('filters by technology, difficulty, language and tag', async () => {
    await createLesson({
      technology: 'docker',
      difficulty: 'beginner',
      language: 'hinglish',
      tags: ['containers'],
    });
    await createLesson({
      technology: 'rag',
      difficulty: 'advanced',
      language: 'en',
      tags: ['embeddings'],
    });
    const r1 = await api.get('/api/v1/lessons?technology=docker&language=hinglish').expect(200);
    expect(r1.body.data).toHaveLength(1);
    const r2 = await api.get('/api/v1/lessons?difficulty=advanced&tag=embeddings').expect(200);
    expect(r2.body.data[0].technology).toBe('rag');
    await api.get('/api/v1/lessons?technology=cobol').expect(400);
  });

  it('never sends quiz answer keys', async () => {
    const lesson = await createLesson();
    const res = await api.get(`/api/v1/lessons/${lesson.slug}`).expect(200);
    const quiz = res.body.data.blocks.find((b: { type: string }) => b.type === 'quiz');
    expect(quiz).toMatchObject({ id: 'quiz1', multiple: false });
    expect(quiz).not.toHaveProperty('correctOptionIds');
    expect(quiz).not.toHaveProperty('explanation');
    expect(JSON.stringify(res.body)).not.toContain('Local servers are usually spawned');
  });

  it('evaluates quiz answers on the server', async () => {
    const user = await registerUser();
    const lesson = await createLesson();
    const url = `/api/v1/lessons/${lesson.id}/quiz/quiz1/answer`;
    const wrong = await api
      .post(url)
      .set(bearer(user))
      .send({ selectedOptionIds: ['b'] })
      .expect(200);
    expect(wrong.body.data).toMatchObject({ correct: false, correctOptionIds: ['a'] });
    const right = await api
      .post(url)
      .set(bearer(user))
      .send({ selectedOptionIds: ['a'] })
      .expect(200);
    expect(right.body.data.correct).toBe(true);
    await api
      .post(url)
      .set(bearer(user))
      .send({ selectedOptionIds: ['zzz'] })
      .expect(400);
    await api
      .post(url)
      .send({ selectedOptionIds: ['a'] })
      .expect(401);

    const detail = await api.get(`/api/v1/lessons/${lesson.slug}`).set(bearer(user)).expect(200);
    expect(detail.body.data.viewer.answeredQuizzes).toEqual([{ blockId: 'quiz1', correct: true }]);
  });
});

describe('bookmarks', () => {
  it('saves idempotently, lists and unsaves', async () => {
    const user = await registerUser();
    const lesson = await createLesson();
    await api.put(`/api/v1/lessons/${lesson.id}/bookmark`).set(bearer(user)).expect(200);
    await api.put(`/api/v1/lessons/${lesson.id}/bookmark`).set(bearer(user)).expect(200);

    const list = await api.get('/api/v1/users/me/bookmarks').set(bearer(user)).expect(200);
    expect(list.body.meta.total).toBe(1);
    expect(list.body.data[0]).toMatchObject({ id: lesson.id, savedAt: expect.any(String) });

    const detail = await api.get(`/api/v1/lessons/${lesson.slug}`).set(bearer(user)).expect(200);
    expect(detail.body.data.viewer.bookmarked).toBe(true);

    await api.delete(`/api/v1/lessons/${lesson.id}/bookmark`).set(bearer(user)).expect(200);
    const after = await api.get('/api/v1/users/me/bookmarks').set(bearer(user)).expect(200);
    expect(after.body.meta.total).toBe(0);
  });

  it('cannot bookmark drafts', async () => {
    const user = await registerUser();
    const draft = await createLesson({ status: 'draft' });
    await api.put(`/api/v1/lessons/${draft.id}/bookmark`).set(bearer(user)).expect(404);
  });
});

describe('progress', () => {
  it('records resume position, never regresses, and completes', async () => {
    const user = await registerUser();
    const lesson = await createLesson();
    const url = `/api/v1/lessons/${lesson.id}/progress`;

    await api
      .put(url)
      .set(bearer(user))
      .send({ lastBlockId: 'code1', completionPercent: 60 })
      .expect(200);
    const back = await api
      .put(url)
      .set(bearer(user))
      .send({ lastBlockId: 'p1', completionPercent: 20 })
      .expect(200);
    expect(back.body.data).toMatchObject({
      lastBlockId: 'p1',
      completionPercent: 60,
      completedAt: null,
    });

    await api
      .put(url)
      .set(bearer(user))
      .send({ lastBlockId: 'not-a-block', completionPercent: 70 })
      .expect(400);

    const done = await api
      .post(`/api/v1/lessons/${lesson.id}/complete`)
      .set(bearer(user))
      .expect(200);
    expect(done.body.data.completionPercent).toBe(100);
    expect(done.body.data.completedAt).toBeTruthy();

    const list = await api
      .get('/api/v1/users/me/progress?status=completed')
      .set(bearer(user))
      .expect(200);
    expect(list.body.data[0].lesson.id).toBe(lesson.id);
  });

  it('feeds streak and weekly stats from real activity', async () => {
    const user = await registerUser();
    const empty = await api.get('/api/v1/users/me/stats').set(bearer(user)).expect(200);
    expect(empty.body.data).toMatchObject({
      currentStreak: 0,
      todayMinutes: 0,
      totalLessonsCompleted: 0,
    });
    expect(empty.body.data.week).toHaveLength(7);

    const lesson = await createLesson();
    await api.post(`/api/v1/lessons/${lesson.id}/complete`).set(bearer(user)).expect(200);
    const stats = await api.get('/api/v1/users/me/stats').set(bearer(user)).expect(200);
    expect(stats.body.data.currentStreak).toBe(1);
    expect(stats.body.data.todayMinutes).toBe(lesson.estimatedMinutes);
    expect(stats.body.data.totalLessonsCompleted).toBe(1);
    expect(stats.body.data.week.at(-1)).toMatchObject({ active: true, lessonsCompleted: 1 });
  });
});

describe('ratings', () => {
  it('creates and updates a single rating per user with correct aggregates', async () => {
    const [a, b] = [await registerUser(), await registerUser()];
    const lesson = await createLesson();
    const url = `/api/v1/lessons/${lesson.id}/rating`;

    await api.put(url).set(bearer(a)).send({ stars: 5 }).expect(200);
    const second = await api.put(url).set(bearer(b)).send({ stars: 2 }).expect(200);
    expect(second.body.data).toMatchObject({ ratingAvg: 3.5, ratingCount: 2 });
    const updated = await api.put(url).set(bearer(a)).send({ stars: 4 }).expect(200);
    expect(updated.body.data).toMatchObject({ stars: 4, ratingAvg: 3, ratingCount: 2 });

    await api.put(url).set(bearer(a)).send({ stars: 6 }).expect(400);
    const detail = await api.get(`/api/v1/lessons/${lesson.slug}`).set(bearer(a)).expect(200);
    expect(detail.body.data.viewer.rating).toBe(4);
  });
});

describe('learning paths', () => {
  it('returns ordered published lessons with viewer progress and resume target', async () => {
    const user = await registerUser();
    const l1 = await createLesson({ title: 'Path lesson one' });
    const l2 = await createLesson({ title: 'Path lesson two' });
    const hidden = await createLesson({ title: 'Path draft lesson', status: 'draft' });
    await LearningPath.create({
      slug: 'mcp-fundamentals',
      title: 'MCP Fundamentals',
      description: 'Learn MCP step by step.',
      technology: 'mcp',
      difficulty: 'beginner',
      lessonIds: [l1._id, hidden._id, l2._id],
      status: 'published',
      publishedAt: new Date(),
    });
    await api.post(`/api/v1/lessons/${l1.id}/complete`).set(bearer(user)).expect(200);

    const res = await api
      .get('/api/v1/learning-paths/mcp-fundamentals')
      .set(bearer(user))
      .expect(200);
    expect(res.body.data.lessons.map((l: { id: string }) => l.id)).toEqual([l1.id, l2.id]);
    expect(res.body.data).toMatchObject({
      lessonCount: 2,
      estimatedMinutes: l1.estimatedMinutes + l2.estimatedMinutes,
      viewerProgress: { completedCount: 1, percent: 50 },
      resumeLessonSlug: l2.slug,
    });

    const list = await api.get('/api/v1/learning-paths').expect(200);
    expect(list.body.data[0].viewerProgress).toBeNull();
  });
});

describe('home and search', () => {
  it('returns a single aggregated feed with honest empty states', async () => {
    const anon = await api.get('/api/v1/home').expect(200);
    expect(anon.body.data).toMatchObject({
      dailyCapsule: { lesson: null },
      continueLearning: [],
      recommendedPaths: [],
      trending: { basis: 'recent', lessons: [] },
      recentQuestions: [],
      stats: null,
    });

    const user = await registerUser();
    const lesson = await createLesson();
    await api
      .put(`/api/v1/lessons/${lesson.id}/progress`)
      .set(bearer(user))
      .send({ completionPercent: 30 })
      .expect(200);
    const home = await api.get('/api/v1/home').set(bearer(user)).expect(200);
    expect(home.body.data.dailyCapsule.lesson.id).toBe(lesson.id);
    expect(home.body.data.continueLearning[0]).toMatchObject({
      lessonId: lesson.id,
      completionPercent: 30,
    });
    expect(home.body.data.stats.currentStreak).toBe(1);
  });

  it('daily capsule is stable for a day', async () => {
    await createLesson();
    await createLesson();
    const a = await api.get('/api/v1/news/daily-capsule').expect(200);
    const b = await api.get('/api/v1/news/daily-capsule').expect(200);
    expect(a.body.data.lesson.id).toBe(b.body.data.lesson.id);
  });

  it('searches published content only, including partial words', async () => {
    await createLesson({
      title: 'Kubernetes deployments explained',
      technology: 'kubernetes',
      tags: ['k8s'],
    });
    await createLesson({ title: 'Kubernetes secrets draft', status: 'draft' });
    const full = await api.get('/api/v1/search?q=kubernetes').expect(200);
    expect(full.body.data.lessons).toHaveLength(1);
    const partial = await api.get('/api/v1/search?q=kube&type=lessons').expect(200);
    expect(partial.body.data.lessons[0].title).toContain('Kubernetes');
    await api.get('/api/v1/search?q=k').expect(400);
  });
});
