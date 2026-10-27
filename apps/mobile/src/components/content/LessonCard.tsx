import type { LessonSummaryDTO } from '@techcapsule/contracts';
import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { Badge, Card, Icon, ProgressBar, Text } from '@/components/ui';
import { difficultyLabel, technologyLabel } from '@/lib/format';
import { makeStyles } from '@/theme/ThemeProvider';
import { TechIcon } from './TechIcon';

export function LessonMeta({ lesson }: { lesson: LessonSummaryDTO }) {
  const styles = useStyles();
  return (
    <View style={styles.meta}>
      <View style={styles.metaItem}>
        <Icon name="time-outline" size={13} tone="subtle" />
        <Text variant="caption" tone="subtle">
          {lesson.estimatedMinutes} min
        </Text>
      </View>
      <Text variant="caption" tone="subtle">
        {difficultyLabel(lesson.difficulty)}
      </Text>
      {lesson.ratingAvg !== null && lesson.ratingCount > 0 ? (
        <View style={styles.metaItem}>
          <Icon name="star" size={12} tone="warning" />
          <Text variant="caption" tone="subtle">
            {lesson.ratingAvg.toFixed(1)} ({lesson.ratingCount})
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export function LessonCard({
  lesson,
  variant = 'row',
  progress,
}: {
  lesson: LessonSummaryDTO;
  variant?: 'row' | 'compact';
  /** 0..100, shown as a bar for in-progress lessons. */
  progress?: number;
}) {
  const router = useRouter();
  const styles = useStyles();
  const open = () => router.push({ pathname: '/lesson/[slug]', params: { slug: lesson.slug } });

  return (
    <Card
      onPress={open}
      style={variant === 'compact' ? styles.compact : undefined}
      accessibilityLabel={`${lesson.title}, ${technologyLabel(lesson.technology)} lesson`}
      testID={`lesson-card-${lesson.slug}`}
    >
      <View style={styles.top}>
        <TechIcon technology={lesson.technology} size={variant === 'compact' ? 36 : 40} />
        <View style={styles.badges}>
          <Badge label={technologyLabel(lesson.technology)} tone="primary" />
          {lesson.language === 'hinglish' ? <Badge label="Hinglish" tone="secondary" /> : null}
        </View>
      </View>
      <Text variant="subheading" numberOfLines={2} style={styles.title}>
        {lesson.title}
      </Text>
      <Text variant="bodySmall" tone="muted" numberOfLines={2}>
        {lesson.summary}
      </Text>
      <LessonMeta lesson={lesson} />
      {progress !== undefined ? (
        <View style={styles.progress}>
          <ProgressBar value={progress / 100} accessibilityLabel={`${progress}% complete`} />
          <Text variant="caption" tone="subtle">
            {progress}% complete
          </Text>
        </View>
      ) : null}
    </Card>
  );
}

const useStyles = makeStyles((t) => ({
  compact: { width: 270 },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.md,
    marginBottom: t.spacing.md,
  },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.xs, flex: 1 },
  title: { marginBottom: t.spacing.xs },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.md,
    marginTop: t.spacing.md,
  },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  progress: { marginTop: t.spacing.md, gap: t.spacing.xs },
}));
