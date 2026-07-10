import type { AssignmentDto, RateMovieRequest } from '@ratingapp/shared-types';
import { apiFetch } from './client';

export function fetchCurrentAssignment() {
  return apiFetch<AssignmentDto>('/assignments/current');
}

export function skipAssignment(assignmentId: string) {
  return apiFetch<AssignmentDto>(`/assignments/${assignmentId}/skip`, {
    method: 'POST',
  });
}

export function rateAssignment(assignmentId: string, data: RateMovieRequest) {
  return apiFetch<AssignmentDto>(`/assignments/${assignmentId}/rate`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
