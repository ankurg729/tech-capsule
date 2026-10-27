import type { LessonSummaryDTO } from '@techcapsule/contracts';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { TechIcon } from '@/components/content/TechIcon';
import { Badge, Icon, PressableScale, Text } from '@/components/ui';
import { difficultyLabel, technologyLabel } from '@/lib/format';
import { makeStyles, useTheme } from '@/theme/ThemeProvider';

export function DailyCapsuleCard({ lesson }: { lesson: LessonSummaryDTO }) {
  const theme = useTheme();
  const styles = useStyles();
  const router = useRouter();
  return (
    <PressableScale
      onPress={() => router.push({ pathname: '/lesson/[slug]', params: { slug: lesson.slug } })}
      accessibilityRole="button"
      accessibilityLabel={`Today's capsule: ${lesson.title}`}
      style={styles.wrapper}
      testID="daily-capsule"
    >
      <LinearGradient
        colors={theme.colors.gradientHero}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <View style={styles.glow} />
        <View style={styles.header}>
          <View style={styles.label}>
            <Icon name="sparkles" size={14} color="#E9DDFF" />
            <Text variant="overline" style={{ color: '#E9DDFF' }}>
              Today&apos;s capsule
            </Text>
          </View>
          <TechIcon technology={lesson.technology} size={36} />
        </View>
        <Text variant="title" style={{ color: '#FFFFFF' }} numberOfLines={2}>
          {lesson.title}
        </Text>
        <Text variant="bodySmall" style={{ color: 'rgba(255,255,255,0.78)' }} numberOfLines={2}>
          {lesson.summary}
        </Text>
        <View style={styles.footer}>
          <View style={styles.badges}>
            <Badge label={technologyLabel(lesson.technology)} tone="primary" />
            <Badge label={`${lesson.estimatedMinutes} min`} icon="time-outline" />
            <Badge label={difficultyLabel(lesson.difficulty)} />
          </View>
          <View style={styles.cta}>
            <Icon name="play" size={18} color={theme.colors.primary} />
          </View>
        </View>
      </LinearGradient>
    </PressableScale>
  );
}

const useStyles = makeStyles((t) => ({
  wrapper: { borderRadius: t.radius.xl, overflow: 'hidden' },
  card: { padding: t.spacing.xl, gap: t.spacing.sm, borderRadius: t.radius.xl },
  glow: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    right: -70,
    top: -90,
    backgroundColor: 'rgba(167, 139, 250, 0.28)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: t.spacing.xs,
  },
  label: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: t.spacing.sm,
  },
  badges: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', flex: 1 },
  cta: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
