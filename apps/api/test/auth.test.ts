import { describe, expect, it } from 'vitest';
import { devOutbox } from '../src/integrations/email/index.js';
import { RefreshSession } from '../src/modules/auth/refreshSession.model.js';
import { User } from '../src/modules/users/user.model.js';
import {
  PASSWORD,
  api,
  bearer,
  latestCode,
  makeApi,
  registerUser,
  uniqueEmail,
} from './helpers.js';

describe('registration', () => {
  it('creates a plain user even if a role is supplied, and hashes the password', async () => {
    const email = uniqueEmail();
    const res = await api
      .post('/api/v1/auth/register')
      .send({ email: email.toUpperCase(), password: PASSWORD, displayName: 'Dev', role: 'admin' })
      .expect(201);

    expect(res.body.data.user).toMatchObject({ email, role: 'user', emailVerified: false });
    expect(res.body.data.tokens.accessToken).toBeTypeOf('string');
    expect(res.body.data.tokens.refreshToken).toBeTypeOf('string');
    expect(res.body.data.verificationEmail).toBe('dev-outbox');

    const stored = await User.findOne({ email }).select('+passwordHash').lean();
    expect(stored?.role).toBe('user');
    expect(stored?.passwordHash).toMatch(/^\$argon2id\$/);
    const session = await RefreshSession.findOne({ userId: stored!._id }).lean();
    expect(session?.tokenHash).not.toBe(res.body.data.tokens.refreshToken);
  });

  it('rejects duplicate emails case-insensitively', async () => {
    const email = uniqueEmail();
    await registerUser({ email });
    const res = await api
      .post('/api/v1/auth/register')
      .send({ email: email.toUpperCase(), password: PASSWORD, displayName: 'Dev' })
      .expect(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('returns machine-readable validation errors', async () => {
    const res = await api
      .post('/api/v1/auth/register')
      .send({ email: 'nope', password: 'short', displayName: 'D' })
      .expect(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    const paths = res.body.error.details.map((d: { path: string }) => d.path);
    expect(paths).toEqual(expect.arrayContaining(['email', 'password', 'displayName']));
  });
});

describe('login and sessions', () => {
  it('logs in and fetches the profile', async () => {
    const user = await registerUser();
    const login = await api
      .post('/api/v1/auth/login')
      .send({ email: user.email, password: PASSWORD })
      .expect(200);
    const me = await api.get('/api/v1/auth/me').set(bearer(login.body.data.tokens)).expect(200);
    expect(me.body.data.email).toBe(user.email);
  });

  it('uses a generic error for wrong password and unknown email', async () => {
    const user = await registerUser();
    const wrong = await api
      .post('/api/v1/auth/login')
      .send({ email: user.email, password: 'wrong-pass-1' })
      .expect(401);
    const unknown = await api
      .post('/api/v1/auth/login')
      .send({ email: uniqueEmail(), password: 'wrong-pass-1' })
      .expect(401);
    expect(wrong.body.error).toMatchObject({ code: 'INVALID_CREDENTIALS' });
    expect(unknown.body.error.message).toBe(wrong.body.error.message);
  });

  it('rejects missing and invalid access tokens', async () => {
    expect((await api.get('/api/v1/auth/me').expect(401)).body.error.code).toBe('UNAUTHENTICATED');
    const bad = await api
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer abc.def.ghi')
      .expect(401);
    expect(bad.body.error.code).toBe('INVALID_TOKEN');
  });

  it('rotates refresh tokens and revokes the family on reuse', async () => {
    const user = await registerUser();
    const first = await api
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: user.refreshToken })
      .expect(200);
    const rotated = first.body.data.tokens.refreshToken as string;
    expect(rotated).not.toBe(user.refreshToken);

    // Replaying the old token is treated as theft…
    const replay = await api
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: user.refreshToken })
      .expect(401);
    expect(replay.body.error.code).toBe('INVALID_TOKEN');
    // …which also kills the newest token in that family.
    await api.post('/api/v1/auth/refresh').send({ refreshToken: rotated }).expect(401);
  });

  it('logout revokes the refresh token', async () => {
    const user = await registerUser();
    await api.post('/api/v1/auth/logout').send({ refreshToken: user.refreshToken }).expect(200);
    await api.post('/api/v1/auth/refresh').send({ refreshToken: user.refreshToken }).expect(401);
  });

  it('web clients get the refresh token as an httpOnly cookie only', async () => {
    const user = await registerUser();
    const res = await api
      .post('/api/v1/auth/login')
      .set('X-Client', 'web')
      .send({ email: user.email, password: PASSWORD })
      .expect(200);
    expect(res.body.data.tokens.refreshToken).toBeUndefined();
    const cookie = res.headers['set-cookie']?.[0] ?? '';
    expect(cookie).toMatch(/tc_refresh=/);
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/SameSite=Strict/);

    const refreshed = await api
      .post('/api/v1/auth/refresh')
      .set('X-Client', 'web')
      .set('Cookie', cookie.split(';')[0]!)
      .expect(200);
    expect(refreshed.body.data.tokens.accessToken).toBeTypeOf('string');
    // Without the custom header, the cookie is ignored (CSRF protection).
    await api.post('/api/v1/auth/refresh').set('Cookie', cookie.split(';')[0]!).expect(401);
  });
});

