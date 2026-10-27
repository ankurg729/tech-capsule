import { questionCreateSchema } from '@techcapsule/contracts';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { TagInput } from '@/components/community/TagInput';
import { Banner, Button, Input, Screen, ScreenHeader, Text } from '@/components/ui';
import { useCurrentUser } from '@/lib/auth/session';
import { apiFormErrors, validate, type FieldErrors } from '@/lib/forms';
import { useCreateQuestion } from '@/queries/community';

export default function NewQuestionScreen() {
  const router = useRouter();
  const user = useCurrentUser();
  const create = useCreateQuestion();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<string | null>(null);

  const submit = async () => {
    setMessage(null);
    const { data, errors: invalid } = validate(questionCreateSchema, { title, body, tags });
    if (!data) return setErrors(invalid);
    setErrors({});
    try {
      const q = await create.mutateAsync(data);
      router.replace({ pathname: '/question/[id]', params: { id: q.id } });
    } catch (err) {
      const { fields, message: msg } = apiFormErrors(err);
      setErrors(fields);
      setMessage(msg);
    }
  };

  return (
    <Screen scroll keyboard header={<ScreenHeader title="Ask a question" />}>
      {!user.emailVerified ? (
        <Banner
          tone="warning"
          title="Email verification required"
          message="Only verified members can post. Verify your email, then come back to ask."
          action={{ label: 'Verify email', onPress: () => router.push('/verify-email') }}
        />
      ) : (
        <Text variant="bodySmall" tone="muted">
          Be specific: include what you tried, what you expected, and any error messages.
        </Text>
      )}
      {message ? <Banner tone="danger" message={message} testID="question-error" /> : null}
      <Input
        label="Title"
        placeholder="How do I…?"
        value={title}
        onChangeText={setTitle}
        maxLength={150}
        error={errors.title}
        hint={`${title.trim().length}/150 · at least 15 characters`}
        testID="question-title"
      />
      <Input
        label="Details"
        placeholder="Describe the problem. Code is welcome."
        value={body}
        onChangeText={setBody}
        multiline
        maxLength={10_000}
        error={errors.body}
        hint="At least 30 characters"
        style={{ minHeight: 180 }}
        testID="question-body"
      />
      <TagInput tags={tags} onChange={setTags} error={errors.tags} />
      <Button
        label="Post question"
        icon="send"
        onPress={submit}
        loading={create.isPending}
        disabled={!user.emailVerified}
        fullWidth
        size="lg"
        testID="question-submit"
      />
    </Screen>
  );
}
