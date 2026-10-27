import type { RatingDTO } from '@techcapsule/contracts';
import { Types } from 'mongoose';
import { ratingAvg } from '../lessons/lesson.mapper.js';
import { Lesson } from '../lessons/lesson.model.js';
import { getPublishedLessonById } from '../lessons/lesson.queries.js';
import { LessonRating } from './lessonRating.model.js';

/** Creates or updates the caller's rating and keeps the lesson's aggregate in sync. */
export async function rateLesson(
  userIdStr: string,
  lessonId: string,
  stars: number,
): Promise<RatingDTO> {
  const lesson = await getPublishedLessonById(lessonId);
  const userId = new Types.ObjectId(userIdStr);

  const previous = await LessonRating.findOneAndUpdate(
    { userId, lessonId: lesson._id },
    { $set: { stars } },
    { upsert: true, returnDocument: 'before' },
  ).lean();

  const inc = previous
    ? { ratingSum: stars - previous.stars, ratingCount: 0 }
    : { ratingSum: stars, ratingCount: 1 };
  const updated = await Lesson.findByIdAndUpdate(
    lesson._id,
    { $inc: inc },
    { returnDocument: 'after', projection: { ratingSum: 1, ratingCount: 1 } },
  ).lean();

  return {
    lessonId: lesson._id.toString(),
    stars,
    ratingAvg: ratingAvg(updated?.ratingSum ?? 0, updated?.ratingCount ?? 0),
    ratingCount: updated?.ratingCount ?? 0,
  };
}

/** Rebuilds aggregates from the ratings collection (used by the seed script / maintenance). */
export async function recomputeLessonRating(lessonId: Types.ObjectId): Promise<void> {
  const [agg] = await LessonRating.aggregate<{ sum: number; count: number }>([
    { $match: { lessonId } },
    { $group: { _id: null, sum: { $sum: '$stars' }, count: { $sum: 1 } } },
  ]);
  await Lesson.updateOne(
    { _id: lessonId },
    { $set: { ratingSum: agg?.sum ?? 0, ratingCount: agg?.count ?? 0 } },
  );
}
