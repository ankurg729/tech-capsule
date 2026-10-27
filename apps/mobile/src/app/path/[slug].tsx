import type { PathLessonDTO } from '@techcapsule/contracts';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { View } from 'react-native';
import { TechIcon } from '@/components/content/TechIcon';
import {
  Badge,
  Button,
  Card,
  ErrorState,
  Icon,
  ProgressBar,
  Screen,
  ScreenHeader,
  SkeletonList,
  Text,
} from '@/components/ui';
import { difficultyLabel, formatMinutes, plural, technologyLabel } from '@/lib/format';
import { usePath } from '@/queries/learning';
import { makeStyles, useTheme } from '@/theme/ThemeProvider';

export default function PathScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const theme = useTheme();
  const router = useRouter();
  const path = usePath(slug);

  if (path.isPending) {
    return (
      <Screen header={<ScreenHeader title="Learning path" />} scroll>
        <SkeletonList count={4} />
      </Screen>
    );
  }
  if (path.isError) {
    return (
      <Screen header={<ScreenHeader title="Learning path" />}>
        <ErrorState error={path.error} onRetry={() => void path.refetch()} />
      </Screen>
    );
  }

  const p = path.data;
  const progress = p.viewerProgress;
  const started =
    (progress?.completedCount ?? 0) > 0 || p.lessons.some((l) => l.completionPercent > 0);
  const openLesson = (lessonSlug: string) =>
    router.push({ pathname: '/lesson/[slug]', params: { slug: lessonSlug } });

  return (
    <Screen
      header={<ScreenHeader title="Learning path" />}
      scroll
      refreshing={path.isRefetching}
      onRefresh={() => void path.refetch()}
    >
      <Card variant="raised" style={{ gap: theme.spacing.md }}>
        <View style={{ flexDirection: 'row', gap: theme.spacing.md, alignItems: 'center' }}>
          <TechIcon technology={p.technology} size={52} />
          <View style={{ flex: 1, gap: 6 }}>
            <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
              <Badge label={technologyLabel(p.technology)} tone="primary" />
              <Badge label={difficultyLabel(p.difficulty)} />
            </View>
            <Text variant="caption" tone="subtle">
              {plural(p.lessonCount, 'lesson')} · {formatMinutes(p.estimatedMinutes)}
            </Text>
          </View>
        </View>
        <Text variant="title" accessibilityRole="header">
          {p.title}
        </Text>
        <Text variant="body" tone="muted">
          {p.description}
        </Text>
        {progress ? (
          <View style={{ gap: 6 }}>
            <ProgressBar value={progress.percent / 100} accessibilityLabel="Path progress" />
            <Text variant="caption" tone="subtle">
              {progress.completedCount} of {p.lessonCount} lessons complete
            </Text>
          </View>
        ) : null}
        {p.resumeLessonSlug ? (
          <Button
            label={started ? 'Continue path' : 'Start path'}
            icon="play"
            fullWidth
            onPress={() => openLesson(p.resumeLessonSlug!)}
            testID="path-resume"
          />
        ) : p.lessons.length > 0 ? (
          <Badge label="Path complete" tone="success" icon="trophy-outline" />
        ) : null}
      </Card>

      <Text variant="heading">Lessons</Text>
      {p.lessons.map((lesson, i) => (
        <PathLessonRow
          key={lesson.id}
          lesson={lesson}
          last={i === p.lessons.length - 1}
          onPress={() => openLesson(lesson.slug)}
        />
      ))}
    </Screen>
  );
}

function PathLessonRow({
  lesson,
  last,
  onPress,
}: {
  lesson: PathLessonDTO;
  last: boolean;
  onPress: () => void;
}) {
  const styles = useStyles();
  const theme = useTheme();
  return (
    <View style={styles.row}>
      <View style={styles.rail}>
        <View
          style={[
            styles.step,
            lesson.completed && {
              backgroundColor: theme.colors.success,
              borderColor: theme.colors.success,
            },
          ]}
        >
          {lesson.completed ? (
            <Icon name="checkmark" size={14} color={theme.colors.onPrimary} />
          ) : (
            <Text variant="caption" weight="800">
              {lesson.position + 1}
            </Text>
          )}
        </View>
        {!last ? <View style={styles.line} /> : null}
      </View>
      <Card
        onPress={onPress}
        style={{ flex: 1, marginBottom: theme.spacing.md }}
        accessibilityLabel={lesson.title}
      >
        <Text variant="subheading" numberOfLines={2}>
          {lesson.title}
        </Text>
        <Text variant="caption" tone="subtle" style={{ marginTop: 4 }}>
          {lesson.estimatedMinutes} min · {difficultyLabel(lesson.difficulty)}
          {lesson.language === 'hinglish' ? ' · Hinglish' : ''}
        </Text>
        {!lesson.completed && lesson.completionPercent > 0 ? (
          <View style={{ marginTop: theme.spacing.sm }}>
            <ProgressBar value={lesson.completionPercent / 100} height={4} />
          </View>
        ) : null}
      </Card>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  row: { flexDirection: 'row', gap: t.spacing.md },
  rail: { alignItems: 'center', width: 28 },
  step: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: t.colors.borderStrong,
    backgroundColor: t.colors.surface,
    marginTop: t.spacing.lg,
  },
  line: { flex: 1, width: 2, backgroundColor: t.colors.border, marginTop: 4 },
}));
