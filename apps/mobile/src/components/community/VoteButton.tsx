import * as Haptics from 'expo-haptics';
import { StyleSheet } from 'react-native';
import { Icon, PressableScale, Text } from '@/components/ui';
import { makeStyles, useTheme } from '@/theme/ThemeProvider';

export function VoteButton({
  score,
  voted,
  disabled,
  disabledReason,
  onToggle,
  testID,
}: {
  score: number;
  voted: boolean;
  disabled?: boolean;
  disabledReason?: string;
  onToggle: (nextVoted: boolean) => void;
  testID?: string;
}) {
  const theme = useTheme();
  const styles = useStyles();
  return (
    <PressableScale
      onPress={() => {
        Haptics.selectionAsync().catch(() => undefined);
        onToggle(!voted);
      }}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={
        disabled && disabledReason ? disabledReason : voted ? 'Remove upvote' : 'Upvote'
      }
      accessibilityState={{ selected: voted, disabled }}
      accessibilityValue={{ text: `${score} votes` }}
      style={[styles.button, voted && styles.active]}
      testID={testID}
    >
      <Icon
        name={voted ? 'arrow-up-circle' : 'arrow-up-circle-outline'}
        size={18}
        color={voted ? theme.colors.primary : theme.colors.textMuted}
      />
      <Text variant="bodySmall" weight="700" tone={voted ? 'primary' : 'muted'}>
        {score}
      </Text>
    </PressableScale>
  );
}

const useStyles = makeStyles((t) => ({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: t.spacing.md,
    paddingVertical: 6,
    borderRadius: t.radius.pill,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: t.colors.border,
    backgroundColor: t.colors.surface,
  },
  active: { borderColor: t.colors.primary, backgroundColor: t.colors.primaryMuted },
}));
