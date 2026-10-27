import { z } from 'zod';

export const TECHNOLOGIES = [
  'mcp',
  'rag',
  'ai-agents',
  'openai',
  'nodejs',
  'javascript',
  'typescript',
  'docker',
  'kubernetes',
  'react',
  'react-native',
  'python',
  'databases',
  'devops',
  'other',
] as const;
export const technologySchema = z.enum(TECHNOLOGIES);
export type Technology = z.infer<typeof technologySchema>;

export const TECHNOLOGY_LABELS: Record<Technology, string> = {
  mcp: 'MCP',
  rag: 'RAG',
  'ai-agents': 'AI Agents',
  openai: 'OpenAI API',
  nodejs: 'Node.js',
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  docker: 'Docker',
  kubernetes: 'Kubernetes',
  react: 'React',
  'react-native': 'React Native',
  python: 'Python',
  databases: 'Databases',
  devops: 'DevOps',
  other: 'Other',
};

export const DIFFICULTIES = ['beginner', 'intermediate', 'advanced'] as const;
export const difficultySchema = z.enum(DIFFICULTIES);
export type Difficulty = z.infer<typeof difficultySchema>;

export const CONTENT_LANGUAGES = ['en', 'hinglish'] as const;
export const contentLanguageSchema = z.enum(CONTENT_LANGUAGES);
export type ContentLanguage = z.infer<typeof contentLanguageSchema>;

export const LANGUAGE_LABELS: Record<ContentLanguage, string> = {
  en: 'English',
  hinglish: 'Hinglish',
};

export const CONTENT_STATUSES = ['draft', 'published', 'archived'] as const;
export const contentStatusSchema = z.enum(CONTENT_STATUSES);
export type ContentStatus = z.infer<typeof contentStatusSchema>;

export const USER_ROLES = ['user', 'admin'] as const;
export const userRoleSchema = z.enum(USER_ROLES);
export type UserRole = z.infer<typeof userRoleSchema>;

export const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, 'Must be a valid id');

export const slugSchema = z
  .string()
  .min(3)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug may contain lowercase letters, numbers and hyphens');

export const tagSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1)
  .max(30)
  .regex(/^[a-z0-9][a-z0-9.+#-]*$/, 'Tags may contain letters, numbers, ".", "+", "#" and "-"');

export const httpsUrlSchema = z.url({ protocol: /^https?$/ }).max(2048);

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
}

export interface ApiSuccess<T, M = undefined> {
  data: T;
  meta?: M;
}

export interface Paginated<T> {
  data: T[];
  meta: PaginationMeta;
}

export const ERROR_CODES = [
  'BAD_REQUEST',
  'VALIDATION_ERROR',
  'UNAUTHENTICATED',
  'TOKEN_EXPIRED',
  'INVALID_TOKEN',
  'INVALID_CREDENTIALS',
  'INVALID_CODE',
  'EMAIL_NOT_VERIFIED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'SPAM_DETECTED',
  'RATE_LIMITED',
  'INTERNAL_ERROR',
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];

export interface ApiErrorBody {
  error: {
    code: ErrorCode;
    message: string;
    details?: unknown;
    requestId?: string;
  };
}

export interface AuthorDTO {
  id: string;
  displayName: string;
}
