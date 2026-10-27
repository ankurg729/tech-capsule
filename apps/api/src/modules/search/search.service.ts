import type { SearchQuery, SearchResultsDTO } from '@techcapsule/contracts';
import { searchPaths } from '../learning-paths/learningPaths.service.js';
import { searchLessons } from '../lessons/lessons.service.js';
import { searchQuestions } from '../questions/questions.service.js';

/**
 * Phase 1 search runs over MongoDB text indexes. Phase 2 can add a semantic/RAG provider
 * behind this same function without changing the endpoint contract.
 */
export async function search(query: SearchQuery, viewerId?: string): Promise<SearchResultsDTO> {
  const want = (t: SearchQuery['type']) => query.type === 'all' || query.type === t;
  const [lessons, paths, questions] = await Promise.all([
    want('lessons') ? searchLessons(query.q, query.limit) : Promise.resolve([]),
    want('paths') ? searchPaths(query.q, Math.min(query.limit, 5), viewerId) : Promise.resolve([]),
    want('questions') ? searchQuestions(query.q, query.limit) : Promise.resolve([]),
  ]);
  return { query: query.q, lessons, paths, questions };
}
