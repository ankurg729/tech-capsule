import type { PublicQuizBlock, QuizAnswerResult } from '@techcapsule/contracts';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Badge, Banner, Button, Icon, Text } from '@/components/ui';
import { errorMessage } from '@/lib/api/http';
import { makeStyles, useTheme } from '@/theme/ThemeProvider';

interface QuizBlockProps {
  block: PublicQuizBlock;
  /** Result of an earlier attempt from the lesson's viewer state, if any. */
  previous?: { correct: boolean };
  onSubmit: (selectedOptionIds: string[]) => Promise<QuizAnswerResult>;
}

/** The answer key never reaches the client: correctness comes back from the API on submit. */
export function QuizBlock({ block, previous, onSubmit }: QuizBlockProps) {
  const theme = useTheme();
  const styles = useStyles();
  const [selected, setSelected] = useState<string[]>([]);
  const [result, setResult] = useState<QuizAnswerResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const toggle = (id: string) => {
    if (result) return;
    setSelected((prev) =>
      block.multiple ? (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]) : [id],
    );
  };

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await onSubmit(selected);
      setResult(res);
      Haptics.notificationAsync(
        res.correct
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Warning,
      ).catch(() => undefined);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const retry = () => {
    setResult(null);
    setSelected([]);
  };

  return (
    <View style={styles.container} testID={`quiz-${block.id}`}>
      <View style={styles.header}>
        <Badge label="Quick check" tone="primary" icon="help-circle-outline" />
        {previous && !result ? (
          <Badge
            label={previous.correct ? 'Answered correctly before' : 'Try it again'}
            tone={previous.correct ? 'success' : 'warning'}
          />
        ) : null}
      </View>
      <Text variant="subheading">{block.question}</Text>
      {block.multiple ? (
        <Text variant="caption" tone="subtle">
          Select all that apply
        </Text>
      ) : null}

      <View style={{ gap: theme.spacing.sm }}>
        {block.options.map((option) => {
          const isSelected = selected.includes(option.id);
          const isCorrect = result?.correctOptionIds.includes(option.id) ?? false;
          const isWrongPick = !!result && isSelected && !isCorrect;
          const borderColor = result
            ? isCorrect
              ? theme.colors.success
              : isWrongPick
                ? theme.colors.danger
                : theme.colors.border
            : isSelected
              ? theme.colors.primary
              : theme.colors.border;
          const backgroundColor = result
            ? isCorrect
              ? theme.colors.successMuted
              : isWrongPick
                ? theme.colors.dangerMuted
                : theme.colors.surface
            : isSelected
              ? theme.colors.primaryMuted
              : theme.colors.surface;
          const icon = result
            ? isCorrect
              ? 'checkmark-circle'
              : isWrongPick
                ? 'close-circle'
                : 'ellipse-outline'
            : block.multiple
              ? isSelected
                ? 'checkbox'
                : 'square-outline'
              : isSelected
                ? 'radio-button-on'
                : 'radio-button-off';

          return (
            <Pressable
              key={option.id}
              onPress={() => toggle(option.id)}
              disabled={!!result}
              accessibilityRole={block.multiple ? 'checkbox' : 'radio'}
              accessibilityState={{ checked: isSelected, disabled: !!result }}
              style={[styles.option, { borderColor, backgroundColor }]}
              testID={`quiz-option-${option.id}`}
            >
              <Icon name={icon} size={20} color={borderColor} />
              <Text variant="body" style={{ flex: 1 }}>
                {option.text}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {error ? <Banner tone="danger" message={error} /> : null}

      {result ? (
        <View style={{ gap: theme.spacing.md }}>
          <Banner
            tone={result.correct ? 'success' : 'warning'}
            title={result.correct ? 'Correct!' : 'Not quite'}
            message={result.explanation}
            testID="quiz-result"
          />
          <Button label="Try again" variant="ghost" size="sm" icon="refresh" onPress={retry} />
        </View>
      ) : (
        <Button
          label="Check answer"
          onPress={submit}
          loading={submitting}
          disabled={selected.length === 0}
          size="sm"
          testID={`quiz-submit-${block.id}`}
        />
      )}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  container: {
    gap: t.spacing.md,
    padding: t.spacing.lg,
    borderRadius: t.radius.lg,
    backgroundColor: t.colors.backgroundElevated,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: t.colors.primaryMuted,
  },
  header: { flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.sm },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.md,
    padding: t.spacing.md,
    borderRadius: t.radius.md,
    borderWidth: 1.5,
  },
}));
