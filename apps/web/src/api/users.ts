import type {
  ChangeEmailRequest,
  ChangePasswordRequest,
  MessageResponseDto,
  UpdateGenrePreferencesRequest,
  UserSettingsResponseDto,
} from '@ratingapp/shared-types';
import { apiFetch } from './client';

export function fetchUserSettings() {
  return apiFetch<UserSettingsResponseDto>('/users/settings');
}

export function updateGenrePreferences(data: UpdateGenrePreferencesRequest) {
  return apiFetch<UserSettingsResponseDto>('/users/settings/genres', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function changePassword(data: ChangePasswordRequest) {
  return apiFetch<MessageResponseDto>('/users/account/password', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function changeEmail(data: ChangeEmailRequest) {
  return apiFetch<MessageResponseDto>('/users/account/email', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}
