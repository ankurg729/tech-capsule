import { MODERATION_STATES, type ModerationState } from '@techcapsule/contracts';
import { Schema, model, type Types } from 'mongoose';

export interface AnswerDoc {
  _id: Types.ObjectId;
  questionId: Types.ObjectId;
  authorId: Types.ObjectId;
  body: string;
  voteScore: number;
  commentCount: number;
  isAccepted: boolean;
  moderation: ModerationState;
  editedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const answerSchema = new Schema<AnswerDoc>(
  {
    questionId: { type: Schema.Types.ObjectId, ref: 'Question', required: true },
    authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    body: { type: String, required: true, maxlength: 10_000 },
    voteScore: { type: Number, default: 0 },
    commentCount: { type: Number, default: 0, min: 0 },
    isAccepted: { type: Boolean, default: false },
    moderation: { type: String, enum: MODERATION_STATES, default: 'visible' },
    editedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

answerSchema.index({ questionId: 1, moderation: 1, isAccepted: -1, voteScore: -1, createdAt: 1 });
answerSchema.index({ authorId: 1, createdAt: -1 });

export const Answer = model<AnswerDoc>('Answer', answerSchema);
