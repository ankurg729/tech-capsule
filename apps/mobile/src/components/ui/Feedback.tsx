import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, type ReactNode } from 'react';
import { ActivityIndicator, Animated, StyleSheet, View, type DimensionValue } from 'react-native';
import { errorMessage, ApiError } from '@/lib/api/http';
import { makeStyles, useTheme } from '@/theme/ThemeProvider';
import { Button } from './Button';
import { Icon, Text, type IconName } from './Text';

export function ProgressBar({
  value,
  height = 6,
  tone = 'accent',
  accessibilityLabel,
}: {
  /** 0..1 */
  value: number;
  height?: number;
  tone?: 'accent' | 'success';
  accessibilityLabel?: string;
}) {
  const theme = useTheme();
  const clamped = Math.max(0, Math.min(1, value));
  const width = useRef(new Animated.Value(clamped)).current;
  useEffect(() => {
    Animated.timing(width, { toValue: clamped, duration: 450, useNativeDriver: false }).start();
  }, [clamped, width]);

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
      style={{
        height,
        borderRadius: height,
        backgroundColor: theme.colors.surfaceRaised,
        overflow: 'hidden',
      }}
    >
      <Animated.View
        style={{
          height,
          borderRadius: height,
          overflow: 'hidden',
          width: width.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
        }}
      >
        <LinearGradient
          colors={
            tone === 'success'
              ? [theme.colors.success, theme.colors.success]
              : theme.colors.gradientAccent
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
}

export function Skeleton({
  width = '100%',
  height = 16,
  radius = 8,
}: {
  width?: DimensionValue;
  height?: DimensionValue;
  radius?: number;
}) {
  const theme = useTheme();
  const opacity = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width,
        height,
        borderRadius: radius,
        backgroundColor: theme.colors.skeleton,
        opacity,
      }}
    />
  );
}

/** Generic card-shaped placeholders used while lists load. */
export function SkeletonList({ count = 3, height = 96 }: { count?: number; height?: number }) {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.spacing.md }} accessibilityLabel="Loading">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} height={height} radius={theme.radius.lg} />
      ))}
    </View>
  );
}

export function EmptyState({
  icon = 'sparkles-outline',
  title,
  message,
  action,
}: {
  icon?: IconName;
  title: string;
  message?: string;
  action?: { label: string; onPress: () => void };
}) {
  const styles = useStyles();
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Icon name={icon} size={28} tone="primary" />
      </View>
      <Text variant="heading" align="center">
        {title}
      </Text>
      {message ? (
        <Text variant="bodySmall" tone="muted" align="center">
          {message}
        </Text>
      ) : null}
      {action ? (
        <Button label={action.label} onPress={action.onPress} size="sm" variant="secondary" />
      ) : null}
    </View>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const network = error instanceof ApiError && error.isNetwork;
  return (
    <EmptyState
      icon={network ? 'cloud-offline-outline' : 'alert-circle-outline'}
      title={network ? 'You seem to be offline' : 'Something went wrong'}
      message={errorMessage(error)}
      action={onRetry ? { label: 'Try again', onPress: onRetry } : undefined}
    />
  );
}

export type BannerTone = 'info' | 'success' | 'warning' | 'danger';

export function Banner({
  tone = 'info',
  title,
  message,
  action,
  testID,
}: {
  tone?: BannerTone;
  title?: string;
  message: ReactNode;
  action?: { label: string; onPress: () => void };
  testID?: string;
}) {
  const theme = useTheme();
  const styles = useStyles();
  const map = {
    info: {
      bg: theme.colors.secondaryMuted,
      fg: theme.colors.secondary,
      icon: 'information-circle',
    },
    success: { bg: theme.colors.successMuted, fg: theme.colors.success, icon: 'checkmark-circle' },
    warning: { bg: theme.colors.warningMuted, fg: theme.colors.warning, icon: 'warning' },
    danger: { bg: theme.colors.dangerMuted, fg: theme.colors.danger, icon: 'alert-circle' },
  } as const;
  const c = map[tone];
  return (
    <View
      style={[styles.banner, { backgroundColor: c.bg, borderColor: c.fg }]}
      accessibilityRole={tone === 'danger' ? 'alert' : undefined}
      testID={testID}
    >
      <Icon name={c.icon} size={18} color={c.fg} />
      <View style={{ flex: 1, gap: 2 }}>
        {title ? (
          <Text variant="bodySmall" weight="700" style={{ color: c.fg }}>
            {title}
          </Text>
        ) : null}
        {typeof message === 'string' ? <Text variant="bodySmall">{message}</Text> : message}
        {action ? (
          <Text
            variant="bodySmall"
            weight="700"
            style={{ color: c.fg, marginTop: 4 }}
            onPress={action.onPress}
            accessibilityRole="button"
          >
            {action.label} →
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export function LoadingView({ label }: { label?: string }) {
  const theme = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
      <ActivityIndicator color={theme.colors.primary} />
      {label ? (
        <Text variant="bodySmall" tone="muted">
          {label}
        </Text>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  empty: {
    alignItems: 'center',
    gap: t.spacing.sm,
    paddingVertical: t.spacing.xxxl,
    paddingHorizontal: t.spacing.xl,
  },
  emptyIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.primaryMuted,
    marginBottom: t.spacing.sm,
  },
  banner: {
    flexDirection: 'row',
    gap: t.spacing.sm,
    padding: t.spacing.md,
    borderRadius: t.radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
}));
