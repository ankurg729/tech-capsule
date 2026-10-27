import { Schema, model, type Types } from 'mongoose';

/**
 * Transactional-outbox record for future AI indexing (Phase 2: embeddings / RAG / ChromaDB).
 * Written whenever published lesson content changes. Nothing consumes it in Phase 1; a future
 * worker can poll `status: 'pending'`, build chunks with `buildLessonIndexDocuments`, and
 * upsert them into a vector store keyed by lessonId + contentVersion.
 */
export interface ContentIndexJobDoc {
  _id: Types.ObjectId;
  lessonId: Types.ObjectId;
  contentVersion: number;
  language: string;
  technology: string;
  operation: 'upsert' | 'delete';
  status: 'pending' | 'processing' | 'done' | 'failed';
  attempts: number;
  lastError: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const contentIndexJobSchema = new Schema<ContentIndexJobDoc>(
  {
    lessonId: { type: Schema.Types.ObjectId, ref: 'Lesson', required: true },
    contentVersion: { type: Number, required: true },
    language: { type: String, required: true },
    technology: { type: String, required: true },
    operation: { type: String, enum: ['upsert', 'delete'], required: true },
    status: { type: String, enum: ['pending', 'processing', 'done', 'failed'], default: 'pending' },
    attempts: { type: Number, default: 0 },
    lastError: { type: String, default: null },
  },
  { timestamps: true },
);

contentIndexJobSchema.index({ lessonId: 1, contentVersion: 1, operation: 1 }, { unique: true });
contentIndexJobSchema.index({ status: 1, createdAt: 1 });

export const ContentIndexJob = model<ContentIndexJobDoc>('ContentIndexJob', contentIndexJobSchema);
