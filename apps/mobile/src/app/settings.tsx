import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable } from 'react-native';
import {
  Button,
  Card,
  Icon,
  SegmentedControl,
  Screen,
  ScreenHeader,
  Sheet,
  Text,
} from '@/components/ui';
import type { IconName } from '@/components/ui';
import { API_URL } from '@/config';
import { useCurrentUser } from '@/lib/auth/session';
import { useSignOut } from '@/queries/account';
import { useAppearance, useTheme, type AppearancePreference } from '@/theme/ThemeProvider';

export default function SettingsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const user = useCurrentUser();
  const signOut = useSignOut();
  const { preference, setPreference } = useAppearance();
  const [confirm, setConfirm] = useState(false);

  return (
    <Screen scroll header={<ScreenHeader title="Settings" />}>
      <Text variant="overline" tone="subtle">
        Account
      </Text>
      <Card padded={false}>
        <Row
          icon="person-circle-outline"
          label="Profile & preferences"
          onPress={() => router.push('/profile')}
        />
        <Row icon="bookmark-outline" label="Saved" onPress={() => router.push('/saved')} />
        {!user.emailVerified ? (
          <Row
            icon="mail-unread-outline"
            label="Verify email"
            onPress={() => router.push('/verify-email')}
          />
        ) : null}
      </Card>

      <Text variant="overline" tone="subtle">
        Appearance
      </Text>
      <SegmentedControl<AppearancePreference>
        value={preference}
        onChange={setPreference}
        options={[
          { value: 'dark', label: 'Dark' },
          { value: 'light', label: 'Light' },
          { value: 'system', label: 'System' },
        ]}
      />

      <Text variant="overline" tone="subtle">
        About
      </Text>
      <Card style={{ gap: theme.spacing.xs }}>
        <Text variant="bodySmall">TechCapsule.dev v{Constants.expoConfig?.version ?? '0.0.0'}</Text>
        <Text variant="caption" tone="subtle">
          Free developer learning. No ads, no subscriptions.
        </Text>
        <Text variant="caption" tone="subtle" selectable>
          API: {API_URL}
        </Text>
      </Card>

      <Button
        label="Log out"
        icon="log-out-outline"
        variant="danger"
        fullWidth
        onPress={() => setConfirm(true)}
        testID="logout"
      />

      <Sheet visible={confirm} onClose={() => setConfirm(false)} title="Log out?">
        <Text variant="bodySmall" tone="muted">
          Your progress is saved to your account. This device&apos;s session will be revoked.
        </Text>
        <Button
          label="Log out"
          variant="danger"
          fullWidth
          loading={signOut.isPending}
          onPress={() => signOut.mutate()}
          testID="logout-confirm"
        />
        <Button label="Cancel" variant="ghost" onPress={() => setConfirm(false)} />
      </Sheet>
    </Screen>
  );
}

function Row({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.md,
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
        backgroundColor: pressed ? theme.colors.surfacePressed : 'transparent',
      })}
    >
      <Icon name={icon} size={20} tone="primary" />
      <Text variant="body" style={{ flex: 1 }}>
        {label}
      </Text>
      <Icon name="chevron-forward" size={18} tone="subtle" />
    </Pressable>
  );
}
