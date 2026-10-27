import { registerInputSchema } from '@techcapsule/contracts';
import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { AuthScaffold } from '@/components/AuthScaffold';
import { Banner, Button, Input, Text } from '@/components/ui';
import { apiFormErrors, validate, type FieldErrors } from '@/lib/forms';
import { useRegister } from '@/queries/account';

export default function RegisterScreen() {
  const router = useRouter();
  const register = useRegister();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<string | null>(null);

  const submit = async () => {
    setMessage(null);
    const { data, errors: invalid } = validate(registerInputSchema, {
      displayName,
      email,
      password,
    });
    if (!data) return setErrors(invalid);
    setErrors({});
    try {
      const result = await register.mutateAsync(data);
      router.replace({
        pathname: '/verify-email',
        params: { delivery: result.verificationEmail, email: result.user.email },
      });
    } catch (err) {
      const { fields, message: msg } = apiFormErrors(err);
      setErrors(fields);
      setMessage(msg);
    }
  };

  return (
    <AuthScaffold
      title="Start learning"
      subtitle="Free forever. Track your streak, save lessons and ask the community."
      footer={
        <Text variant="bodySmall" tone="muted">
          Already have an account?{' '}
          <Link href="/login" replace>
            <Text variant="bodySmall" tone="primary" weight="700">
              Log in
            </Text>
          </Link>
        </Text>
      }
    >
      {message ? <Banner tone="danger" message={message} /> : null}
      <Input
        label="Display name"
        icon="person-outline"
        value={displayName}
        onChangeText={setDisplayName}
        autoComplete="name"
        textContentType="name"
        error={errors.displayName}
        testID="register-name"
      />
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
        testID="register-email"
      />
      <Input
        label="Password"
        icon="lock-closed-outline"
        value={password}
        onChangeText={setPassword}
        secure
        autoComplete="new-password"
        textContentType="newPassword"
        hint="At least 10 characters, with letters and numbers."
        error={errors.password}
        testID="register-password"
      />
      <Button
        label="Create account"
        onPress={submit}
        loading={register.isPending}
        fullWidth
        size="lg"
        testID="register-submit"
      />
    </AuthScaffold>
  );
}
