import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import type { ThemeColors, TypographyVariant } from '@/theme/tokens';

export type TextTone =
  | 'default'
  | 'muted'
  | 'subtle'
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'onPrimary';

export function toneColor(colors: ThemeColors, tone: TextTone): string {
  switch (tone) {
    case 'muted':
      return colors.textMuted;
    case 'subtle':
      return colors.textSubtle;
    case 'primary':
      return colors.primary;
    case 'secondary':
      return colors.secondary;
    case 'success':
      return colors.success;
    case 'warning':
      return colors.warning;
    case 'danger':
      return colors.danger;
    case 'onPrimary':
      return colors.onPrimary;
    default:
      return colors.text;
  }
}

export interface TextProps extends RNTextProps {
  variant?: TypographyVariant;
  tone?: TextTone;
  weight?: TextStyle['fontWeight'];
  align?: TextStyle['textAlign'];
}

export function Text({
  variant = 'body',
  tone = 'default',
  weight,
  align,
  style,
  ...rest
}: TextProps) {
  const theme = useTheme();
  return (
    <RNText
      {...rest}
      style={[
        theme.typography[variant],
        { color: toneColor(theme.colors, tone) },
        weight ? { fontWeight: weight } : null,
        align ? { textAlign: align } : null,
        style,
      ]}
    />
  );
}

export type IconName = ComponentProps<typeof Ionicons>['name'];

export function Icon({
  name,
  size = 20,
  color,
  tone = 'default',
}: {
  name: IconName;
  size?: number;
  color?: string;
  tone?: TextTone;
}) {
  const theme = useTheme();
  return <Ionicons name={name} size={size} color={color ?? toneColor(theme.colors, tone)} />;
}
