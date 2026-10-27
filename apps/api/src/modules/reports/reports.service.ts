import type {
  ModerationState,
  ReportCreateInput,
  ReportDTO,
  ReportResolveInput,
  ReportStatus,
  ReportTarget,
} from '@techcapsule/contracts';
import { Types } from 'mongoose';
import { badRequest, notFound } from '../../lib/errors.js';
import { pageMeta, type PageResult } from '../../lib/http.js';
import { excerpt } from '../../lib/text.js';
import { recordAudit, type AuditActor } from '../admin/audit.service.js';
import { Answer } from '../answers/answer.model.js';
import { Comment } from '../comments/comment.model.js';
import { Question } from '../questions/question.model.js';
import { authorFrom } from '../users/user.mapper.js';
import { loadAuthors } from '../users/users.service.js';
import { Report, type ReportDoc } from './report.model.js';

interface TargetSnapshot {
  _id: Types.ObjectId;
  authorId: Types.ObjectId;
  moderation: ModerationState;
  text: string;
}

async function findTarget(
  type: ReportTarget,
  id: Types.ObjectId | string,
): Promise<TargetSnapshot | null> {
  if (!Types.ObjectId.isValid(id)) return null;
  if (type === 'question') {
    const q = await Question.findById(id).select('authorId moderation title body').lean();
    return (
      q && {
        _id: q._id,
        authorId: q.authorId,
        moderation: q.moderation,
        text: `${q.title} — ${q.body}`,
      }
    );
  }
  const Model = (type === 'answer' ? Answer : Comment) as typeof Answer;
  const d = await Model.findById(id).select('authorId moderation body').lean();
  return d && { _id: d._id, authorId: d.authorId, moderation: d.moderation, text: d.body };
}

/** Idempotent per reporter + target (unique index). */
export async function createReport(reporterId: string, input: ReportCreateInput) {
  const target = await findTarget(input.targetType, input.targetId);
  if (!target || target.moderation !== 'visible') throw notFound('Content');
  await Report.updateOne(
    {
      reporterId: new Types.ObjectId(reporterId),
      targetType: input.targetType,
      targetId: target._id,
    },
    { $setOnInsert: { reason: input.reason, details: input.details ?? null, status: 'open' } },
    { upsert: true },
  );
  return { message: 'Thanks — our moderators will review this.' };
}

export async function listReports(query: {
  page: number;
  limit: number;
  status: ReportStatus;
}): Promise<PageResult<ReportDTO>> {
  const filter = { status: query.status };
  const [rows, total] = await Promise.all([
    Report.find(filter)
      .sort({ createdAt: query.status === 'open' ? 1 : -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .lean<ReportDoc[]>(),
    Report.countDocuments(filter),
  ]);
  const targets = await Promise.all(rows.map((r) => findTarget(r.targetType, r.targetId)));
  const authors = await loadAuthors([
    ...rows.map((r) => r.reporterId),
    ...targets.flatMap((t) => (t ? [t.authorId] : [])),
  ]);
  const items = rows.map((r, i): ReportDTO => {
    const t = targets[i];
    return {
      id: r._id.toString(),
      targetType: r.targetType,
      targetId: r.targetId.toString(),
      reason: r.reason,
      details: r.details,
      status: r.status,
      reporter: authorFrom(authors, r.reporterId),
      resolution: r.resolution
        ? {
            action: r.resolution.action,
            note: r.resolution.note,
            resolvedAt: r.resolution.resolvedAt.toISOString(),
            resolvedBy: r.resolution.resolvedBy.toString(),
          }
        : null,
      target: t
        ? {
            excerpt: excerpt(t.text, 280),
            moderation: t.moderation,
            author: authorFrom(authors, t.authorId),
          }
        : null,
      createdAt: r.createdAt.toISOString(),
    };
  });
  return { items, meta: pageMeta(query.page, query.limit, total) };
}

/** Changes visibility and keeps denormalised counters consistent. No-op if unchanged. */
export async function setModeration(
  type: ReportTarget,
  id: Types.ObjectId,
  state: ModerationState,
) {
  const delta = state === 'hidden' ? -1 : 1;
  if (type === 'question') {
    await Question.updateOne(
      { _id: id, moderation: { $ne: state } },
      { $set: { moderation: state } },
    );
    return;
  }
  if (type === 'answer') {
    const before = await Answer.findOneAndUpdate(
      { _id: id, moderation: { $ne: state } },
      { $set: { moderation: state, ...(state === 'hidden' ? { isAccepted: false } : {}) } },
      { returnDocument: 'before' },
    ).lean();
    if (!before) return;
    await Question.updateOne(
      { _id: before.questionId },
      {
        $inc: { answerCount: delta },
        ...(before.isAccepted && state === 'hidden' ? { $set: { acceptedAnswerId: null } } : {}),
      },
    );
    return;
  }
  const before = await Comment.findOneAndUpdate(
    { _id: id, moderation: { $ne: state } },
    { $set: { moderation: state } },
    { returnDocument: 'before' },
  ).lean();
  if (!before) return;
  const Parent = (before.targetType === 'question' ? Question : Answer) as typeof Question;
  await Parent.updateOne({ _id: before.targetId }, { $inc: { commentCount: delta } });
}

export async function resolveReport(
  reportId: string,
  input: ReportResolveInput,
  actor: AuditActor,
) {
  if (!Types.ObjectId.isValid(reportId)) throw notFound('Report');
  const report = await Report.findById(reportId).lean();
  if (!report) throw notFound('Report');
  const target = await findTarget(report.targetType, report.targetId);
  if (!target && input.action !== 'dismiss') throw badRequest('Reported content no longer exists');

  if (input.action === 'hide-content')
    await setModeration(report.targetType, report.targetId, 'hidden');
  if (input.action === 'restore-content')
    await setModeration(report.targetType, report.targetId, 'visible');

  const resolution = {
    action: input.action,
    note: input.note ?? null,
    resolvedAt: new Date(),
    resolvedBy: new Types.ObjectId(actor.userId),
  };
  const status: ReportStatus = input.action === 'dismiss' ? 'dismissed' : 'resolved';
  // Hiding/restoring settles every open report about the same content.
  const scope =
    input.action === 'dismiss'
      ? { _id: report._id }
      : { targetType: report.targetType, targetId: report.targetId, status: 'open' as const };
  await Report.updateMany(scope, { $set: { status, resolution } });
  await Report.updateOne({ _id: report._id }, { $set: { status, resolution } });

  await recordAudit(actor, `report.${input.action}`, report.targetType, report.targetId, {
    reportId: report._id.toString(),
    reason: report.reason,
    note: input.note ?? null,
  });
  return { id: reportId, status };
}
