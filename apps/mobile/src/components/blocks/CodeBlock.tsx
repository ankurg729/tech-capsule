import type { CodeBlock as CodeBlockData } from '@techcapsule/contracts';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text as RNText, View } from 'react-native';
import { Icon, Text } from '@/components/ui';
import { tokenize } from '@/lib/highlight';
import { makeStyles, useTheme } from '@/theme/ThemeProvider';
import { typography } from '@/theme/tokens';

const LANGUAGE_NAMES: Record<CodeBlockData['language'], string> = {
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  json: 'JSON',
  bash: 'Shell',
  python: 'Python',
  yaml: 'YAML',
  dockerfile: 'Dockerfile',
  text: 'Text',
};

export function CodeBlock({ block }: { block: CodeBlockData }) {
  const theme = useTheme();
  const styles = useStyles();
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tokens = useMemo(() => tokenize(block.code, block.language), [block.code, block.language]);
  const lineCount = useMemo(() => block.code.split('\n').length, [block.code]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const copy = async () => {
    await Clipboard.setStringAsync(block.code);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1600);
  };

  return (
    <View style={{ gap: theme.spacing.xs }}>
      <View style={styles.container}>
        <View style={styles.toolbar}>
          <View style={styles.dots}>
            <View style={[styles.dot, { backgroundColor: '#F87171' }]} />
            <View style={[styles.dot, { backgroundColor: '#FBBF24' }]} />
            <View style={[styles.dot, { backgroundColor: '#34D399' }]} />
          </View>
          <Text variant="caption" style={styles.filename} numberOfLines={1}>
            {block.filename ?? LANGUAGE_NAMES[block.language]}
          </Text>
          <Pressable
            onPress={copy}
            accessibilityRole="button"
            accessibilityLabel={copied ? 'Code copied' : 'Copy code'}
            hitSlop={8}
            style={styles.copy}
            testID={`copy-${block.id}`}
          >
            <Icon
              name={copied ? 'checkmark' : 'copy-outline'}
              size={14}
              color={copied ? theme.colors.success : theme.colors.syntax.punctuation}
            />
            <Text
              variant="caption"
              style={{ color: copied ? theme.colors.success : theme.colors.syntax.punctuation }}
            >
              {copied ? 'Copied' : 'Copy'}
            </Text>
          </Pressable>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.codeRow}>
            <RNText style={[styles.code, styles.gutter]} accessible={false}>
              {Array.from({ length: lineCount }, (_, i) => String(i + 1)).join('\n')}
            </RNText>
            <RNText style={styles.code} selectable accessibilityLabel={block.code}>
              {tokens.map((tok, i) => (
                <RNText key={i} style={{ color: theme.colors.syntax[tok.type] }}>
                  {tok.text}
                </RNText>
              ))}
            </RNText>
          </View>
        </ScrollView>
      </View>
      {block.caption ? (
        <Text variant="caption" tone="subtle">
          {block.caption}
        </Text>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  container: {
    backgroundColor: t.colors.codeBackground,
    borderRadius: t.radius.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: t.colors.codeBorder,
    overflow: 'hidden',
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.md,
    paddingHorizontal: t.spacing.md,
    paddingVertical: t.spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: t.colors.codeBorder,
  },
  dots: { flexDirection: 'row', gap: 5 },
  dot: { width: 8, height: 8, borderRadius: 4, opacity: 0.85 },
  filename: { flex: 1, color: t.colors.syntax.punctuation },
  copy: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  codeRow: { flexDirection: 'row', padding: t.spacing.md, gap: t.spacing.md },
  code: { ...typography.code, color: t.colors.syntax.plain },
  gutter: { color: t.colors.syntax.comment, textAlign: 'right', minWidth: 18 },
}));
