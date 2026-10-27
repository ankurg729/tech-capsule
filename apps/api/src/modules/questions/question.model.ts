import { MODERATION_STATES, type ModerationState } from '@techcapsule/contracts';
import { Schema, model, type Types } from 'mongoose';

export interface QuestionDoc {
  _id: Types.ObjectId;
  authorId: Types.ObjectId;
  title: string;
  body: string;
  tags: string[];
  // Denormalised counters; the source of truth is the Vote/Answer/Comment collections.
  voteScore: number;
  answerCount: number;
  commentCount: number;
  acceptedAnswerId: Types.ObjectId | null;
  moderation: ModerationState;
  editedAt: Date | null;
  lastActivityAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const questionSchema = new Schema<QuestionDoc>(
  {
    authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true, maxlength: 150 },
    body: { type: String, required: true, maxlength: 10_000 },
    tags: { type: [String], default: [] },
    voteScore: { type: Number, default: 0 },
    answerCount: { type: Number, default: 0, min: 0 },
    commentCount: { type: Number, default: 0, min: 0 },
    acceptedAnswerId: { type: Schema.Types.ObjectId, ref: 'Answer', default: null },
    moderation: { type: String, enum: MODERATION_STATES, default: 'visible' },
    editedAt: { type: Date, default: null },
    lastActivityAt: { type: Date, default: () => new Date() },
  },
  { timestamps: true },
);

questionSchema.index({ moderation: 1, createdAt: -1 });
questionSchema.index({ moderation: 1, tags: 1, createdAt: -1 });
questionSchema.index({ moderation: 1, voteScore: -1, createdAt: -1 });
questionSchema.index({ moderation: 1, answerCount: 1, createdAt: -1 });
questionSchema.index({ authorId: 1, createdAt: -1 });
questionSchema.index(
  { title: 'text', tags: 'text', body: 'text' },
  { name: 'question_text', weights: { title: 8, tags: 5, body: 1 } },
);

export const Question = model<QuestionDoc>('Question', questionSchema);
