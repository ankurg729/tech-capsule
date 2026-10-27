import type {
  BookmarkResultDTO,
  NewsCategory,
  NewsDetailDTO,
  NewsSummaryDTO,
  SavedItem,
} from '@techcapsule/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { qk, useInfinitePage } from './client';

export const useNewsFeed = (category: NewsCategory | undefined) =>
  useInfinitePage<NewsSummaryDTO>(qk.news(category), '/news', { category });

export const useNewsArticle = (slug: string) =>
  useQuery({
    queryKey: qk.newsArticle(slug),
    queryFn: ({ signal }) =>
      api.get<NewsDetailDTO>(`/news/${encodeURIComponent(slug)}`, undefined, signal),
  });

export const useSavedNews = () =>
  useInfinitePage<SavedItem<NewsSummaryDTO>>(qk.bookmarks('news'), '/users/me/bookmarks', {
    type: 'news',
  });

export function useNewsBookmark(article: Pick<NewsDetailDTO, 'id' | 'slug'>) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (bookmarked: boolean) =>
      bookmarked
        ? api.put<BookmarkResultDTO>(`/news/${article.id}/bookmark`)
        : api.delete<BookmarkResultDTO>(`/news/${article.id}/bookmark`),
    onSuccess: (res) => {
      client.setQueryData<NewsDetailDTO>(qk.newsArticle(article.slug), (prev) =>
        prev ? { ...prev, viewer: { bookmarked: res.bookmarked } } : prev,
      );
      void client.invalidateQueries({ queryKey: qk.bookmarks('news') });
    },
  });
}
