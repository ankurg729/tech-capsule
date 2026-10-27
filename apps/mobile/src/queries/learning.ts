import type {
  BookmarkResultDTO,
  ContentLanguage,
  Difficulty,
  HomeFeedDTO,
  LearningStatsDTO,
  LessonDetailDTO,
  LessonSummaryDTO,
  PathDetailDTO,
  PathSummaryDTO,
  ProgressDTO,
  ProgressInput,
  ProgressWithLessonDTO,
  QuizAnswerResult,
  RatingDTO,
  SavedItem,
  SearchResultsDTO,
  Technology,
} from '@techcapsule/contracts';
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { qk, useInfinitePage } from './client';

export interface LessonFilters {
  technology?: Technology;
  difficulty?: Difficulty;
  language?: ContentLanguage;
  tag?: string;
  q?: string;
  sort?: 'newest' | 'top-rated';
}

export interface PathFilters {
  technology?: Technology;
  difficulty?: Difficulty;
}

type LessonRef = Pick<LessonDetailDTO, 'id' | 'slug'>;

function patchLesson(
  client: QueryClient,
  slug: string,
  update: (lesson: LessonDetailDTO) => LessonDetailDTO,
) {
  client.setQueryData<LessonDetailDTO>(qk.lesson(slug), (prev) => (prev ? update(prev) : prev));
}

function emptyViewer(): NonNullable<LessonDetailDTO['viewer']> {
  return { bookmarked: false, rating: null, progress: null, answeredQuizzes: [] };
}

/** Learning activity changes home, stats, progress lists and path completion. */
function invalidateLearning(client: QueryClient) {
  void client.invalidateQueries({ queryKey: qk.home });
  void client.invalidateQueries({ queryKey: qk.stats });
  void client.invalidateQueries({ queryKey: ['progress'] });
  void client.invalidateQueries({ queryKey: ['path'] });
  void client.invalidateQueries({ queryKey: ['paths'] });
}

export const useHomeFeed = () =>
  useQuery({
    queryKey: qk.home,
    queryFn: ({ signal }) => api.get<HomeFeedDTO>('/home', undefined, signal),
  });

export const useStats = () =>
  useQuery({
    queryKey: qk.stats,
    queryFn: ({ signal }) => api.get<LearningStatsDTO>('/users/me/stats', undefined, signal),
  });

export const useLessons = (filters: LessonFilters) =>
  useInfinitePage<LessonSummaryDTO>(qk.lessons(filters), '/lessons', { ...filters });

export const useLesson = (slug: string) =>
  useQuery({
    queryKey: qk.lesson(slug),
    queryFn: ({ signal }) =>
      api.get<LessonDetailDTO>(`/lessons/${encodeURIComponent(slug)}`, undefined, signal),
  });

export const usePaths = (filters: PathFilters) =>
  useInfinitePage<PathSummaryDTO>(qk.paths(filters), '/learning-paths', { ...filters });

export const usePath = (slug: string) =>
  useQuery({
    queryKey: qk.path(slug),
    queryFn: ({ signal }) =>
      api.get<PathDetailDTO>(`/learning-paths/${encodeURIComponent(slug)}`, undefined, signal),
  });

export const useProgressList = (status: 'in-progress' | 'completed') =>
  useInfinitePage<ProgressWithLessonDTO>(qk.progress(status), '/users/me/progress', { status });

export const useSavedLessons = () =>
  useInfinitePage<SavedItem<LessonSummaryDTO>>(qk.bookmarks('lesson'), '/users/me/bookmarks', {
    type: 'lesson',
  });

export const useSearch = (q: string, type: 'all' | 'lessons' | 'paths' | 'questions' = 'all') =>
  useQuery({
    queryKey: qk.search(q, type),
    queryFn: ({ signal }) => api.get<SearchResultsDTO>('/search', { q, type }, signal),
    enabled: q.trim().length >= 2,
    staleTime: 30_000,
  });

export function useSaveProgress(lesson: LessonRef) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: ProgressInput) =>
      api.put<ProgressDTO>(`/lessons/${lesson.id}/progress`, input),
    onSuccess: (progress) =>
      patchLesson(client, lesson.slug, (l) => ({
        ...l,
        viewer: {
          ...(l.viewer ?? emptyViewer()),
          progress: {
            lastBlockId: progress.lastBlockId,
            completionPercent: progress.completionPercent,
            completedAt: progress.completedAt,
          },
        },
      })),
  });
}

export function useCompleteLesson(lesson: LessonRef) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<ProgressDTO>(`/lessons/${lesson.id}/complete`),
    onSuccess: (progress) => {
      patchLesson(client, lesson.slug, (l) => ({
        ...l,
        viewer: {
          ...(l.viewer ?? emptyViewer()),
          progress: {
            lastBlockId: progress.lastBlockId,
            completionPercent: progress.completionPercent,
            completedAt: progress.completedAt,
          },
        },
      }));
      invalidateLearning(client);
    },
  });
}

export function useAnswerQuiz(lesson: LessonRef) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (vars: { blockId: string; selectedOptionIds: string[] }) =>
      api.post<QuizAnswerResult>(`/lessons/${lesson.id}/quiz/${vars.blockId}/answer`, {
        selectedOptionIds: vars.selectedOptionIds,
      }),
    onSuccess: (result) => {
      patchLesson(client, lesson.slug, (l) => {
        const viewer = l.viewer ?? emptyViewer();
        const others = viewer.answeredQuizzes.filter((q) => q.blockId !== result.blockId);
        return {
          ...l,
          viewer: {
            ...viewer,
            answeredQuizzes: [...others, { blockId: result.blockId, correct: result.correct }],
          },
        };
      });
      void client.invalidateQueries({ queryKey: qk.stats });
    },
  });
}

export function useRateLesson(lesson: LessonRef) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (stars: number) => api.put<RatingDTO>(`/lessons/${lesson.id}/rating`, { stars }),
    onSuccess: (rating) => {
      patchLesson(client, lesson.slug, (l) => ({
        ...l,
        ratingAvg: rating.ratingAvg,
        ratingCount: rating.ratingCount,
        viewer: { ...(l.viewer ?? emptyViewer()), rating: rating.stars },
      }));
      void client.invalidateQueries({ queryKey: ['lessons'] });
    },
  });
}

export function useLessonBookmark(lesson: LessonRef) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (bookmarked: boolean) =>
      bookmarked
        ? api.put<BookmarkResultDTO>(`/lessons/${lesson.id}/bookmark`)
        : api.delete<BookmarkResultDTO>(`/lessons/${lesson.id}/bookmark`),
    onSuccess: (res) => {
      patchLesson(client, lesson.slug, (l) => ({
        ...l,
        viewer: { ...(l.viewer ?? emptyViewer()), bookmarked: res.bookmarked },
      }));
      void client.invalidateQueries({ queryKey: qk.bookmarks('lesson') });
    },
  });
}

export { invalidateLearning };
