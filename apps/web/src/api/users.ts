import type { UpdateGenrePreferencesRequest, UserSettingsResponseDto } from '@ratingapp/shared-types';
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
