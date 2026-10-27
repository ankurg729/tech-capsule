import type {
  AuthSessionDTO,
  ForgotPasswordInput,
  LoginInput,
  MessageDTO,
  RegisterInput,
  RegisterResultDTO,
  ResendVerificationDTO,
  ResetPasswordInput,
  UpdateProfileInput,
  UserDTO,
  VerifyEmailInput,
} from '@techcapsule/contracts';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { rawRequest } from '@/lib/api/http';
import { session } from '@/lib/auth/session';
import { qk } from './client';

export function useLogin() {
  return useMutation({
    mutationFn: async (input: LoginInput) => {
      const { data } = await rawRequest<AuthSessionDTO>('/auth/login', {
        method: 'POST',
        body: input,
      });
      await session.establish(data);
      return data;
    },
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: async (input: RegisterInput) => {
      const { data } = await rawRequest<RegisterResultDTO>('/auth/register', {
        method: 'POST',
        body: input,
      });
      await session.establish(data);
      return data;
    },
  });
}

export const useForgotPassword = () =>
  useMutation({
    mutationFn: async (input: ForgotPasswordInput) =>
      (await rawRequest<MessageDTO>('/auth/forgot-password', { method: 'POST', body: input })).data,
  });

export const useResetPassword = () =>
  useMutation({
    mutationFn: async (input: ResetPasswordInput) =>
      (await rawRequest<MessageDTO>('/auth/reset-password', { method: 'POST', body: input })).data,
  });

export function useVerifyEmail() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: VerifyEmailInput) =>
      (await rawRequest<{ user: UserDTO }>('/auth/verify-email', { method: 'POST', body: input }))
        .data,
    onSuccess: ({ user }) => {
      if (session.getState().user?.id === user.id) session.setUser(user);
      void client.invalidateQueries({ queryKey: ['question'] });
    },
  });
}

export const useResendVerification = () =>
  useMutation({
    mutationFn: () => api.post<ResendVerificationDTO>('/auth/resend-verification'),
  });

export function useUpdateProfile() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateProfileInput) => api.patch<UserDTO>('/users/me', input),
    onSuccess: (user) => {
      session.setUser(user);
      // Interests, language and timezone drive the daily capsule, recommendations and streaks.
      void client.invalidateQueries({ queryKey: qk.home });
      void client.invalidateQueries({ queryKey: qk.stats });
    },
  });
}

export const useSignOut = () => useMutation({ mutationFn: () => session.signOut() });
