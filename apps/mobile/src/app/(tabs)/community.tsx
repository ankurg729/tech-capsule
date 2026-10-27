import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { QuestionCard } from '@/components/content/QuestionCard';
import { InfiniteList } from '@/components/InfiniteList';
import { Banner, Button, Chip, Input, Screen, SegmentedControl, Text } from '@/components/ui';
import { useCurrentUser } from '@/lib/auth/session';
import { useDebouncedValue } from '@/lib/hooks';
import { useQuestions, type QuestionFilters } from '@/queries/community';
import { useTheme } from '@/theme/ThemeProvider';

type Sort = NonNullable<QuestionFilters['sort']>;

export default function CommunityScreen() {
  const theme = useTheme();
  const router = useRouter();
  const user = useCurrentUser();
  const [sort, setSort] = useState<Sort>('newest');
  const [mine, setMine] = useState(false);
  const [query, setQuery] = useState('');
  const q = useDebouncedValue(query.trim());
  const questions = useQuestions({ sort, q: q || undefined, mine: mine || undefined });

  return (
    <Screen testID="community-screen">
      <View
        style={{
          paddingHorizontal: theme.spacing.lg,
          paddingTop: theme.spacing.sm,
          gap: theme.spacing.md,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <Text variant="display">Community</Text>
            <Text variant="caption" tone="subtle">
              Ask, answer and learn together
            </Text>
          </View>
          <Button
            label="Ask"
            icon="add"
            size="sm"
            onPress={() => router.push('/question/new')}
            testID="ask-question"
          />
        </View>
        {!user.emailVerified ? (
          <Banner
            tone="warning"
            message="Verify your email to ask, answer and vote."
            action={{ label: 'Verify now', onPress: () => router.push('/verify-email') }}
          />
        ) : null}
        <Input
          icon="search"
          placeholder="Search questions"
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
          accessibilityLabel="Search questions"
        />
        <SegmentedControl
          value={sort}
          onChange={setSort}
          options={[
            { value: 'newest', label: 'Newest' },
            { value: 'votes', label: 'Top voted' },
            { value: 'unanswered', label: 'Unanswered' },
          ]}
        />
        <View style={{ flexDirection: 'row' }}>
          <Chip
            label="My questions"
            icon="person-outline"
            selected={mine}
            onPress={() => setMine((m) => !m)}
          />
        </View>
      </View>
      <View style={{ flex: 1 }}>
        <InfiniteList
          source={questions}
          keyExtractor={(item) => item.id}
          renderItem={(item) => <QuestionCard question={item} />}
          empty={{
            title: mine ? "You haven't asked anything yet" : 'No questions found',
            message: q ? 'Try different keywords.' : 'Stuck on something? The community can help.',
            action: { label: 'Ask a question', onPress: () => router.push('/question/new') },
          }}
        />
      </View>
    </Screen>
  );
}
