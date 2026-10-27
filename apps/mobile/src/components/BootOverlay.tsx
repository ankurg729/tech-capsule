import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { LogoMark } from '@/components/brand/Logo';
import { Button, Text } from '@/components/ui';
import { API_URL } from '@/config';
import { session, type SessionStatus } from '@/lib/auth/session';
import { useTheme } from '@/theme/ThemeProvider';

/** Covers the navigator while the stored session is restored, or when the API can't be reached. */
export function BootOverlay({
  status,
}: {
  status: Extract<SessionStatus, 'loading' | 'unreachable'>;
}) {
  const theme = useTheme();
  return (
    <View
      style={[
        StyleSheet.absoluteFill,
        {
          backgroundColor: theme.colors.background,
          alignItems: 'center',
          justifyContent: 'center',
          padding: theme.spacing.xxl,
          gap: theme.spacing.lg,
        },
      ]}
      testID="boot-overlay"
    >
      <LogoMark size={64} />
      {status === 'loading' ? (
        <ActivityIndicator color={theme.colors.primary} />
      ) : (
        <>
          <Text variant="title" align="center">
            Can&apos;t reach TechCapsule
          </Text>
          <Text variant="bodySmall" tone="muted" align="center">
            Your session is saved. Check your connection and that the API is running at:
          </Text>
          <Text variant="caption" tone="secondary" align="center" selectable>
            {API_URL}
          </Text>
          <Button label="Try again" icon="refresh" onPress={() => void session.bootstrap()} />
          <Button
            label="Sign out"
            variant="ghost"
            size="sm"
            onPress={() => void session.signOut()}
          />
        </>
      )}
    </View>
  );
}
