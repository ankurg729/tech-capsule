import type { AuthSessionDTO, UserDTO } from '@techcapsule/contracts';
import { useSyncExternalStore } from 'react';
import { ApiError, rawRequest } from '../api/http';
import * as tokenStorage from './tokenStorage';

export type SessionStatus = 'loading' | 'signedOut' | 'signedIn' | 'unreachable';

export interface SessionState {
  status: SessionStatus;
  user: UserDTO | null;
}

/** Refresh slightly early so a request never leaves with a token that expires in flight. */
const EXPIRY_SKEW_MS = 30_000;

let state: SessionState = { status: 'loading', user: null };
let access: { token: string; expiresAt: number } | null = null;
let refreshInFlight: Promise<string | null> | null = null;
const listeners = new Set<() => void>();
const signOutHandlers = new Set<() => void>();

function setState(next: Partial<SessionState>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

async function clearLocal() {
  access = null;
  await tokenStorage.deleteRefreshToken().catch(() => undefined);
  setState({ status: 'signedOut', user: null });
  signOutHandlers.forEach((h) => h());
}

async function establish(dto: AuthSessionDTO) {
  if (!dto.tokens.refreshToken) throw new Error('Session response did not include a refresh token');
  await tokenStorage.saveRefreshToken(dto.tokens.refreshToken);
  access = {
    token: dto.tokens.accessToken,
    expiresAt: Date.parse(dto.tokens.accessTokenExpiresAt),
  };
  setState({ status: 'signedIn', user: dto.user });
}

/**
 * Rotates the refresh token. Concurrent callers share one request, because the server treats
 * reuse of an already-rotated token as theft and revokes the whole session family.
 */
function refresh(): Promise<string | null> {
  refreshInFlight ??= (async () => {
    const stored = await tokenStorage.readRefreshToken();
    if (!stored) {
      await clearLocal();
      return null;
    }
    try {
      const { data } = await rawRequest<AuthSessionDTO>('/auth/refresh', {
        method: 'POST',
        body: { refreshToken: stored },
      });
      await establish(data);
      return data.tokens.accessToken;
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        await clearLocal();
        return null;
      }
      throw err;
    }
  })().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

export const session = {
  getState: () => state,

  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  /** Registers cleanup (e.g. clearing cached queries) that runs whenever the user is signed out. */
  onSignOut(handler: () => void) {
    signOutHandlers.add(handler);
    return () => {
      signOutHandlers.delete(handler);
    };
  },

  establish,
  refresh,

  async bootstrap() {
    setState({ status: 'loading' });
    const stored = await tokenStorage.readRefreshToken().catch(() => null);
    if (!stored) {
      setState({ status: 'signedOut', user: null });
      return;
    }
    try {
      await refresh();
    } catch {
      // Keep the stored token: the server is unreachable, not rejecting the session.
      setState({ status: 'unreachable' });
    }
  },

  async getAccessToken(): Promise<string | null> {
    if (state.status !== 'signedIn') return null;
    if (access && access.expiresAt - Date.now() > EXPIRY_SKEW_MS) return access.token;
    return refresh();
  },

  setUser(user: UserDTO) {
    setState({ user });
  },

  async signOut() {
    const stored = await tokenStorage.readRefreshToken().catch(() => null);
    await clearLocal();
    if (stored) {
      rawRequest('/auth/logout', { method: 'POST', body: { refreshToken: stored } }).catch(
        () => undefined,
      );
    }
  },
};

export function useSession(): SessionState {
  return useSyncExternalStore(session.subscribe, session.getState, session.getState);
}

export function useCurrentUser(): UserDTO {
  const { user } = useSession();
  if (!user) throw new Error('useCurrentUser must be used inside a signed-in screen');
  return user;
}
