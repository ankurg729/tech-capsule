import {
  answerCreateSchema,
  questionUpdateSchema,
  type AnswerDTO,
  type QuestionDetailDTO,
} from '@techcapsule/contracts';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { CommentThread } from '@/components/community/CommentThread';
import { ReportSheet, type ReportTargetRef } from '@/components/community/ReportSheet';
import { TagInput } from '@/components/community/TagInput';
import { VoteButton } from '@/components/community/VoteButton';
import {
  Avatar,
  Badge,
  Banner,
  Button,
  Card,
  ErrorState,
  Icon,
  IconButton,
  Input,
  Screen,
  ScreenHeader,
  Sheet,
  SkeletonList,
  Text,
} from '@/components/ui';
import { useCurrentUser } from '@/lib/auth/session';
import { errorMessage } from '@/lib/api/http';
import { formatRelative, plural } from '@/lib/format';
import { apiFormErrors, validate, type FieldErrors } from '@/lib/forms';
import {
  useAcceptAnswer,
  useAnswers,
  useCreateAnswer,
  useQuestion,
  useUpdateAnswer,
  useUpdateQuestion,
  useVote,
} from '@/queries/community';
import { useTheme } from '@/theme/ThemeProvider';

export default function QuestionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const question = useQuestion(id);

  if (question.isPending) {
    return (
      <Screen header={<ScreenHeader title="Question" />} scroll>
        <SkeletonList count={3} height={140} />
      </Screen>
    );
  }
  if (question.isError) {
    return (
      <Screen header={<ScreenHeader title="Question" />}>
        <ErrorState error={question.error} onRetry={() => void question.refetch()} />
      </Screen>
    );
  }
  return <QuestionView question={question.data} refetch={() => void question.refetch()} />;
}

function QuestionView({ question, refetch }: { question: QuestionDetailDTO; refetch: () => void }) {
  const theme = useTheme();
  const router = useRouter();
  const user = useCurrentUser();
  const answers = useAnswers(question.id);
  const vote = useVote(question.id);
  const accept = useAcceptAnswer(question.id);
  const [report, setReport] = useState<ReportTargetRef | null>(null);
  const [editingQuestion, setEditingQuestion] = useState(false);
  const [editingAnswer, setEditingAnswer] = useState<AnswerDTO | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const isAuthor = !!question.viewer?.isAuthor;
  const verified = user.emailVerified;

  const onVote = (targetType: 'question' | 'answer', targetId: string, voted: boolean) => {
    setActionError(null);
    vote.mutate(
      { targetType, targetId, voted },
      { onError: (err) => setActionError(errorMessage(err)) },
    );
  };

  const onAccept = (answer: AnswerDTO) => {
    setActionError(null);
    accept.mutate(answer.isAccepted ? null : answer.id, {
      onError: (err) => setActionError(errorMessage(err)),
    });
  };

  return (
    <Screen
      scroll
      keyboard
      refreshing={answers.isRefetching}
      onRefresh={() => {
        refetch();
        void answers.refetch();
      }}
      header={
        <ScreenHeader
          title="Question"
          right={
            <IconButton
              icon="flag-outline"
              accessibilityLabel="Report question"
              onPress={() => setReport({ targetType: 'question', targetId: question.id })}
            />
          }
        />
      }
    >
      <View style={{ gap: theme.spacing.md }}>
        <Text variant="title" accessibilityRole="header">
          {question.title}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
          <Avatar name={question.author.displayName} size={28} />
          <Text variant="caption" tone="subtle" style={{ flex: 1 }}>
            {question.author.displayName} · asked {formatRelative(question.createdAt)}
            {question.editedAt ? ' · edited' : ''}
          </Text>
        </View>
        <Text variant="body" tone="muted" selectable>
          {question.body}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {question.tags.map((t) => (
            <Badge key={t} label={`#${t}`} tone="secondary" />
          ))}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
          <VoteButton
            score={question.voteScore}
            voted={!!question.viewer?.voted}
            disabled={isAuthor || !verified || vote.isPending}
            disabledReason={
              isAuthor ? "You can't vote on your own question" : 'Verify your email to vote'
            }
            onToggle={(v) => onVote('question', question.id, v)}
            testID="question-vote"
          />
          {isAuthor ? (
            <Button
              label="Edit"
              icon="create-outline"
              variant="ghost"
              size="sm"
              onPress={() => setEditingQuestion(true)}
            />
          ) : null}
        </View>
        <CommentThread
          questionId={question.id}
          targetType="question"
          targetId={question.id}
          count={question.commentCount}
          canPost={verified}
          onReport={(commentId) => setReport({ targetType: 'comment', targetId: commentId })}
        />
      </View>

      {actionError ? <Banner tone="danger" message={actionError} /> : null}

      <Text variant="heading">{plural(question.answerCount, 'answer')}</Text>
      {answers.isPending ? <SkeletonList count={2} /> : null}
      {answers.isError ? (
        <ErrorState error={answers.error} onRetry={() => void answers.refetch()} />
      ) : null}
      {answers.items.map((answer) => (
        <AnswerCard
          key={answer.id}
          answer={answer}
          questionId={question.id}
          canAccept={isAuthor}
          canVote={verified && !answer.viewer?.isAuthor}
          canComment={verified}
          onVote={(v) => onVote('answer', answer.id, v)}
          onAccept={() => onAccept(answer)}
          onEdit={() => setEditingAnswer(answer)}
          onReport={(target) => setReport(target)}
        />
      ))}
      {answers.hasNextPage ? (
        <Button
          label="Load more answers"
          variant="secondary"
          onPress={() => void answers.fetchNextPage()}
          loading={answers.isFetchingNextPage}
        />
      ) : null}

      {verified ? (
        <AnswerComposer questionId={question.id} />
      ) : (
        <Banner
          tone="warning"
          message="Verify your email to post an answer."
          action={{ label: 'Verify email', onPress: () => router.push('/verify-email') }}
        />
      )}

      <ReportSheet target={report} onClose={() => setReport(null)} />
      <EditQuestionSheet
        question={question}
        visible={editingQuestion}
        onClose={() => setEditingQuestion(false)}
      />
      <EditAnswerSheet
        questionId={question.id}
        answer={editingAnswer}
        onClose={() => setEditingAnswer(null)}
      />
    </Screen>
  );
}

