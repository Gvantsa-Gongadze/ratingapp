import type { RankingEntryDto, RankingPeriod } from '@ratingapp/shared-types';
import { apiFetch } from './client';

export function fetchRankings(period: RankingPeriod) {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return apiFetch<RankingEntryDto[]>(`/rankings?period=${period}&tz=${encodeURIComponent(tz)}`);
}
