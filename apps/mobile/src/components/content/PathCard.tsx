import type { PathSummaryDTO } from '@techcapsule/contracts';
import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { Badge, Card, Icon, ProgressBar, Text } from '@/components/ui';
import { difficultyLabel, formatMinutes, plural, technologyLabel } from '@/lib/format';
import { makeStyles } from '@/theme/ThemeProvider';
import { TechIcon } from './TechIcon';

export function PathCard({
  path,
  variant = 'row',
}: {
  path: PathSummaryDTO;
  variant?: 'row' | 'compact';
}) {
  const router = useRouter();
  const styles = useStyles();
  const progress = path.viewerProgress;

  return (
    <Card
      variant="raised"
      onPress={() => router.push({ pathname: '/path/[slug]', params: { slug: path.slug } })}
      style={variant === 'compact' ? styles.compact : undefined}
      accessibilityLabel={`${path.title} learning path`}
      testID={`path-card-${path.slug}`}
    >
      <View style={styles.header}>
        <TechIcon technology={path.technology} size={44} />
        <View style={{ flex: 1, gap: 4 }}>
          <Text variant="overline" tone="primary">
            Learning path
          </Text>
          <Text variant="subheading" numberOfLines={2}>
            {path.title}
          </Text>
        </View>
      </View>
      <Text variant="bodySmall" tone="muted" numberOfLines={2}>
        {path.description}
      </Text>
      <View style={styles.meta}>
        <Badge label={technologyLabel(path.technology)} />
        <Badge label={difficultyLabel(path.difficulty)} />
        <View style={styles.metaItem}>
          <Icon name="layers-outline" size={13} tone="subtle" />
          <Text variant="caption" tone="subtle">
            {plural(path.lessonCount, 'lesson')} · {formatMinutes(path.estimatedMinutes)}
          </Text>
        </View>
      </View>
      {progress && progress.completedCount > 0 ? (
        <View style={styles.progress}>
          <ProgressBar value={progress.percent / 100} />
          <Text variant="caption" tone="subtle">
            {progress.completedCount}/{path.lessonCount} lessons · {progress.percent}%
          </Text>
        </View>
      ) : null}
    </Card>
  );
}

const useStyles = makeStyles((t) => ({
  compact: { width: 290 },
  header: {
    flexDirection: 'row',
    gap: t.spacing.md,
    alignItems: 'center',
    marginBottom: t.spacing.sm,
  },
  meta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: t.spacing.sm,
    marginTop: t.spacing.md,
  },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  progress: { marginTop: t.spacing.md, gap: t.spacing.xs },
}));
