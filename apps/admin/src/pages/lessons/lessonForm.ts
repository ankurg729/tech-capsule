import type {
  AdminLessonDTO,
  ContentBlock,
  ContentLanguage,
  Difficulty,
  Technology,
} from '@techcapsule/contracts';
import { cleanBlock } from '@/features/blocks/blockModel';
import { blankToUndefined } from '@/lib/forms';

export interface LessonFormValues {
  title: string;
  slug: string;
  summary: string;
  technology: Technology;
  tags: string;
  difficulty: Difficulty;
  language: ContentLanguage;
  coverImageUrl: string;
  blocks: ContentBlock[];
}

export const EMPTY_LESSON: LessonFormValues = {
  title: '',
  slug: '',
  summary: '',
  technology: 'mcp',
  tags: '',
  difficulty: 'beginner',
  language: 'en',
  coverImageUrl: '',
  blocks: [],
};

export function lessonToForm(l: AdminLessonDTO): LessonFormValues {
  return {
    title: l.title,
    slug: l.slug,
    summary: l.summary,
    technology: l.technology,
    tags: l.tags.join(', '),
    difficulty: l.difficulty,
    language: l.language,
    coverImageUrl: l.coverImageUrl ?? '',
    blocks: l.blocks,
  };
}

export function parseTags(raw: string): string[] {
  return raw
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
}

/**
 * Request body for create/update. A blank cover image becomes `null` on edits so it is
 * cleared, and is omitted on create.
 */
export function formToLessonInput(v: LessonFormValues, isEdit: boolean) {
  const cover = blankToUndefined(v.coverImageUrl);
  return {
    title: v.title,
    slug: blankToUndefined(v.slug),
    summary: v.summary,
    technology: v.technology,
    tags: parseTags(v.tags),
    difficulty: v.difficulty,
    language: v.language,
    coverImageUrl: cover ?? (isEdit ? null : undefined),
    blocks: v.blocks.map(cleanBlock),
  };
}
