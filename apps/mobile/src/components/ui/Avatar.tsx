import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from './Text';

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? '?';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase();
}

export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const theme = useTheme();
  return (
    <LinearGradient
      colors={theme.colors.gradientAccent}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: 'center',
        justifyContent: 'center',
      }}
      accessibilityLabel={name}
    >
      <Text
        tone="onPrimary"
        weight="800"
        style={{ fontSize: size * 0.38, lineHeight: size * 0.46 }}
      >
        {initials(name)}
      </Text>
    </LinearGradient>
  );
}
