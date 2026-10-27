import type { AuthSessionDTO } from '@techcapsule/contracts';
import * as SecureStore from 'expo-secure-store';
import { jsonBody, mockFetch } from '../../../test/utils';
import { api } from '../api/client';
import { session } from './session';

const store = (SecureStore as unknown as { __store: Map<string, string> }).__store;

function sessionDTO(n: number, accessTtlMs = 15 * 60_000): AuthSessionDTO {
  return {
    user: {
      id: 'u1',
      email: 'ada@example.dev',
      displayName: 'Ada',
      role: 'user',
      emailVerified: true,
      preferences: {
        language: 'en',
        interests: [],
        experienceLevel: 'beginner',
        dailyGoalMinutes: 10,
        timezone: 'UTC',
      },
      createdAt: '2026-01-01T00:00:00.000Z',
    },
    tokens: {
      accessToken: `access-${n}`,
      accessTokenExpiresAt: new Date(Date.now() + accessTtlMs).toISOString(),
      refreshToken: `refresh-token-number-${n}-xxxxxxxx`,
      refreshTokenExpiresAt: new Date(Date.now() + 86_400_000).toISOString(),
    },
  };
}

beforeEach(async () => {
  store.clear();
  await session.signOut();
});

describe('session', () => {
  it('persists only the refresh token, never the access token or password', async () => {
    mockFetch(() => ({ status: 200, body: { data: {} } }));
    await session.establish(sessionDTO(1));
    expect([...store.values()]).toEqual(['refresh-token-number-1-xxxxxxxx']);
    expect([...store.values()].join()).not.toContain('access-1');
    expect(session.getState()).toMatchObject({ status: 'signedIn', user: { id: 'u1' } });
  });

  it('bootstraps to signedOut when nothing is stored, and to unreachable on network failure', async () => {
    await session.bootstrap();
    expect(session.getState().status).toBe('signedOut');

    store.set('tc.refreshToken', 'refresh-token-number-9-xxxxxxxx');
    globalThis.fetch = jest.fn(async () => {
      throw new TypeError('Network request failed');
    }) as unknown as typeof fetch;
    await session.bootstrap();
    expect(session.getState().status).toBe('unreachable');
    expect(store.get('tc.refreshToken')).toBe('refresh-token-number-9-xxxxxxxx');
  });

  it('shares one refresh request between concurrent callers (rotation safety)', async () => {
    await session.establish(sessionDTO(1, 0));
    const { calls } = mockFetch((url) =>
      url.endsWith('/auth/refresh')
        ? { status: 200, body: { data: sessionDTO(2) } }
        : { status: 200, body: { data: { ok: true } } },
    );

    await Promise.all([api.get('/home'), api.get('/users/me/stats'), api.get('/news')]);

    const refreshCalls = calls.filter((c) => c.url.endsWith('/auth/refresh'));
    expect(refreshCalls).toHaveLength(1);
    expect(jsonBody(refreshCalls[0]!.init)).toEqual({
      refreshToken: 'refresh-token-number-1-xxxxxxxx',
    });
    const authed = calls.filter((c) => !c.url.endsWith('/auth/refresh'));
    for (const c of authed) {
      expect((c.init.headers as Record<string, string>).Authorization).toBe('Bearer access-2');
    }
    expect(store.get('tc.refreshToken')).toBe('refresh-token-number-2-xxxxxxxx');
  });

  it('retries once after TOKEN_EXPIRED and signs out when the refresh token is rejected', async () => {
    await session.establish(sessionDTO(1));
    mockFetch((url) => {
      if (url.endsWith('/auth/refresh')) {
        return { status: 401, body: { error: { code: 'INVALID_TOKEN', message: 'revoked' } } };
      }
      return { status: 401, body: { error: { code: 'TOKEN_EXPIRED', message: 'expired' } } };
    });

    await expect(api.get('/home')).rejects.toMatchObject({ code: 'TOKEN_EXPIRED' });
    expect(session.getState().status).toBe('signedOut');
    expect(store.size).toBe(0);
  });

  it('revokes the session on the server when signing out', async () => {
    await session.establish(sessionDTO(1));
    const { calls } = mockFetch(() => ({ status: 200, body: { data: { message: 'ok' } } }));
    await session.signOut();
    expect(store.size).toBe(0);
    const logout = calls.find((c) => c.url.endsWith('/auth/logout'));
    expect(logout && jsonBody(logout.init)).toEqual({
      refreshToken: 'refresh-token-number-1-xxxxxxxx',
    });
  });
});
