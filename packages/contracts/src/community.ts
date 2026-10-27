import { z } from 'zod';
import { objectIdSchema, paginationQuerySchema, tagSchema, type AuthorDTO } from './common.js';

export const questionCreateSchema = z.object({
  title: z.string().trim().min(15, 'Title should be at least 15 characters').max(150),
  body: z.string().trim().min(30, 'Describe your question in at least 30 characters').max(10_000),
  tags: z
    .array(tagSchema)
    .min(1, 'Add at least one tag')
    .max(5)
    .refine((t) => new Set(t).size === t.length, 'Tags must be unique'),
});
export type QuestionCreateInput = z.infer<typeof questionCreateSchema>;

export const questionUpdateSchema = questionCreateSchema
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'Nothing to update');
export type QuestionUpdateInput = z.infer<typeof questionUpdateSchema>;

export const questionListQuerySchema = paginationQuerySchema.extend({
  q: z.string().trim().min(1).max(100).optional(),
  tag: tagSchema.optional(),
  sort: z.enum(['newest', 'votes', 'unanswered']).default('newest'),
  mine: z.stringbool().optional(),
});
export type QuestionListQuery = z.infer<typeof questionListQuerySchema>;

export const answerCreateSchema = z.object({
  body: z.string().trim().min(20, 'Answers should be at least 20 characters').max(10_000),
});
export type AnswerCreateInput = z.infer<typeof answerCreateSchema>;
export const answerUpdateSchema = answerCreateSchema;

export const COMMENT_TARGETS = ['question', 'answer'] as const;
export const commentTargetSchema = z.enum(COMMENT_TARGETS);
export type CommentTarget = z.infer<typeof commentTargetSchema>;

export const commentCreateSchema = z.object({
  targetType: commentTargetSchema,
  targetId: objectIdSchema,
  body: z.string().trim().min(2).max(1000),
});
export type CommentCreateInput = z.infer<typeof commentCreateSchema>;

export const commentListQuerySchema = paginationQuerySchema.extend({
  targetType: commentTargetSchema,
  targetId: objectIdSchema,
});

export const VOTE_TARGETS = ['question', 'answer'] as const;
export const voteTargetSchema = z.enum(VOTE_TARGETS);
export type VoteTarget = z.infer<typeof voteTargetSchema>;

export const voteParamsSchema = z.object({
  targetType: voteTargetSchema,
  targetId: objectIdSchema,
});

export interface QuestionSummaryDTO {
  id: string;
  title: string;
  excerpt: string;
  tags: string[];
  author: AuthorDTO;
  voteScore: number;
  answerCount: number;
  hasAcceptedAnswer: boolean;
  createdAt: string;
}

export interface ViewerContentStateDTO {
  voted: boolean;
  isAuthor: boolean;
}

export interface QuestionDetailDTO extends QuestionSummaryDTO {
  body: string;
  acceptedAnswerId: string | null;
  commentCount: number;
  editedAt: string | null;
  viewer: ViewerContentStateDTO | null;
}

export interface AnswerDTO {
  id: string;
  questionId: string;
  body: string;
  author: AuthorDTO;
  voteScore: number;
  isAccepted: boolean;
  commentCount: number;
  createdAt: string;
  editedAt: string | null;
  viewer: ViewerContentStateDTO | null;
}

export interface CommentDTO {
  id: string;
  targetType: CommentTarget;
  targetId: string;
  body: string;
  author: AuthorDTO;
  createdAt: string;
}

export interface VoteResultDTO {
  targetType: VoteTarget;
  targetId: string;
  voted: boolean;
  voteScore: number;
}
