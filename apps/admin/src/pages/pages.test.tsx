import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockFetch, sessionBody, user } from '../../test/utils';

// Fresh session state per test. Everything that renders must come from the same module
// registry, otherwise React Router's context would be duplicated.
async function loadApp() {
  vi.resetModules();
  const { routes } = await import('@/router');
  const { session } = await import('@/lib/session');
  const { renderRoutes } = await import('../../test/utils');
  return { routes, session, renderRoutes };
}

const lessonDTO = (body: Record<string, unknown>) => ({
  id: '65f000000000000000000001',
  slug: 'mcp-basics',
  status: 'draft',
  contentVersion: 1,
  estimatedMinutes: 1,
  coverImageUrl: null,
  ratingAvg: null,
  ratingCount: 0,
  publishedAt: null,
  archivedAt: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...body,
});

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe('login page', () => {
  it('shows an explicit error for learner accounts', async () => {
    const { routes, session, renderRoutes } = await loadApp();
    mockFetch((c) =>
      c.url.endsWith('/auth/login')
        ? { status: 200, body: sessionBody(user({ role: 'user' })) }
        : c.url.endsWith('/auth/logout')
          ? { status: 200, body: { data: { message: 'ok' } } }
          : { status: 401, body: { error: { code: 'INVALID_TOKEN', message: 'missing' } } },
    );
    await session.bootstrap();
    renderRoutes(routes, '/');

    const ue = userEvent.setup();
    await ue.type(await screen.findByLabelText('Email'), 'learner@example.dev');
    await ue.type(screen.getByLabelText('Password'), 'whatever-123');
    await ue.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/does not have admin access/i);
    expect(session.getState().status).toBe('signedOut');
  });

  it('signs an admin in and lands on the overview with live counts', async () => {
    const { routes, session, renderRoutes } = await loadApp();
    mockFetch((c) => {
      if (c.url.endsWith('/auth/refresh'))
        return { status: 401, body: { error: { code: 'INVALID_TOKEN', message: 'missing' } } };
      if (c.url.endsWith('/auth/login')) return { status: 200, body: sessionBody() };
      if (c.url.endsWith('/admin/overview')) {
        return {
          status: 200,
          body: {
            data: {
              counts: {
                users: 12,
                verifiedUsers: 7,
                lessons: { draft: 2, published: 9, archived: 1 },
                paths: { draft: 0, published: 3, archived: 0 },
                news: { draft: 1, published: 4, archived: 0 },
                questions: 5,
                answers: 8,
                openReports: 2,
              },
              recentAudit: [],
            },
          },
        };
      }
      return { status: 404, body: { error: { code: 'NOT_FOUND', message: 'nope' } } };
    });
    await session.bootstrap();
    renderRoutes(routes, '/');

    const ue = userEvent.setup();
    await ue.type(await screen.findByLabelText('Email'), 'admin@techcapsule.dev');
    await ue.type(screen.getByLabelText('Password'), 'correct-horse-42');
    await ue.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('heading', { name: 'Overview' })).toBeInTheDocument();
    expect(await screen.findByText('9')).toBeInTheDocument();
    expect(screen.getByText(/7 verified/)).toBeInTheDocument();
  });
});

describe('lesson editor', () => {
  it('validates locally, then creates a draft with the block content', async () => {
    const { routes, session, renderRoutes } = await loadApp();
    let created: ReturnType<typeof lessonDTO> | null = null;
    const { calls } = mockFetch((c) => {
      if (c.url.endsWith('/auth/refresh')) return { status: 200, body: sessionBody() };
      if (c.url.endsWith('/admin/lessons') && c.method === 'POST') {
        created = lessonDTO(c.body as Record<string, unknown>);
        return { status: 201, body: { data: created } };
      }
      if (created && c.url.endsWith(`/admin/lessons/${created.id}`)) {
        return { status: 200, body: { data: created } };
      }
      return {
        status: 200,
        body: {
          data: [],
          meta: { page: 1, limit: 20, total: 0, totalPages: 1, hasNextPage: false },
        },
      };
    });
    await session.bootstrap();
    const { router } = renderRoutes(routes, '/lessons/new');
    const ue = userEvent.setup();

    await ue.click(await screen.findByRole('button', { name: 'Create draft' }));
    expect(
      await screen.findByText('Fix the highlighted fields before saving.'),
    ).toBeInTheDocument();
    expect(calls.some((c) => c.method === 'POST' && c.url.endsWith('/admin/lessons'))).toBe(false);

    await ue.type(screen.getByLabelText('Title'), 'MCP basics');
    await ue.type(screen.getByLabelText('Summary'), 'What the Model Context Protocol is.');
    await ue.type(screen.getByLabelText('Tags'), 'mcp, Protocols');
    await ue.click(screen.getByRole('button', { name: '+ Paragraph' }));
    await ue.type(screen.getByLabelText('Text'), 'MCP connects **models** to tools.');
    await ue.click(screen.getByRole('button', { name: 'Create draft' }));

    await waitFor(() =>
      expect(router.state.location.pathname).toBe('/lessons/65f000000000000000000001'),
    );
    const post = calls.find((c) => c.method === 'POST' && c.url.endsWith('/admin/lessons'))!;
    expect(post.body).toEqual({
      title: 'MCP basics',
      summary: 'What the Model Context Protocol is.',
      technology: 'mcp',
      tags: ['mcp', 'protocols'],
      difficulty: 'beginner',
      language: 'en',
      blocks: [{ id: 'paragraph', type: 'paragraph', text: 'MCP connects **models** to tools.' }],
    });
    expect(post.headers.Authorization).toBe('Bearer access-1');
  });
});
