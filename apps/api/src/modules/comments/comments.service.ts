import type {
  CommentCreateInput,
  CommentDTO,
  CommentTarget,
  PaginationQuery,
} from '@techcapsule/contracts';
import { Types } from 'mongoose';
import { notFound } from '../../lib/errors.js';
import { pageMeta, type PageResult } from '../../lib/http.js';
import { assertNotSpam } from '../../lib/text.js';
import { Answer } from '../answers/answer.model.js';
import { Question } from '../questions/question.model.js';
import { authorFrom, type AuthorLookup } from '../users/user.mapper.js';
import { loadAuthors } from '../users/users.service.js';
import { Comment, type CommentDoc } from './comment.model.js';

/** Resolves the visible target and its owning question id, or throws 404. */
async function resolveTarget(targetType: CommentTarget, targetId: string) {
  if (!Types.ObjectId.isValid(targetId)) throw notFound('Target');
  if (targetType === 'question') {
    const q = await Question.findOne({ _id: targetId, moderation: 'visible' }).select('_id').lean();
    if (!q) throw notFound('Question');
    return { model: Question, id: q._id, questionId: q._id };
  }
  const a = await Answer.findOne({ _id: targetId, moderation: 'visible' })
    .select('_id questionId')
    .lean();
  if (!a) throw notFound('Answer');
  const q = await Question.exists({ _id: a.questionId, moderation: 'visible' });
  if (!q) throw notFound('Question');
  return { model: Answer, id: a._id, questionId: a.questionId };
}

const toDTO = (c: CommentDoc, authors: AuthorLookup): CommentDTO => ({
  id: c._id.toString(),
  targetType: c.targetType,
  targetId: c.targetId.toString(),
  body: c.body,
  author: authorFrom(authors, c.authorId),
  createdAt: c.createdAt.toISOString(),
});

export async function createComment(
  authorId: string,
  input: CommentCreateInput,
): Promise<CommentDTO> {
  assertNotSpam(input.body);
  const target = await resolveTarget(input.targetType, input.targetId);
  const comment = await Comment.create({
    targetType: input.targetType,
    targetId: target.id,
    questionId: target.questionId,
    authorId: new Types.ObjectId(authorId),
    body: input.body,
  });
  await (target.model as typeof Question).updateOne(
    { _id: target.id },
    { $inc: { commentCount: 1 } },
  );
  return toDTO(comment.toObject(), await loadAuthors([authorId]));
}

export async function listComments(
  targetType: CommentTarget,
  targetId: string,
  page: PaginationQuery,
): Promise<PageResult<CommentDTO>> {
  const target = await resolveTarget(targetType, targetId);
  const filter = { targetType, targetId: target.id, moderation: 'visible' as const };
  const [docs, total] = await Promise.all([
    Comment.find(filter)
      .sort({ createdAt: 1 })
      .skip((page.page - 1) * page.limit)
      .limit(page.limit)
      .lean<CommentDoc[]>(),
    Comment.countDocuments(filter),
  ]);
  const authors = await loadAuthors(docs.map((d) => d.authorId));
  return {
    items: docs.map((d) => toDTO(d, authors)),
    meta: pageMeta(page.page, page.limit, total),
  };
}
