import { describe, expect, it } from 'vitest';
import {
  contentBlocksSchema,
  estimateReadingMinutes,
  toPublicBlock,
  type ContentBlock,
} from './blocks.js';
import { registerInputSchema } from './auth.js';
import { lessonUpdateSchema } from './lessons.js';
import { newsUpdateSchema } from './news.js';

const quiz = {
  id: 'q1',
  type: 'quiz',
  question: 'What does MCP stand for?',
  options: [
    { id: 'a', text: 'Model Context Protocol' },
    { id: 'b', text: 'Machine Control Program' },
  ],
  correctOptionIds: ['a'],
  explanation: 'MCP is the Model Context Protocol.',
} as const;

describe('content blocks', () => {
  it('accepts every supported block type', () => {
    const result = contentBlocksSchema.safeParse([
      { id: 'h', type: 'heading', text: 'Intro' },
      { id: 'p', type: 'paragraph', text: 'Hello **world**' },
      { id: 'c', type: 'code', language: 'typescript', code: 'const a = 1;' },
      { id: 'i', type: 'image', url: 'https://example.com/a.png', alt: 'diagram' },
      {
        id: 'd',
        type: 'diagram',
        nodes: [
          { id: 'n1', label: 'Client' },
          { id: 'n2', label: 'Server' },
        ],
        edges: [{ from: 'n1', to: 'n2' }],
      },
      { id: 'co', type: 'callout', variant: 'tip', text: 'Remember this' },
      quiz,
    ]);
    expect(result.success).toBe(true);
  });

  it('rejects unknown block types and html-ish payloads by shape', () => {
    expect(
      contentBlocksSchema.safeParse([{ id: 'x', type: 'html', html: '<script>' }]).success,
    ).toBe(false);
  });

  it('rejects duplicate block ids', () => {
    const r = contentBlocksSchema.safeParse([
      { id: 'a', type: 'paragraph', text: 'one' },
      { id: 'a', type: 'paragraph', text: 'two' },
    ]);
    expect(r.success).toBe(false);
  });

  it('rejects quizzes whose answer is not an option', () => {
    const r = contentBlocksSchema.safeParse([{ ...quiz, correctOptionIds: ['z'] }]);
    expect(r.success).toBe(false);
  });

  it('rejects diagram edges pointing at unknown nodes', () => {
    const r = contentBlocksSchema.safeParse([
      {
        id: 'd',
        type: 'diagram',
        nodes: [
          { id: 'n1', label: 'A' },
          { id: 'n2', label: 'B' },
        ],
        edges: [{ from: 'n1', to: 'nope' }],
      },
    ]);
    expect(r.success).toBe(false);
  });

  it('rejects non-http image urls', () => {
    const r = contentBlocksSchema.safeParse([
      { id: 'i', type: 'image', url: 'javascript:alert(1)', alt: 'x' },
    ]);
    expect(r.success).toBe(false);
  });

  it('strips quiz answer keys for learners', () => {
    const parsed = contentBlocksSchema.parse([quiz]) as ContentBlock[];
    const pub = toPublicBlock(parsed[0]!);
    expect(pub).not.toHaveProperty('correctOptionIds');
    expect(pub).not.toHaveProperty('explanation');
    expect(pub).toMatchObject({ type: 'quiz', multiple: false });
  });

  it('estimates at least one minute of reading', () => {
    expect(estimateReadingMinutes([{ id: 'p', type: 'paragraph', text: 'short' }])).toBe(1);
    const long = 'word '.repeat(1000);
    expect(estimateReadingMinutes([{ id: 'p', type: 'paragraph', text: long }])).toBe(5);
  });
});

describe('partial update schemas', () => {
  it('do not inject defaults for omitted fields', () => {
    expect(lessonUpdateSchema.parse({ title: 'Hello world' })).toEqual({ title: 'Hello world' });
    expect(newsUpdateSchema.parse({ title: 'Hello world' })).toEqual({ title: 'Hello world' });
  });
});

describe('registration', () => {
  it('strips a client-supplied role', () => {
    const parsed = registerInputSchema.parse({
      email: ' Dev@Example.COM ',
      password: 'supersecret1',
      displayName: 'Dev',
      role: 'admin',
    });
    expect(parsed).not.toHaveProperty('role');
    expect(parsed.email).toBe('dev@example.com');
  });
});
