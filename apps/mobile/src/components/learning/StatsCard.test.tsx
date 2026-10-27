import type { LearningStatsDTO } from '@techcapsule/contracts';
import { screen } from '@testing-library/react-native';
import { renderWithProviders } from '../../../test/utils';
import { StatsCard } from './StatsCard';

const week = [
  '2026-03-04',
  '2026-03-05',
  '2026-03-06',
  '2026-03-07',
  '2026-03-08',
  '2026-03-09',
  '2026-03-10',
];

it('shows real streak, goal and weekly activity from the API', async () => {
  const stats: LearningStatsDTO = {
    currentStreak: 3,
    longestStreak: 5,
    todayMinutes: 4,
    dailyGoalMinutes: 10,
    totalLessonsCompleted: 2,
    week: week.map((date, i) => ({
      date,
      minutes: i > 3 ? 6 : 0,
      lessonsCompleted: 0,
      active: i > 3,
    })),
  };
  await renderWithProviders(<StatsCard stats={stats} />);
  expect(screen.getByTestId('streak-count')).toHaveTextContent('3');
  expect(screen.getByText('4/10 min')).toBeOnTheScreen();
  expect(screen.getByText(/2 lessons completed · best streak 5/)).toBeOnTheScreen();
});
