import { Types } from 'mongoose';
import { notFound } from '../../lib/errors.js';
import { Lesson, type LessonDoc } from './lesson.model.js';

/** Loads a published lesson by id or throws 404. Drafts/archived lessons are invisible here. */
export async function getPublishedLessonById(id: string): Promise<LessonDoc> {
  if (!Types.ObjectId.isValid(id)) throw notFound('Lesson');
  const lesson = await Lesson.findOne({ _id: id, status: 'published' }).lean<LessonDoc>();
  if (!lesson) throw notFound('Lesson');
  return lesson;
}
