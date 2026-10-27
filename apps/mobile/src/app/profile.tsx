import {
  DAILY_GOALS,
  displayNameSchema,
  type ContentLanguage,
  type Difficulty,
  type Technology,
} from '@techcapsule/contracts';
import { useState } from 'react';
import { View } from 'react-native';
import { DIFFICULTY_OPTIONS, LANGUAGE_OPTIONS, TECHNOLOGY_OPTIONS } from '@/components/filters';
import {
  Avatar,
  Badge,
  Banner,
  Button,
  Card,
  Chip,
  Input,
  Screen,
  ScreenHeader,
  Text,
} from '@/components/ui';
import { useCurrentUser } from '@/lib/auth/session';
import { deviceTimezone } from '@/lib/format';
import { apiFormErrors } from '@/lib/forms';
import { useUpdateProfile } from '@/queries/account';
import { useTheme } from '@/theme/ThemeProvider';

const MAX_INTERESTS = 15;

export default function ProfileScreen() {
  const theme = useTheme();
  const user = useCurrentUser();
  const update = useUpdateProfile();
  const prefs = user.preferences;

  const [displayName, setDisplayName] = useState(user.displayName);
  const [language, setLanguage] = useState<ContentLanguage>(prefs.language);
  const [interests, setInterests] = useState<Technology[]>(prefs.interests);
  const [experience, setExperience] = useState<Difficulty>(prefs.experienceLevel);
  const [dailyGoal, setDailyGoal] = useState(prefs.dailyGoalMinutes);
  const [timezone, setTimezone] = useState(prefs.timezone);
  const [nameError, setNameError] = useState<string | null>(null);
  const [status, setStatus] = useState<{ tone: 'success' | 'danger'; message: string } | null>(
    null,
  );
  const detectedTz = deviceTimezone();

  const toggleInterest = (t: Technology) =>
    setInterests((prev) =>
      prev.includes(t)
        ? prev.filter((x) => x !== t)
        : prev.length < MAX_INTERESTS
          ? [...prev, t]
          : prev,
    );

  const save = async () => {
    setStatus(null);
    const name = displayNameSchema.safeParse(displayName);
    if (!name.success) return setNameError(name.error.issues[0]?.message ?? 'Invalid name');
    setNameError(null);
    try {
      await update.mutateAsync({
        displayName: name.data,
        preferences: {
          language,
          interests,
          experienceLevel: experience,
          dailyGoalMinutes: dailyGoal,
          timezone,
        },
      });
      setStatus({ tone: 'success', message: 'Preferences saved.' });
    } catch (err) {
      const { fields, message } = apiFormErrors(err);
      setStatus({
        tone: 'danger',
        message: message ?? Object.values(fields)[0] ?? 'Could not save',
      });
    }
  };

  return (
    <Screen scroll keyboard header={<ScreenHeader title="Profile & preferences" />}>
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
        <Avatar name={user.displayName} size={56} />
        <View style={{ flex: 1, gap: 4 }}>
          <Text variant="heading">{user.displayName}</Text>
          <Text variant="caption" tone="subtle">
            {user.email}
          </Text>
          <Badge
            label={user.emailVerified ? 'Email verified' : 'Email not verified'}
            tone={user.emailVerified ? 'success' : 'warning'}
          />
        </View>
      </Card>

      <Input
        label="Display name"
        value={displayName}
        onChangeText={setDisplayName}
        maxLength={50}
        error={nameError}
      />

      <Section title="Lesson language" hint="Used for your daily capsule and recommendations.">
        {LANGUAGE_OPTIONS.map((o) => (
          <Chip
            key={o.value}
            label={o.label}
            selected={language === o.value}
            onPress={() => setLanguage(o.value)}
          />
        ))}
      </Section>

      <Section title="Experience level">
        {DIFFICULTY_OPTIONS.map((o) => (
          <Chip
            key={o.value}
            label={o.label}
            selected={experience === o.value}
            onPress={() => setExperience(o.value)}
          />
        ))}
      </Section>

      <Section title="Interests" hint="Pick the topics you want to see first.">
        {TECHNOLOGY_OPTIONS.map((o) => (
          <Chip
            key={o.value}
            label={o.label}
            selected={interests.includes(o.value)}
            onPress={() => toggleInterest(o.value)}
          />
        ))}
      </Section>

      <Section title="Daily goal" hint="Minutes of learning per day. Drives your streak ring.">
        {DAILY_GOALS.map((g) => (
          <Chip
            key={g}
            label={`${g} min`}
            selected={dailyGoal === g}
            onPress={() => setDailyGoal(g)}
          />
        ))}
      </Section>

      <Section
        title="Timezone"
        hint="Streaks and the daily capsule roll over at midnight in this timezone."
      >
        <Chip label={timezone} selected />
        {detectedTz && detectedTz !== timezone ? (
          <Chip
            label={`Use device (${detectedTz})`}
            icon="locate-outline"
            onPress={() => setTimezone(detectedTz)}
          />
        ) : null}
      </Section>

      {status ? <Banner tone={status.tone} message={status.message} /> : null}
      <Button
        label="Save preferences"
        onPress={save}
        loading={update.isPending}
        fullWidth
        size="lg"
      />
    </Screen>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.spacing.sm }}>
      <Text variant="subheading">{title}</Text>
      {hint ? (
        <Text variant="caption" tone="subtle">
          {hint}
        </Text>
      ) : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
        {children}
      </View>
    </View>
  );
}
