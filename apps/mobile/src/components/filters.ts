import {
  CONTENT_LANGUAGES,
  DIFFICULTIES,
  LANGUAGE_LABELS,
  NEWS_CATEGORIES,
  NEWS_CATEGORY_LABELS,
  TECHNOLOGIES,
  TECHNOLOGY_LABELS,
  type ContentLanguage,
  type Difficulty,
  type NewsCategory,
  type Technology,
} from '@techcapsule/contracts';
import type { ChipOption } from '@/components/ui';
import { difficultyLabel } from '@/lib/format';

export const TECHNOLOGY_OPTIONS: ChipOption<Technology>[] = TECHNOLOGIES.filter(
  (t) => t !== 'other',
).map((t) => ({ value: t, label: TECHNOLOGY_LABELS[t] }));

export const DIFFICULTY_OPTIONS: ChipOption<Difficulty>[] = DIFFICULTIES.map((d) => ({
  value: d,
  label: difficultyLabel(d),
}));

export const LANGUAGE_OPTIONS: ChipOption<ContentLanguage>[] = CONTENT_LANGUAGES.map((l) => ({
  value: l,
  label: LANGUAGE_LABELS[l],
}));

export const NEWS_CATEGORY_OPTIONS: ChipOption<NewsCategory>[] = NEWS_CATEGORIES.map((c) => ({
  value: c,
  label: NEWS_CATEGORY_LABELS[c],
}));
