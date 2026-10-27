import { forgotPasswordInputSchema } from '@techcapsule/contracts';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { AuthScaffold } from '@/components/AuthScaffold';
import { Banner, Button, Input } from '@/components/ui';
import { apiFormErrors, validate, type FieldErrors } from '@/lib/forms';
import { useForgotPassword } from '@/queries/account';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const forgot = useForgotPassword();
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<{ email: string; message: string } | null>(null);

  const submit = async () => {
    setError(null);
    const { data, errors: invalid } = validate(forgotPasswordInputSchema, { email });
    if (!data) return setErrors(invalid);
    setErrors({});
    try {
      const res = await forgot.mutateAsync(data);
      setSentTo({ email: data.email, message: res.message });
    } catch (err) {
      const { fields, message } = apiFormErrors(err);
      setErrors(fields);
      setError(message);
    }
  };

  return (
    <AuthScaffold
      back
      title="Reset password"
      subtitle="Enter your account email and we'll send you a one-time reset code."
    >
      {error ? <Banner tone="danger" message={error} /> : null}
      {sentTo ? (
        <>
          {/* The API answers identically whether or not the account exists. */}
          <Banner tone="info" title="Check your inbox" message={sentTo.message} />
          {__DEV__ ? (
            <Banner
              tone="warning"
              title="Development"
              message="If the API runs with EMAIL_PROVIDER=log, no email is sent. The code is printed in the API console and listed at GET /api/v1/dev/emails."
            />
          ) : null}
          <Button
            label="Enter reset code"
            iconRight="arrow-forward"
            fullWidth
            size="lg"
            onPress={() =>
              router.push({ pathname: '/reset-password', params: { email: sentTo.email } })
            }
          />
          <Button label="Send again" variant="ghost" onPress={submit} loading={forgot.isPending} />
        </>
      ) : (
        <>
          <Input
            label="Email"
            icon="mail-outline"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            error={errors.email}
            onSubmitEditing={submit}
          />
          <Button
            label="Send reset code"
            onPress={submit}
            loading={forgot.isPending}
            fullWidth
            size="lg"
          />
        </>
      )}
    </AuthScaffold>
  );
}
