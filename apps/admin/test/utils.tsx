import type { UserDTO } from '@techcapsule/contracts';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { createMemoryRouter, RouterProvider, type RouteObject } from 'react-router';
import { vi } from 'vitest';

export interface Call {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: unknown;
}

type Handler = (call: Call) => { status: number; body?: unknown };

/** Replaces global fetch with a scripted handler and records every request. */
export function mockFetch(handler: Handler) {
  const calls: Call[] = [];
  const fn = vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const call: Call = {
      url: String(input),
      method: init.method ?? 'GET',
      headers: (init.headers ?? {}) as Record<string, string>,
      body: init.body ? JSON.parse(String(init.body)) : undefined,
    };
    calls.push(call);
    const { status, body } = handler(call);
    return new Response(body === undefined ? null : JSON.stringify(body), { status });
  });
  vi.stubGlobal('fetch', fn);
  return { fn, calls };
}

export const user = (overrides: Partial<UserDTO> = {}): UserDTO => ({
  id: 'u1',
  email: 'admin@techcapsule.dev',
  displayName: 'Ada Admin',
  role: 'admin',
  emailVerified: true,
  preferences: {
    language: 'en',
    interests: [],
    experienceLevel: 'beginner',
    dailyGoalMinutes: 10,
    timezone: 'UTC',
  },
  createdAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

export const sessionBody = (u: UserDTO = user(), accessToken = 'access-1') => ({
  data: {
    user: u,
    tokens: {
      accessToken,
      accessTokenExpiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
      refreshTokenExpiresAt: new Date(Date.now() + 86_400_000).toISOString(),
    },
  },
});

export function renderRoutes(routes: RouteObject[], initialPath: string) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false, gcTime: Infinity },
    },
  });
  const router = createMemoryRouter(routes, { initialEntries: [initialPath] });
  const utils = render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { ...utils, router, client };
}

export function renderWithClient(ui: ReactElement) {
  return renderRoutes([{ path: '*', element: ui }], '/');
}
