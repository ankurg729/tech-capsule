import type { DayActivityDTO, LearningStatsDTO } from '@techcapsule/contracts';
import { Types } from 'mongoose';
import { addDays, dayKey } from '../../lib/dates.js';
import { User } from '../users/user.model.js';
import { ActivityDay } from './activityDay.model.js';
import { UserProgress } from './userProgress.model.js';

async function userTimezone(userId: Types.ObjectId): Promise<{ tz: string; goal: number }> {
  const user = await User.findById(userId).select('preferences').lean();
  return {
    tz: user?.preferences.timezone ?? 'UTC',
    goal: user?.preferences.dailyGoalMinutes ?? 10,
  };
}

export async function recordActivity(
  userId: Types.ObjectId,
  delta: { minutes?: number; lessonsCompleted?: number },
  now = new Date(),
): Promise<void> {
  const { tz } = await userTimezone(userId);
  await ActivityDay.updateOne(
    { userId, day: dayKey(now, tz) },
    {
      $inc: {
        minutes: Math.max(0, delta.minutes ?? 0),
        lessonsCompleted: delta.lessonsCompleted ?? 0,
        events: 1,
      },
    },
    { upsert: true },
  );
}

/** Streak counts consecutive active days ending today, or yesterday if today isn't active yet. */
export function computeStreaks(activeDays: string[], today: string) {
  const set = new Set(activeDays);
  let current = 0;
  let cursor = set.has(today) ? today : addDays(today, -1);
  while (set.has(cursor)) {
    current++;
    cursor = addDays(cursor, -1);
  }

  const sorted = [...set].sort();
  let longest = 0;
  let run = 0;
  let prev: string | null = null;
  for (const day of sorted) {
    run = prev && addDays(prev, 1) === day ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = day;
  }
  return { current, longest };
}

const HISTORY_DAYS = 400;

export async function getLearningStats(
  userIdStr: string,
  now = new Date(),
): Promise<LearningStatsDTO> {
  const userId = new Types.ObjectId(userIdStr);
  const { tz, goal } = await userTimezone(userId);
  const today = dayKey(now, tz);

  const [days, totalLessonsCompleted] = await Promise.all([
    ActivityDay.find({ userId, day: { $gte: addDays(today, -HISTORY_DAYS) } })
      .select('day minutes lessonsCompleted events')
      .lean(),
    UserProgress.countDocuments({ userId, completedAt: { $ne: null } }),
  ]);

  const byDay = new Map(days.map((d) => [d.day, d]));
  const week: DayActivityDTO[] = [];
  for (let i = 6; i >= 0; i--) {
    const date = addDays(today, -i);
    const d = byDay.get(date);
    week.push({
      date,
      minutes: Math.round(d?.minutes ?? 0),
      lessonsCompleted: d?.lessonsCompleted ?? 0,
      active: Boolean(d && d.events > 0),
    });
  }

  const { current, longest } = computeStreaks(
    days.filter((d) => d.events > 0).map((d) => d.day),
    today,
  );

  return {
    currentStreak: current,
    longestStreak: longest,
    todayMinutes: Math.round(byDay.get(today)?.minutes ?? 0),
    dailyGoalMinutes: goal,
    totalLessonsCompleted,
    week,
  };
}
