import { z } from 'zod';
import { objectIdSchema, paginationQuerySchema, type AuthorDTO } from './common.js';

export const REPORT_TARGETS = ['question', 'answer', 'comment'] as const;
export const reportTargetSchema = z.enum(REPORT_TARGETS);
export type ReportTarget = z.infer<typeof reportTargetSchema>;

export const REPORT_REASONS = ['spam', 'abuse', 'off-topic', 'misinformation', 'other'] as const;
export const reportReasonSchema = z.enum(REPORT_REASONS);
export type ReportReason = z.infer<typeof reportReasonSchema>;

export const REPORT_STATUSES = ['open', 'resolved', 'dismissed'] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export const reportCreateSchema = z.object({
  targetType: reportTargetSchema,
  targetId: objectIdSchema,
  reason: reportReasonSchema,
  details: z.string().trim().max(1000).optional(),
});
export type ReportCreateInput = z.infer<typeof reportCreateSchema>;

export const reportListQuerySchema = paginationQuerySchema.extend({
  status: z.enum(REPORT_STATUSES).default('open'),
});

export const reportResolveSchema = z.object({
  action: z.enum(['dismiss', 'hide-content', 'restore-content']),
  note: z.string().trim().max(1000).optional(),
});
export type ReportResolveInput = z.infer<typeof reportResolveSchema>;

export const MODERATION_STATES = ['visible', 'hidden'] as const;
export type ModerationState = (typeof MODERATION_STATES)[number];

export interface ReportDTO {
  id: string;
  targetType: ReportTarget;
  targetId: string;
  reason: ReportReason;
  details: string | null;
  status: ReportStatus;
  reporter: AuthorDTO;
  resolution: {
    action: string;
    note: string | null;
    resolvedAt: string;
    resolvedBy: string;
  } | null;
  /** Snapshot of the reported content at review time (null if it was deleted). */
  target: { excerpt: string; moderation: ModerationState; author: AuthorDTO } | null;
  createdAt: string;
}
