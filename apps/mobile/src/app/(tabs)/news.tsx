import type { NewsCategory } from '@techcapsule/contracts';
import { useState } from 'react';
import { View } from 'react-native';
import { NewsCard } from '@/components/content/NewsCard';
import { NEWS_CATEGORY_OPTIONS } from '@/components/filters';
import { InfiniteList } from '@/components/InfiniteList';
import { ChipFilter, Screen, Text } from '@/components/ui';
import { useNewsFeed } from '@/queries/news';
import { useTheme } from '@/theme/ThemeProvider';

export default function NewsScreen() {
  const theme = useTheme();
  const [category, setCategory] = useState<NewsCategory>();
  const feed = useNewsFeed(category);

  return (
    <Screen testID="news-screen">
      <View style={{ gap: theme.spacing.md, paddingTop: theme.spacing.sm }}>
        <View style={{ paddingHorizontal: theme.spacing.lg }}>
          <Text variant="display">Tech News</Text>
          <Text variant="caption" tone="subtle">
            Curated by the TechCapsule team · every story links to its source
          </Text>
        </View>
        <ChipFilter options={NEWS_CATEGORY_OPTIONS} value={category} onChange={setCategory} />
      </View>
      <View style={{ flex: 1 }}>
        <InfiniteList
          source={feed}
          keyExtractor={(a) => a.id}
          renderItem={(a) => <NewsCard article={a} />}
          skeletonHeight={160}
          empty={{
            title: 'No stories here yet',
            message: category ? 'Try another category.' : 'Check back soon for curated updates.',
          }}
        />
      </View>
    </Screen>
  );
}
