import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { LessonCard } from '@/components/content/LessonCard';
import { InfiniteList } from '@/components/InfiniteList';
import { StatsCard } from '@/components/learning/StatsCard';
import { Card, Icon, IconButton, SegmentedControl, Screen, Skeleton, Text } from '@/components/ui';
import { formatRelative } from '@/lib/format';
import { useProgressList, useStats } from '@/queries/learning';
import { useTheme } from '@/theme/ThemeProvider';

type Tab = 'in-progress' | 'completed';

export default function MyLearningScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('in-progress');
  const stats = useStats();
  const progress = useProgressList(tab);

  const header = (
    <View style={{ gap: theme.spacing.lg, marginBottom: theme.spacing.xs }}>
      {stats.data ? (
        <StatsCard stats={stats.data} />
      ) : stats.isPending ? (
        <Skeleton height={150} radius={theme.radius.lg} />
      ) : null}
      <Card onPress={() => router.push('/saved')} accessibilityLabel="Saved lessons and articles">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
          <Icon name="bookmark" size={20} tone="primary" />
          <View style={{ flex: 1 }}>
            <Text variant="subheading">Saved</Text>
            <Text variant="caption" tone="subtle">
              Lessons and news you bookmarked
            </Text>
          </View>
          <Icon name="chevron-forward" size={18} tone="subtle" />
        </View>
      </Card>
      <SegmentedControl
        value={tab}
        onChange={setTab}
        options={[
          { value: 'in-progress', label: 'In progress' },
          { value: 'completed', label: 'Completed' },
        ]}
      />
    </View>
  );

  return (
    <Screen testID="learning-screen">
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: theme.spacing.lg,
          paddingTop: theme.spacing.sm,
        }}
      >
        <Text variant="display" style={{ flex: 1 }}>
          My Learning
        </Text>
        <IconButton
          icon="settings-outline"
          accessibilityLabel="Settings"
          onPress={() => router.push('/settings')}
        />
      </View>
      <InfiniteList
        source={progress}
        header={header}
        keyExtractor={(p) => p.lessonId}
        renderItem={(p) => (
          <View style={{ gap: 4 }}>
            <LessonCard
              lesson={p.lesson}
              progress={tab === 'in-progress' ? p.completionPercent : undefined}
            />
            <Text variant="caption" tone="subtle" style={{ marginLeft: theme.spacing.xs }}>
              {p.completedAt
                ? `Completed ${formatRelative(p.completedAt)}`
                : `Last opened ${formatRelative(p.lastViewedAt)}`}
            </Text>
          </View>
        )}
        empty={
          tab === 'in-progress'
            ? {
                title: 'Nothing in progress',
                message:
                  'Start a lesson and it will show up here so you can pick up where you left off.',
                action: { label: 'Explore lessons', onPress: () => router.push('/explore') },
              }
            : { title: 'No completed lessons yet', message: 'Finish a lesson to see it here.' }
        }
      />
    </Screen>
  );
}
