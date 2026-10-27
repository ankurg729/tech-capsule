import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';
import { LessonCard } from '@/components/content/LessonCard';
import { PathCard } from '@/components/content/PathCard';
import { QuestionCard } from '@/components/content/QuestionCard';
import { HorizontalList } from '@/components/HorizontalList';
import { DailyCapsuleCard } from '@/components/learning/DailyCapsuleCard';
import { StatsCard } from '@/components/learning/StatsCard';
import { SearchEntry } from '@/components/SearchEntry';
import {
  Avatar,
  Banner,
  Card,
  EmptyState,
  ErrorState,
  Screen,
  SectionHeader,
  Skeleton,
  Text,
} from '@/components/ui';
import { useCurrentUser } from '@/lib/auth/session';
import { greeting } from '@/lib/format';
import { useHomeFeed } from '@/queries/learning';
import { useTheme } from '@/theme/ThemeProvider';

export default function HomeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const user = useCurrentUser();
  const home = useHomeFeed();
  const firstName = user.displayName.split(' ')[0] ?? user.displayName;

  return (
    <Screen
      scroll
      refreshing={home.isRefetching}
      onRefresh={() => void home.refetch()}
      testID="home-screen"
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
        <View style={{ flex: 1 }}>
          <Text variant="caption" tone="subtle">
            {greeting()}
          </Text>
          <Text variant="display" numberOfLines={1}>
            {firstName}
          </Text>
        </View>
        <Pressable
          onPress={() => router.push('/profile')}
          accessibilityRole="button"
          accessibilityLabel="Profile and preferences"
        >
          <Avatar name={user.displayName} size={44} />
        </Pressable>
      </View>

      <SearchEntry />

      {!user.emailVerified ? (
        <Banner
          tone="warning"
          title="Verify your email"
          message="Verified members can ask, answer and vote in the community."
          action={{ label: 'Enter code', onPress: () => router.push('/verify-email') }}
        />
      ) : null}

      {home.isPending ? (
        <HomeSkeleton />
      ) : home.isError ? (
        <ErrorState error={home.error} onRetry={() => void home.refetch()} />
      ) : (
        <>
          {home.data.stats ? <StatsCard stats={home.data.stats} /> : null}

          {home.data.dailyCapsule.lesson ? (
            <DailyCapsuleCard lesson={home.data.dailyCapsule.lesson} />
          ) : (
            <Card>
              <EmptyState
                icon="sparkles-outline"
                title="No capsule yet"
                message="Once lessons are published, a new capsule appears here every day."
              />
            </Card>
          )}

          {home.data.continueLearning.length > 0 ? (
            <View style={{ gap: theme.spacing.md }}>
              <SectionHeader
                title="Continue learning"
                action={{ label: 'See all', onPress: () => router.push('/learning') }}
              />
              <HorizontalList
                data={home.data.continueLearning}
                keyExtractor={(p) => p.lessonId}
                renderItem={(p) => (
                  <LessonCard lesson={p.lesson} variant="compact" progress={p.completionPercent} />
                )}
              />
            </View>
          ) : null}

          {home.data.recommendedPaths.length > 0 ? (
            <View style={{ gap: theme.spacing.md }}>
              <SectionHeader
                title="Recommended paths"
                subtitle="Structured tracks based on your interests"
                action={{ label: 'Explore', onPress: () => router.push('/explore') }}
              />
              <HorizontalList
                data={home.data.recommendedPaths}
                keyExtractor={(p) => p.id}
                renderItem={(p) => <PathCard path={p} variant="compact" />}
              />
            </View>
          ) : null}

          {home.data.trending.lessons.length > 0 ? (
            <View style={{ gap: theme.spacing.md }}>
              <SectionHeader
                title={
                  home.data.trending.basis === 'activity' ? 'Trending lessons' : 'Fresh lessons'
                }
                subtitle={
                  home.data.trending.basis === 'activity'
                    ? 'Most started by learners in the last 14 days'
                    : 'Newest published lessons'
                }
              />
              {home.data.trending.lessons.slice(0, 5).map((lesson) => (
                <LessonCard key={lesson.id} lesson={lesson} />
              ))}
            </View>
          ) : null}

          <View style={{ gap: theme.spacing.md }}>
            <SectionHeader
              title="Recent questions"
              action={{ label: 'Community', onPress: () => router.push('/community') }}
            />
            {home.data.recentQuestions.length > 0 ? (
              home.data.recentQuestions
                .slice(0, 3)
                .map((q) => <QuestionCard key={q.id} question={q} />)
            ) : (
              <Card>
                <EmptyState
                  icon="chatbubbles-outline"
                  title="No questions yet"
                  message="Be the first to ask the community."
                  action={{ label: 'Ask a question', onPress: () => router.push('/question/new') }}
                />
              </Card>
            )}
          </View>
        </>
      )}
    </Screen>
  );
}

function HomeSkeleton() {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.spacing.lg }} accessibilityLabel="Loading your feed">
      <Skeleton height={150} radius={theme.radius.lg} />
      <Skeleton height={190} radius={theme.radius.xl} />
      <Skeleton width={160} height={20} />
      <Skeleton height={120} radius={theme.radius.lg} />
      <Skeleton height={120} radius={theme.radius.lg} />
    </View>
  );
}
