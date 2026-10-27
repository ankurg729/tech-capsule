import { screen, userEvent } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';
import LoginScreen from '@/app/(auth)/login';
import { session } from '@/lib/auth/session';
import { jsonBody, mockFetch, renderWithProviders } from '../../test/utils';

jest.mock('expo-router', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    Link: ({ children }: { children: React.ReactNode }) => <Text>{children}</Text>,
    useLocalSearchParams: () => ({}),
    useRouter: () => ({
      push: jest.fn(),
      replace: jest.fn(),
      back: jest.fn(),
      canGoBack: () => true,
    }),
  };
});

const store = (SecureStore as unknown as { __store: Map<string, string> }).__store;

beforeEach(async () => {
  store.clear();
  await session.signOut();
});

it('validates input locally before calling the API', async () => {
  const user = userEvent.setup();
  const { fn } = mockFetch(() => ({ status: 500, body: {} }));
  await renderWithProviders(<LoginScreen />);

  await user.type(screen.getByTestId('login-email'), 'not-an-email');
  await user.press(screen.getByTestId('login-submit'));

  expect(await screen.findByText('Enter a valid email address')).toBeOnTheScreen();
  expect(fn).not.toHaveBeenCalled();
});

it('shows the server error for bad credentials and stays signed out', async () => {
  const user = userEvent.setup();
  mockFetch(() => ({
    status: 401,
    body: { error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } },
  }));
  await renderWithProviders(<LoginScreen />);

  await user.type(screen.getByTestId('login-email'), 'ada@example.dev');
  await user.type(screen.getByTestId('login-password'), 'wrong-password-1');
  await user.press(screen.getByTestId('login-submit'));

  expect(await screen.findByTestId('login-error')).toHaveTextContent(/Invalid email or password/);
  expect(session.getState().status).toBe('signedOut');
  expect(store.size).toBe(0);
});

it('signs in with valid credentials and stores the refresh token securely', async () => {
  const user = userEvent.setup();
  const { calls } = mockFetch(() => ({
    status: 200,
    body: {
      data: {
        user: {
          id: 'u1',
          email: 'ada@example.dev',
          displayName: 'Ada',
          role: 'user',
          emailVerified: false,
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
          accessToken: 'access',
          accessTokenExpiresAt: new Date(Date.now() + 900_000).toISOString(),
          refreshToken: 'refresh-token-abcdefghijklmnop',
          refreshTokenExpiresAt: new Date(Date.now() + 86_400_000).toISOString(),
        },
      },
    },
  }));
  await renderWithProviders(<LoginScreen />);

  await user.type(screen.getByTestId('login-email'), 'Ada@Example.dev');
  await user.type(screen.getByTestId('login-password'), 'correct-horse-42');
  await user.press(screen.getByTestId('login-submit'));

  await screen.findByTestId('login-submit');
  expect(jsonBody(calls[0]!.init)).toEqual({
    email: 'ada@example.dev',
    password: 'correct-horse-42',
  });
  expect(session.getState().status).toBe('signedIn');
  expect([...store.values()]).toEqual(['refresh-token-abcdefghijklmnop']);
});
