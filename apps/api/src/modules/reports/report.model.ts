import {
  REPORT_REASONS,
  REPORT_STATUSES,
  REPORT_TARGETS,
  type ReportReason,
  type ReportStatus,
  type ReportTarget,
} from '@techcapsule/contracts';
import { Schema, model, type Types } from 'mongoose';

export interface ReportDoc {
  _id: Types.ObjectId;
  reporterId: Types.ObjectId;
  targetType: ReportTarget;
  targetId: Types.ObjectId;
  reason: ReportReason;
  details: string | null;
  status: ReportStatus;
  resolution: {
    action: 'dismiss' | 'hide-content' | 'restore-content';
    note: string | null;
    resolvedAt: Date;
    resolvedBy: Types.ObjectId;
  } | null;
  createdAt: Date;
  updatedAt: Date;
}

const reportSchema = new Schema<ReportDoc>(
  {
    reporterId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    targetType: { type: String, enum: REPORT_TARGETS, required: true },
    targetId: { type: Schema.Types.ObjectId, required: true },
    reason: { type: String, enum: REPORT_REASONS, required: true },
    details: { type: String, default: null, maxlength: 1000 },
    status: { type: String, enum: REPORT_STATUSES, default: 'open' },
    resolution: {
      type: new Schema(
        {
          action: { type: String, required: true },
          note: { type: String, default: null },
          resolvedAt: { type: Date, required: true },
          resolvedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        },
        { _id: false },
      ),
      default: null,
    },
  },
  { timestamps: true },
);

// One report per user per item; re-reporting is idempotent.
reportSchema.index({ reporterId: 1, targetType: 1, targetId: 1 }, { unique: true });
reportSchema.index({ status: 1, createdAt: -1 });
reportSchema.index({ targetType: 1, targetId: 1, status: 1 });

export const Report = model<ReportDoc>('Report', reportSchema);
