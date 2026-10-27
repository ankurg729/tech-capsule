import type {
  AnswerDTO,
  CommentDTO,
  CommentTarget,
  MessageDTO,
  QuestionCreateInput,
  QuestionDetailDTO,
  QuestionSummaryDTO,
  QuestionUpdateInput,
  ReportCreateInput,
  VoteResultDTO,
  VoteTarget,
} from '@techcapsule/contracts';
import {
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
  type QueryClient,
} from '@tanstack/react-query';
import { api, type Page } from '@/lib/api/client';
import { qk, useInfinitePage } from './client';

export interface QuestionFilters {
  q?: string;
  tag?: string;
  sort?: 'newest' | 'votes' | 'unanswered';
  mine?: boolean;
}

export const useQuestions = (filters: QuestionFilters) =>
  useInfinitePage<QuestionSummaryDTO>(qk.questions(filters), '/questions', { ...filters });

export const useQuestion = (id: string) =>
  useQuery({
    queryKey: qk.question(id),
    queryFn: ({ signal }) => api.get<QuestionDetailDTO>(`/questions/${id}`, undefined, signal),
  });

export const useAnswers = (questionId: string) =>
  useInfinitePage<AnswerDTO>(
    qk.answers(questionId),
    `/questions/${questionId}/answers`,
    {},
    {
      limit: 30,
    },
  );

export const useComments = (targetType: CommentTarget, targetId: string, enabled = true) =>
  useInfinitePage<CommentDTO>(
    qk.comments(targetType, targetId),
    '/comments',
    { targetType, targetId },
    { enabled, limit: 50 },
  );

function invalidateQuestionLists(client: QueryClient) {
  void client.invalidateQueries({ queryKey: ['questions'] });
  void client.invalidateQueries({ queryKey: qk.home });
}

export function useCreateQuestion() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: QuestionCreateInput) => api.post<QuestionDetailDTO>('/questions', input),
    onSuccess: (q) => {
      client.setQueryData(qk.question(q.id), q);
      invalidateQuestionLists(client);
    },
  });
}

export function useUpdateQuestion(id: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: QuestionUpdateInput) =>
      api.patch<QuestionDetailDTO>(`/questions/${id}`, input),
    onSuccess: (q) => {
      client.setQueryData(qk.question(id), q);
      invalidateQuestionLists(client);
    },
  });
}

export function useCreateAnswer(questionId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => api.post<AnswerDTO>(`/questions/${questionId}/answers`, { body }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: qk.answers(questionId) });
      void client.invalidateQueries({ queryKey: qk.question(questionId) });
      invalidateQuestionLists(client);
    },
  });
}

export function useUpdateAnswer(questionId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (vars: { answerId: string; body: string }) =>
      api.patch<AnswerDTO>(`/answers/${vars.answerId}`, { body: vars.body }),
    onSuccess: (answer) => updateAnswerInCache(client, questionId, answer.id, () => answer),
  });
}

function updateAnswerInCache(
  client: QueryClient,
  questionId: string,
  answerId: string,
  update: (a: AnswerDTO) => AnswerDTO,
) {
  client.setQueryData<InfiniteData<Page<AnswerDTO>>>(qk.answers(questionId), (prev) =>
    prev
      ? {
          ...prev,
          pages: prev.pages.map((p) => ({
            ...p,
            items: p.items.map((a) => (a.id === answerId ? update(a) : a)),
          })),
        }
      : prev,
  );
}

export function useVote(questionId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (vars: { targetType: VoteTarget; targetId: string; voted: boolean }) =>
      vars.voted
        ? api.put<VoteResultDTO>(`/votes/${vars.targetType}/${vars.targetId}`)
        : api.delete<VoteResultDTO>(`/votes/${vars.targetType}/${vars.targetId}`),
    onSuccess: (res) => {
      if (res.targetType === 'question') {
        client.setQueryData<QuestionDetailDTO>(qk.question(questionId), (q) =>
          q
            ? {
                ...q,
                voteScore: res.voteScore,
                viewer: { isAuthor: q.viewer?.isAuthor ?? false, voted: res.voted },
              }
            : q,
        );
        void client.invalidateQueries({ queryKey: ['questions'] });
      } else {
        updateAnswerInCache(client, questionId, res.targetId, (a) => ({
          ...a,
          voteScore: res.voteScore,
          viewer: { isAuthor: a.viewer?.isAuthor ?? false, voted: res.voted },
        }));
      }
    },
  });
}

export function useAcceptAnswer(questionId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (answerId: string | null) =>
      answerId
        ? api.put<{ acceptedAnswerId: string | null }>(
            `/questions/${questionId}/accept/${answerId}`,
          )
        : api.delete<{ acceptedAnswerId: string | null }>(`/questions/${questionId}/accept`),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: qk.question(questionId) });
      void client.invalidateQueries({ queryKey: qk.answers(questionId) });
      invalidateQuestionLists(client);
    },
  });
}

export function useCreateComment(questionId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (vars: { targetType: CommentTarget; targetId: string; body: string }) =>
      api.post<CommentDTO>('/comments', vars),
    onSuccess: (comment) => {
      void client.invalidateQueries({
        queryKey: qk.comments(comment.targetType, comment.targetId),
      });
      if (comment.targetType === 'question') {
        void client.invalidateQueries({ queryKey: qk.question(questionId) });
      } else {
        updateAnswerInCache(client, questionId, comment.targetId, (a) => ({
          ...a,
          commentCount: a.commentCount + 1,
        }));
      }
    },
  });
}

export const useReport = () =>
  useMutation({
    mutationFn: (input: ReportCreateInput) => api.post<MessageDTO>('/reports', input),
  });