function AnswerCard({
  answer,
  questionId,
  canAccept,
  canVote,
  canComment,
  onVote,
  onAccept,
  onEdit,
  onReport,
}: {
  answer: AnswerDTO;
  questionId: string;
  canAccept: boolean;
  canVote: boolean;
  canComment: boolean;
  onVote: (voted: boolean) => void;
  onAccept: () => void;
  onEdit: () => void;
  onReport: (target: ReportTargetRef) => void;
}) {
  const theme = useTheme();
  return (
    <Card
      variant={answer.isAccepted ? 'raised' : 'default'}
      style={[
        { gap: theme.spacing.md },
        answer.isAccepted ? { borderColor: theme.colors.success, borderWidth: 1.5 } : null,
      ]}
      testID={`answer-${answer.id}`}
    >
      {answer.isAccepted ? (
        <Badge label="Accepted answer" tone="success" icon="checkmark-circle" />
      ) : null}
      <Text variant="body" tone="muted" selectable>
        {answer.body}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
        <Avatar name={answer.author.displayName} size={24} />
        <Text variant="caption" tone="subtle" style={{ flex: 1 }}>
          {answer.author.displayName} · {formatRelative(answer.createdAt)}
          {answer.editedAt ? ' · edited' : ''}
        </Text>
        <Pressable
          onPress={() => onReport({ targetType: 'answer', targetId: answer.id })}
          accessibilityRole="button"
          accessibilityLabel="Report answer"
          hitSlop={8}
        >
          <Icon name="flag-outline" size={15} tone="subtle" />
        </Pressable>
      </View>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.sm,
          flexWrap: 'wrap',
        }}
      >
        <VoteButton
          score={answer.voteScore}
          voted={!!answer.viewer?.voted}
          disabled={!canVote}
          disabledReason={
            answer.viewer?.isAuthor
              ? "You can't vote on your own answer"
              : 'Verify your email to vote'
          }
          onToggle={onVote}
        />
        {canAccept ? (
          <Button
            label={answer.isAccepted ? 'Unaccept' : 'Accept'}
            icon={answer.isAccepted ? 'close-circle-outline' : 'checkmark-circle-outline'}
            variant="ghost"
            size="sm"
            onPress={onAccept}
            testID={`accept-${answer.id}`}
          />
        ) : null}
        {answer.viewer?.isAuthor ? (
          <Button label="Edit" icon="create-outline" variant="ghost" size="sm" onPress={onEdit} />
        ) : null}
      </View>
      <CommentThread
        questionId={questionId}
        targetType="answer"
        targetId={answer.id}
        count={answer.commentCount}
        canPost={canComment}
        onReport={(commentId) => onReport({ targetType: 'comment', targetId: commentId })}
      />
    </Card>
  );
}

