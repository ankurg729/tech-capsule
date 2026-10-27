import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { makeStyles } from '@/theme/ThemeProvider';
import { PressableScale } from './PressableScale';

interface CardProps {
  children: ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  variant?: 'default' | 'raised' | 'outline';
  padded?: boolean;
  accessibilityLabel?: string;
  testID?: string;
}

export function Card({
  children,
  onPress,
  style,
  variant = 'default',
  padded = true,
  accessibilityLabel,
  testID,
}: CardProps) {
  const styles = useStyles();
  const composed = [
    styles.card,
    variant === 'raised' && styles.raised,
    variant === 'outline' && styles.outline,
    padded && styles.padded,
    style,
  ];
  if (!onPress) {
    return (
      <View style={composed} testID={testID}>
        {children}
      </View>
    );
  }
  return (
    <PressableScale
      onPress={onPress}
      style={composed}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      testID={testID}
    >
      {children}
    </PressableScale>
  );
}

const useStyles = makeStyles((t) => ({
  card: {
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.colors.border,
    overflow: 'hidden',
  },
  raised: { backgroundColor: t.colors.surfaceRaised },
  outline: { backgroundColor: 'transparent', borderColor: t.colors.borderStrong },
  padded: { padding: t.spacing.lg },
}));
