import {
  CONTENT_STATUSES,
  NEWS_CATEGORIES,
  type ContentStatus,
  type NewsCategory,
} from '@techcapsule/contracts';
import { Schema, model, type Types } from 'mongoose';

export interface NewsArticleDoc {
  _id: Types.ObjectId;
  slug: string;
  title: string;
  summary: string;
  body: string;
  category: NewsCategory;
  sourceName: string;
  sourceUrl: string;
  imageUrl: string | null;
  isSample: boolean;
  status: ContentStatus;
  publishedAt: Date | null;
  archivedAt: Date | null;
  createdBy: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const newsArticleSchema = new Schema<NewsArticleDoc>(
  {
    slug: { type: String, required: true, trim: true, maxlength: 120 },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    summary: { type: String, required: true, maxlength: 600 },
    body: { type: String, required: true, maxlength: 20_000 },
    category: { type: String, enum: NEWS_CATEGORIES, required: true },
    sourceName: { type: String, required: true, maxlength: 100 },
    sourceUrl: { type: String, required: true, maxlength: 2048 },
    imageUrl: { type: String, default: null },
    isSample: { type: Boolean, default: false },
    status: { type: String, enum: CONTENT_STATUSES, default: 'draft' },
    publishedAt: { type: Date, default: null },
    archivedAt: { type: Date, default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
);

newsArticleSchema.index({ slug: 1 }, { unique: true });
newsArticleSchema.index({ status: 1, publishedAt: -1 });
newsArticleSchema.index({ status: 1, category: 1, publishedAt: -1 });

export const NewsArticle = model<NewsArticleDoc>('NewsArticle', newsArticleSchema);
