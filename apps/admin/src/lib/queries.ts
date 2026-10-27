import type {
  AdminLessonDTO,
  AdminNewsDTO,
  AdminOverviewDTO,
  AdminPathDTO,
  AuditEntryDTO,
  LessonInput,
  LessonUpdateInput,
  NewsInput,
  NewsUpdateInput,
  PathInput,
  PathUpdateInput,
  ReportDTO,
  ReportResolveInput,
  ReportStatus,
} from '@techcapsule/contracts';
import {
  keepPreviousData,
  QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { api } from './api';
import { ApiError, type QueryValue } from './http';
import { session } from './session';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      refetchOnWindowFocus: true,
      retry: (count, err) => err instanceof ApiError && err.code === 'NETWORK_ERROR' && count < 2,
    },
    mutations: { retry: false },
  },
});
session.onSignOut(() => queryClient.clear());

export type StatusAction = 'publish' | 'unpublish' | 'archive';
type Query = Record<string, QueryValue>;

export const qk = {
  overview: ['overview'] as const,
  lessons: (q?: Query) => (q ? (['lessons', q] as const) : (['lessons'] as const)),
  lesson: (id: string) => ['lesson', id] as const,
  paths: (q?: Query) => (q ? (['paths', q] as const) : (['paths'] as const)),
  path: (id: string) => ['path', id] as const,
  news: (q?: Query) => (q ? (['news', q] as const) : (['news'] as const)),
  article: (id: string) => ['article', id] as const,
  reports: (q?: Query) => (q ? (['reports', q] as const) : (['reports'] as const)),
  audit: (q?: Query) => (q ? (['audit', q] as const) : (['audit'] as const)),
};

const pageQuery = <T>(key: readonly unknown[], path: string, query: Query) => ({
  queryKey: key,
  queryFn: ({ signal }: { signal: AbortSignal }) => api.page<T>(path, query, signal),
  placeholderData: keepPreviousData,
});

export const useOverview = () =>
  useQuery({
    queryKey: qk.overview,
    queryFn: ({ signal }) => api.get<AdminOverviewDTO>('/admin/overview', undefined, signal),
  });

// Lessons
export const useLessons = (query: Query) =>
  useQuery(pageQuery<AdminLessonDTO>(qk.lessons(query), '/admin/lessons', query));

export const useLessonsByIds = (ids: string[]) =>
  useQuery({
    queryKey: ['lessons', 'byIds', ids],
    queryFn: ({ signal }) =>
      api.page<AdminLessonDTO>('/admin/lessons', { ids: ids.join(','), limit: 50 }, signal),
    enabled: ids.length > 0,
  });

export const useLesson = (id: string | undefined) =>
  useQuery({
    queryKey: qk.lesson(id ?? ''),
    queryFn: ({ signal }) => api.get<AdminLessonDTO>(`/admin/lessons/${id}`, undefined, signal),
    enabled: !!id,
  });

function useSaved<T extends { id: string }>(
  listKey: readonly unknown[],
  detailKey: (id: string) => readonly unknown[],
) {
  const client = useQueryClient();
  return (saved: T) => {
    client.setQueryData(detailKey(saved.id), saved);
    void client.invalidateQueries({ queryKey: listKey });
    void client.invalidateQueries({ queryKey: qk.overview });
    void client.invalidateQueries({ queryKey: qk.audit() });
  };
}

export function useSaveLesson(id: string | undefined) {
  const onSaved = useSaved<AdminLessonDTO>(qk.lessons(), qk.lesson);
  return useMutation({
    mutationFn: (input: LessonInput | LessonUpdateInput) =>
      id
        ? api.patch<AdminLessonDTO>(`/admin/lessons/${id}`, input)
        : api.post<AdminLessonDTO>('/admin/lessons', input),
    onSuccess: onSaved,
  });
}

export function useLessonStatus(id: string) {
  const onSaved = useSaved<AdminLessonDTO>(qk.lessons(), qk.lesson);
  return useMutation({
    mutationFn: (action: StatusAction) =>
      api.post<AdminLessonDTO>(`/admin/lessons/${id}/${action}`),
    onSuccess: onSaved,
  });
}

// Learning paths
export const usePaths = (query: Query) =>
  useQuery(pageQuery<AdminPathDTO>(qk.paths(query), '/admin/learning-paths', query));

export const usePath = (id: string | undefined) =>
  useQuery({
    queryKey: qk.path(id ?? ''),
    queryFn: ({ signal }) =>
      api.get<AdminPathDTO>(`/admin/learning-paths/${id}`, undefined, signal),
    enabled: !!id,
  });

export function useSavePath(id: string | undefined) {
  const onSaved = useSaved<AdminPathDTO>(qk.paths(), qk.path);
  return useMutation({
    mutationFn: (input: PathInput | PathUpdateInput) =>
      id
        ? api.patch<AdminPathDTO>(`/admin/learning-paths/${id}`, input)
        : api.post<AdminPathDTO>('/admin/learning-paths', input),
    onSuccess: onSaved,
  });
}

export function usePathStatus(id: string) {
  const onSaved = useSaved<AdminPathDTO>(qk.paths(), qk.path);
  return useMutation({
    mutationFn: (action: StatusAction) =>
      api.post<AdminPathDTO>(`/admin/learning-paths/${id}/${action}`),
    onSuccess: onSaved,
  });
}

// News
export const useNewsList = (query: Query) =>
  useQuery(pageQuery<AdminNewsDTO>(qk.news(query), '/admin/news', query));

export const useArticle = (id: string | undefined) =>
  useQuery({
    queryKey: qk.article(id ?? ''),
    queryFn: ({ signal }) => api.get<AdminNewsDTO>(`/admin/news/${id}`, undefined, signal),
    enabled: !!id,
  });

export function useSaveArticle(id: string | undefined) {
  const onSaved = useSaved<AdminNewsDTO>(qk.news(), qk.article);
  return useMutation({
    mutationFn: (input: NewsInput | NewsUpdateInput) =>
      id
        ? api.patch<AdminNewsDTO>(`/admin/news/${id}`, input)
        : api.post<AdminNewsDTO>('/admin/news', input),
    onSuccess: onSaved,
  });
}

export function useArticleStatus(id: string) {
  const onSaved = useSaved<AdminNewsDTO>(qk.news(), qk.article);
  return useMutation({
    mutationFn: (action: StatusAction) => api.post<AdminNewsDTO>(`/admin/news/${id}/${action}`),
    onSuccess: onSaved,
  });
}

// Moderation & audit
export const useReports = (query: Query) =>
  useQuery(pageQuery<ReportDTO>(qk.reports(query), '/admin/reports', query));

export function useResolveReport() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: ReportResolveInput & { id: string }) =>
      api.post<{ id: string; status: ReportStatus }>(`/admin/reports/${id}/resolve`, input),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: qk.reports() });
      void client.invalidateQueries({ queryKey: qk.overview });
      void client.invalidateQueries({ queryKey: qk.audit() });
    },
  });
}

export const useAudit = (query: Query) =>
  useQuery(pageQuery<AuditEntryDTO>(qk.audit(query), '/admin/audit-logs', query));
