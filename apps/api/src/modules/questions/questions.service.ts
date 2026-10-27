import type {
  QuestionCreateInput,
  QuestionDetailDTO,
  QuestionListQuery,
  QuestionSummaryDTO,
  QuestionUpdateInput,
} from '@techcapsule/contracts';
import { Types, type QueryFilter } from 'mongoose';
import { AppError, badRequest, forbidden, notFound, unauthenticated } from '../../lib/errors.js';
import { pageMeta, type PageResult } from '../../lib/http.js';
import { assertNotSpam, escapeRegex } from '../../lib/text.js';
import { Answer } from '../answers/answer.model.js';
import { loadAuthors } from '../users/users.service.js';
import { Vote } from '../votes/vote.model.js';
import { toQuestionDetail, toQuestionSummary } from './question.mapper.js';
import { Question, type QuestionDoc } from './question.model.js';

const visible = { moderation: 'visible' as const };

export async function getVisibleQuestion(id: string): Promise<QuestionDoc> {
  if (!Types.ObjectId.isValid(id)) throw notFound('Question');
  const q = await Question.findOne({ _id: id, ...visible }).lean<QuestionDoc>();
  if (!q) throw notFound('Question');
  return q;
}

async function summaries(docs: QuestionDoc[]): Promise<QuestionSummaryDTO[]> {
  const authors = await loadAuthors(docs.map((d) => d.authorId));
  return docs.map((d) => toQuestionSummary(d, authors));
}

export async function listQuestions(
  query: QuestionListQuery,
  viewerId?: string,
): Promise<PageResult<QuestionSummaryDTO>> {
  const filter: QueryFilter<QuestionDoc> = { ...visible };
  if (query.tag) filter.tags = query.tag;
  if (query.q) filter.$text = { $search: query.q };
  if (query.mine) {
    if (!viewerId) throw unauthenticated('Log in to see your questions');
    filter.authorId = new Types.ObjectId(viewerId);
  }
  if (query.sort === 'unanswered') filter.answerCount = 0;

  const sort: Record<string, 1 | -1 | { $meta: 'textScore' }> = query.q
    ? { score: { $meta: 'textScore' }, createdAt: -1 }
    : query.sort === 'votes'
      ? { voteScore: -1, createdAt: -1 }
      : { createdAt: -1 };

  const [docs, total] = await Promise.all([
    Question.find(filter, query.q ? { score: { $meta: 'textScore' } } : {})
      .select('title body tags authorId voteScore answerCount acceptedAnswerId createdAt')
      .sort(sort)
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .lean<QuestionDoc[]>(),
    Question.countDocuments(filter),
  ]);
  return { items: await summaries(docs), meta: pageMeta(query.page, query.limit, total) };
}

export async function recentQuestions(limit = 5): Promise<QuestionSummaryDTO[]> {
  const docs = await Question.find(visible)
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean<QuestionDoc[]>();
  return summaries(docs);
}

export async function searchQuestions(q: string, limit: number): Promise<QuestionSummaryDTO[]> {
  const hits = await Question.find(
    { ...visible, $text: { $search: q } },
    { score: { $meta: 'textScore' } },
  )
    .sort({ score: { $meta: 'textScore' } })
    .limit(limit)
    .lean<QuestionDoc[]>();
  if (hits.length < limit) {
    hits.push(
      ...(await Question.find({
        ...visible,
        _id: { $nin: hits.map((h) => h._id) },
        title: new RegExp(escapeRegex(q), 'i'),
      })
        .sort({ createdAt: -1 })
        .limit(limit - hits.length)
        .lean<QuestionDoc[]>()),
    );
  }
  return summaries(hits);
}

const DUPLICATE_WINDOW_MS = 24 * 3_600_000;

export async function createQuestion(
  authorId: string,
  input: QuestionCreateInput,
): Promise<QuestionDetailDTO> {
  assertNotSpam(input.title, input.body);
  const author = new Types.ObjectId(authorId);
  const duplicate = await Question.exists({
    authorId: author,
    title: new RegExp(`^${escapeRegex(input.title)}$`, 'i'),
    createdAt: { $gte: new Date(Date.now() - DUPLICATE_WINDOW_MS) },
  });
  if (duplicate) {
    throw new AppError(422, 'SPAM_DETECTED', 'You already asked this question recently');
  }
  const doc = await Question.create({ ...input, authorId: author, lastActivityAt: new Date() });
  return getQuestionDetail(doc._id.toString(), authorId);
}

export async function getQuestionDetail(id: string, viewerId?: string): Promise<QuestionDetailDTO> {
  const q = await getVisibleQuestion(id);
  const [authors, voted] = await Promise.all([
    loadAuthors([q.authorId]),
    viewerId
      ? Vote.exists({
          voterId: new Types.ObjectId(viewerId),
          targetType: 'question',
          targetId: q._id,
        })
      : Promise.resolve(null),
  ]);
  const viewer = viewerId
    ? { voted: Boolean(voted), isAuthor: q.authorId.toString() === viewerId }
    : null;
  return toQuestionDetail(q, authors, viewer);
}

export async function updateQuestion(
  id: string,
  userId: string,
  input: QuestionUpdateInput,
): Promise<QuestionDetailDTO> {
  const q = await getVisibleQuestion(id);
  if (q.authorId.toString() !== userId) throw forbidden('You can only edit your own questions');
  assertNotSpam(input.title ?? '', input.body ?? '');
  await Question.updateOne({ _id: q._id }, { $set: { ...input, editedAt: new Date() } });
  return getQuestionDetail(id, userId);
}

/** Only the question author may accept; accepting another answer moves the mark. */
export async function acceptAnswer(questionId: string, answerId: string, userId: string) {
  const q = await getVisibleQuestion(questionId);
  if (q.authorId.toString() !== userId)
    throw forbidden('Only the question author can accept an answer');
  if (!Types.ObjectId.isValid(answerId)) throw notFound('Answer');
  const answer = await Answer.findOne({ _id: answerId, moderation: 'visible' }).lean();
  if (!answer) throw notFound('Answer');
  if (!answer.questionId.equals(q._id)) throw badRequest('Answer does not belong to this question');

  await Answer.updateMany({ questionId: q._id, isAccepted: true }, { $set: { isAccepted: false } });
  await Answer.updateOne({ _id: answer._id }, { $set: { isAccepted: true } });
  await Question.updateOne(
    { _id: q._id },
    { $set: { acceptedAnswerId: answer._id, lastActivityAt: new Date() } },
  );
  return { questionId, acceptedAnswerId: answerId };
}

export async function unacceptAnswer(questionId: string, userId: string) {
  const q = await getVisibleQuestion(questionId);
  if (q.authorId.toString() !== userId)
    throw forbidden('Only the question author can change the accepted answer');
  await Answer.updateMany({ questionId: q._id, isAccepted: true }, { $set: { isAccepted: false } });
  await Question.updateOne({ _id: q._id }, { $set: { acceptedAnswerId: null } });
  return { questionId, acceptedAnswerId: null };
}
