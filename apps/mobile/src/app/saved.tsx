import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { LessonCard } from '@/components/content/LessonCard';
import { NewsCard } from '@/components/content/NewsCard';
import { InfiniteList } from '@/components/InfiniteList';
import { Screen, ScreenHeader, SegmentedControl } from '@/components/ui';
import { useSavedLessons } from '@/queries/learning';
import { useSavedNews } from '@/queries/news';
import { useTheme } from '@/theme/ThemeProvider';

export default function SavedScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [tab, setTab] = useState<'lessons' | 'news'>('lessons');
  const lessons = useSavedLessons();
  const news = useSavedNews();

  return (
    <Screen header={<ScreenHeader title="Saved" />}>
      <View style={{ paddingHorizontal: theme.spacing.lg }}>
        <SegmentedControl
          value={tab}
          onChange={setTab}
          options={[
            { value: 'lessons', label: 'Lessons' },
            { value: 'news', label: 'News' },
          ]}
        />
      </View>
      <View style={{ flex: 1 }}>
        {tab === 'lessons' ? (
          <InfiniteList
            source={lessons}
            keyExtractor={(l) => l.id}
            renderItem={(l) => <LessonCard lesson={l} />}
            empty={{
              title: 'No saved lessons',
              message: 'Tap the bookmark on any lesson to keep it here.',
              action: { label: 'Explore lessons', onPress: () => router.push('/explore') },
            }}
          />
        ) : (
          <InfiniteList
            source={news}
            keyExtractor={(a) => a.id}
            renderItem={(a) => <NewsCard article={a} />}
            skeletonHeight={160}
            empty={{ title: 'No saved articles', message: 'Save news stories to read them later.' }}
          />
        )}
      </View>
    </Screen>
  );
}
