import { Schema, model, type Types } from 'mongoose';

export type BookmarkTarget = 'lesson' | 'news';

export interface BookmarkDoc {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  targetType: BookmarkTarget;
  targetId: Types.ObjectId;
  createdAt: Date;
}

const bookmarkSchema = new Schema<BookmarkDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    targetType: { type: String, enum: ['lesson', 'news'], required: true },
    targetId: { type: Schema.Types.ObjectId, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

bookmarkSchema.index({ userId: 1, targetType: 1, targetId: 1 }, { unique: true });
bookmarkSchema.index({ userId: 1, targetType: 1, createdAt: -1 });

export const Bookmark = model<BookmarkDoc>('Bookmark', bookmarkSchema);
