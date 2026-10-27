import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { makeStyles, useTheme } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/tokens';
import { Icon, Text, type IconName } from './Text';

export function Chip({
  label,
  selected = false,
  onPress,
  icon,
  testID,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: IconName;
  testID?: string;
}) {
  const styles = useStyles();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityState={onPress ? { selected } : undefined}
      testID={testID}
      style={({ pressed }) => [
        styles.chip,
        selected && styles.chipSelected,
        pressed && styles.chipPressed,
      ]}
    >
      {icon ? <Icon name={icon} size={14} tone={selected ? 'primary' : 'muted'} /> : null}
      <Text variant="bodySmall" weight="600" tone={selected ? 'primary' : 'muted'}>
        {label}
      </Text>
    </Pressable>
  );
}

export interface ChipOption<T extends string> {
  value: T;
  label: string;
}

/** Horizontally scrolling single-select chips; tapping the active chip clears it. */
export function ChipFilter<T extends string>({
  options,
  value,
  onChange,
  allLabel = 'All',
}: {
  options: readonly ChipOption<T>[];
  value: T | undefined;
  onChange: (v: T | undefined) => void;
  allLabel?: string | null;
}) {
  const theme = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: theme.spacing.sm, paddingHorizontal: theme.spacing.lg }}
    >
      {allLabel ? (
        <Chip label={allLabel} selected={value === undefined} onPress={() => onChange(undefined)} />
      ) : null}
      {options.map((o) => (
        <Chip
          key={o.value}
          label={o.label}
          selected={value === o.value}
          onPress={() => onChange(value === o.value ? undefined : o.value)}
        />
      ))}
    </ScrollView>
  );
}

export type BadgeTone = 'neutral' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger';

function badgeColors(c: ThemeColors, tone: BadgeTone) {
  switch (tone) {
    case 'primary':
      return { bg: c.primaryMuted, fg: c.primary };
    case 'secondary':
      return { bg: c.secondaryMuted, fg: c.secondary };
    case 'success':
      return { bg: c.successMuted, fg: c.success };
    case 'warning':
      return { bg: c.warningMuted, fg: c.warning };
    case 'danger':
      return { bg: c.dangerMuted, fg: c.danger };
    default:
      return { bg: c.surfaceRaised, fg: c.textMuted };
  }
}

export function Badge({
  label,
  tone = 'neutral',
  icon,
}: {
  label: string;
  tone?: BadgeTone;
  icon?: IconName;
}) {
  const theme = useTheme();
  const { bg, fg } = badgeColors(theme.colors, tone);
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        alignSelf: 'flex-start',
        backgroundColor: bg,
        borderRadius: theme.radius.pill,
        paddingHorizontal: 8,
        paddingVertical: 3,
      }}
    >
      {icon ? <Icon name={icon} size={12} color={fg} /> : null}
      <Text variant="caption" weight="700" style={{ color: fg }}>
        {label}
      </Text>
    </View>
  );
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly ChipOption<T>[];
  value: T;
  onChange: (v: T) => void;
}) {
  const styles = useStyles();
  return (
    <View style={styles.segmented} accessibilityRole="tablist">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={[styles.segment, active && styles.segmentActive]}
          >
            <Text variant="bodySmall" weight="700" tone={active ? 'default' : 'subtle'}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: t.spacing.md,
    paddingVertical: 7,
    borderRadius: t.radius.pill,
    backgroundColor: t.colors.surface,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: t.colors.border,
  },
  chipSelected: { backgroundColor: t.colors.primaryMuted, borderColor: t.colors.primary },
  chipPressed: { opacity: 0.8 },
  segmented: {
    flexDirection: 'row',
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.md,
    padding: 3,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.colors.border,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: t.spacing.sm,
    borderRadius: t.radius.sm + 2,
  },
  segmentActive: { backgroundColor: t.colors.surfaceRaised },
}));
