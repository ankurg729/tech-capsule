import { loginInputSchema } from '@techcapsule/contracts';
import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { Banner, Button, TextField } from '@/components/ui';
import { apiFormErrors, validate, type FieldErrors } from '@/lib/forms';
import { session, useSession } from '@/lib/session';

export function LoginPage() {
  const { status, notice } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (status === 'signedIn') return <Navigate to={from} replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    const result = validate(loginInputSchema, { email, password });
    if (result.errors) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      await session.login(result.data);
      navigate(from, { replace: true });
    } catch (err) {
      const { fields, message } = apiFormErrors(err);
      setErrors(fields);
      setFormError(message);
    } finally {
      setSubmitting(false);
    }
  }

  const banner = formError ?? notice;

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={onSubmit} noValidate>
        <div className="brand brand-lg">
          <span className="brand-mark" aria-hidden>
            TC
          </span>
          <div>
            <strong>TechCapsule Admin</strong>
            <small>Content & moderation</small>
          </div>
        </div>
        {banner ? <Banner tone={formError ? 'error' : 'warning'}>{banner}</Banner> : null}
        <TextField
          label="Email"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
          autoFocus
        />
        <TextField
          label="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
        />
        <Button type="submit" variant="primary" busy={submitting} className="btn-block">
          Sign in
        </Button>
        <p className="muted small">
          Admin accounts are created with <code>npm run create-admin</code>. Learner accounts cannot
          sign in here.
        </p>
      </form>
    </div>
  );
}
