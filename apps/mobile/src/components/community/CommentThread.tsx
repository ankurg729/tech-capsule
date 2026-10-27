import type { CommentTarget } from '@techcapsule/contracts';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Banner, Button, Icon, Input, Text } from '@/components/ui';
import { errorMessage } from '@/lib/api/http';
import { formatRelative } from '@/lib/format';
import { useComments, useCreateComment } from '@/queries/community';
import { makeStyles, useTheme } from '@/theme/ThemeProvider';

export function CommentThread({
  questionId,
  targetType,
  targetId,
  count,
  canPost,
  onReport,
}: {
  questionId: string;
  targetType: CommentTarget;
  targetId: string;
  count: number;
  canPost: boolean;
  onReport: (commentId: string) => void;
}) {
  const theme = useTheme();
  const styles = useStyles();
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const comments = useComments(targetType, targetId, open);
  const create = useCreateComment(questionId);

  const post = async () => {
    setError(null);
    try {
      await create.mutateAsync({ targetType, targetId, body: body.trim() });
      setBody('');
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <View style={{ gap: theme.spacing.sm }}>
      <Pressable
        onPress={() => setOpen((o) => !o)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        style={styles.toggle}
        hitSlop={6}
      >
        <Icon name="chatbubble-ellipses-outline" size={15} tone="subtle" />
        <Text variant="caption" tone="subtle" weight="600">
          {open
            ? 'Hide comments'
            : count > 0
              ? `${count} comment${count === 1 ? '' : 's'}`
              : 'Add a comment'}
        </Text>
      </Pressable>
      {open ? (
        <View style={styles.thread}>
          {comments.isPending ? <ActivityIndicator color={theme.colors.primary} /> : null}
          {comments.isError ? (
            <Banner tone="danger" message={errorMessage(comments.error)} />
          ) : null}
          {comments.items.map((c) => (
            <View key={c.id} style={styles.comment}>
              <Text variant="bodySmall">{c.body}</Text>
              <View style={styles.commentMeta}>
                <Text variant="caption" tone="subtle" style={{ flex: 1 }}>
                  {c.author.displayName} · {formatRelative(c.createdAt)}
                </Text>
                <Pressable
                  onPress={() => onReport(c.id)}
                  accessibilityRole="button"
                  accessibilityLabel="Report comment"
                  hitSlop={8}
                >
                  <Icon name="flag-outline" size={13} tone="subtle" />
                </Pressable>
              </View>
            </View>
          ))}
          {comments.hasNextPage ? (
            <Button
              label="Load more comments"
              variant="ghost"
              size="sm"
              onPress={() => void comments.fetchNextPage()}
              loading={comments.isFetchingNextPage}
            />
          ) : null}
          {canPost ? (
            <View style={{ gap: theme.spacing.sm }}>
              <Input
                placeholder="Add a comment…"
                value={body}
                onChangeText={setBody}
                maxLength={1000}
                accessibilityLabel="Comment"
              />
              {error ? <Banner tone="danger" message={error} /> : null}
              <Button
                label="Comment"
                size="sm"
                onPress={post}
                disabled={body.trim().length < 2}
                loading={create.isPending}
              />
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' },
  thread: {
    gap: t.spacing.sm,
    paddingLeft: t.spacing.md,
    borderLeftWidth: 2,
    borderLeftColor: t.colors.border,
  },
  comment: {
    gap: 2,
    paddingBottom: t.spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: t.colors.border,
  },
  commentMeta: { flexDirection: 'row', alignItems: 'center' },
}));
