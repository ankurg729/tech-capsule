import { verifyEmailInputSchema, type EmailDeliveryStatus } from '@techcapsule/contracts';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { AuthScaffold } from '@/components/AuthScaffold';
import { Banner, Button, Input } from '@/components/ui';
import { useSession } from '@/lib/auth/session';
import { errorMessage } from '@/lib/api/http';
import { apiFormErrors, validate, type FieldErrors } from '@/lib/forms';
import { useResendVerification, useVerifyEmail } from '@/queries/account';

const DELIVERY_STATUSES = ['sent', 'dev-outbox', 'failed'] as const;

function DeliveryNotice({ status, email }: { status: EmailDeliveryStatus | null; email: string }) {
  if (status === 'sent') {
    return <Banner tone="info" message={`We sent an 8-character code to ${email}.`} />;
  }
  if (status === 'dev-outbox') {
    return (
      <Banner
        tone="warning"
        title="Development mode — no email was sent"
        message="The API is using the dev email outbox. Find the code in the API console or at GET /api/v1/dev/emails."
        testID="dev-outbox-notice"
      />
    );
  }
  if (status === 'failed') {
    return (
      <Banner
        tone="danger"
        message="We couldn't send the verification email. Tap “Resend code” to try again."
      />
    );
  }
  return null;
}

export default function VerifyEmailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ delivery?: string; email?: string }>();
  const { user, status } = useSession();
  const signedIn = status === 'signedIn';
  const verify = useVerifyEmail();
  const resend = useResendVerification();

  const initialDelivery = DELIVERY_STATUSES.find((s) => s === params.delivery) ?? null;
  const [delivery, setDelivery] = useState<EmailDeliveryStatus | null>(initialDelivery);
  const [email, setEmail] = useState(user?.email ?? params.email ?? '');
  const [code, setCode] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);

  const done = () => router.replace(signedIn ? '/' : '/login');

  const submit = async () => {
    setError(null);
    const { data, errors: invalid } = validate(verifyEmailInputSchema, { email, code });
    if (!data) return setErrors(invalid);
    setErrors({});
    try {
      await verify.mutateAsync(data);
      setVerified(true);
    } catch (err) {
      const { fields, message } = apiFormErrors(err);
      setErrors(fields);
      setError(message);
    }
  };

  const resendCode = async () => {
    setError(null);
    try {
      const res = await resend.mutateAsync();
      setDelivery(res.delivery);
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  if (verified || user?.emailVerified) {
    return (
      <AuthScaffold title="Email verified" subtitle="You can now ask questions, answer and vote.">
        <Banner tone="success" message="Thanks for confirming your email address." />
        <Button label={signedIn ? 'Continue' : 'Log in'} onPress={done} fullWidth size="lg" />
      </AuthScaffold>
    );
  }

  return (
    <AuthScaffold
      title="Verify your email"
      subtitle="Verification unlocks posting in the community. You can keep learning in the meantime."
    >
      <DeliveryNotice status={delivery} email={email} />
      {error ? <Banner tone="danger" message={error} /> : null}
      <Input
        label="Email"
        icon="mail-outline"
        value={email}
        onChangeText={setEmail}
        editable={!signedIn}
        autoCapitalize="none"
        keyboardType="email-address"
        error={errors.email}
      />
      <Input
        label="Verification code"
        icon="key-outline"
        value={code}
        onChangeText={(v) => setCode(v.toUpperCase())}
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={8}
        textContentType="oneTimeCode"
        error={errors.code}
        testID="verify-code"
      />
      <Button
        label="Verify email"
        onPress={submit}
        loading={verify.isPending}
        fullWidth
        size="lg"
      />
      {signedIn ? (
        <Button
          label="Resend code"
          variant="secondary"
          icon="mail-unread-outline"
          onPress={resendCode}
          loading={resend.isPending}
          fullWidth
        />
      ) : null}
      <Button label={signedIn ? 'Skip for now' : 'Back to login'} variant="ghost" onPress={done} />
    </AuthScaffold>
  );
}
