import { describe, expect, it } from 'vitest';
import { Vote } from '../src/modules/votes/vote.model.js';
import { api, bearer, registerUser, type TestUser } from './helpers.js';

const question = {
  title: 'How do I expose a tool from an MCP server?',
  body: 'I have a Node.js MCP server running over stdio. How do I register a tool with an input schema?',
  tags: ['mcp', 'nodejs'],
};

async function ask(user: TestUser, overrides: Partial<typeof question> = {}) {
  const res = await api
    .post('/api/v1/questions')
    .set(bearer(user))
    .send({ ...question, ...overrides })
    .expect(201);
  return res.body.data as { id: string };
}

async function answer(
  user: TestUser,
  questionId: string,
  body = 'Use server.registerTool with a Zod input schema and return content.',
) {
  const res = await api
    .post(`/api/v1/questions/${questionId}/answers`)
    .set(bearer(user))
    .send({ body })
    .expect(201);
  return res.body.data as { id: string };
}

describe('questions', () => {
  it('requires a verified email to post', async () => {
    const unverified = await registerUser();
    const res = await api
      .post('/api/v1/questions')
      .set(bearer(unverified))
      .send(question)
      .expect(403);
    expect(res.body.error.code).toBe('EMAIL_NOT_VERIFIED');
  });

  it('validates input', async () => {
    const user = await registerUser({ verified: true });
    const res = await api
      .post('/api/v1/questions')
      .set(bearer(user))
      .send({ title: 'short', body: 'x', tags: [] })
      .expect(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('creates, lists, filters and searches', async () => {
    const user = await registerUser({ verified: true });
    const q = await ask(user);
    await ask(user, { title: 'Docker compose networking between services', tags: ['docker'] });

    const list = await api.get('/api/v1/questions').expect(200);
    expect(list.body.meta.total).toBe(2);
    expect(list.body.data[0].author.displayName).toBe('Test Dev');
    const byTag = await api.get('/api/v1/questions?tag=docker').expect(200);
    expect(byTag.body.data).toHaveLength(1);
    const search = await api.get('/api/v1/questions?q=tool').expect(200);
    expect(search.body.data[0].id).toBe(q.id);
    const unanswered = await api.get('/api/v1/questions?sort=unanswered').expect(200);
    expect(unanswered.body.data).toHaveLength(2);
    const mine = await api.get('/api/v1/questions?mine=true').set(bearer(user)).expect(200);
    expect(mine.body.meta.total).toBe(2);
  });

  it('blocks duplicates and link spam', async () => {
    const user = await registerUser({ verified: true });
    await ask(user);
    const dup = await api.post('/api/v1/questions').set(bearer(user)).send(question).expect(422);
    expect(dup.body.error.code).toBe('SPAM_DETECTED');
    const links = Array.from({ length: 6 }, (_, i) => `https://spam${i}.example.com`).join(' ');
    await api
      .post('/api/v1/questions')
      .set(bearer(user))
      .send({
        ...question,
        title: 'Totally different question title here',
        body: `Buy now ${links}`,
      })
      .expect(422);
  });

  it('only lets authors edit', async () => {
    const [owner, other] = [
      await registerUser({ verified: true }),
      await registerUser({ verified: true }),
    ];
    const q = await ask(owner);
    await api
      .patch(`/api/v1/questions/${q.id}`)
      .set(bearer(other))
      .send({ title: 'Hijacked question title!!' })
      .expect(403);
    const edited = await api
      .patch(`/api/v1/questions/${q.id}`)
      .set(bearer(owner))
      .send({ tags: ['mcp'] })
      .expect(200);
    expect(edited.body.data).toMatchObject({ tags: ['mcp'], editedAt: expect.any(String) });
  });
});

describe('answers and acceptance', () => {
  it('posts, paginates, edits own answers and accepts', async () => {
    const [asker, helper, other] = [
      await registerUser({ verified: true }),
      await registerUser({ verified: true }),
      await registerUser({ verified: true }),
    ];
    const q = await ask(asker);
    const a1 = await answer(helper, q.id);
    const a2 = await answer(
      other,
      q.id,
      'Another approach: define the tool schema with JSON Schema directly.',
    );

    const page = await api.get(`/api/v1/questions/${q.id}/answers?limit=1`).expect(200);
    expect(page.body.meta).toMatchObject({ total: 2, hasNextPage: true });

    await api
      .patch(`/api/v1/answers/${a1.id}`)
      .set(bearer(other))
      .send({ body: 'Not my answer but editing it anyway' })
      .expect(403);
    await api
      .patch(`/api/v1/answers/${a1.id}`)
      .set(bearer(helper))
      .send({ body: 'Updated: use registerTool and return a content array.' })
      .expect(200);

    await api.put(`/api/v1/questions/${q.id}/accept/${a2.id}`).set(bearer(helper)).expect(403);
    await api.put(`/api/v1/questions/${q.id}/accept/${a2.id}`).set(bearer(asker)).expect(200);
    await api.put(`/api/v1/questions/${q.id}/accept/${a1.id}`).set(bearer(asker)).expect(200);

    const answers = await api.get(`/api/v1/questions/${q.id}/answers`).expect(200);
    expect(answers.body.data[0]).toMatchObject({ id: a1.id, isAccepted: true });
    expect(answers.body.data.filter((a: { isAccepted: boolean }) => a.isAccepted)).toHaveLength(1);

    const detail = await api.get(`/api/v1/questions/${q.id}`).expect(200);
    expect(detail.body.data).toMatchObject({
      answerCount: 2,
      acceptedAnswerId: a1.id,
      hasAcceptedAnswer: true,
    });
  });

  it('rejects accepting an answer from another question', async () => {
    const asker = await registerUser({ verified: true });
    const helper = await registerUser({ verified: true });
    const q1 = await ask(asker);
    const q2 = await ask(asker, { title: 'A second, unrelated question title' });
    const a = await answer(helper, q2.id);
    await api.put(`/api/v1/questions/${q1.id}/accept/${a.id}`).set(bearer(asker)).expect(400);
  });
});

describe('votes', () => {
  it('upvotes idempotently, forbids self-votes, and removes votes', async () => {
    const [author, voter] = [
      await registerUser({ verified: true }),
      await registerUser({ verified: true }),
    ];
    const q = await ask(author);

    await api.put(`/api/v1/votes/question/${q.id}`).set(bearer(author)).expect(403);
    const v1 = await api.put(`/api/v1/votes/question/${q.id}`).set(bearer(voter)).expect(200);
    const v2 = await api.put(`/api/v1/votes/question/${q.id}`).set(bearer(voter)).expect(200);
    expect(v1.body.data.voteScore).toBe(1);
    expect(v2.body.data.voteScore).toBe(1);
    expect(await Vote.countDocuments()).toBe(1);

    const detail = await api.get(`/api/v1/questions/${q.id}`).set(bearer(voter)).expect(200);
    expect(detail.body.data.viewer).toEqual({ voted: true, isAuthor: false });

    const removed = await api
      .delete(`/api/v1/votes/question/${q.id}`)
      .set(bearer(voter))
      .expect(200);
    expect(removed.body.data).toMatchObject({ voted: false, voteScore: 0 });
    const again = await api.delete(`/api/v1/votes/question/${q.id}`).set(bearer(voter)).expect(200);
    expect(again.body.data.voteScore).toBe(0);
    await api.put(`/api/v1/votes/comment/${q.id}`).set(bearer(voter)).expect(400);
  });

  it('handles concurrent duplicate votes safely', async () => {
    const [author, voter] = [
      await registerUser({ verified: true }),
      await registerUser({ verified: true }),
    ];
    const q = await ask(author);
    await Promise.all(
      Array.from({ length: 5 }, () => api.put(`/api/v1/votes/question/${q.id}`).set(bearer(voter))),
    );
    const detail = await api.get(`/api/v1/questions/${q.id}`).expect(200);
    expect(detail.body.data.voteScore).toBe(1);
  });
});

describe('comments and reports', () => {
  it('comments on questions and answers', async () => {
    const [asker, helper] = [
      await registerUser({ verified: true }),
      await registerUser({ verified: true }),
    ];
    const q = await ask(asker);
    const a = await answer(helper, q.id);
    await api
      .post('/api/v1/comments')
      .set(bearer(helper))
      .send({ targetType: 'question', targetId: q.id, body: 'Which SDK version?' })
      .expect(201);
    await api
      .post('/api/v1/comments')
      .set(bearer(asker))
      .send({ targetType: 'answer', targetId: a.id, body: 'Thanks, that worked!' })
      .expect(201);

    const comments = await api
      .get(`/api/v1/comments?targetType=answer&targetId=${a.id}`)
      .expect(200);
    expect(comments.body.data[0].body).toBe('Thanks, that worked!');
    const detail = await api.get(`/api/v1/questions/${q.id}`).expect(200);
    expect(detail.body.data.commentCount).toBe(1);
  });

  it('accepts one report per user per item', async () => {
    const [asker, reporter] = [await registerUser({ verified: true }), await registerUser()];
    const q = await ask(asker);
    const body = { targetType: 'question', targetId: q.id, reason: 'spam' };
    await api.post('/api/v1/reports').set(bearer(reporter)).send(body).expect(201);
    await api.post('/api/v1/reports').set(bearer(reporter)).send(body).expect(201);
    await api
      .post('/api/v1/reports')
      .set(bearer(reporter))
      .send({ ...body, reason: 'not-a-reason' })
      .expect(400);
    await api.post('/api/v1/reports').send(body).expect(401);
  });
});
