import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { LessonCard } from '@/components/content/LessonCard';
import { PathCard } from '@/components/content/PathCard';
import { QuestionCard } from '@/components/content/QuestionCard';
import {
  EmptyState,
  ErrorState,
  Input,
  Screen,
  ScreenHeader,
  SectionHeader,
  SegmentedControl,
} from '@/components/ui';
import { useDebouncedValue } from '@/lib/hooks';
import { useSearch } from '@/queries/learning';
import { useTheme } from '@/theme/ThemeProvider';

type Scope = 'all' | 'lessons' | 'paths' | 'questions';

export default function SearchScreen() {
  const theme = useTheme();
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<Scope>('all');
  const q = useDebouncedValue(query.trim(), 300);
  const search = useSearch(q, scope);
  const data = search.data;
  const total = data ? data.lessons.length + data.paths.length + data.questions.length : 0;

  return (
    <Screen scroll keyboard header={<ScreenHeader title="Search" />}>
      <Input
        icon="search"
        placeholder="MCP, RAG, Docker, React…"
        value={query}
        onChangeText={setQuery}
        autoFocus
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        accessibilityLabel="Search"
        testID="search-input"
      />
      <SegmentedControl
        value={scope}
        onChange={setScope}
        options={[
          { value: 'all', label: 'All' },
          { value: 'lessons', label: 'Lessons' },
          { value: 'paths', label: 'Paths' },
          { value: 'questions', label: 'Q&A' },
        ]}
      />

      {q.length < 2 ? (
        <EmptyState
          icon="search-outline"
          title="Search TechCapsule"
          message="Find lessons, learning paths and community questions. Type at least 2 characters."
        />
      ) : search.isPending ? (
        <ActivityIndicator color={theme.colors.primary} style={{ marginTop: theme.spacing.xl }} />
      ) : search.isError ? (
        <ErrorState error={search.error} onRetry={() => void search.refetch()} />
      ) : total === 0 ? (
        <EmptyState
          icon="file-tray-outline"
          title={`No results for “${q}”`}
          message="Try a broader term or a technology name."
        />
      ) : (
        <>
          {data && data.lessons.length > 0 ? (
            <View style={{ gap: theme.spacing.md }}>
              <SectionHeader title="Lessons" />
              {data.lessons.map((l) => (
                <LessonCard key={l.id} lesson={l} />
              ))}
            </View>
          ) : null}
          {data && data.paths.length > 0 ? (
            <View style={{ gap: theme.spacing.md }}>
              <SectionHeader title="Learning paths" />
              {data.paths.map((p) => (
                <PathCard key={p.id} path={p} />
              ))}
            </View>
          ) : null}
          {data && data.questions.length > 0 ? (
            <View style={{ gap: theme.spacing.md }}>
              <SectionHeader title="Questions" />
              {data.questions.map((qq) => (
                <QuestionCard key={qq.id} question={qq} />
              ))}
            </View>
          ) : null}
        </>
      )}
    </Screen>
  );
}
