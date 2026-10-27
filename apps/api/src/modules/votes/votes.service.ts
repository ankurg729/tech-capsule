import type { VoteResultDTO, VoteTarget } from '@techcapsule/contracts';
import { Types } from 'mongoose';
import { forbidden, notFound } from '../../lib/errors.js';
import { Answer } from '../answers/answer.model.js';
import { Question } from '../questions/question.model.js';
import { Vote } from './vote.model.js';

const modelFor = (t: VoteTarget) => (t === 'question' ? Question : Answer) as typeof Question;

async function loadTarget(targetType: VoteTarget, targetId: string) {
  if (!Types.ObjectId.isValid(targetId))
    throw notFound(targetType === 'question' ? 'Question' : 'Answer');
  const doc = await modelFor(targetType)
    .findOne({ _id: targetId, moderation: 'visible' })
    .select('authorId voteScore')
    .lean();
  if (!doc) throw notFound(targetType === 'question' ? 'Question' : 'Answer');
  return doc;
}

/**
 * Idempotent upvote. The unique (voter, type, target) index guarantees one vote per user, and
 * the score is only incremented when an insert actually happened.
 */
export async function vote(
  userId: string,
  targetType: VoteTarget,
  targetId: string,
): Promise<VoteResultDTO> {
  const target = await loadTarget(targetType, targetId);
  if (target.authorId.toString() === userId) throw forbidden('You cannot vote on your own post');

  const voterId = new Types.ObjectId(userId);
  let inserted = false;
  try {
    const res = await Vote.updateOne(
      { voterId, targetType, targetId: target._id },
      { $setOnInsert: { value: 1 } },
      { upsert: true },
    );
    inserted = res.upsertedCount === 1;
  } catch (err) {
    if ((err as { code?: number }).code !== 11000) throw err;
  }
  const updated = inserted
    ? await modelFor(targetType)
        .findByIdAndUpdate(target._id, { $inc: { voteScore: 1 } }, { returnDocument: 'after' })
        .select('voteScore')
        .lean()
    : target;
  return { targetType, targetId, voted: true, voteScore: updated?.voteScore ?? target.voteScore };
}

export async function unvote(
  userId: string,
  targetType: VoteTarget,
  targetId: string,
): Promise<VoteResultDTO> {
  const target = await loadTarget(targetType, targetId);
  const res = await Vote.deleteOne({
    voterId: new Types.ObjectId(userId),
    targetType,
    targetId: target._id,
  });
  const updated =
    res.deletedCount === 1
      ? await modelFor(targetType)
          .findByIdAndUpdate(target._id, { $inc: { voteScore: -1 } }, { returnDocument: 'after' })
          .select('voteScore')
          .lean()
      : target;
  return { targetType, targetId, voted: false, voteScore: updated?.voteScore ?? target.voteScore };
}
