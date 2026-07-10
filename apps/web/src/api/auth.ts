import type { AuthResponseDto, LoginRequest, RegisterRequest } from '@ratingapp/shared-types';
import { apiFetch } from './client';

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
