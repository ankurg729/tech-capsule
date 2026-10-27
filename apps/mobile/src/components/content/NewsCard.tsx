import { NEWS_CATEGORY_LABELS, type NewsSummaryDTO } from '@techcapsule/contracts';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { Badge, Card, Icon, Text } from '@/components/ui';
import { formatRelative } from '@/lib/format';
import { makeStyles } from '@/theme/ThemeProvider';
import { NEWS_ICONS } from './visuals';

export function NewsCard({ article }: { article: NewsSummaryDTO }) {
  const router = useRouter();
  const styles = useStyles();
  return (
    <Card
      padded={false}
      onPress={() => router.push({ pathname: '/news/[slug]', params: { slug: article.slug } })}
      accessibilityLabel={`${article.isSample ? 'Sample article: ' : ''}${article.title}`}
      testID={`news-card-${article.slug}`}
    >
      {article.imageUrl ? (
        <Image
          source={{ uri: article.imageUrl }}
          style={styles.image}
          contentFit="cover"
          transition={200}
          accessible={false}
        />
      ) : null}
      <View style={styles.body}>
        <View style={styles.badges}>
          <Badge
            label={NEWS_CATEGORY_LABELS[article.category]}
            icon={NEWS_ICONS[article.category]}
            tone="secondary"
          />
          {article.isSample ? <Badge label="Sample" tone="warning" icon="flask-outline" /> : null}
        </View>
        <Text variant="subheading" numberOfLines={3}>
          {article.title}
        </Text>
        <Text variant="bodySmall" tone="muted" numberOfLines={2}>
          {article.summary}
        </Text>
        <View style={styles.source}>
          <Icon name="newspaper-outline" size={13} tone="subtle" />
          <Text variant="caption" tone="subtle" numberOfLines={1} style={{ flex: 1 }}>
            {article.sourceName}
            {article.publishedAt ? ` · ${formatRelative(article.publishedAt)}` : ''}
          </Text>
        </View>
      </View>
    </Card>
  );
}

const useStyles = makeStyles((t) => ({
  image: { width: '100%', aspectRatio: 16 / 8, backgroundColor: t.colors.surfaceRaised },
  body: { padding: t.spacing.lg, gap: t.spacing.sm },
  badges: { flexDirection: 'row', gap: t.spacing.xs, flexWrap: 'wrap' },
  source: { flexDirection: 'row', alignItems: 'center', gap: 6 },
}));
