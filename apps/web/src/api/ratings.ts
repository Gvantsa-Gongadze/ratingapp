import type { MyRatingDto } from '@ratingapp/shared-types';
import { apiFetch } from './client';

export function fetchMyRatings() {
  return apiFetch<MyRatingDto[]>('/ratings/mine');
}
