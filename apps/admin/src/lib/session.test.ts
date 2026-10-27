import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockFetch, sessionBody, user } from '../../test/utils';

// The session is module state; load a fresh copy for every test.
async function load() {
  vi.resetModules();
  const sessionModule = await import('./session');
  const { api } = await import('./api');
  return { ...sessionModule, api };
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe('admin session', () => {
  it('signs in admins with the web cookie flow and keeps the token in memory only', async () => {
    const { session } = await load();
    const { calls } = mockFetch(() => ({ status: 200, body: sessionBody() }));

    await session.login({ email: 'admin@techcapsule.dev', password: 'pw' });

    expect(session.getState()).toMatchObject({ status: 'signedIn', user: { role: 'admin' } });
    expect(calls[0]).toMatchObject({
      url: '/api/v1/auth/login',
      method: 'POST',
      headers: { 'X-Client': 'web' },
    });
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
  });

  it('rejects learner accounts and revokes the session the API just issued', async () => {
    const { session, NOT_ADMIN_MESSAGE } = await load();
    const { calls } = mockFetch((c) =>
      c.url.endsWith('/auth/login')
        ? { status: 200, body: sessionBody(user({ role: 'user' })) }
        : { status: 200, body: { data: { message: 'Logged out' } } },
    );

    await expect(session.login({ email: 'learner@example.dev', password: 'pw' })).rejects.toThrow(
      NOT_ADMIN_MESSAGE,
    );
    expect(session.getState()).toMatchObject({ status: 'signedOut', notice: NOT_ADMIN_MESSAGE });
    expect(calls.map((c) => c.url)).toEqual(['/api/v1/auth/login', '/api/v1/auth/logout']);
  });

  it('bootstraps from the refresh cookie, or lands signed out without one', async () => {
    let s = await load();
    mockFetch(() => ({ status: 200, body: sessionBody() }));
    await s.session.bootstrap();
    expect(s.session.getState().status).toBe('signedIn');

    s = await load();
    mockFetch(() => ({
      status: 401,
      body: { error: { code: 'INVALID_TOKEN', message: 'Refresh token missing' } },
    }));
    await s.session.bootstrap();
    expect(s.session.getState()).toMatchObject({ status: 'signedOut', notice: null });
  });

  it('shares one refresh between concurrent requests (rotation is single-use)', async () => {
    const { session, api } = await load();
    let refreshes = 0;
    const { calls } = mockFetch((c) => {
      if (c.url.endsWith('/auth/refresh')) {
        refreshes++;
        return { status: 200, body: sessionBody(user(), `access-${refreshes}`) };
      }
      return { status: 200, body: { data: { ok: true } } };
    });

    await Promise.all([
      api.get('/admin/overview'),
      api.get('/admin/lessons'),
      api.get('/admin/news'),
    ]);

    expect(refreshes).toBe(1);
    expect(session.getState().status).toBe('signedIn');
    const authed = calls.filter((c) => !c.url.includes('/auth/'));
    expect(authed.every((c) => c.headers.Authorization === 'Bearer access-1')).toBe(true);
  });

  it('refreshes and retries once when the access token has expired', async () => {
    const { api } = await load();
    let refreshes = 0;
    let first = true;
    mockFetch((c) => {
      if (c.url.endsWith('/auth/refresh')) {
        refreshes++;
        return { status: 200, body: sessionBody(user(), `access-${refreshes}`) };
      }
      if (first) {
        first = false;
        return { status: 401, body: { error: { code: 'TOKEN_EXPIRED', message: 'expired' } } };
      }
      return { status: 200, body: { data: { token: c.headers.Authorization } } };
    });

    await expect(api.get('/admin/overview')).resolves.toEqual({ token: 'Bearer access-2' });
    expect(refreshes).toBe(2);
  });

  it('signs out when the server says the account is no longer an admin', async () => {
    const { session, api, NOT_ADMIN_MESSAGE } = await load();
    mockFetch((c) =>
      c.url.endsWith('/auth/refresh')
        ? { status: 200, body: sessionBody() }
        : c.url.endsWith('/auth/logout')
          ? { status: 200, body: { data: { message: 'ok' } } }
          : { status: 403, body: { error: { code: 'FORBIDDEN', message: 'Forbidden' } } },
    );
    const onSignOut = vi.fn();
    session.onSignOut(onSignOut);

    await expect(api.get('/admin/overview')).rejects.toMatchObject({ status: 403 });
    expect(session.getState()).toMatchObject({ status: 'signedOut', notice: NOT_ADMIN_MESSAGE });
    expect(onSignOut).toHaveBeenCalledOnce();
  });

  it('reports an unreachable API instead of pretending to be signed out silently', async () => {
    const { session } = await load();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch');
      }),
    );
    await session.bootstrap();
    expect(session.getState().status).toBe('signedOut');
    expect(session.getState().notice).toMatch(/cannot reach the api/i);
  });
});
