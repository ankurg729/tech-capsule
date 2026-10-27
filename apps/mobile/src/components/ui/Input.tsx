import { useState, type ComponentRef, type Ref } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { makeStyles, useTheme } from '@/theme/ThemeProvider';
import { Icon, Text, type IconName } from './Text';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string | null;
  hint?: string;
  icon?: IconName;
  /** Renders a show/hide toggle and hides the value by default. */
  secure?: boolean;
  ref?: Ref<ComponentRef<typeof TextInput>>;
}

export function Input({
  label,
  error,
  hint,
  icon,
  secure = false,
  multiline,
  style,
  ref,
  onFocus,
  onBlur,
  ...rest
}: InputProps) {
  const theme = useTheme();
  const styles = useStyles();
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(secure);

  return (
    <View style={styles.wrapper}>
      {label ? (
        <Text variant="caption" tone="muted" style={styles.label}>
          {label}
        </Text>
      ) : null}
      <View
        style={[
          styles.field,
          multiline && styles.multiline,
          focused && { borderColor: theme.colors.primary },
          error ? { borderColor: theme.colors.danger } : null,
        ]}
      >
        {icon ? <Icon name={icon} size={18} tone="subtle" /> : null}
        <TextInput
          ref={ref}
          {...rest}
          multiline={multiline}
          secureTextEntry={hidden}
          placeholderTextColor={theme.colors.textSubtle}
          selectionColor={theme.colors.primary}
          accessibilityLabel={rest.accessibilityLabel ?? label}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[styles.input, multiline && styles.inputMultiline, style]}
        />
        {secure ? (
          <Pressable
            onPress={() => setHidden((h) => !h)}
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
            hitSlop={10}
          >
            <Icon name={hidden ? 'eye-outline' : 'eye-off-outline'} size={18} tone="subtle" />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text variant="caption" tone="danger" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : hint ? (
        <Text variant="caption" tone="subtle">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  wrapper: { gap: t.spacing.xs },
  label: { marginLeft: t.spacing.xxs },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.sm,
    minHeight: 48,
    paddingHorizontal: t.spacing.md,
    borderRadius: t.radius.md,
    backgroundColor: t.colors.surface,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: t.colors.border,
  },
  multiline: { alignItems: 'flex-start', paddingVertical: t.spacing.sm },
  input: {
    flex: 1,
    color: t.colors.text,
    fontSize: 15,
    paddingVertical: t.spacing.sm,
  },
  inputMultiline: { minHeight: 120, textAlignVertical: 'top' },
}));
