import type {
  AuthResponseDto,
  ForgotPasswordRequest,
  LoginRequest,
  MeDto,
  MessageResponseDto,
  RegisterRequest,
  ResetPasswordRequest,
} from '@ratingapp/shared-types';
import { apiFetch } from './client';

export function fetchMe() {
  return apiFetch<MeDto>('/auth/me');
}

export function register(data: RegisterRequest) {
  return apiFetch<AuthResponseDto>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function login(data: LoginRequest) {
  return apiFetch<AuthResponseDto>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function forgotPassword(data: ForgotPasswordRequest) {
  return apiFetch<MessageResponseDto>('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function resetPassword(data: ResetPasswordRequest) {
  return apiFetch<MessageResponseDto>('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
