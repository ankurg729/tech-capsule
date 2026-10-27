import {
  CONTENT_LANGUAGES,
  CONTENT_STATUSES,
  DIFFICULTIES,
  TECHNOLOGIES,
  type ContentBlock,
  type ContentLanguage,
  type ContentStatus,
  type Difficulty,
  type Technology,
} from '@techcapsule/contracts';
import { Schema, model, type Types } from 'mongoose';

export interface LessonDoc {
  _id: Types.ObjectId;
  slug: string;
  title: string;
  summary: string;
  technology: Technology;
  tags: string[];
  difficulty: Difficulty;
  language: ContentLanguage;
  coverImageUrl: string | null;
  /** Validated against the shared Zod discriminated union before every write. */
  blocks: ContentBlock[];
  /** Flattened prose used only for full-text search. */
  searchText: string;
  estimatedMinutes: number;
  status: ContentStatus;
  contentVersion: number;
  publishedAt: Date | null;
  archivedAt: Date | null;
  ratingSum: number;
  ratingCount: number;
  createdBy: Types.ObjectId | null;
  updatedBy: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const lessonSchema = new Schema<LessonDoc>(
  {
    slug: { type: String, required: true, trim: true, maxlength: 120 },
    title: { type: String, required: true, trim: true, maxlength: 150 },
    summary: { type: String, required: true, trim: true, maxlength: 500 },
    technology: { type: String, enum: TECHNOLOGIES, required: true },
    tags: { type: [String], default: [] },
    difficulty: { type: String, enum: DIFFICULTIES, required: true },
    language: { type: String, enum: CONTENT_LANGUAGES, required: true },
    coverImageUrl: { type: String, default: null },
    blocks: { type: Schema.Types.Mixed, required: true, default: [] },
    searchText: { type: String, default: '', select: false },
    estimatedMinutes: { type: Number, required: true, min: 1 },
    status: { type: String, enum: CONTENT_STATUSES, default: 'draft', required: true },
    contentVersion: { type: Number, default: 1 },
    publishedAt: { type: Date, default: null },
    archivedAt: { type: Date, default: null },
    ratingSum: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true, minimize: false },
);

lessonSchema.index({ slug: 1 }, { unique: true });
lessonSchema.index({ status: 1, publishedAt: -1 });
lessonSchema.index({ status: 1, technology: 1, difficulty: 1, language: 1, publishedAt: -1 });
lessonSchema.index({ status: 1, tags: 1, publishedAt: -1 });
lessonSchema.index(
  { title: 'text', tags: 'text', summary: 'text', searchText: 'text' },
  {
    name: 'lesson_text',
    weights: { title: 10, tags: 6, summary: 4, searchText: 1 },
    default_language: 'english',
    language_override: 'textSearchLanguage',
  },
);

export const Lesson = model<LessonDoc>('Lesson', lessonSchema);
