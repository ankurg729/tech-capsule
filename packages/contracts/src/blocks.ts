import { z } from 'zod';
import { httpsUrlSchema } from './common.js';

/**
 * Lesson content is a list of typed blocks. Clients render each block natively;
 * no block ever carries HTML or executable content.
 */

export const blockIdSchema = z
  .string()
  .min(1)
  .max(40)
  .regex(/^[a-z0-9][a-z0-9-]*$/, 'Block ids may contain lowercase letters, numbers and hyphens');

export const CODE_LANGUAGES = [
  'javascript',
  'typescript',
  'json',
  'bash',
  'python',
  'yaml',
  'dockerfile',
  'text',
] as const;
export const codeLanguageSchema = z.enum(CODE_LANGUAGES);
export type CodeLanguage = z.infer<typeof codeLanguageSchema>;

export const headingBlockSchema = z.object({
  id: blockIdSchema,
  type: z.literal('heading'),
  text: z.string().trim().min(1).max(200),
  level: z.union([z.literal(2), z.literal(3)]).default(2),
});

/** Paragraph text supports a tiny safe inline syntax: **bold** and `code`. */
export const paragraphBlockSchema = z.object({
  id: blockIdSchema,
  type: z.literal('paragraph'),
  text: z.string().trim().min(1).max(5000),
});

export const codeBlockSchema = z.object({
  id: blockIdSchema,
  type: z.literal('code'),
  language: codeLanguageSchema,
  code: z.string().min(1).max(10_000),
  filename: z.string().trim().max(100).optional(),
  caption: z.string().trim().max(300).optional(),
});

export const imageBlockSchema = z.object({
  id: blockIdSchema,
  type: z.literal('image'),
  url: httpsUrlSchema,
  alt: z.string().trim().min(1).max(300),
  caption: z.string().trim().max(300).optional(),
  aspectRatio: z.number().min(0.25).max(4).optional(),
});

export const DIAGRAM_TONES = ['primary', 'secondary', 'neutral', 'success', 'warning'] as const;

export const diagramNodeSchema = z.object({
  id: blockIdSchema,
  label: z.string().trim().min(1).max(60),
  description: z.string().trim().max(140).optional(),
  tone: z.enum(DIAGRAM_TONES).default('neutral'),
});

export const diagramEdgeSchema = z.object({
  from: blockIdSchema,
  to: blockIdSchema,
  label: z.string().trim().max(40).optional(),
});

export const diagramBlockSchema = z
  .object({
    id: blockIdSchema,
    type: z.literal('diagram'),
    title: z.string().trim().max(120).optional(),
    direction: z.enum(['horizontal', 'vertical']).default('vertical'),
    nodes: z.array(diagramNodeSchema).min(2).max(12),
    edges: z.array(diagramEdgeSchema).max(24).default([]),
    caption: z.string().trim().max(300).optional(),
  })
  .superRefine((block, ctx) => {
    const ids = new Set<string>();
    block.nodes.forEach((node, i) => {
      if (ids.has(node.id)) {
        ctx.addIssue({
          code: 'custom',
          message: `Duplicate node id "${node.id}"`,
          path: ['nodes', i, 'id'],
        });
      }
      ids.add(node.id);
    });
    block.edges.forEach((edge, i) => {
      if (!ids.has(edge.from) || !ids.has(edge.to)) {
        ctx.addIssue({
          code: 'custom',
          message: 'Edge references an unknown node',
          path: ['edges', i],
        });
      }
    });
  });

export const CALLOUT_VARIANTS = ['info', 'tip', 'warning'] as const;

export const calloutBlockSchema = z.object({
  id: blockIdSchema,
  type: z.literal('callout'),
  variant: z.enum(CALLOUT_VARIANTS),
  title: z.string().trim().max(120).optional(),
  text: z.string().trim().min(1).max(2000),
});

export const quizOptionSchema = z.object({
  id: blockIdSchema,
  text: z.string().trim().min(1).max(300),
});

