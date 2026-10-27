import type { ReactElement } from 'react';
import { FlatList } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';

/** Edge-to-edge horizontal carousel that cancels the parent screen padding. */
export function HorizontalList<T>({
  data,
  keyExtractor,
  renderItem,
}: {
  data: readonly T[];
  keyExtractor: (item: T) => string;
  renderItem: (item: T) => ReactElement;
}) {
  const theme = useTheme();
  return (
    <FlatList
      horizontal
      data={data}
      keyExtractor={keyExtractor}
      renderItem={({ item }) => renderItem(item)}
      showsHorizontalScrollIndicator={false}
      style={{ marginHorizontal: -theme.spacing.lg }}
      contentContainerStyle={{ paddingHorizontal: theme.spacing.lg, gap: theme.spacing.md }}
    />
  );
}
