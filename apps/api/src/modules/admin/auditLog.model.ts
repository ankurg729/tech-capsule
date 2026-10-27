import { Schema, model, type Types } from 'mongoose';

/** Append-only record of important administrative actions. */
export interface AuditLogDoc {
  _id: Types.ObjectId;
  actorId: Types.ObjectId;
  action: string;
  targetType: string;
  targetId: Types.ObjectId | null;
  metadata: Record<string, unknown>;
  ip: string | null;
  createdAt: Date;
}

const auditLogSchema = new Schema<AuditLogDoc>(
  {
    actorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, required: true, maxlength: 60 },
    targetType: { type: String, required: true, maxlength: 30 },
    targetId: { type: Schema.Types.ObjectId, default: null },
    metadata: { type: Schema.Types.Mixed, default: {} },
    ip: { type: String, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false }, minimize: false },
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });

export const AuditLog = model<AuditLogDoc>('AuditLog', auditLogSchema);