describe('email verification', () => {
  it('verifies with the emailed code', async () => {
    const user = await registerUser();
    const code = latestCode(user.email);
    const res = await api
      .post('/api/v1/auth/verify-email')
      .send({ email: user.email, code })
      .expect(200);
    expect(res.body.data.user.emailVerified).toBe(true);
  });

  it('rejects wrong codes and locks after repeated attempts', async () => {
    const user = await registerUser();
    const code = latestCode(user.email);
    for (let i = 0; i < 5; i++) {
      const r = await api
        .post('/api/v1/auth/verify-email')
        .send({ email: user.email, code: 'AAAAAAAA' })
        .expect(400);
      expect(r.body.error.code).toBe('INVALID_CODE');
    }
    await api.post('/api/v1/auth/verify-email').send({ email: user.email, code }).expect(400);
  });

  it('resend issues a new code and reports honest delivery status', async () => {
    const user = await registerUser();
    const res = await api.post('/api/v1/auth/resend-verification').set(bearer(user)).expect(200);
    expect(res.body.data.delivery).toBe('dev-outbox');
  });
});

describe('password reset', () => {
  it('does not reveal whether an email exists', async () => {
    const user = await registerUser();
    const known = await api
      .post('/api/v1/auth/forgot-password')
      .send({ email: user.email })
      .expect(200);
    const unknown = await api
      .post('/api/v1/auth/forgot-password')
      .send({ email: uniqueEmail() })
      .expect(200);
    expect(known.body).toEqual(unknown.body);
  });

  it('resets the password with a code and revokes existing sessions', async () => {
    const user = await registerUser();
    await api.post('/api/v1/auth/forgot-password').send({ email: user.email }).expect(200);
    await new Promise((r) => setTimeout(r, 20)); // delivery is fire-and-forget
    const code = latestCode(user.email);
    const newPassword = 'brand-new-pass-77';

    await api
      .post('/api/v1/auth/reset-password')
      .send({ email: user.email, code, password: newPassword })
      .expect(200);
    await api.post('/api/v1/auth/refresh').send({ refreshToken: user.refreshToken }).expect(401);
    await api
      .post('/api/v1/auth/login')
      .send({ email: user.email, password: PASSWORD })
      .expect(401);
    await api
      .post('/api/v1/auth/login')
      .send({ email: user.email, password: newPassword })
      .expect(200);
    // Codes are single-use.
    await api
      .post('/api/v1/auth/reset-password')
      .send({ email: user.email, code, password: 'another-pass-88' })
      .expect(400);
  });
});

describe('rate limiting', () => {
  it('throttles repeated failed logins', async () => {
    const limited = makeApi({ rateLimit: true });
    const email = uniqueEmail();
    let last = 0;
    for (let i = 0; i < 11; i++) {
      last = (await limited.post('/api/v1/auth/login').send({ email, password: 'bad-password-1' }))
        .status;
    }
    expect(last).toBe(429);
  });
});

describe('profile', () => {
  it('updates preferences with validation', async () => {
    const user = await registerUser();
    const res = await api
      .patch('/api/v1/users/me')
      .set(bearer(user))
      .send({
        preferences: {
          language: 'hinglish',
          interests: ['mcp', 'rag', 'mcp'],
          dailyGoalMinutes: 15,
          timezone: 'Asia/Kolkata',
        },
      })
      .expect(200);
    expect(res.body.data.preferences).toMatchObject({
      language: 'hinglish',
      interests: ['mcp', 'rag'],
      dailyGoalMinutes: 15,
      timezone: 'Asia/Kolkata',
      experienceLevel: 'beginner',
    });
    await api
      .patch('/api/v1/users/me')
      .set(bearer(user))
      .send({ preferences: { dailyGoalMinutes: 7 } })
      .expect(400);
    await api
      .patch('/api/v1/users/me')
      .set(bearer(user))
      .send({ preferences: { timezone: 'Mars/Base' } })
      .expect(400);
    // Users can't promote themselves through the profile endpoint.
    await api
      .patch('/api/v1/users/me')
      .set(bearer(user))
      .send({ displayName: 'New Name', role: 'admin' })
      .expect(200);
    expect((await User.findById(user.id).lean())?.role).toBe('user');
  });
});

describe('dev outbox', () => {
  it('is available only with the log provider', () => {
    expect(devOutbox).not.toBeNull();
  });
});
