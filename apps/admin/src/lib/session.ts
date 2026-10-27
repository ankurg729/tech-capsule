import type { AuthSessionDTO, LoginInput, UserDTO } from '@techcapsule/contracts';
import { useSyncExternalStore } from 'react';
import { ApiError, rawRequest } from './http';

export type SessionStatus = 'loading' | 'signedOut' | 'signedIn';

export interface SessionState {
  status: SessionStatus;
  user: UserDTO | null;
  /** Shown on the login screen after an involuntary sign-out. */
  notice: string | null;
}

const REFRESH_LEEWAY_MS = 30_000;
export const NOT_ADMIN_MESSAGE = 'This account does not have admin access.';

let state: SessionState = { status: 'loading', user: null, notice: null };
// The access token lives only in memory; the refresh token is an httpOnly cookie the
// page's JavaScript can never read.
let accessToken: string | null = null;
let accessExpiresAt = 0;
let refreshInFlight: Promise<void> | null = null;
const listeners = new Set<() => void>();
const signOutListeners = new Set<() => void>();

function setState(next: Partial<SessionState>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

function clearTokens() {
  accessToken = null;
  accessExpiresAt = 0;
}

async function acceptSession(session: AuthSessionDTO) {
  if (session.user.role !== 'admin') {
    // Revoke the cookie session the API just issued; a learner account is useless here.
    await rawRequest('/auth/logout', { method: 'POST', body: {} }).catch(() => undefined);
    clearTokens();
    setState({ status: 'signedOut', user: null, notice: NOT_ADMIN_MESSAGE });
    throw new ApiError(403, 'FORBIDDEN', NOT_ADMIN_MESSAGE);
  }
  accessToken = session.tokens.accessToken;
  accessExpiresAt = Date.parse(session.tokens.accessTokenExpiresAt);
  setState({ status: 'signedIn', user: session.user, notice: null });
}

function expire(notice: string | null) {
  const wasSignedIn = state.status === 'signedIn';
  clearTokens();
  setState({ status: 'signedOut', user: null, notice });
  if (wasSignedIn) signOutListeners.forEach((l) => l());
}

export const session = {
  getState: () => state,
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  onSignOut(listener: () => void) {
    signOutListeners.add(listener);
    return () => signOutListeners.delete(listener);
  },

  async login(input: LoginInput): Promise<UserDTO> {
    const { data } = await rawRequest<AuthSessionDTO>('/auth/login', {
      method: 'POST',
      body: input,
    });
    await acceptSession(data);
    return data.user;
  },

  /**
   * Rotates the refresh cookie. Single-flight: the API treats reuse of a rotated token as
   * theft and revokes the whole session family, so concurrent callers share one request.
   */
  refresh(): Promise<void> {
    refreshInFlight ??= (async () => {
      try {
        const { data } = await rawRequest<AuthSessionDTO>('/auth/refresh', {
          method: 'POST',
          body: {},
        });
        await acceptSession(data);
      } catch (err) {
        const rejected =
          err instanceof ApiError &&
          (err.status === 401 || (err.status === 403 && err.message !== NOT_ADMIN_MESSAGE));
        if (rejected) {
          expire(state.status === 'signedIn' ? 'Your session ended. Please sign in again.' : null);
        }
        throw err;
      } finally {
        refreshInFlight = null;
      }
    })();
    return refreshInFlight;
  },

  /** Restores a session from the refresh cookie on page load. */
  async bootstrap(): Promise<void> {
    try {
      await session.refresh();
    } catch (err) {
      if (state.status === 'loading') {
        setState({
          status: 'signedOut',
          notice: err instanceof ApiError && err.code === 'NETWORK_ERROR' ? err.message : null,
        });
      }
    }
  },

  async getAccessToken(): Promise<string> {
    if (!accessToken || Date.now() > accessExpiresAt - REFRESH_LEEWAY_MS) {
      await session.refresh();
    }
    if (!accessToken) throw new ApiError(401, 'UNAUTHENTICATED', 'Not signed in');
    return accessToken;
  },

  /** The server re-checks the role on every admin request; a 403 means access was revoked. */
  revoked() {
    void rawRequest('/auth/logout', { method: 'POST', body: {} }).catch(() => undefined);
    expire(NOT_ADMIN_MESSAGE);
  },

  async signOut(): Promise<void> {
    try {
      await rawRequest('/auth/logout', { method: 'POST', body: {} });
    } catch {
      // The cookie is cleared server-side when reachable; local state is cleared regardless.
    }
    expire(null);
  },
};

export function useSession(): SessionState {
  return useSyncExternalStore(session.subscribe, session.getState, session.getState);
}
