import type { AnswerDTO, PaginationQuery } from '@techcapsule/contracts';
import { Types } from 'mongoose';
import { conflict, forbidden, notFound } from '../../lib/errors.js';
import { pageMeta, type PageResult } from '../../lib/http.js';
import { assertNotSpam } from '../../lib/text.js';
import { Question } from '../questions/question.model.js';
import { getVisibleQuestion } from '../questions/questions.service.js';
import { authorFrom } from '../users/user.mapper.js';
import { loadAuthors } from '../users/users.service.js';
import { Vote } from '../votes/vote.model.js';
import { Answer, type AnswerDoc } from './answer.model.js';

async function toDTOs(answers: AnswerDoc[], viewerId?: string): Promise<AnswerDTO[]> {
  const [authors, votes] = await Promise.all([
    loadAuthors(answers.map((a) => a.authorId)),
    viewerId
      ? Vote.find({
          voterId: new Types.ObjectId(viewerId),
          targetType: 'answer',
          targetId: { $in: answers.map((a) => a._id) },
        })
          .select('targetId')
          .lean()
      : Promise.resolve([]),
  ]);
  const voted = new Set(votes.map((v) => v.targetId.toString()));
  return answers.map((a) => ({
    id: a._id.toString(),
    questionId: a.questionId.toString(),
    body: a.body,
    author: authorFrom(authors, a.authorId),
    voteScore: a.voteScore,
    isAccepted: a.isAccepted,
    commentCount: a.commentCount,
    createdAt: a.createdAt.toISOString(),
    editedAt: a.editedAt?.toISOString() ?? null,
    viewer: viewerId
      ? { voted: voted.has(a._id.toString()), isAuthor: a.authorId.toString() === viewerId }
      : null,
  }));
}

export async function listAnswers(
  questionId: string,
  page: PaginationQuery,
  viewerId?: string,
): Promise<PageResult<AnswerDTO>> {
  const q = await getVisibleQuestion(questionId);
  const filter = { questionId: q._id, moderation: 'visible' as const };
  const [docs, total] = await Promise.all([
    Answer.find(filter)
      .sort({ isAccepted: -1, voteScore: -1, createdAt: 1 })
      .skip((page.page - 1) * page.limit)
      .limit(page.limit)
      .lean<AnswerDoc[]>(),
    Answer.countDocuments(filter),
  ]);
  return { items: await toDTOs(docs, viewerId), meta: pageMeta(page.page, page.limit, total) };
}

export async function createAnswer(
  questionId: string,
  authorId: string,
  body: string,
): Promise<AnswerDTO> {
  assertNotSpam(body);
  const q = await getVisibleQuestion(questionId);
  const author = new Types.ObjectId(authorId);
  if (await Answer.exists({ questionId: q._id, authorId: author, body })) {
    throw conflict('You already posted this answer');
  }
  const answer = await Answer.create({ questionId: q._id, authorId: author, body });
  await Question.updateOne(
    { _id: q._id },
    { $inc: { answerCount: 1 }, $set: { lastActivityAt: new Date() } },
  );
  const [dto] = await toDTOs([answer.toObject()], authorId);
  return dto!;
}

export async function updateAnswer(
  answerId: string,
  userId: string,
  body: string,
): Promise<AnswerDTO> {
  if (!Types.ObjectId.isValid(answerId)) throw notFound('Answer');
  const answer = await Answer.findOne({ _id: answerId, moderation: 'visible' }).lean();
  if (!answer) throw notFound('Answer');
  if (answer.authorId.toString() !== userId) throw forbidden('You can only edit your own answers');
  assertNotSpam(body);
  const updated = await Answer.findByIdAndUpdate(
    answer._id,
    { $set: { body, editedAt: new Date() } },
    { returnDocument: 'after' },
  ).lean<AnswerDoc>();
  const [dto] = await toDTOs([updated!], userId);
  return dto!;
}
