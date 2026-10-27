import type { ContentBlock } from '@techcapsule/contracts';
import { logger } from '../../lib/logger.js';
import { ContentIndexJob } from './contentIndexJob.model.js';
import type { LessonDoc } from './lesson.model.js';

/** A retrieval-ready chunk. Metadata lets future AI answers deep-link back to the lesson. */
export interface LessonIndexDocument {
  id: string;
  text: string;
  metadata: {
    lessonId: string;
    slug: string;
    title: string;
    language: string;
    technology: string;
    difficulty: string;
    contentVersion: number;
    sectionId: string | null;
    sectionTitle: string | null;
    blockIds: string[];
    deepLink: string;
  };
}

function blockText(block: ContentBlock): string {
  switch (block.type) {
    case 'heading':
    case 'paragraph':
      return block.text;
    case 'callout':
      return [block.title, block.text].filter(Boolean).join(': ');
    case 'code':
      return [block.caption, '```' + block.language, block.code, '```'].filter(Boolean).join('\n');
    case 'image':
      return [block.alt, block.caption].filter(Boolean).join(' — ');
    case 'diagram':
      return [
        block.title,
        block.nodes.map((n) => n.label + (n.description ? ` (${n.description})` : '')).join(' → '),
        block.caption,
      ]
        .filter(Boolean)
        .join('\n');
    case 'quiz':
      // Answer keys are intentionally excluded from the index.
      return `Quiz: ${block.question}`;
  }
}

/** Splits a lesson into heading-delimited sections, then caps each chunk at ~maxChars. */
export function buildLessonIndexDocuments(
  lesson: Pick<
    LessonDoc,
    | '_id'
    | 'slug'
    | 'title'
    | 'language'
    | 'technology'
    | 'difficulty'
    | 'contentVersion'
    | 'blocks'
  >,
  maxChars = 1500,
): LessonIndexDocument[] {
  const docs: LessonIndexDocument[] = [];
  let section: { id: string | null; title: string | null } = { id: null, title: null };
  let buffer: string[] = [];
  let blockIds: string[] = [];

  const flush = () => {
    if (!buffer.length) return;
    const lessonId = lesson._id.toString();
    docs.push({
      id: `${lessonId}:v${lesson.contentVersion}:${docs.length}`,
      text: [lesson.title, section.title, ...buffer].filter(Boolean).join('\n\n'),
      metadata: {
        lessonId,
        slug: lesson.slug,
        title: lesson.title,
        language: lesson.language,
        technology: lesson.technology,
        difficulty: lesson.difficulty,
        contentVersion: lesson.contentVersion,
        sectionId: section.id,
        sectionTitle: section.title,
        blockIds,
        deepLink: `techcapsule://lesson/${lesson.slug}${section.id ? `?section=${section.id}` : ''}`,
      },
    });
    buffer = [];
    blockIds = [];
  };

  for (const block of lesson.blocks) {
    if (block.type === 'heading') {
      flush();
      section = { id: block.id, title: block.text };
      continue;
    }
    const text = blockText(block);
    if (buffer.join('\n\n').length + text.length > maxChars) flush();
    buffer.push(text);
    blockIds.push(block.id);
  }
  flush();
  return docs;
}

export async function enqueueIndexJob(
  lesson: Pick<LessonDoc, '_id' | 'contentVersion' | 'language' | 'technology'>,
  operation: 'upsert' | 'delete',
): Promise<void> {
  try {
    await ContentIndexJob.updateOne(
      { lessonId: lesson._id, contentVersion: lesson.contentVersion, operation },
      {
        $setOnInsert: {
          language: lesson.language,
          technology: lesson.technology,
          status: 'pending',
          attempts: 0,
        },
      },
      { upsert: true },
    );
  } catch (err) {
    // Indexing is best-effort in Phase 1 and must never block publishing.
    logger.warn({ err, lessonId: lesson._id.toString() }, 'Failed to enqueue content index job');
  }
}
