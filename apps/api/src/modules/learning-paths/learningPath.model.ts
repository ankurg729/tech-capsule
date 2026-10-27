import {
  CONTENT_STATUSES,
  DIFFICULTIES,
  TECHNOLOGIES,
  type ContentStatus,
  type Difficulty,
  type Technology,
} from '@techcapsule/contracts';
import { Schema, model, type Types } from 'mongoose';

export interface LearningPathDoc {
  _id: Types.ObjectId;
  slug: string;
  title: string;
  description: string;
  technology: Technology;
  difficulty: Difficulty;
  coverImageUrl: string | null;
  /** Ordered references; bounded (max 50) by validation. */
  lessonIds: Types.ObjectId[];
  status: ContentStatus;
  publishedAt: Date | null;
  archivedAt: Date | null;
  createdBy: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const learningPathSchema = new Schema<LearningPathDoc>(
  {
    slug: { type: String, required: true, trim: true, maxlength: 120 },
    title: { type: String, required: true, trim: true, maxlength: 150 },
    description: { type: String, required: true, maxlength: 1000 },
    technology: { type: String, enum: TECHNOLOGIES, required: true },
    difficulty: { type: String, enum: DIFFICULTIES, required: true },
    coverImageUrl: { type: String, default: null },
    lessonIds: {
      type: [{ type: Schema.Types.ObjectId, ref: 'Lesson' }],
      validate: [(v: unknown[]) => v.length <= 50, 'A path can contain at most 50 lessons'],
    },
    status: { type: String, enum: CONTENT_STATUSES, default: 'draft' },
    publishedAt: { type: Date, default: null },
    archivedAt: { type: Date, default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
);

learningPathSchema.index({ slug: 1 }, { unique: true });
learningPathSchema.index({ status: 1, technology: 1, publishedAt: -1 });
learningPathSchema.index(
  { title: 'text', description: 'text' },
  { name: 'path_text', weights: { title: 5, description: 1 } },
);

export const LearningPath = model<LearningPathDoc>('LearningPath', learningPathSchema);