function AnswerComposer({ questionId }: { questionId: string }) {
  const theme = useTheme();
  const create = useCreateAnswer(questionId);
  const [body, setBody] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<string | null>(null);

  const submit = async () => {
    setMessage(null);
    const { data, errors: invalid } = validate(answerCreateSchema, { body });
    if (!data) return setErrors(invalid);
    setErrors({});
    try {
      await create.mutateAsync(data.body);
      setBody('');
    } catch (err) {
      const { fields, message: msg } = apiFormErrors(err);
      setErrors(fields);
      setMessage(msg);
    }
  };

  return (
    <Card style={{ gap: theme.spacing.md }}>
      <Text variant="subheading">Your answer</Text>
      {message ? <Banner tone="danger" message={message} /> : null}
      <Input
        placeholder="Share what worked for you…"
        value={body}
        onChangeText={setBody}
        multiline
        maxLength={10_000}
        error={errors.body}
        hint="At least 20 characters"
        testID="answer-body"
      />
      <Button
        label="Post answer"
        icon="send"
        onPress={submit}
        loading={create.isPending}
        fullWidth
        testID="answer-submit"
      />
    </Card>
  );
}

function EditQuestionSheet({
  question,
  visible,
  onClose,
}: {
  question: QuestionDetailDTO;
  visible: boolean;
  onClose: () => void;
}) {
  const update = useUpdateQuestion(question.id);
  const [title, setTitle] = useState(question.title);
  const [body, setBody] = useState(question.body);
  const [tags, setTags] = useState(question.tags);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<string | null>(null);

  const save = async () => {
    setMessage(null);
    const { data, errors: invalid } = validate(questionUpdateSchema, { title, body, tags });
    if (!data) return setErrors(invalid);
    try {
      await update.mutateAsync(data);
      onClose();
    } catch (err) {
      const { fields, message: msg } = apiFormErrors(err);
      setErrors(fields);
      setMessage(msg);
    }
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="Edit question">
      {message ? <Banner tone="danger" message={message} /> : null}
      <Input label="Title" value={title} onChangeText={setTitle} error={errors.title} />
      <Input
        label="Details"
        value={body}
        onChangeText={setBody}
        multiline
        error={errors.body}
        style={{ minHeight: 120, maxHeight: 220 }}
      />
      <TagInput tags={tags} onChange={setTags} error={errors.tags} />
      <Button label="Save changes" onPress={save} loading={update.isPending} fullWidth />
    </Sheet>
  );
}

function EditAnswerSheet({
  questionId,
  answer,
  onClose,
}: {
  questionId: string;
  answer: AnswerDTO | null;
  onClose: () => void;
}) {
  return answer ? (
    <EditAnswerForm key={answer.id} questionId={questionId} answer={answer} onClose={onClose} />
  ) : null;
}

function EditAnswerForm({
  questionId,
  answer,
  onClose,
}: {
  questionId: string;
  answer: AnswerDTO;
  onClose: () => void;
}) {
  const update = useUpdateAnswer(questionId);
  const [body, setBody] = useState(answer.body);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<string | null>(null);

  const save = async () => {
    setMessage(null);
    const { data, errors: invalid } = validate(answerCreateSchema, { body });
    if (!data) return setErrors(invalid);
    try {
      await update.mutateAsync({ answerId: answer.id, body: data.body });
      onClose();
    } catch (err) {
      const { fields, message: msg } = apiFormErrors(err);
      setErrors(fields);
      setMessage(msg);
    }
  };

  return (
    <Sheet visible onClose={onClose} title="Edit answer">
      {message ? <Banner tone="danger" message={message} /> : null}
      <Input
        value={body}
        onChangeText={setBody}
        multiline
        error={errors.body}
        style={{ minHeight: 140, maxHeight: 260 }}
        accessibilityLabel="Answer"
      />
      <Button label="Save changes" onPress={save} loading={update.isPending} fullWidth />
    </Sheet>
  );
}
