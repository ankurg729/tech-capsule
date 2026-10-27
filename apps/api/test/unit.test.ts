import { contentBlocksSchema } from '@techcapsule/contracts';
import { Types } from 'mongoose';
import { describe, expect, it } from 'vitest';
import { buildOpenApiDocument } from '../src/docs/openapi.js';
import { addDays, dayKey } from '../src/lib/dates.js';
import { assertNotSpam, slugify } from '../src/lib/text.js';
import { buildLessonIndexDocuments } from '../src/modules/lessons/lessonIndexing.js';
import { computeStreaks } from '../src/modules/progress/activity.service.js';
import { sampleBlocks } from './helpers.js';

describe('streaks', () => {
  it('counts consecutive days and tolerates today not being active yet', () => {
    const today = '2026-10-27';
    expect(computeStreaks([], today)).toEqual({ current: 0, longest: 0 });
    expect(computeStreaks(['2026-10-25', '2026-10-26'], today).current).toBe(2);
    expect(computeStreaks(['2026-10-25', '2026-10-26', today], today).current).toBe(3);
    expect(computeStreaks(['2026-10-20', '2026-10-21', '2026-10-22', '2026-10-25'], today)).toEqual(
      {
        current: 0,
        longest: 3,
      },
    );
  });
});

describe('dates', () => {
  it('uses the user timezone for calendar days', () => {
    const instant = new Date('2026-10-27T20:00:00Z');
    expect(dayKey(instant, 'UTC')).toBe('2026-10-27');
    expect(dayKey(instant, 'Asia/Kolkata')).toBe('2026-10-28');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
});

describe('text helpers', () => {
  it('slugifies titles', () => {
    expect(slugify('  MCP: Tools & Résumés!  ')).toBe('mcp-tools-resumes');
  });
  it('flags link spam and character floods', () => {
    expect(() => assertNotSpam('normal text https://a.dev')).not.toThrow();
    expect(() => assertNotSpam(Array(6).fill('https://x.dev').join(' '))).toThrow();
    expect(() => assertNotSpam('!'.repeat(40))).toThrow();
  });
});

describe('phase 2 indexing', () => {
  it('chunks lessons by section with metadata and without quiz answers', () => {
    const blocks = contentBlocksSchema.parse(sampleBlocks);
    const docs = buildLessonIndexDocuments({
      _id: new Types.ObjectId(),
      slug: 'intro-mcp',
      title: 'Intro',
      language: 'en',
      technology: 'mcp',
      difficulty: 'beginner',
      contentVersion: 3,
      blocks,
    });
    expect(docs).toHaveLength(1);
    expect(docs[0]!.metadata).toMatchObject({
      language: 'en',
      technology: 'mcp',
      contentVersion: 3,
      sectionId: 'intro',
    });
    expect(docs[0]!.metadata.deepLink).toBe('techcapsule://lesson/intro-mcp?section=intro');
    expect(docs[0]!.text).not.toContain('spawned as subprocesses');
  });
});

describe('openapi', () => {
  it('documents the required endpoints', () => {
    const doc = buildOpenApiDocument();
    for (const path of [
      '/auth/register',
      '/home',
      '/lessons/{slug}',
      '/questions/{id}/accept/{answerId}',
      '/news/daily-capsule',
      '/admin/reports',
    ]) {
      expect(doc.paths).toHaveProperty([path]);
    }
    expect(JSON.stringify(doc)).toContain('"bearerAuth"');
  });
});
