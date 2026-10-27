import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { makeStyles, useTheme } from '@/theme/ThemeProvider';
import { PressableScale } from './PressableScale';
import { Icon, Text, type IconName } from './Text';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  icon?: IconName;
  iconRight?: IconName;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  testID?: string;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
  accessibilityLabel,
  testID,
}: ButtonProps) {
  const theme = useTheme();
  const styles = useStyles();
  const inactive = disabled || loading;
  const fg =
    variant === 'primary'
      ? theme.colors.onPrimary
      : variant === 'danger'
        ? theme.colors.danger
        : variant === 'ghost'
          ? theme.colors.primary
          : theme.colors.text;
  const sizeStyle = size === 'sm' ? styles.sm : size === 'lg' ? styles.lg : styles.md;
  const iconSize = size === 'sm' ? 16 : 18;

  const content = (
    <View style={[styles.inner, sizeStyle]}>
      {loading ? (
        <ActivityIndicator color={fg} size="small" />
      ) : (
        <>
          {icon ? <Icon name={icon} size={iconSize} color={fg} /> : null}
          <Text
            variant={size === 'sm' ? 'bodySmall' : 'subheading'}
            weight="700"
            style={{ color: fg }}
            numberOfLines={1}
          >
            {label}
          </Text>
          {iconRight ? <Icon name={iconRight} size={iconSize} color={fg} /> : null}
        </>
      )}
    </View>
  );

  return (
    <PressableScale
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: inactive, busy: loading }}
      testID={testID}
      style={[
        styles.base,
        variant === 'secondary' && styles.secondary,
        variant === 'danger' && styles.danger,
        fullWidth && styles.fullWidth,
        style,
      ]}
    >
      {variant === 'primary' ? (
        <LinearGradient
          colors={theme.colors.gradientAccent}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      {content}
    </PressableScale>
  );
}

const useStyles = makeStyles((t) => ({
  base: { borderRadius: t.radius.md, overflow: 'hidden', alignSelf: 'flex-start' },
  fullWidth: { alignSelf: 'stretch' },
  secondary: {
    backgroundColor: t.colors.surfaceRaised,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.colors.borderStrong,
  },
  danger: { backgroundColor: t.colors.dangerMuted },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: t.spacing.sm,
  },
  sm: { paddingHorizontal: t.spacing.md, minHeight: 34 },
  md: { paddingHorizontal: t.spacing.lg, minHeight: 46 },
  lg: { paddingHorizontal: t.spacing.xl, minHeight: 52 },
}));

export function IconButton({
  icon,
  onPress,
  accessibilityLabel,
  active = false,
  size = 40,
  disabled,
  testID,
}: {
  icon: IconName;
  onPress?: () => void;
  accessibilityLabel: string;
  active?: boolean;
  size?: number;
  disabled?: boolean;
  testID?: string;
}) {
  const theme = useTheme();
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected: active, disabled }}
      hitSlop={6}
      testID={testID}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: active ? theme.colors.primaryMuted : theme.colors.surfaceRaised,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: active ? theme.colors.primary : theme.colors.border,
      }}
    >
      <Icon name={icon} size={size * 0.48} tone={active ? 'primary' : 'default'} />
    </PressableScale>
  );
}