/** Authoring shape: includes the answer key. Never sent to learners. */
export const quizBlockSchema = z
  .object({
    id: blockIdSchema,
    type: z.literal('quiz'),
    question: z.string().trim().min(1).max(500),
    options: z.array(quizOptionSchema).min(2).max(6),
    correctOptionIds: z.array(blockIdSchema).min(1),
    explanation: z.string().trim().min(1).max(2000),
  })
  .superRefine((block, ctx) => {
    const optionIds = new Set(block.options.map((o) => o.id));
    if (optionIds.size !== block.options.length) {
      ctx.addIssue({
        code: 'custom',
        message: 'Quiz option ids must be unique',
        path: ['options'],
      });
    }
    for (const id of block.correctOptionIds) {
      if (!optionIds.has(id)) {
        ctx.addIssue({
          code: 'custom',
          message: `Correct option "${id}" is not one of the options`,
          path: ['correctOptionIds'],
        });
      }
    }
  });

export const contentBlockSchema = z.discriminatedUnion('type', [
  headingBlockSchema,
  paragraphBlockSchema,
  codeBlockSchema,
  imageBlockSchema,
  diagramBlockSchema,
  calloutBlockSchema,
  quizBlockSchema,
]);

export const contentBlocksSchema = z
  .array(contentBlockSchema)
  .min(1)
  .max(200)
  .superRefine((blocks, ctx) => {
    const seen = new Set<string>();
    blocks.forEach((block, i) => {
      if (seen.has(block.id)) {
        ctx.addIssue({
          code: 'custom',
          message: `Duplicate block id "${block.id}"`,
          path: [i, 'id'],
        });
      }
      seen.add(block.id);
    });
  });

export type HeadingBlock = z.infer<typeof headingBlockSchema>;
export type ParagraphBlock = z.infer<typeof paragraphBlockSchema>;
export type CodeBlock = z.infer<typeof codeBlockSchema>;
export type ImageBlock = z.infer<typeof imageBlockSchema>;
export type DiagramBlock = z.infer<typeof diagramBlockSchema>;
export type CalloutBlock = z.infer<typeof calloutBlockSchema>;
export type QuizBlock = z.infer<typeof quizBlockSchema>;
export type ContentBlock = z.infer<typeof contentBlockSchema>;
export type ContentBlockType = ContentBlock['type'];
export type ContentBlockInput = z.input<typeof contentBlockSchema>;

/** Learner-facing quiz: the answer key and explanation are stripped server-side. */
export interface PublicQuizBlock {
  id: string;
  type: 'quiz';
  question: string;
  options: { id: string; text: string }[];
  multiple: boolean;
}

export type PublicContentBlock = Exclude<ContentBlock, QuizBlock> | PublicQuizBlock;

export function toPublicBlock(block: ContentBlock): PublicContentBlock {
  if (block.type !== 'quiz') return block;
  return {
    id: block.id,
    type: 'quiz',
    question: block.question,
    options: block.options.map((o) => ({ id: o.id, text: o.text })),
    multiple: block.correctOptionIds.length > 1,
  };
}

export const quizAnswerInputSchema = z.object({
  selectedOptionIds: z.array(blockIdSchema).min(1).max(6),
});
export type QuizAnswerInput = z.infer<typeof quizAnswerInputSchema>;

export interface QuizAnswerResult {
  blockId: string;
  correct: boolean;
  correctOptionIds: string[];
  explanation: string;
}

const WORDS_PER_MINUTE = 200;
const CODE_LINES_PER_MINUTE = 20;

/** Deterministic reading-time estimate so the server and admin preview agree. */
export function estimateReadingMinutes(blocks: ContentBlock[]): number {
  let words = 0;
  let codeLines = 0;
  let extraSeconds = 0;
  const countWords = (s: string) => s.split(/\s+/).filter(Boolean).length;
  for (const block of blocks) {
    switch (block.type) {
      case 'heading':
      case 'paragraph':
        words += countWords(block.text);
        break;
      case 'callout':
        words += countWords(block.text) + countWords(block.title ?? '');
        break;
      case 'code':
        codeLines += block.code.split('\n').length;
        break;
      case 'image':
        extraSeconds += 10;
        break;
      case 'diagram':
        extraSeconds += 20;
        words += block.nodes.reduce((n, node) => n + countWords(node.label), 0);
        break;
      case 'quiz':
        extraSeconds += 30;
        words += countWords(block.question);
        break;
    }
  }
  const minutes = words / WORDS_PER_MINUTE + codeLines / CODE_LINES_PER_MINUTE + extraSeconds / 60;
  return Math.max(1, Math.round(minutes));
}
