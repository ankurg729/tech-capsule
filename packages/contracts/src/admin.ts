import { z } from 'zod';
import { paginationQuerySchema } from './common.js';

export interface AuditEntryDTO {
  id: string;
  actor: { id: string; displayName: string; email: string } | null;
  action: string;
  targetType: string;
  targetId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export const auditListQuerySchema = paginationQuerySchema.extend({
  action: z.string().trim().max(60).optional(),
  targetType: z.string().trim().max(30).optional(),
});

export interface AdminOverviewDTO {
  counts: {
    users: number;
    verifiedUsers: number;
    lessons: { draft: number; published: number; archived: number };
    paths: { draft: number; published: number; archived: number };
    news: { draft: number; published: number; archived: number };
    questions: number;
    answers: number;
    openReports: number;
  };
  recentAudit: AuditEntryDTO[];
}
