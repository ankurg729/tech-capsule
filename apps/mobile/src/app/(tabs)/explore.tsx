import type { ContentLanguage, Difficulty, Technology } from '@techcapsule/contracts';
import { useState } from 'react';
import { View } from 'react-native';
import { LessonCard } from '@/components/content/LessonCard';
import { PathCard } from '@/components/content/PathCard';
import { DIFFICULTY_OPTIONS, LANGUAGE_OPTIONS, TECHNOLOGY_OPTIONS } from '@/components/filters';
import { InfiniteList } from '@/components/InfiniteList';
import { ChipFilter, Input, Screen, SegmentedControl, Text } from '@/components/ui';
import { useDebouncedValue } from '@/lib/hooks';
import { plural } from '@/lib/format';
import { useLessons, usePaths } from '@/queries/learning';
import { useTheme } from '@/theme/ThemeProvider';

type Mode = 'lessons' | 'paths';

export default function ExploreScreen() {
  const theme = useTheme();
  const [mode, setMode] = useState<Mode>('lessons');
  const [query, setQuery] = useState('');
  const [technology, setTechnology] = useState<Technology>();
  const [difficulty, setDifficulty] = useState<Difficulty>();
  const [language, setLanguage] = useState<ContentLanguage>();
  const [sort, setSort] = useState<'newest' | 'top-rated'>('newest');
  const q = useDebouncedValue(query.trim());

  const lessons = useLessons({ technology, difficulty, language, sort, q: q || undefined });
  const paths = usePaths({ technology, difficulty });
  const active = mode === 'lessons' ? lessons : paths;
  const hasFilters = !!(technology || difficulty || language || q);

  return (
    <Screen testID="explore-screen">
      <View style={{ gap: theme.spacing.md, paddingTop: theme.spacing.sm }}>
        <View style={{ paddingHorizontal: theme.spacing.lg, gap: theme.spacing.md }}>
          <Text variant="display">Explore</Text>
          <SegmentedControl
            value={mode}
            onChange={setMode}
            options={[
              { value: 'lessons', label: 'Lessons' },
              { value: 'paths', label: 'Learning paths' },
            ]}
          />
          {mode === 'lessons' ? (
            <Input
              icon="search"
              placeholder="Search lessons"
              value={query}
              onChangeText={setQuery}
              returnKeyType="search"
              autoCorrect={false}
              clearButtonMode="while-editing"
              accessibilityLabel="Search lessons"
              testID="explore-search"
            />
          ) : null}
        </View>
        <ChipFilter options={TECHNOLOGY_OPTIONS} value={technology} onChange={setTechnology} />
        <ChipFilter
          options={DIFFICULTY_OPTIONS}
          value={difficulty}
          onChange={setDifficulty}
          allLabel="Any level"
        />
        {mode === 'lessons' ? (
          <ChipFilter
            options={LANGUAGE_OPTIONS}
            value={language}
            onChange={setLanguage}
            allLabel="Any language"
          />
        ) : null}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: theme.spacing.lg,
          }}
        >
          <Text variant="caption" tone="subtle">
            {active.isPending
              ? 'Loading…'
              : plural(active.total, mode === 'lessons' ? 'lesson' : 'path')}
          </Text>
          {mode === 'lessons' ? (
            <Text
              variant="caption"
              tone="primary"
              weight="700"
              onPress={() => setSort((s) => (s === 'newest' ? 'top-rated' : 'newest'))}
              accessibilityRole="button"
              accessibilityLabel={`Sort: ${sort === 'newest' ? 'newest first' : 'top rated'}`}
            >
              {sort === 'newest' ? 'Newest first ⇅' : 'Top rated ⇅'}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={{ flex: 1 }}>
        {mode === 'lessons' ? (
          <InfiniteList
            source={lessons}
            keyExtractor={(l) => l.id}
            renderItem={(l) => <LessonCard lesson={l} />}
            empty={{
              title: hasFilters ? 'No matching lessons' : 'No lessons yet',
              message: hasFilters ? 'Try removing a filter or a different search.' : undefined,
            }}
            testID="lesson-list"
          />
        ) : (
          <InfiniteList
            source={paths}
            keyExtractor={(p) => p.id}
            renderItem={(p) => <PathCard path={p} />}
            empty={{
              title: hasFilters ? 'No matching paths' : 'No learning paths yet',
              message: hasFilters ? 'Try a different technology or level.' : undefined,
            }}
          />
        )}
      </View>
    </Screen>
  );
}
