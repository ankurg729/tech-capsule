import { loginInputSchema } from '@techcapsule/contracts';
import { Link, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { AuthScaffold } from '@/components/AuthScaffold';
import { Banner, Button, Input, Text } from '@/components/ui';
import { apiFormErrors, validate, type FieldErrors } from '@/lib/forms';
import { useLogin } from '@/queries/account';

export default function LoginScreen() {
  const params = useLocalSearchParams<{ reset?: string; email?: string }>();
  const login = useLogin();
  const [email, setEmail] = useState(params.email ?? '');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<string | null>(null);

  const submit = async () => {
    setMessage(null);
    const { data, errors: invalid } = validate(loginInputSchema, { email, password });
    if (!data) return setErrors(invalid);
    setErrors({});
    try {
      // On success the session flips to signed-in and the router guard opens the app.
      await login.mutateAsync(data);
    } catch (err) {
      const { fields, message: msg } = apiFormErrors(err);
      setErrors(fields);
      setMessage(msg);
    }
  };

  return (
    <AuthScaffold
      title="Welcome back"
      subtitle="Bite-sized lessons on AI, MCP, RAG and modern dev — in English or Hinglish."
      footer={
        <Text variant="bodySmall" tone="muted">
          New here?{' '}
          <Link href="/register" replace>
            <Text variant="bodySmall" tone="primary" weight="700">
              Create an account
            </Text>
          </Link>
        </Text>
      }
    >
      {params.reset ? (
        <Banner tone="success" message="Password updated. Log in with your new password." />
      ) : null}
      {message ? <Banner tone="danger" message={message} testID="login-error" /> : null}
      <Input
        label="Email"
        icon="mail-outline"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
        error={errors.email}
        testID="login-email"
      />
      <Input
        label="Password"
        icon="lock-closed-outline"
        value={password}
        onChangeText={setPassword}
        secure
        autoComplete="current-password"
        textContentType="password"
        error={errors.password}
        onSubmitEditing={submit}
        returnKeyType="go"
        testID="login-password"
      />
      <Link href="/forgot-password" style={{ alignSelf: 'flex-end' }}>
        <Text variant="bodySmall" tone="primary" weight="600">
          Forgot password?
        </Text>
      </Link>
      <Button
        label="Log in"
        onPress={submit}
        loading={login.isPending}
        fullWidth
        size="lg"
        testID="login-submit"
      />
    </AuthScaffold>
  );
}
