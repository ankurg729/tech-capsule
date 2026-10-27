import type { QuestionSummaryDTO } from '@techcapsule/contracts';
import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { Card, Icon, Text } from '@/components/ui';
import { formatRelative } from '@/lib/format';
import { makeStyles } from '@/theme/ThemeProvider';

export function QuestionCard({ question }: { question: QuestionSummaryDTO }) {
  const router = useRouter();
  const styles = useStyles();
  return (
    <Card
      onPress={() => router.push({ pathname: '/question/[id]', params: { id: question.id } })}
      accessibilityLabel={`Question: ${question.title}`}
      testID={`question-card-${question.id}`}
    >
      <View style={styles.row}>
        <View style={styles.stats}>
          <Stat icon="arrow-up" value={question.voteScore} label="votes" />
          <Stat
            icon={question.hasAcceptedAnswer ? 'checkmark-circle' : 'chatbubble-outline'}
            value={question.answerCount}
            label="answers"
            highlight={question.hasAcceptedAnswer}
          />
        </View>
        <View style={{ flex: 1, gap: 6 }}>
          <Text variant="subheading" numberOfLines={2}>
            {question.title}
          </Text>
          <Text variant="bodySmall" tone="muted" numberOfLines={2}>
            {question.excerpt}
          </Text>
          <View style={styles.tags}>
            {question.tags.slice(0, 3).map((tag) => (
              <Text key={tag} variant="caption" tone="secondary">
                #{tag}
              </Text>
            ))}
          </View>
          <Text variant="caption" tone="subtle">
            {question.author.displayName} · {formatRelative(question.createdAt)}
          </Text>
        </View>
      </View>
    </Card>
  );
}

function Stat({
  icon,
  value,
  label,
  highlight,
}: {
  icon: 'arrow-up' | 'checkmark-circle' | 'chatbubble-outline';
  value: number;
  label: string;
  highlight?: boolean;
}) {
  const styles = useStyles();
  return (
    <View style={styles.stat} accessibilityLabel={`${value} ${label}`}>
      <Icon name={icon} size={14} tone={highlight ? 'success' : 'subtle'} />
      <Text variant="bodySmall" weight="700" tone={highlight ? 'success' : 'default'}>
        {value}
      </Text>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  row: { flexDirection: 'row', gap: t.spacing.md },
  stats: { gap: t.spacing.sm, alignItems: 'center', width: 44 },
  stat: { alignItems: 'center', gap: 2 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.sm },
}));
