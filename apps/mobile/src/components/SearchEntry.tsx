import { useRouter } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';
import { Icon, Text } from '@/components/ui';
import { makeStyles } from '@/theme/ThemeProvider';

export function SearchEntry({ placeholder = 'Search lessons, paths, questions' }) {
  const router = useRouter();
  const styles = useStyles();
  return (
    <Pressable
      onPress={() => router.push('/search')}
      accessibilityRole="search"
      accessibilityLabel="Search"
      style={({ pressed }) => [styles.bar, pressed && { opacity: 0.85 }]}
      testID="search-entry"
    >
      <Icon name="search" size={18} tone="subtle" />
      <Text variant="body" tone="subtle" numberOfLines={1}>
        {placeholder}
      </Text>
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.sm,
    height: 48,
    paddingHorizontal: t.spacing.lg,
    borderRadius: t.radius.pill,
    backgroundColor: t.colors.surface,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: t.colors.border,
  },
}));
