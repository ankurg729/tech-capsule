import type { LearningStatsDTO } from '@techcapsule/contracts';
import { View } from 'react-native';
import { Card, Icon, ProgressBar, Text } from '@/components/ui';
import { plural, weekdayInitial } from '@/lib/format';
import { makeStyles, useTheme } from '@/theme/ThemeProvider';

export function StatsCard({ stats }: { stats: LearningStatsDTO }) {
  const theme = useTheme();
  const styles = useStyles();
  const goalProgress = stats.dailyGoalMinutes > 0 ? stats.todayMinutes / stats.dailyGoalMinutes : 0;
  const maxMinutes = Math.max(stats.dailyGoalMinutes, ...stats.week.map((d) => d.minutes), 1);
  const goalMet = stats.todayMinutes >= stats.dailyGoalMinutes;

  return (
    <Card testID="stats-card">
      <View style={styles.top}>
        <View style={styles.streak}>
          <View style={styles.flame}>
            <Icon
              name="flame"
              size={22}
              color={stats.currentStreak > 0 ? theme.colors.warning : theme.colors.textSubtle}
            />
          </View>
          <View>
            <Text variant="title" testID="streak-count">
              {stats.currentStreak}
            </Text>
            <Text variant="caption" tone="subtle">
              day streak
            </Text>
          </View>
        </View>
        <View style={{ flex: 1, gap: 6 }}>
          <View style={styles.goalRow}>
            <Text variant="bodySmall" weight="600">
              Today
            </Text>
            <Text variant="caption" tone={goalMet ? 'success' : 'subtle'}>
              {stats.todayMinutes}/{stats.dailyGoalMinutes} min{goalMet ? ' · goal met' : ''}
            </Text>
          </View>
          <ProgressBar
            value={goalProgress}
            tone={goalMet ? 'success' : 'accent'}
            accessibilityLabel="Daily goal progress"
          />
          <Text variant="caption" tone="subtle">
            {plural(stats.totalLessonsCompleted, 'lesson')} completed · best streak{' '}
            {stats.longestStreak}
          </Text>
        </View>
      </View>

      <View style={styles.week} accessibilityLabel="Activity over the last 7 days">
        {stats.week.map((day, i) => {
          const isToday = i === stats.week.length - 1;
          const height = day.minutes > 0 ? 8 + (day.minutes / maxMinutes) * 36 : 4;
          return (
            <View key={day.date} style={styles.day}>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.bar,
                    {
                      height,
                      backgroundColor: day.active
                        ? theme.colors.primary
                        : theme.colors.surfaceRaised,
                    },
                  ]}
                />
              </View>
              <Text
                variant="caption"
                tone={isToday ? 'primary' : 'subtle'}
                weight={isToday ? '800' : '500'}
              >
                {weekdayInitial(day.date)}
              </Text>
            </View>
          );
        })}
      </View>
    </Card>
  );
}

const useStyles = makeStyles((t) => ({
  top: { flexDirection: 'row', gap: t.spacing.lg, alignItems: 'center' },
  streak: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm },
  flame: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.warningMuted,
  },
  goalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  week: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: t.spacing.lg,
    paddingTop: t.spacing.md,
    borderTopWidth: 1,
    borderTopColor: t.colors.border,
  },
  day: { alignItems: 'center', gap: 6, flex: 1 },
  barTrack: { height: 44, justifyContent: 'flex-end' },
  bar: { width: 14, borderRadius: 7 },
}));
