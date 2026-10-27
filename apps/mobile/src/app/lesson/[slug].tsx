import type { LessonDetailDTO } from '@techcapsule/contracts';
import { useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import * as Linking from 'expo-linking';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import {
  AppState,
  ScrollView,
  Share,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { BlockRenderer } from '@/components/blocks/BlockRenderer';
import { LessonMeta } from '@/components/content/LessonCard';
import { TechIcon } from '@/components/content/TechIcon';
import {
  Badge,
  Banner,
  Button,
  Card,
  ErrorState,
  IconButton,
  ProgressBar,
  Screen,
  ScreenHeader,
  Skeleton,
  StarRating,
  Text,
} from '@/components/ui';
import { ApiError, errorMessage } from '@/lib/api/http';
import { difficultyLabel, formatDate, languageLabel, technologyLabel } from '@/lib/format';
import { computeReadingState, shouldSave, type BlockPosition } from '@/lib/readingProgress';
import {
  invalidateLearning,
  useAnswerQuiz,
  useCompleteLesson,
  useLesson,
  useLessonBookmark,
  useRateLesson,
  useSaveProgress,
} from '@/queries/learning';
import { useTheme } from '@/theme/ThemeProvider';

/** Time on screen after which reading counts as engaged even without scrolling. */
const ENGAGE_AFTER_MS = 8_000;

export default function LessonScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const lesson = useLesson(slug);
  const theme = useTheme();

  if (lesson.isPending) {
    return (
      <Screen header={<ScreenHeader />} scroll>
        <Skeleton width={120} height={22} />
        <Skeleton height={34} />
        <Skeleton height={60} />
        <Skeleton height={220} radius={theme.radius.lg} />
      </Screen>
    );
  }
  if (lesson.isError) {
    const missing = lesson.error instanceof ApiError && lesson.error.status === 404;
    return (
      <Screen header={<ScreenHeader />}>
        {missing ? (
          <ErrorState
            error={new ApiError(404, 'NOT_FOUND', 'This lesson is no longer available.')}
          />
        ) : (
          <ErrorState error={lesson.error} onRetry={() => void lesson.refetch()} />
        )}
      </Screen>
    );
  }
  return <LessonReader lesson={lesson.data} />;
}

function LessonReader({ lesson }: { lesson: LessonDetailDTO }) {
  const theme = useTheme();
  const client = useQueryClient();
  const ref = useMemo(() => ({ id: lesson.id, slug: lesson.slug }), [lesson.id, lesson.slug]);
  const saveProgress = useSaveProgress(ref);
  const complete = useCompleteLesson(ref);
  const rate = useRateLesson(ref);
  const bookmark = useLessonBookmark(ref);
  const answerQuiz = useAnswerQuiz(ref);

  const viewer = lesson.viewer;
  const completed = !!viewer?.progress?.completedAt;
  const resumeBlockId = !completed ? (viewer?.progress?.lastBlockId ?? null) : null;

  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const blocksOffset = useRef(0);
  const offsets = useRef(new Map<string, number>());
  const engaged = useRef(false);
  const saved = useRef({
    percent: viewer?.progress?.completionPercent ?? 0,
    sectionId: viewer?.progress?.lastBlockId ?? null,
  });
  const pending = useRef<{ percent: number; sectionId: string | null } | null>(null);
  const [percent, setPercent] = useState(viewer?.progress?.completionPercent ?? 0);
  const [showResume, setShowResume] = useState(!!resumeBlockId);
  const [actionError, setActionError] = useState<string | null>(null);

  // Latest mutation handles, readable from long-lived callbacks (unmount, AppState, quizzes).
  const latest = useRef({ saveProgress, answerQuiz });
  useEffect(() => {
    latest.current = { saveProgress, answerQuiz };
  });

  const flush = useCallback(() => {
    const next = pending.current;
    if (!next) return;
    pending.current = null;
    saved.current = next;
    latest.current.saveProgress.mutate({
      completionPercent: next.percent,
      lastBlockId: next.sectionId ?? undefined,
    });
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      engaged.current = true;
    }, ENGAGE_AFTER_MS);
    const sub = AppState.addEventListener('change', (s) => {
      if (s !== 'active') flush();
    });
    return () => {
      clearTimeout(timer);
      sub.remove();
      flush();
      invalidateLearning(client);
    };
  }, [flush, client]);

  const positions = useCallback((): BlockPosition[] => {
    return lesson.blocks
      .filter((b) => offsets.current.has(b.id))
      .map((b) => ({
        id: b.id,
        y: blocksOffset.current + (offsets.current.get(b.id) ?? 0),
        isHeading: b.type === 'heading',
      }));
  }, [lesson.blocks]);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!engaged.current || completed) return;
    const state = computeReadingState(
      positions(),
      e.nativeEvent.contentOffset.y,
      e.nativeEvent.layoutMeasurement.height,
    );
    const best = {
      percent: Math.max(state.percent, saved.current.percent),
      sectionId: state.sectionId,
    };
    if (best.percent > percent) setPercent(best.percent);
    if (shouldSave(saved.current, best)) {
      pending.current = best;
      flush();
    } else if (best.sectionId !== saved.current.sectionId || best.percent > saved.current.percent) {
      pending.current = best;
    }
  };

  const scrollToBlock = (id: string) => {
    const y = offsets.current.get(id);
    if (y === undefined) return;
    engaged.current = true;
    scrollRef.current?.scrollTo({ y: Math.max(0, blocksOffset.current + y - 16), animated: true });
    setShowResume(false);
  };

  const quizResults = useMemo(
    () => new Map((viewer?.answeredQuizzes ?? []).map((q) => [q.blockId, { correct: q.correct }])),
    [viewer?.answeredQuizzes],
  );

  const onQuizSubmit = useCallback(
    (blockId: string, selectedOptionIds: string[]) =>
      latest.current.answerQuiz.mutateAsync({ blockId, selectedOptionIds }),
    [],
  );

  const markComplete = async () => {
    setActionError(null);
    try {
      pending.current = null;
      await complete.mutateAsync();
      setPercent(100);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    } catch (err) {
      setActionError(errorMessage(err));
    }
  };

  const toggleBookmark = () => {
    Haptics.selectionAsync().catch(() => undefined);
    bookmark.mutate(!viewer?.bookmarked, { onError: (err) => setActionError(errorMessage(err)) });
  };

  const share = () => {
    const url = Linking.createURL(`/lesson/${lesson.slug}`);
    void Share.share({ title: lesson.title, message: `${lesson.title} — TechCapsule.dev\n${url}` });
  };

  const onRate = (stars: number) => {
    setActionError(null);
    rate.mutate(stars, { onError: (err) => setActionError(errorMessage(err)) });
  };

  return (
    <Screen
      header={
        <>
          <ScreenHeader
            title={technologyLabel(lesson.technology)}
            subtitle={`${lesson.estimatedMinutes} min · ${difficultyLabel(lesson.difficulty)}`}
            right={
              <>
                <IconButton
                  icon={viewer?.bookmarked ? 'bookmark' : 'bookmark-outline'}
                  accessibilityLabel={viewer?.bookmarked ? 'Remove from saved' : 'Save lesson'}
                  active={!!viewer?.bookmarked}
                  onPress={toggleBookmark}
                  disabled={bookmark.isPending}
                  testID="lesson-bookmark"
                />
                <IconButton
                  icon="share-outline"
                  accessibilityLabel="Share lesson"
                  onPress={share}
                />
              </>
            }
          />
          <View style={{ paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.xs }}>
            <ProgressBar value={percent / 100} height={3} accessibilityLabel="Reading progress" />
          </View>
        </>
      }
    >
      <ScrollView
        ref={scrollRef}
        onScroll={onScroll}
        onScrollBeginDrag={() => {
          engaged.current = true;
        }}
        scrollEventThrottle={120}
        contentContainerStyle={{
          padding: theme.spacing.lg,
          paddingBottom: theme.spacing.huge * 2,
          gap: theme.spacing.lg,
        }}
        testID="lesson-scroll"
      >
        <View style={{ gap: theme.spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
            <TechIcon technology={lesson.technology} size={48} />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, flex: 1 }}>
              <Badge label={technologyLabel(lesson.technology)} tone="primary" />
              <Badge label={languageLabel(lesson.language)} tone="secondary" />
              {lesson.tags.slice(0, 3).map((t) => (
                <Badge key={t} label={`#${t}`} />
              ))}
            </View>
          </View>
          <Text variant="display" accessibilityRole="header">
            {lesson.title}
          </Text>
          <Text variant="body" tone="muted">
            {lesson.summary}
          </Text>
          <LessonMeta lesson={lesson} />
        </View>

        {showResume && resumeBlockId ? (
          <Banner
            tone="info"
            title="Pick up where you left off"
            message={`You're ${viewer?.progress?.completionPercent ?? 0}% through this lesson.`}
            action={{ label: 'Resume', onPress: () => scrollToBlock(resumeBlockId) }}
            testID="resume-banner"
          />
        ) : null}

        <View
          style={{ gap: theme.spacing.lg }}
          onLayout={(e: LayoutChangeEvent) => {
            blocksOffset.current = e.nativeEvent.layout.y;
          }}
        >
          {lesson.blocks.map((block) => (
            <View
              key={block.id}
              onLayout={(e) => offsets.current.set(block.id, e.nativeEvent.layout.y)}
            >
              <BlockRenderer
                block={block}
                previousQuiz={quizResults.get(block.id)}
                onQuizSubmit={onQuizSubmit}
              />
            </View>
          ))}
        </View>

        <Card variant="raised" style={{ gap: theme.spacing.lg, marginTop: theme.spacing.lg }}>
          {actionError ? <Banner tone="danger" message={actionError} /> : null}
          {completed ? (
            <Banner
              tone="success"
              title="Lesson complete"
              message={`Completed on ${formatDate(viewer?.progress?.completedAt ?? new Date().toISOString())}.`}
              testID="lesson-completed"
            />
          ) : (
            <View style={{ gap: theme.spacing.sm }}>
              <Text variant="heading">Finished reading?</Text>
              <Text variant="bodySmall" tone="muted">
                Marking it complete updates your streak and learning path progress.
              </Text>
              <Button
                label="Mark as complete"
                icon="checkmark-done"
                onPress={markComplete}
                loading={complete.isPending}
                fullWidth
                testID="lesson-complete"
              />
            </View>
          )}
          <View style={{ gap: theme.spacing.sm, alignItems: 'center' }}>
            <Text variant="subheading">
              {viewer?.rating ? 'Your rating' : 'How useful was this lesson?'}
            </Text>
            <StarRating
              value={viewer?.rating ?? null}
              onChange={onRate}
              disabled={rate.isPending}
            />
            {viewer?.rating ? (
              <Text variant="caption" tone="subtle">
                Tap a star to change your rating
              </Text>
            ) : null}
          </View>
        </Card>
      </ScrollView>
    </Screen>
  );
}
