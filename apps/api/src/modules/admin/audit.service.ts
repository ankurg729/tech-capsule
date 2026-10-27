import type { AuditEntryDTO } from '@techcapsule/contracts';
import { Types, type QueryFilter } from 'mongoose';
import { pageMeta, type PageResult } from '../../lib/http.js';
import { User } from '../users/user.model.js';
import { AuditLog, type AuditLogDoc } from './auditLog.model.js';

export interface AuditActor {
  userId: string;
  ip?: string | undefined;
}

export async function recordAudit(
  actor: AuditActor,
  action: string,
  targetType: string,
  targetId: Types.ObjectId | string | null,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  await AuditLog.create({
    actorId: new Types.ObjectId(actor.userId),
    action,
    targetType,
    targetId: targetId ? new Types.ObjectId(targetId.toString()) : null,
    metadata,
    ip: actor.ip ?? null,
  });
}

async function toDTOs(rows: AuditLogDoc[]): Promise<AuditEntryDTO[]> {
  const actors = await User.find({
    _id: { $in: [...new Set(rows.map((r) => r.actorId.toString()))] },
  })
    .select('displayName email')
    .lean();
  const byId = new Map(actors.map((a) => [a._id.toString(), a]));
  return rows.map((r) => {
    const a = byId.get(r.actorId.toString());
    return {
      id: r._id.toString(),
      actor: a ? { id: a._id.toString(), displayName: a.displayName, email: a.email } : null,
      action: r.action,
      targetType: r.targetType,
      targetId: r.targetId?.toString() ?? null,
      metadata: r.metadata,
      createdAt: r.createdAt.toISOString(),
    };
  });
}

export async function listAudit(query: {
  page: number;
  limit: number;
  action?: string | undefined;
  targetType?: string | undefined;
}): Promise<PageResult<AuditEntryDTO>> {
  const filter: QueryFilter<AuditLogDoc> = {};
  if (query.action) filter.action = query.action;
  if (query.targetType) filter.targetType = query.targetType;
  const [rows, total] = await Promise.all([
    AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .lean<AuditLogDoc[]>(),
    AuditLog.countDocuments(filter),
  ]);
  return { items: await toDTOs(rows), meta: pageMeta(query.page, query.limit, total) };
}

export async function recentAudit(limit = 10): Promise<AuditEntryDTO[]> {
  return toDTOs(await AuditLog.find().sort({ createdAt: -1 }).limit(limit).lean<AuditLogDoc[]>());
}
