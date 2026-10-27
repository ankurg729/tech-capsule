import type {
  QuestionDetailDTO,
  QuestionSummaryDTO,
  ViewerContentStateDTO,
} from '@techcapsule/contracts';
import { excerpt } from '../../lib/text.js';
import { authorFrom, type AuthorLookup } from '../users/user.mapper.js';
import type { QuestionDoc } from './question.model.js';

export function toQuestionSummary(q: QuestionDoc, authors: AuthorLookup): QuestionSummaryDTO {
  return {
    id: q._id.toString(),
    title: q.title,
    excerpt: excerpt(q.body),
    tags: q.tags,
    author: authorFrom(authors, q.authorId),
    voteScore: q.voteScore,
    answerCount: q.answerCount,
    hasAcceptedAnswer: q.acceptedAnswerId !== null,
    createdAt: q.createdAt.toISOString(),
  };
}

export function toQuestionDetail(
  q: QuestionDoc,
  authors: AuthorLookup,
  viewer: ViewerContentStateDTO | null,
): QuestionDetailDTO {
  return {
    ...toQuestionSummary(q, authors),
    body: q.body,
    acceptedAnswerId: q.acceptedAnswerId?.toString() ?? null,
    commentCount: q.commentCount,
    editedAt: q.editedAt?.toISOString() ?? null,
    viewer,
  };
}
