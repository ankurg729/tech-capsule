import { LinearGradient } from 'expo-linear-gradient';
import { View } from 'react-native';
import { Icon, Text } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';

export function LogoMark({ size = 40 }: { size?: number }) {
  const theme = useTheme();
  return (
    <LinearGradient
      colors={theme.colors.gradientAccent}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.32,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon name="flash" size={size * 0.52} color="#FFFFFF" />
    </LinearGradient>
  );
}

export function Logo({ size = 36 }: { size?: number }) {
  return (
    <View
      style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
      accessibilityRole="header"
      accessibilityLabel="TechCapsule.dev"
    >
      <LogoMark size={size} />
      <Text variant="heading" weight="800">
        TechCapsule
        <Text variant="heading" weight="800" tone="primary">
          .dev
        </Text>
      </Text>
    </View>
  );
}
