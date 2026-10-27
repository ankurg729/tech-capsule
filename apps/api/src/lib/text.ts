import { AppError } from './errors.js';

export function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100)
    .replace(/-+$/g, '');
}

export function excerpt(text: string, max = 180): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  return flat.length <= max ? flat : `${flat.slice(0, max - 1).trimEnd()}…`;
}

export function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const URL_PATTERN = /https?:\/\/\S+/gi;
const MAX_LINKS = 5;

/** Cheap heuristics that block the most common low-effort spam without an external service. */
export function assertNotSpam(...texts: string[]): void {
  const joined = texts.join('\n');
  const links = joined.match(URL_PATTERN)?.length ?? 0;
  if (links > MAX_LINKS) {
    throw new AppError(422, 'SPAM_DETECTED', `Posts may contain at most ${MAX_LINKS} links`);
  }
  if (/(.)\1{29,}/su.test(joined)) {
    throw new AppError(422, 'SPAM_DETECTED', 'Post contains excessive repeated characters');
  }
}
