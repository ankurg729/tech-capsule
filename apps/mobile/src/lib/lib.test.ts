import { loginInputSchema, registerInputSchema } from '@techcapsule/contracts';
import { resolveApiUrl } from '@/config';
import { formatMinutes, formatRelative, greeting, weekdayInitial } from './format';
import { validate } from './forms';
import { tokenize } from './highlight';
import { parseInline } from './inline';
import { computeReadingState, MAX_SCROLL_PERCENT, shouldSave } from './readingProgress';

describe('parseInline', () => {
  it('splits bold and code spans and keeps everything else literal', () => {
    expect(parseInline('Use **MCP** with `npx` <b>now</b>')).toEqual([
      { type: 'text', text: 'Use ' },
      { type: 'bold', text: 'MCP' },
      { type: 'text', text: ' with ' },
      { type: 'code', text: 'npx' },
      { type: 'text', text: ' <b>now</b>' },
    ]);
  });

  it('leaves unmatched markers as plain text', () => {
    expect(parseInline('a ** b ` c')).toEqual([{ type: 'text', text: 'a ** b ` c' }]);
  });
});

describe('tokenize', () => {
  const join = (code: string, lang: Parameters<typeof tokenize>[1]) =>
    tokenize(code, lang)
      .map((t) => t.text)
      .join('');

  it('round-trips the source exactly for every language', () => {
    const samples: [string, Parameters<typeof tokenize>[1]][] = [
      ['const x = await fetch("/api"); // go\nexport default x;', 'typescript'],
      ['{"name": "tc", "ok": true, "n": -1.5}', 'json'],
      ['docker run -p 3000:3000 $IMAGE # run', 'bash'],
      ['def f(x):\n    return None  # nothing', 'python'],
      ['apiVersion: v1\nkind: Pod # comment', 'yaml'],
      ['FROM node:22-alpine\nRUN npm ci', 'dockerfile'],
      ['plain text', 'text'],
    ];
    for (const [code, lang] of samples) expect(join(code, lang)).toBe(code);
  });

  it('classifies keywords, strings, comments and functions', () => {
    const tokens = tokenize('const s = "hi"; // note\nrun()', 'javascript');
    const typeOf = (text: string) => tokens.find((t) => t.text.trim() === text)?.type;
    expect(typeOf('const')).toBe('keyword');
    expect(typeOf('"hi"')).toBe('string');
    expect(typeOf('// note')).toBe('comment');
    expect(typeOf('run')).toBe('function');
  });

  it('highlights JSON keys separately from values', () => {
    const tokens = tokenize('{"a": "b"}', 'json');
    expect(tokens.find((t) => t.text === '"a"')?.type).toBe('property');
    expect(tokens.find((t) => t.text === '"b"')?.type).toBe('string');
  });
});

describe('reading progress', () => {
  const positions = [
    { id: 'h1', y: 0, isHeading: true },
    { id: 'p1', y: 400, isHeading: false },
    { id: 'h2', y: 900, isHeading: true },
    { id: 'p2', y: 1600, isHeading: false },
  ];

  it('counts blocks above the read line and tracks the current section', () => {
    expect(computeReadingState(positions, 0, 600)).toEqual({ percent: 48, sectionId: 'h1' });
    expect(computeReadingState(positions, 900, 600).sectionId).toBe('h2');
  });

  it('never reports 100% from scrolling alone', () => {
    expect(computeReadingState(positions, 5000, 600).percent).toBe(MAX_SCROLL_PERCENT);
  });

  it('only saves after meaningful progress or a section change', () => {
    const last = { percent: 40, sectionId: 'h1' };
    expect(shouldSave(last, { percent: 42, sectionId: 'h1' })).toBe(false);
    expect(shouldSave(last, { percent: 45, sectionId: 'h1' })).toBe(true);
    expect(shouldSave(last, { percent: 41, sectionId: 'h2' })).toBe(true);
  });
});

describe('resolveApiUrl', () => {
  it('prefers EXPO_PUBLIC_API_URL and strips trailing slashes', () => {
    expect(resolveApiUrl('https://api.example.dev/api/v1/', '192.168.1.5:8081', 'ios')).toBe(
      'https://api.example.dev/api/v1',
    );
  });

  it('uses the Metro LAN host for devices', () => {
    expect(resolveApiUrl(undefined, '192.168.1.5:8081', 'android')).toBe(
      'http://192.168.1.5:4000/api/v1',
    );
  });

  it('falls back to the Android emulator host alias or localhost', () => {
    expect(resolveApiUrl(undefined, 'localhost:8081', 'android')).toBe(
      'http://10.0.2.2:4000/api/v1',
    );
    expect(resolveApiUrl('', undefined, 'ios')).toBe('http://localhost:4000/api/v1');
  });
});

describe('validate', () => {
  it('returns parsed data using the shared contracts schema', () => {
    const res = validate(loginInputSchema, { email: ' Dev@Example.com ', password: 'x' });
    expect(res.data).toEqual({ email: 'dev@example.com', password: 'x' });
  });

  it('maps issues to fields and never passes a client-chosen role through', () => {
    const bad = validate(registerInputSchema, {
      email: 'nope',
      password: 'short',
      displayName: 'A',
    });
    expect(Object.keys(bad.errors ?? {}).sort()).toEqual(['displayName', 'email', 'password']);
    const good = validate(registerInputSchema, {
      email: 'a@b.dev',
      password: 'longenough1',
      displayName: 'Ada',
      role: 'admin',
    });
    expect(good.data).not.toHaveProperty('role');
  });
});

describe('format helpers', () => {
  it('formats durations and relative times', () => {
    expect(formatMinutes(45)).toBe('45 min');
    expect(formatMinutes(80)).toBe('1 h 20 min');
    const now = Date.parse('2026-03-10T12:00:00Z');
    expect(formatRelative('2026-03-10T11:58:00Z', now)).toBe('2m ago');
    expect(formatRelative('2026-03-08T12:00:00Z', now)).toBe('2d ago');
  });

  it('derives greeting and weekday initials', () => {
    expect(greeting(new Date(2026, 0, 1, 9))).toBe('Good morning');
    expect(greeting(new Date(2026, 0, 1, 22))).toBe('Good evening');
    expect(weekdayInitial('2026-03-09')).toBe('M');
  });
});
