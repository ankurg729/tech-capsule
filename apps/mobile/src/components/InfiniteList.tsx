import type { ReactElement } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, View } from 'react-native';
import { EmptyState, ErrorState, SkeletonList } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';

interface InfiniteSource<T> {
  items: T[];
  isPending: boolean;
  isError: boolean;
  error: unknown;
  isRefetching: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  refetch: () => unknown;
  fetchNextPage: () => unknown;
}

export function InfiniteList<T>({
  source,
  renderItem,
  keyExtractor,
  header,
  empty,
  skeletonHeight = 110,
  testID,
}: {
  source: InfiniteSource<T>;
  renderItem: (item: T) => ReactElement;
  keyExtractor: (item: T) => string;
  header?: ReactElement;
  empty: { title: string; message?: string; action?: { label: string; onPress: () => void } };
  skeletonHeight?: number;
  testID?: string;
}) {
  const theme = useTheme();
  const pad = theme.spacing.lg;

  return (
    <FlatList
      testID={testID}
      data={source.isPending || source.isError ? [] : source.items}
      keyExtractor={keyExtractor}
      renderItem={({ item }) => renderItem(item)}
      ListHeaderComponent={header}
      ListEmptyComponent={
        source.isPending ? (
          <SkeletonList count={4} height={skeletonHeight} />
        ) : source.isError ? (
          <ErrorState error={source.error} onRetry={() => void source.refetch()} />
        ) : (
          <EmptyState title={empty.title} message={empty.message} action={empty.action} />
        )
      }
      ListFooterComponent={
        source.isFetchingNextPage ? (
          <View style={{ paddingVertical: theme.spacing.lg }}>
            <ActivityIndicator color={theme.colors.primary} />
          </View>
        ) : undefined
      }
      contentContainerStyle={{
        padding: pad,
        paddingBottom: theme.spacing.huge,
        gap: theme.spacing.md,
      }}
      onEndReachedThreshold={0.4}
      onEndReached={() => {
        if (source.hasNextPage && !source.isFetchingNextPage) void source.fetchNextPage();
      }}
      refreshControl={
        <RefreshControl
          refreshing={source.isRefetching && !source.isFetchingNextPage}
          onRefresh={() => void source.refetch()}
          tintColor={theme.colors.primary}
          colors={[theme.colors.primary]}
        />
      }
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
    />
  );
}
