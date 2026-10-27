import { NEWS_CATEGORY_LABELS } from '@techcapsule/contracts';
import { Image } from 'expo-image';
import * as Linking from 'expo-linking';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Share, View } from 'react-native';
import { NEWS_ICONS } from '@/components/content/visuals';
import {
  Badge,
  Banner,
  Button,
  ErrorState,
  IconButton,
  Screen,
  ScreenHeader,
  SkeletonList,
  Text,
} from '@/components/ui';
import { errorMessage } from '@/lib/api/http';
import { formatDate } from '@/lib/format';
import { useNewsArticle, useNewsBookmark } from '@/queries/news';
import { useTheme } from '@/theme/ThemeProvider';

export default function NewsArticleScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const article = useNewsArticle(slug);

  if (article.isPending) {
    return (
      <Screen header={<ScreenHeader />} scroll>
        <SkeletonList count={3} height={140} />
      </Screen>
    );
  }
  if (article.isError) {
    return (
      <Screen header={<ScreenHeader />}>
        <ErrorState error={article.error} onRetry={() => void article.refetch()} />
      </Screen>
    );
  }
  return <ArticleView article={article.data} />;
}

function ArticleView({
  article,
}: {
  article: NonNullable<ReturnType<typeof useNewsArticle>['data']>;
}) {
  const theme = useTheme();
  const bookmark = useNewsBookmark(article);
  const [error, setError] = useState<string | null>(null);
  const saved = !!article.viewer?.bookmarked;
  const paragraphs = article.body
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  const openSource = async () => {
    setError(null);
    try {
      await Linking.openURL(article.sourceUrl);
    } catch {
      setError("Couldn't open the source link on this device.");
    }
  };

  const share = () =>
    void Share.share({
      title: article.title,
      message: `${article.title}\nvia ${article.sourceName}: ${article.sourceUrl}`,
    });

  return (
    <Screen
      scroll
      header={
        <ScreenHeader
          title={NEWS_CATEGORY_LABELS[article.category]}
          right={
            <>
              <IconButton
                icon={saved ? 'bookmark' : 'bookmark-outline'}
                active={saved}
                accessibilityLabel={saved ? 'Remove from saved' : 'Save article'}
                onPress={() =>
                  bookmark.mutate(!saved, { onError: (err) => setError(errorMessage(err)) })
                }
                disabled={bookmark.isPending}
              />
              <IconButton icon="share-outline" accessibilityLabel="Share article" onPress={share} />
            </>
          }
        />
      }
    >
      <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
        <Badge
          label={NEWS_CATEGORY_LABELS[article.category]}
          icon={NEWS_ICONS[article.category]}
          tone="secondary"
        />
        {article.isSample ? <Badge label="Sample" tone="warning" icon="flask-outline" /> : null}
      </View>
      <Text variant="display" accessibilityRole="header">
        {article.title}
      </Text>
      <Text variant="caption" tone="subtle">
        Source: {article.sourceName}
        {article.publishedAt ? ` · Published ${formatDate(article.publishedAt)}` : ''}
      </Text>
      {article.isSample ? (
        <Banner
          tone="warning"
          title="Sample article"
          message="This is placeholder content that ships with the demo seed. It is not real news."
        />
      ) : null}
      {error ? <Banner tone="danger" message={error} /> : null}
      {article.imageUrl ? (
        <Image
          source={{ uri: article.imageUrl }}
          style={{ width: '100%', aspectRatio: 16 / 9, borderRadius: theme.radius.lg }}
          contentFit="cover"
          accessible={false}
        />
      ) : null}
      <Text variant="subheading" tone="muted">
        {article.summary}
      </Text>
      {paragraphs.map((p, i) => (
        <Text key={i} variant="body" tone="muted">
          {p}
        </Text>
      ))}
      <Button
        label={`Read on ${article.sourceName}`}
        icon="open-outline"
        variant="secondary"
        fullWidth
        onPress={openSource}
      />
    </Screen>
  );
}
