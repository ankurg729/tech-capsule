import type { ContentBlockInput, LessonInput } from '@techcapsule/contracts';
import { estimateReadingMinutes, lessonInputSchema } from '@techcapsule/contracts';
import request from 'supertest';
import { createApp, type AppOptions } from '../src/app.js';
import { devOutbox } from '../src/integrations/email/index.js';
import { hashPassword } from '../src/modules/auth/password.js';
import { buildSearchText } from '../src/modules/lessons/lessons.admin.service.js';
import { Lesson } from '../src/modules/lessons/lesson.model.js';
import { User } from '../src/modules/users/user.model.js';

export const makeApi = (opts: AppOptions = {}) => request(createApp(opts));
export const api = makeApi();

let counter = 0;
export const uniqueEmail = (prefix = 'user') => `${prefix}${++counter}_${Date.now()}@example.com`;

export const PASSWORD = 'correct-horse-42';

export interface TestUser {
  id: string;
  email: string;
  accessToken: string;
  refreshToken: string;
}

export async function registerUser(
  opts: { verified?: boolean; email?: string } = {},
): Promise<TestUser> {
  const email = opts.email ?? uniqueEmail();
  const res = await api
    .post('/api/v1/auth/register')
    .send({ email, password: PASSWORD, displayName: 'Test Dev' })
    .expect(201);
  if (opts.verified) {
    await User.updateOne({ email }, { $set: { emailVerifiedAt: new Date() } });
  }
  return {
    id: res.body.data.user.id,
    email,
    accessToken: res.body.data.tokens.accessToken,
    refreshToken: res.body.data.tokens.refreshToken,
  };
}

export async function createAdmin(): Promise<TestUser> {
  const email = uniqueEmail('admin');
  await User.create({
    email,
    passwordHash: await hashPassword(PASSWORD),
    displayName: 'Admin',
    role: 'admin',
    emailVerifiedAt: new Date(),
  });
  const res = await api.post('/api/v1/auth/login').send({ email, password: PASSWORD }).expect(200);
  return {
    id: res.body.data.user.id,
    email,
    accessToken: res.body.data.tokens.accessToken,
    refreshToken: res.body.data.tokens.refreshToken,
  };
}

export const bearer = (u: { accessToken: string }) => ({
  Authorization: `Bearer ${u.accessToken}`,
});

export function latestCode(email: string): string {
  const mail = devOutbox?.list().find((m) => m.to === email);
  const match = mail?.text.match(/code: ([A-Z0-9]{8})/);
  if (!match) throw new Error(`No code email for ${email}`);
  return match[1]!;
}

export const sampleBlocks: ContentBlockInput[] = [
  { id: 'intro', type: 'heading', text: 'Introduction' },
  { id: 'p1', type: 'paragraph', text: 'MCP connects **models** to tools using `JSON-RPC`.' },
  { id: 'code1', type: 'code', language: 'typescript', code: 'const x: number = 1;' },
  {
    id: 'quiz1',
    type: 'quiz',
    question: 'What transport does a local MCP server commonly use?',
    options: [
      { id: 'a', text: 'stdio' },
      { id: 'b', text: 'FTP' },
    ],
    correctOptionIds: ['a'],
    explanation: 'Local servers are usually spawned as subprocesses speaking over stdio.',
  },
];

export async function createLesson(
  overrides: Partial<LessonInput> & {
    status?: 'draft' | 'published' | 'archived';
    slug?: string;
  } = {},
) {
  const { status = 'published', ...rest } = overrides;
  const input = lessonInputSchema.parse({
    title: 'Intro to Model Context Protocol',
    summary: 'Learn what MCP is and why it matters.',
    technology: 'mcp',
    tags: ['mcp', 'ai'],
    difficulty: 'beginner',
    language: 'en',
    blocks: sampleBlocks,
    ...rest,
  });
  return Lesson.create({
    ...input,
    slug: overrides.slug ?? `lesson-${++counter}`,
    searchText: buildSearchText(input.blocks),
    estimatedMinutes: Math.max(estimateReadingMinutes(input.blocks), 4),
    status,
    publishedAt: status === 'published' ? new Date(Date.now() - counter * 1000) : null,
  });
}
