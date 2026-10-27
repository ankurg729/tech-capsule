import { focusManager, QueryClient, useInfiniteQuery, type QueryKey } from '@tanstack/react-query';
import { useMemo } from 'react';
import { AppState, Platform } from 'react-native';
import { api } from '@/lib/api/client';
import { ApiError, type QueryValue } from '@/lib/api/http';
import { session } from '@/lib/auth/session';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 10 * 60_000,
      // Client errors (4xx) won't succeed on retry; transient network failures might.
      retry: (count, err) => (err instanceof ApiError && err.isNetwork ? count < 2 : false),
    },
    mutations: { retry: false },
  },
});

session.onSignOut(() => queryClient.clear());

/** Refetch stale queries when the app returns to the foreground. */
export function subscribeAppFocus() {
  if (Platform.OS === 'web') return () => undefined;
  const sub = AppState.addEventListener('change', (s) => focusManager.setFocused(s === 'active'));
  return () => sub.remove();
}

export const PAGE_SIZE = 20;

export function useInfinitePage<T>(
  queryKey: QueryKey,
  path: string,
  query: Record<string, QueryValue> = {},
  options: { enabled?: boolean; limit?: number } = {},
) {
  const result = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam, signal }) =>
      api.page<T>(path, { ...query, page: pageParam, limit: options.limit ?? PAGE_SIZE }, signal),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.meta.hasNextPage ? last.meta.page + 1 : undefined),
    enabled: options.enabled,
  });
  const items = useMemo(() => result.data?.pages.flatMap((p) => p.items) ?? [], [result.data]);
  return { ...result, items, total: result.data?.pages[0]?.meta.total ?? 0 };
}

export const qk = {
  home: ['home'] as const,
  stats: ['stats'] as const,
  lessons: (filters: object) => ['lessons', filters] as const,
  lesson: (slug: string) => ['lesson', slug] as const,
  paths: (filters: object) => ['paths', filters] as const,
  path: (slug: string) => ['path', slug] as const,
  progress: (status: string) => ['progress', status] as const,
  bookmarks: (type: 'lesson' | 'news') => ['bookmarks', type] as const,
  questions: (filters: object) => ['questions', filters] as const,
  question: (id: string) => ['question', id] as const,
  answers: (questionId: string) => ['answers', questionId] as const,
  comments: (targetType: string, targetId: string) => ['comments', targetType, targetId] as const,
  news: (category: string | undefined) => ['news', category ?? 'all'] as const,
  newsArticle: (slug: string) => ['news-article', slug] as const,
  search: (q: string, type: string) => ['search', q, type] as const,
};
