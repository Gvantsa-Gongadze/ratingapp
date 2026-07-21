import type {
  AdminStatsDto,
  MessageResponseDto,
  PaginatedAdminReviews,
  PaginatedAdminUsers,
  SetUserBannedRequest,
  UpdateUserRoleRequest,
} from '@ratingapp/shared-types';
import { apiFetch } from './client';

export function fetchAdminUsers(page: number) {
  return apiFetch<PaginatedAdminUsers>(`/admin/users?page=${page}`);
}

export function updateUserRole(userId: string, data: UpdateUserRoleRequest) {
  return apiFetch<MessageResponseDto>(`/admin/users/${userId}/role`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function setUserBanned(userId: string, data: SetUserBannedRequest) {
  return apiFetch<MessageResponseDto>(`/admin/users/${userId}/ban`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function fetchAdminReviews(page: number) {
  return apiFetch<PaginatedAdminReviews>(`/admin/reviews?page=${page}`);
}

export function removeReview(ratingId: string) {
  return apiFetch<MessageResponseDto>(`/admin/reviews/${ratingId}`, {
    method: 'DELETE',
  });
}

export function fetchAdminStats() {
  return apiFetch<AdminStatsDto>('/admin/stats');
}
