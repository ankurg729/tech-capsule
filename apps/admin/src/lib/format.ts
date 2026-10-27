import {
  LANGUAGE_LABELS,
  NEWS_CATEGORY_LABELS,
  TECHNOLOGY_LABELS,
  type ContentLanguage,
  type NewsCategory,
  type Technology,
} from '@techcapsule/contracts';

const dateTime = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });
const dateOnly = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });

export function formatDateTime(iso: string | null | undefined): string {
  return iso ? dateTime.format(new Date(iso)) : '—';
}

export function formatDate(iso: string | null | undefined): string {
  return iso ? dateOnly.format(new Date(iso)) : '—';
}

export const technologyLabel = (t: Technology) => TECHNOLOGY_LABELS[t];
export const languageLabel = (l: ContentLanguage) => LANGUAGE_LABELS[l];
export const categoryLabel = (c: NewsCategory) => NEWS_CATEGORY_LABELS[c];

export function capitalize(s: string): string {
  return s ? s[0]!.toUpperCase() + s.slice(1) : s;
}

export function plural(n: number, word: string, pluralWord = `${word}s`): string {
  return `${n} ${n === 1 ? word : pluralWord}`;
}
