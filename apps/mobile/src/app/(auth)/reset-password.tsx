import { resetPasswordInputSchema } from '@techcapsule/contracts';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { AuthScaffold } from '@/components/AuthScaffold';
import { Banner, Button, Input } from '@/components/ui';
import { apiFormErrors, validate, type FieldErrors } from '@/lib/forms';
import { useResetPassword } from '@/queries/account';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const reset = useResetPassword();
  const [email, setEmail] = useState(params.email ?? '');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    const { data, errors: invalid } = validate(resetPasswordInputSchema, { email, code, password });
    if (!data) return setErrors(invalid);
    if (password !== confirm) return setErrors({ confirm: 'Passwords do not match' });
    setErrors({});
    try {
      await reset.mutateAsync(data);
      router.replace({ pathname: '/login', params: { reset: '1', email: data.email } });
    } catch (err) {
      const { fields, message } = apiFormErrors(err);
      setErrors(fields);
      setError(message);
    }
  };

  return (
    <AuthScaffold
      back
      title="Choose a new password"
      subtitle="Enter the 8-character code from the email. It expires 15 minutes after it was sent."
    >
      {error ? <Banner tone="danger" message={error} /> : null}
      <Input
        label="Email"
        icon="mail-outline"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        error={errors.email}
      />
      <Input
        label="Reset code"
        icon="key-outline"
        value={code}
        onChangeText={(v) => setCode(v.toUpperCase())}
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={8}
        textContentType="oneTimeCode"
        error={errors.code}
      />
      <Input
        label="New password"
        icon="lock-closed-outline"
        value={password}
        onChangeText={setPassword}
        secure
        autoComplete="new-password"
        hint="At least 10 characters, with letters and numbers."
        error={errors.password}
      />
      <Input
        label="Confirm password"
        icon="lock-closed-outline"
        value={confirm}
        onChangeText={setConfirm}
        secure
        error={errors.confirm}
      />
      <Button
        label="Update password"
        onPress={submit}
        loading={reset.isPending}
        fullWidth
        size="lg"
      />
    </AuthScaffold>
  );
}
