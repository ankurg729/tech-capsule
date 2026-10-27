import { Schema, model, type Types } from 'mongoose';

export interface QuizResult {
  blockId: string;
  correct: boolean;
  answeredAt: Date;
}

export interface UserProgressDoc {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  lessonId: Types.ObjectId;
  lastBlockId: string | null;
  completionPercent: number;
  completedAt: Date | null;
  /** Bounded by the number of quiz blocks in the lesson (one entry per quiz). */
  quizResults: QuizResult[];
  startedAt: Date;
  lastViewedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userProgressSchema = new Schema<UserProgressDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    lessonId: { type: Schema.Types.ObjectId, ref: 'Lesson', required: true },
    lastBlockId: { type: String, default: null, maxlength: 40 },
    completionPercent: { type: Number, default: 0, min: 0, max: 100 },
    completedAt: { type: Date, default: null },
    quizResults: {
      type: [
        {
          _id: false,
          blockId: { type: String, required: true },
          correct: { type: Boolean, required: true },
          answeredAt: { type: Date, required: true },
        },
      ],
      default: [],
    },
    startedAt: { type: Date, required: true },
    lastViewedAt: { type: Date, required: true },
  },
  { timestamps: true },
);

userProgressSchema.index({ userId: 1, lessonId: 1 }, { unique: true });
userProgressSchema.index({ userId: 1, completedAt: 1, lastViewedAt: -1 });
// Supports the "trending" aggregation (learners starting a lesson recently).
userProgressSchema.index({ startedAt: -1, lessonId: 1 });

export const UserProgress = model<UserProgressDoc>('UserProgress', userProgressSchema);
