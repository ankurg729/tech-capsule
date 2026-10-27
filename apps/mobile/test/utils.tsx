import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { ThemeProvider } from '@/theme/ThemeProvider';

export function renderWithProviders(ui: ReactElement) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false, gcTime: Infinity },
    },
  });
  return render(
    <ThemeProvider>
      <QueryClientProvider client={client}>{ui}</QueryClientProvider>
    </ThemeProvider>,
  );
}

type FetchHandler = (url: string, init: RequestInit) => { status: number; body: unknown };

/** Replaces global fetch with a scripted handler and records every call. */
export function mockFetch(handler: FetchHandler) {
  const calls: { url: string; init: RequestInit }[] = [];
  const fn = jest.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = String(input);
    calls.push({ url, init });
    const { status, body } = handler(url, init);
    return {
      ok: status >= 200 && status < 300,
      status,
      text: async () => (body === undefined ? '' : JSON.stringify(body)),
    } as Response;
  });
  globalThis.fetch = fn as unknown as typeof fetch;
  return { fn, calls };
}

export function jsonBody(init: RequestInit): Record<string, unknown> {
  return JSON.parse(String(init.body ?? '{}')) as Record<string, unknown>;
}
