import type { PaginatedRankings, RankingPeriod } from '@ratingapp/shared-types';
import { apiFetch } from './client';

export function fetchRankings(period: RankingPeriod, page = 1) {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return apiFetch<PaginatedRankings>(
    `/rankings?period=${period}&page=${page}&tz=${encodeURIComponent(tz)}`,
  );
}
