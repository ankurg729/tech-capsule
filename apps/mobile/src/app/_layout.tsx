import { QueryClientProvider } from '@tanstack/react-query';
import {
  DarkTheme,
  DefaultTheme,
  Stack,
  ThemeProvider as NavigationThemeProvider,
} from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BootOverlay } from '@/components/BootOverlay';
import { session, useSession } from '@/lib/auth/session';
import { queryClient, subscribeAppFocus } from '@/queries/client';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <AppNavigator />
        </QueryClientProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function AppNavigator() {
  const theme = useTheme();
  const { status } = useSession();
  const signedIn = status === 'signedIn';

  useEffect(() => {
    void session.bootstrap();
    return subscribeAppFocus();
  }, []);

  useEffect(() => {
    if (status !== 'loading') SplashScreen.hideAsync().catch(() => undefined);
  }, [status]);

  const navigationTheme = useMemo(() => {
    const base = theme.scheme === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: theme.colors.primary,
        background: theme.colors.background,
        card: theme.colors.backgroundElevated,
        text: theme.colors.text,
        border: theme.colors.border,
      },
    };
  }, [theme]);

  return (
    <NavigationThemeProvider value={navigationTheme}>
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.background },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Protected guard={signedIn} redirectTo="/login">
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="lesson/[slug]" />
          <Stack.Screen name="path/[slug]" />
          <Stack.Screen name="question/new" options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="question/[id]" />
          <Stack.Screen name="news/[slug]" />
          <Stack.Screen name="saved" />
          <Stack.Screen name="profile" />
          <Stack.Screen name="search" options={{ animation: 'fade' }} />
          <Stack.Screen name="settings" />
        </Stack.Protected>
        <Stack.Protected guard={!signedIn} redirectTo="/">
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
        {/* Reachable signed in (after registering) or signed out (code from another device). */}
        <Stack.Screen name="verify-email" />
      </Stack>
      {status === 'loading' || status === 'unreachable' ? <BootOverlay status={status} /> : null}
    </NavigationThemeProvider>
  );
}
