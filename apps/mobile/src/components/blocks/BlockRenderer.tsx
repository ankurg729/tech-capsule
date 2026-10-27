import type {
  CalloutBlock,
  ImageBlock,
  PublicContentBlock,
  QuizAnswerResult,
} from '@techcapsule/contracts';
import { Image } from 'expo-image';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon, Text } from '@/components/ui';
import { makeStyles, useTheme } from '@/theme/ThemeProvider';
import { CodeBlock } from './CodeBlock';
import { DiagramBlock } from './DiagramBlock';
import { InlineText } from './InlineText';
import { QuizBlock } from './QuizBlock';

interface Props {
  block: PublicContentBlock;
  previousQuiz?: { correct: boolean };
  onQuizSubmit: (blockId: string, selected: string[]) => Promise<QuizAnswerResult>;
}

export const BlockRenderer = memo(function BlockRenderer({
  block,
  previousQuiz,
  onQuizSubmit,
}: Props) {
  switch (block.type) {
    case 'heading':
      return (
        <Text
          variant={block.level === 2 ? 'title' : 'heading'}
          accessibilityRole="header"
          style={{ marginTop: block.level === 2 ? 12 : 4 }}
        >
          {block.text}
        </Text>
      );
    case 'paragraph':
      return <InlineText text={block.text} variant="body" tone="muted" />;
    case 'code':
      return <CodeBlock block={block} />;
    case 'image':
      return <ImageView block={block} />;
    case 'diagram':
      return <DiagramBlock block={block} />;
    case 'callout':
      return <Callout block={block} />;
    case 'quiz':
      return (
        <QuizBlock
          block={block}
          previous={previousQuiz}
          onSubmit={(selected) => onQuizSubmit(block.id, selected)}
        />
      );
    default:
      // Unknown block types (e.g. from a newer API) are skipped rather than crashing the lesson.
      return null;
  }
});

function ImageView({ block }: { block: ImageBlock }) {
  const styles = useStyles();
  return (
    <View style={{ gap: 6 }}>
      <Image
        source={{ uri: block.url }}
        style={[styles.image, { aspectRatio: block.aspectRatio ?? 16 / 9 }]}
        contentFit="contain"
        transition={200}
        accessibilityLabel={block.alt}
        accessible
      />
      {block.caption ? (
        <Text variant="caption" tone="subtle" align="center">
          {block.caption}
        </Text>
      ) : null}
    </View>
  );
}

function Callout({ block }: { block: CalloutBlock }) {
  const theme = useTheme();
  const styles = useStyles();
  const v = {
    info: {
      icon: 'information-circle',
      fg: theme.colors.secondary,
      bg: theme.colors.secondaryMuted,
    },
    tip: { icon: 'bulb', fg: theme.colors.success, bg: theme.colors.successMuted },
    warning: { icon: 'warning', fg: theme.colors.warning, bg: theme.colors.warningMuted },
  } as const;
  const c = v[block.variant];
  return (
    <View style={[styles.callout, { backgroundColor: c.bg, borderLeftColor: c.fg }]}>
      <View style={styles.calloutHeader}>
        <Icon name={c.icon} size={18} color={c.fg} />
        <Text variant="bodySmall" weight="700" style={{ color: c.fg }}>
          {block.title ??
            (block.variant === 'tip' ? 'Tip' : block.variant === 'warning' ? 'Heads up' : 'Note')}
        </Text>
      </View>
      <InlineText text={block.text} variant="bodySmall" />
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  image: {
    width: '100%',
    borderRadius: t.radius.md,
    backgroundColor: t.colors.surfaceRaised,
  },
  callout: {
    padding: t.spacing.md,
    borderRadius: t.radius.md,
    borderLeftWidth: 3,
    gap: t.spacing.xs,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
  },
  calloutHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
}));
