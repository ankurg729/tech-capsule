import { describe, expect, it } from 'vitest';
import { AuditLog } from '../src/modules/admin/auditLog.model.js';
import { ContentIndexJob } from '../src/modules/lessons/contentIndexJob.model.js';
import { Report } from '../src/modules/reports/report.model.js';
import { User } from '../src/modules/users/user.model.js';
import { api, bearer, createAdmin, createLesson, registerUser, sampleBlocks } from './helpers.js';

const lessonBody = {
  title: 'RAG chunking strategies',
  summary: 'How to split documents for retrieval.',
  technology: 'rag',
  tags: ['rag', 'chunking'],
  difficulty: 'intermediate',
  language: 'en',
  blocks: sampleBlocks,
};

describe('admin authorization', () => {
  it('rejects anonymous users and non-admins on every admin route', async () => {
    const user = await registerUser({ verified: true });
    for (const path of [
      '/api/v1/admin/overview',
      '/api/v1/admin/lessons',
      '/api/v1/admin/reports',
      '/api/v1/admin/audit-logs',
    ]) {
      await api.get(path).expect(401);
      const res = await api.get(path).set(bearer(user)).expect(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    }
    await api.post('/api/v1/admin/lessons').set(bearer(user)).send(lessonBody).expect(403);
  });

  it('re-checks the role in the database, so demotion is immediate', async () => {
    const admin = await createAdmin();
    await api.get('/api/v1/admin/overview').set(bearer(admin)).expect(200);
    await User.updateOne({ _id: admin.id }, { $set: { role: 'user' } });
    await api.get('/api/v1/admin/overview').set(bearer(admin)).expect(403);
  });
});

describe('lesson workflow', () => {
  it('draft → publish → edit → archive with audit trail and index outbox', async () => {
    const admin = await createAdmin();
    const created = await api
      .post('/api/v1/admin/lessons')
      .set(bearer(admin))
      .send(lessonBody)
      .expect(201);
    const lesson = created.body.data;
    expect(lesson).toMatchObject({
      status: 'draft',
      slug: 'rag-chunking-strategies',
      contentVersion: 1,
    });
    expect(lesson.blocks.find((b: { type: string }) => b.type === 'quiz').correctOptionIds).toEqual(
      ['a'],
    );

    await api.get(`/api/v1/lessons/${lesson.slug}`).expect(404);
    await api.post(`/api/v1/admin/lessons/${lesson.id}/publish`).set(bearer(admin)).expect(200);
    await api.get(`/api/v1/lessons/${lesson.slug}`).expect(200);

    const edited = await api
      .patch(`/api/v1/admin/lessons/${lesson.id}`)
      .set(bearer(admin))
      .send({
        blocks: [
          ...sampleBlocks,
          { id: 'tip', type: 'callout', variant: 'tip', text: 'Overlap chunks slightly.' },
        ],
      })
      .expect(200);
    expect(edited.body.data).toMatchObject({ contentVersion: 2, tags: ['rag', 'chunking'] });

    const withCover = await api
      .patch(`/api/v1/admin/lessons/${lesson.id}`)
      .set(bearer(admin))
      .send({ coverImageUrl: 'https://example.com/cover.png' })
      .expect(200);
    expect(withCover.body.data.coverImageUrl).toBe('https://example.com/cover.png');
    const cleared = await api
      .patch(`/api/v1/admin/lessons/${lesson.id}`)
      .set(bearer(admin))
      .send({ coverImageUrl: null })
      .expect(200);
    expect(cleared.body.data).toMatchObject({ coverImageUrl: null, contentVersion: 2 });

    const jobs = await ContentIndexJob.find({ lessonId: lesson.id })
      .sort({ contentVersion: 1 })
      .lean();
    expect(jobs.map((j) => [j.contentVersion, j.operation])).toEqual([
      [1, 'upsert'],
      [2, 'upsert'],
    ]);

    await api.post(`/api/v1/admin/lessons/${lesson.id}/archive`).set(bearer(admin)).expect(200);
    await api.get(`/api/v1/lessons/${lesson.slug}`).expect(404);

    const audit = await AuditLog.find({ targetId: lesson.id }).sort({ createdAt: 1 }).lean();
    expect(audit.map((a) => a.action)).toEqual([
      'lesson.create',
      'lesson.publish',
      'lesson.update',
      'lesson.update',
      'lesson.update',
      'lesson.archive',
    ]);
  });

  it('validates content blocks with the shared schema', async () => {
    const admin = await createAdmin();
    const bad = await api
      .post('/api/v1/admin/lessons')
      .set(bearer(admin))
      .send({
        ...lessonBody,
        blocks: [{ id: 'x', type: 'html', html: '<script>alert(1)</script>' }],
      })
      .expect(400);
    expect(bad.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects duplicate explicit slugs and de-duplicates generated ones', async () => {
    const admin = await createAdmin();
    await api.post('/api/v1/admin/lessons').set(bearer(admin)).send(lessonBody).expect(201);
    const second = await api
      .post('/api/v1/admin/lessons')
      .set(bearer(admin))
      .send(lessonBody)
      .expect(201);
    expect(second.body.data.slug).toBe('rag-chunking-strategies-2');
    await api
      .post('/api/v1/admin/lessons')
      .set(bearer(admin))
      .send({ ...lessonBody, slug: 'rag-chunking-strategies' })
      .expect(409);
  });
});

describe('paths and news', () => {
  it('creates and publishes a learning path', async () => {
    const admin = await createAdmin();
    const draftLesson = await createLesson({ status: 'draft' });
    const path = await api
      .post('/api/v1/admin/learning-paths')
      .set(bearer(admin))
      .send({
        title: 'Docker Fundamentals',
        description: 'Containers from zero.',
        technology: 'docker',
        difficulty: 'beginner',
        lessonIds: [draftLesson.id],
      })
      .expect(201);
    await api
      .post(`/api/v1/admin/learning-paths/${path.body.data.id}/publish`)
      .set(bearer(admin))
      .expect(400);

    const live = await createLesson();
    await api
      .patch(`/api/v1/admin/learning-paths/${path.body.data.id}`)
      .set(bearer(admin))
      .send({ lessonIds: [live.id, draftLesson.id] })
      .expect(200);
    await api
      .post(`/api/v1/admin/learning-paths/${path.body.data.id}/publish`)
      .set(bearer(admin))
      .expect(200);
    const pub = await api.get('/api/v1/learning-paths/docker-fundamentals').expect(200);
    expect(pub.body.data.lessonCount).toBe(1);

    const resolved = await api
      .get(`/api/v1/admin/lessons?ids=${live.id},${draftLesson.id}`)
      .set(bearer(admin))
      .expect(200);
    expect(resolved.body.data.map((l: { id: string }) => l.id).sort()).toEqual(
      [live.id, draftLesson.id].sort(),
    );
    await api.get('/api/v1/admin/lessons?ids=not-an-id').set(bearer(admin)).expect(400);
  });

  it('publishes news and lets users save it', async () => {
    const admin = await createAdmin();
    const user = await registerUser();
    const created = await api
      .post('/api/v1/admin/news')
      .set(bearer(admin))
      .send({
        title: 'Sample: Example AI tooling update',
        summary: 'A clearly labelled sample article for local development.',
        body: 'This is sample content.\n\nIt is not real news.',
        category: 'ai-tools',
        sourceName: 'TechCapsule Sample',
        sourceUrl: 'https://techcapsule.dev',
        isSample: true,
      })
      .expect(201);
    const article = created.body.data;
    expect((await api.get('/api/v1/news').expect(200)).body.data).toHaveLength(0);
    await api.post(`/api/v1/admin/news/${article.id}/publish`).set(bearer(admin)).expect(200);

    const list = await api.get('/api/v1/news?category=ai-tools').expect(200);
    expect(list.body.data[0]).toMatchObject({ isSample: true, sourceName: 'TechCapsule Sample' });
    await api.put(`/api/v1/news/${article.id}/bookmark`).set(bearer(user)).expect(200);
    const detail = await api.get(`/api/v1/news/${article.slug}`).set(bearer(user)).expect(200);
    expect(detail.body.data.viewer.bookmarked).toBe(true);
    const saved = await api
      .get('/api/v1/users/me/bookmarks?type=news')
      .set(bearer(user))
      .expect(200);
    expect(saved.body.data[0].id).toBe(article.id);
  });
});

describe('moderation', () => {
  it('hides reported content, settles related reports and keeps counters consistent', async () => {
    const admin = await createAdmin();
    const [asker, spammer, r1, r2] = await Promise.all([
      registerUser({ verified: true }),
      registerUser({ verified: true }),
      registerUser(),
      registerUser(),
    ]);
    const q = (
      await api
        .post('/api/v1/questions')
        .set(bearer(asker))
        .send({
          title: 'Why does my container exit immediately?',
          body: 'docker run starts my Node app container and it exits with code 0 right away.',
          tags: ['docker'],
        })
    ).body.data;
    const spam = (
      await api
        .post(`/api/v1/questions/${q.id}/answers`)
        .set(bearer(spammer))
        .send({ body: 'Buy cheap followers at my totally legit website' })
    ).body.data;

    for (const reporter of [r1, r2]) {
      await api
        .post('/api/v1/reports')
        .set(bearer(reporter))
        .send({ targetType: 'answer', targetId: spam.id, reason: 'spam' })
        .expect(201);
    }
    const queue = await api.get('/api/v1/admin/reports').set(bearer(admin)).expect(200);
    expect(queue.body.meta.total).toBe(2);
    expect(queue.body.data[0].target.excerpt).toContain('cheap followers');

    await api
      .post(`/api/v1/admin/reports/${queue.body.data[0].id}/resolve`)
      .set(bearer(admin))
      .send({ action: 'hide-content', note: 'spam' })
      .expect(200);

    expect(await Report.countDocuments({ status: 'open' })).toBe(0);
    const answers = await api.get(`/api/v1/questions/${q.id}/answers`).expect(200);
    expect(answers.body.data).toHaveLength(0);
    const detail = await api.get(`/api/v1/questions/${q.id}`).expect(200);
    expect(detail.body.data.answerCount).toBe(0);

    const overview = await api.get('/api/v1/admin/overview').set(bearer(admin)).expect(200);
    expect(overview.body.data.counts.openReports).toBe(0);
    expect(overview.body.data.recentAudit[0].action).toBe('report.hide-content');
    const audit = await api
      .get('/api/v1/admin/audit-logs?targetType=answer')
      .set(bearer(admin))
      .expect(200);
    expect(audit.body.data).toHaveLength(1);
  });
});
