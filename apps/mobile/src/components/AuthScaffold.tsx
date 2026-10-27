import type { ReactNode } from 'react';
import { View } from 'react-native';
import { Logo } from '@/components/brand/Logo';
import { Screen, ScreenHeader, Text } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';

export function AuthScaffold({
  title,
  subtitle,
  children,
  footer,
  back = false,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  back?: boolean;
}) {
  const theme = useTheme();
  return (
    <Screen
      scroll
      keyboard
      header={back ? <ScreenHeader /> : undefined}
      contentStyle={{
        paddingTop: back ? theme.spacing.md : theme.spacing.huge,
        gap: theme.spacing.xl,
      }}
    >
      <Logo />
      <View style={{ gap: theme.spacing.xs }}>
        <Text variant="display">{title}</Text>
        {subtitle ? (
          <Text variant="body" tone="muted">
            {subtitle}
          </Text>
        ) : null}
      </View>
      <View style={{ gap: theme.spacing.lg }}>{children}</View>
      {footer ? (
        <View style={{ alignItems: 'center', gap: theme.spacing.md }}>{footer}</View>
      ) : null}
    </Screen>
  );
}
