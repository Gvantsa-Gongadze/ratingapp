import type { PaginatedMyRatings, RankingPeriod } from '@ratingapp/shared-types';
import { apiFetch } from './client';

export function fetchMyRatings(period: RankingPeriod = 'all', page = 1) {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return apiFetch<PaginatedMyRatings>(
    `/ratings/mine?period=${period}&page=${page}&tz=${encodeURIComponent(tz)}`,
  );
}
