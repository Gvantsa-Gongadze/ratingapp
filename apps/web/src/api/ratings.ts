import type { MyRatingDto, RankingPeriod } from '@ratingapp/shared-types';
import { apiFetch } from './client';

export function fetchMyRatings(period: RankingPeriod = 'all') {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return apiFetch<MyRatingDto[]>(`/ratings/mine?period=${period}&tz=${encodeURIComponent(tz)}`);
}
