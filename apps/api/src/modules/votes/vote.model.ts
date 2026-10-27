import { VOTE_TARGETS, type VoteTarget } from '@techcapsule/contracts';
import { Schema, model, type Types } from 'mongoose';

/** Upvotes only in the MVP. The unique index makes duplicate votes impossible. */
export interface VoteDoc {
  _id: Types.ObjectId;
  voterId: Types.ObjectId;
  targetType: VoteTarget;
  targetId: Types.ObjectId;
  value: 1;
  createdAt: Date;
}

const voteSchema = new Schema<VoteDoc>(
  {
    voterId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    targetType: { type: String, enum: VOTE_TARGETS, required: true },
    targetId: { type: Schema.Types.ObjectId, required: true },
    value: { type: Number, enum: [1], default: 1 },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

voteSchema.index({ voterId: 1, targetType: 1, targetId: 1 }, { unique: true });
voteSchema.index({ targetType: 1, targetId: 1 });

export const Vote = model<VoteDoc>('Vote', voteSchema);
