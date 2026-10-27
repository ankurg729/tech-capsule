import {
  COMMENT_TARGETS,
  MODERATION_STATES,
  type CommentTarget,
  type ModerationState,
} from '@techcapsule/contracts';
import { Schema, model, type Types } from 'mongoose';

export interface CommentDoc {
  _id: Types.ObjectId;
  targetType: CommentTarget;
  targetId: Types.ObjectId;
  /** Owning question, for both question and answer comments (simplifies moderation lookups). */
  questionId: Types.ObjectId;
  authorId: Types.ObjectId;
  body: string;
  moderation: ModerationState;
  createdAt: Date;
  updatedAt: Date;
}

const commentSchema = new Schema<CommentDoc>(
  {
    targetType: { type: String, enum: COMMENT_TARGETS, required: true },
    targetId: { type: Schema.Types.ObjectId, required: true },
    questionId: { type: Schema.Types.ObjectId, ref: 'Question', required: true },
    authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    body: { type: String, required: true, maxlength: 1000 },
    moderation: { type: String, enum: MODERATION_STATES, default: 'visible' },
  },
  { timestamps: true },
);

commentSchema.index({ targetType: 1, targetId: 1, moderation: 1, createdAt: 1 });
commentSchema.index({ authorId: 1, createdAt: -1 });

export const Comment = model<CommentDoc>('Comment', commentSchema);
