import { Schema, model, type Types } from 'mongoose';

export interface LessonRatingDoc {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  lessonId: Types.ObjectId;
  stars: number;
  createdAt: Date;
  updatedAt: Date;
}

const lessonRatingSchema = new Schema<LessonRatingDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    lessonId: { type: Schema.Types.ObjectId, ref: 'Lesson', required: true },
    stars: { type: Number, required: true, min: 1, max: 5 },
  },
  { timestamps: true },
);

lessonRatingSchema.index({ userId: 1, lessonId: 1 }, { unique: true });
lessonRatingSchema.index({ lessonId: 1 });

export const LessonRating = model<LessonRatingDoc>('LessonRating', lessonRatingSchema);
